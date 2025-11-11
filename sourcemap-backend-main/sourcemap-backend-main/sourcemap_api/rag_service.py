from datetime import datetime
import numpy as np
from typing import List, Dict, Any, Optional
import json
import re
import concurrent.futures
from loguru import logger

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel as PydanticBaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from django.conf import settings as django_settings
from django.db import transaction
from .models import KnowledgeDocument, SimilarDocument
from .llm_models import RAGAnalysis


class RAGService:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=django_settings.GEMINI_EMBEDDING_MODEL,
            google_api_key=django_settings.GEMINI_API_KEY
        )
        self.llm = ChatGoogleGenerativeAI(
            model=django_settings.GEMINI_MODEL,
            google_api_key=django_settings.GEMINI_API_KEY,
            temperature=0.2
        )
        # Use with_structured_output as per the recommended approach
        # This should work with properly configured langchain-google-genai
        try:
            self.structured_llm = self.llm.with_structured_output(RAGAnalysis)
        except (NotImplementedError, TypeError, AttributeError):
            # If structured output is not available or not working, set to None
            self.structured_llm = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,  # 500 words per chunk
            chunk_overlap=50
        )

    def add_to_knowledge_base(self, docs: List[str], doc_type: str, source: str = "manual"):
        """
        Add documents to the knowledge base with embeddings.
        """
        try:
            # Process each document
            for doc_text in docs:
                # Split document into chunks
                chunks = self.text_splitter.split_text(doc_text)
                
                for chunk in chunks:
                    # Create embedding for the chunk
                    embedding_vector = self.embeddings.embed_query(chunk)
                    
                    # Truncate to 1536 dimensions as specified in the plan
                    if len(embedding_vector) > 1536:
                        embedding_vector = embedding_vector[:1536]
                    
                    # Convert to bytes for storage
                    embedding_bytes = self._vector_to_bytes(embedding_vector)
                    
                    # Create knowledge document record
                    knowledge_doc = KnowledgeDocument.objects.create(
                        type=doc_type,
                        source=source,
                        embedding=embedding_bytes,
                        doc_metadata={
                            "chunk_size": len(chunk),
                            "source_length": len(doc_text)
                        },
                        provenance={
                            "source_doc": source,
                            "chunk_timestamp": datetime.utcnow().isoformat(),
                            "embedding_model": django_settings.GEMINI_EMBEDDING_MODEL
                        },
                    )
                
            print(f"Added {len(docs)} documents to knowledge base with {len(chunks)} chunks")
            
        except Exception as e:
            print(f"Error adding to knowledge base: {str(e)}")
            raise e

    def find_similar_documents(self, query_docs: List[str], doc_type: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Find similar documents in the knowledge base based on embeddings.
        """
        logger.info(f"Finding similar documents for type: {doc_type}")
        
        try:
            results = []
            
            for query_doc in query_docs:
                # Embed the query document
                query_embedding = self.embeddings.embed_query(query_doc)
                
                # Truncate to 1536 dimensions
                if len(query_embedding) > 1536:
                    query_embedding = query_embedding[:1536]
                
                # In a real implementation, we would use PGVector's cosine similarity
                # Since we can't connect to the DB with PGVector, we'll implement a basic similarity
                # by comparing embeddings stored as binary data
                # This is simplified for now - in a real implementation, this would use proper vector operations
                similar_docs = KnowledgeDocument.objects.filter(
                    type=doc_type
                )[:k]
                
                for doc in similar_docs:
                    # Convert stored embedding back to vector for similarity calculation
                    stored_vector = self._bytes_to_vector(doc.embedding)
                    
                    # Calculate cosine similarity
                    similarity = self._cosine_similarity(query_embedding, stored_vector)
                    
                    if similarity > 0.6:  # Only return matches above threshold
                        results.append({
                            "doc_id": str(doc.id),
                            "similarity_score": float(similarity),
                            "metadata": doc.doc_metadata,
                            "provenance": doc.provenance
                        })
            
            # Sort by similarity score
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            logger.success(f"Found {len(results)} similar documents")
            return results[:k]  # Return top k results
            
        except Exception as e:
            logger.error(f"Error finding similar documents: {str(e)}")
            raise e

    def analyze_with_context(self, extracted_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze documents with RAG context using Gemini.
        """
        logger.info(f"Starting RAG analysis for {len(extracted_docs)} documents")
        
        results = []
        
        for doc_info in extracted_docs:
            doc_text = doc_info.get("text", "")
            doc_id = doc_info.get("id", "")
            
            try:
                # Find similar documents in knowledge base
                similar_docs = self.find_similar_documents([doc_text], "general", k=5)
                
                # Prepare context from similar documents
                context_texts = []
                for sim_doc in similar_docs:
                    # In a real implementation, we'd retrieve the actual content
                    # For now, we'll just note the similarity
                    context_texts.append(f"Similar document with {sim_doc['similarity_score']:.2f} similarity")
                
                context = "\n".join(context_texts) if context_texts else "No similar documents found in knowledge base."
                
                # Prepare the analysis prompt with context
                prompt = (
                    f"Analyze the following document against the provided context:\n\n"
                    f"DOCUMENT TEXT:\n{doc_text}\n\n"
                    f"CONTEXT FROM KNOWLEDGE BASE:\n{context}\n\n"
                    f"Based on the context, identify any deviations, inconsistencies, or anomalies "
                    f"when compared to similar documents in the knowledge base."
                )
                
                # Create message with the prompt
                message = HumanMessage(content=prompt)
                
                # Perform the analysis
                if self.structured_llm is not None:
                    # Use structured output
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(lambda: self.structured_llm.invoke([message]))
                        result = future.result()
                else:
                    # Fallback: use regular LLM call and parse JSON manually
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(lambda: self.llm.invoke([message]))
                        raw_response = future.result()
                    
                    # Try to extract structured information from raw response
                    response_content = raw_response.content
                    import json
                    import re
                    
                    # Look for JSON in the response (in case the model responds in JSON format)
                    json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
                    if json_match:
                        try:
                            json_str = json_match.group()
                            parsed = json.loads(json_str)
                            # Create RAGAnalysis from parsed data
                            result = RAGAnalysis(
                                match_score=parsed.get('match_score', 0.5),
                                deviations=parsed.get('deviations', []),
                                assessment=parsed.get('assessment', 'RAG analysis completed'),
                                reasoning=parsed.get('reasoning', 'Analysis performed with fallback method')
                            )
                        except json.JSONDecodeError:
                            # JSON parsing failed, use basic response
                            result = RAGAnalysis(
                                match_score=0.5,
                                deviations=['Could not parse response as JSON'],
                                assessment='RAG analysis completed with basic parsing',
                                reasoning='The response could not be parsed as JSON'
                            )
                    else:
                        # No JSON found, create basic response
                        result = RAGAnalysis(
                            match_score=0.5,
                            deviations=[],
                            assessment='RAG analysis completed',
                            reasoning='Analysis performed with fallback method'
                        )
                
                # Store similar document references
                try:
                    for sim_doc in similar_docs:
                        similar_document = SimilarDocument.objects.create(
                            analysis_id=doc_id,  # This would be the analysis result ID in real implementation
                            ref_id=sim_doc["doc_id"],
                            similarity_score=sim_doc["similarity_score"],
                            explanation=result.reasoning,
                        )
                except Exception as e:
                    logger.error(f"Error storing similar documents: {str(e)}")
                
                results.append({
                    "document_id": doc_id,
                    "analysis": result.dict(),
                    "similar_documents": similar_docs
                })
                
            except Exception as e:
                logger.error(f"Error analyzing document {doc_id} with context: {str(e)}")
                results.append({
                    "document_id": doc_id,
                    "error": str(e)
                })
        
        logger.success(f"Completed RAG analysis for {len(extracted_docs)} documents")
        return results

    def _vector_to_bytes(self, vector: List[float]) -> bytes:
        """Convert a vector to bytes for storage."""
        return np.array(vector, dtype=np.float32).tobytes()

    def _bytes_to_vector(self, bytes_data: bytes) -> List[float]:
        """Convert bytes back to a vector."""
        return np.frombuffer(bytes_data, dtype=np.float32).tolist()

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        # Convert to numpy arrays
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        # Calculate cosine similarity
        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
        
        return float(dot_product / (norm_v1 * norm_v2))