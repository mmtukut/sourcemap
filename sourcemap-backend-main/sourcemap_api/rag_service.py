from typing import List, Dict, Any
from datetime import datetime
import concurrent.futures
from loguru import logger
import json
import re

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import GoogleGenerativeAiEmbeddings
# from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores import FAISS
from pydantic import BaseModel as PydanticBaseModel, Field

from django.conf import settings as django_settings
from django.db import transaction
from .models import Document, AnalysisResult, AnomalyDetection, KnowledgeDocument

class QAResponse(PydanticBaseModel):
    """Response model for question answering."""
    answer: str = Field(description="The answer to the question.")
    sources: List[str] = Field(description="A list of sources used to answer the question.")


class RAGService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=django_settings.GEMINI_MODEL,
            google_api_key=django_settings.GEMINI_API_KEY,
            temperature=0.1
        )
        self.embeddings = GoogleGenerativeAiEmbeddings(model=django_settings.GEMINI_EMBEDDING_MODEL, google_api_key=django_settings.GEMINI_API_KEY)
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        self.vector_db = None

    def _create_vector_db_from_documents(self, documents: List[Dict[str, str]]):
        """Create a vector database from a list of documents."""
        texts = [doc["text"] for doc in documents]
        metadatas = [{"doc_id": doc["id"]} for doc in documents]
        
        # Split texts into smaller chunks
        all_splits = self.text_splitter.create_documents(texts, metadatas=metadatas)
        
        # Create the vector database
        self.vector_db = FAISS.from_documents(documents=all_splits, embedding=self.embeddings)
        logger.info(f"VectorDB created with {len(all_splits)} splits")

    def analyze_with_context(self, documents: List[Dict[str, str]]) -> None:
        """Analyze documents and create a vector database for RAG."""
        logger.info(f"Starting RAG analysis with {len(documents)} documents")
        
        try:
            self._create_vector_db_from_documents(documents)
            logger.success("Successfully created vector database.")
        except Exception as e:
            logger.error(f"Error creating vector database: {e}")
            raise

    def query_rag(self, query: str) -> QAResponse:
        """Query the RAG system with a given query."""
        if not self.vector_db:
            raise ValueError("Vector database not initialized. Call analyze_with_context first.")
        
        try:
            # Perform similarity search
            search_results = self.vector_db.similarity_search(query)
            
            # Extract context from search results
            context = "\n".join([result.page_content for result in search_results])
            
            # Construct the prompt
            prompt = (
                "You are a world-class digital forensics expert. Use the context below to answer the query. "
                "Be concise and provide the answer directly. If the answer is not in the context, say 'I don't know'.\n"
                "Context:\n" + context + "\n"
                "Query: " + query + "\n"
                "Answer:"
            )
            
            # Generate the answer
            message = HumanMessage(content=prompt)
            answer = self.llm.invoke([message]).content
            
            # Extract source document IDs from search results
            sources = list(set([result.metadata["doc_id"] for result in search_results]))
            
            return QAResponse(answer=answer, sources=sources)
        except Exception as e:
            logger.error(f"Error querying RAG: {e}")
            raise
