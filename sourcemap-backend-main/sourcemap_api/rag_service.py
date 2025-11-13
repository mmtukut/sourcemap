import numpy as np
from typing import List, Dict, Any
from loguru import logger

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

from django.conf import settings as django_settings
from .models import KnowledgeDocument, SimilarDocument
from .llm_models import RAGAnalysis


class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model=django_settings.OPENAI_EMBEDDING_MODEL,
            openai_api_key=django_settings.OPENAI_API_KEY
        )
        self.llm = ChatOpenAI(
            model=django_settings.OPENAI_MODEL,
            openai_api_key=django_settings.OPENAI_API_KEY,
            temperature=0.2
        )
        self.structured_llm = self.llm.with_structured_output(RAGAnalysis)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )

    def add_to_knowledge_base(self, docs: List[str], doc_type: str, source: str = "manual"):
        """
        Add documents to the knowledge base with embeddings.
        """
        for doc_text in docs:
            chunks = self.text_splitter.split_text(doc_text)

            for chunk in chunks:
                embedding_vector = self.embeddings.embed_query(chunk)
                embedding_bytes = self._vector_to_bytes(embedding_vector)

                KnowledgeDocument.objects.create(
                    type=doc_type,
                    source=source,
                    embedding=embedding_bytes,
                    doc_metadata={
                        "chunk_size": len(chunk),
                        "source_length": len(doc_text)
                    },
                    provenance={
                        "source_doc": source,
                        "embedding_model": django_settings.OPENAI_EMBEDDING_MODEL
                    },
                )

        logger.info(f"Added documents to knowledge base")

    def find_similar_documents(self, query_docs: List[str], doc_type: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Find similar documents in the knowledge base based on embeddings.
        """
        results = []

        for query_doc in query_docs:
            query_embedding = self.embeddings.embed_query(query_doc)
            similar_docs = KnowledgeDocument.objects.filter(type=doc_type)[:k]

            for doc in similar_docs:
                stored_vector = self._bytes_to_vector(doc.embedding)
                similarity = self._cosine_similarity(query_embedding, stored_vector)

                if similarity > 0.6:
                    results.append({
                        "doc_id": str(doc.id),
                        "similarity_score": float(similarity),
                        "metadata": doc.doc_metadata,
                        "provenance": doc.provenance
                    })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:k]

    def analyze_with_context(self, extracted_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze documents with RAG context using OpenAI.
        """
        results = []

        for doc_info in extracted_docs:
            doc_text = doc_info.get("text", "")
            doc_id = doc_info.get("id", "")

            try:
                # Find similar documents
                similar_docs = self.find_similar_documents([doc_text], "general", k=5)
                context = "No similar documents found." if not similar_docs else (
                    "\n".join([f"Similarity: {doc['similarity_score']:.2f}" for doc in similar_docs])
                )

                # Prepare prompt
                prompt = (
                    f"Document: {doc_text}\n\n"
                    f"Context: {context}\n\n"
                    "Analyze this document against the context and identify any deviations or anomalies."
                )

                # Create and send message
                message = HumanMessage(content=prompt)
                result = self.structured_llm.invoke([message])

                # Store similar document references
                for sim_doc in similar_docs:
                    SimilarDocument.objects.create(
                        analysis_id=doc_id,
                        ref_id=sim_doc["doc_id"],
                        similarity_score=sim_doc["similarity_score"],
                        explanation=result.reasoning,
                    )

                results.append({
                    "document_id": doc_id,
                    "analysis": result.dict(),
                    "similar_documents": similar_docs
                })

            except Exception as e:
                logger.error(f"Error analyzing document {doc_id}: {str(e)}")
                results.append({
                    "document_id": doc_id,
                    "error": str(e)
                })

        return results

    def _vector_to_bytes(self, vector: List[float]) -> bytes:
        """Convert a vector to bytes for storage."""
        return np.array(vector, dtype=np.float32).tobytes()

    def _bytes_to_vector(self, bytes_data: bytes) -> List[float]:
        """Convert bytes back to a vector."""
        return np.frombuffer(bytes_data, dtype=np.float32).tolist()

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        v1, v2 = np.array(vec1), np.array(vec2)
        norm_v1, norm_v2 = np.linalg.norm(v1), np.linalg.norm(v2)
        return 0.0 if norm_v1 == 0 or norm_v2 == 0 else float(np.dot(v1, v2) / (norm_v1 * norm_v2))