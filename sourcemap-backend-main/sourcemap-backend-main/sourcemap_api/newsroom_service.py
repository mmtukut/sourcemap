import os
from typing import List, Dict, Any
from loguru import logger

from django.conf import settings as django_settings
from .models import AnalysisResult, SimilarDocument
from .llm_models import RAGAnalysis

# Import the necessary functions from newsroom_rag
from . import newsroom_rag


class NewsroomRAGService:
    def __init__(self):
        # Just initialize - rely on environment variables in newsroom_rag
        pass

    def analyze_with_newsroom_context(self, extracted_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze documents against the newsroom/historical archive using Pinecone.
        Returns detailed information about similar news articles.
        """
        results = []

        for doc_info in extracted_docs:
            doc_text = doc_info.get("text", "")
            doc_id = doc_info.get("id", "")

            try:
                # Search Pinecone for similar historical documents
                search_results = newsroom_rag.search_pinecone(
                    index_name="archivi",  # Using the same index name from newsroom_rag
                    query=doc_text,
                    top_k=5,
                    namespace="newsroom"
                )

                if search_results:
                    # Process the search results to extract detailed information
                    similar_news = []
                    for result in search_results:
                        news_article = {
                            "title": result['metadata'].get('title', 'No Title'),
                            "publisher": result['metadata'].get('publisher', 'Unknown Publisher'),
                            "date": result['metadata'].get('date', 'Unknown Date'),
                            "link": result['metadata'].get('link', 'No Link'),
                            "similarity_score": result['similarity_score'],
                            "description": result['metadata'].get('description', ''),
                        }
                        similar_news.append(news_article)
                    
                    analysis_result = {
                        "document_id": doc_id,
                        "similar_news_articles": similar_news,
                        "matched_documents_count": len(search_results),
                        "search_results": search_results
                    }
                else:
                    analysis_result = {
                        "document_id": doc_id,
                        "similar_news_articles": [],
                        "matched_documents_count": 0,
                        "search_results": []
                    }

                results.append(analysis_result)

            except Exception as e:
                logger.error(f"Error analyzing document {doc_id} with newsroom RAG: {str(e)}")
                results.append({
                    "document_id": doc_id,
                    "error": str(e),
                    "similar_news_articles": [],
                    "matched_documents_count": 0,
                    "search_results": []
                })

        return results

    def check_document_authenticity(self, doc_text: str, doc_id: str) -> Dict[str, Any]:
        """
        Specifically check if a document exists in historical archives to verify authenticity.
        """
        try:
            search_results = newsroom_rag.search_pinecone(
                index_name="archivi",
                query=doc_text,
                top_k=3,
                namespace="newsroom"
            )

            if search_results:
                # Calculate authenticity score based on similarity
                max_similarity = max([result['similarity_score'] for result in search_results])
                
                # Determine authenticity based on similarity threshold
                if max_similarity > 0.8:
                    authenticity_level = "high"
                    explanation = "Document matches closely with historical archives"
                elif max_similarity > 0.6:
                    authenticity_level = "medium"
                    explanation = "Document has some similarities with historical archives"
                else:
                    authenticity_level = "low"
                    explanation = "Document has low similarity with historical archives"
            else:
                max_similarity = 0.0
                authenticity_level = "low"
                explanation = "Document not found in historical archives"

            return {
                "authenticity_score": max_similarity,
                "authenticity_level": authenticity_level,
                "explanation": explanation,
                "matching_documents": len(search_results),
                "search_results": search_results
            }

        except Exception as e:
            logger.error(f"Error checking authenticity for document {doc_id}: {str(e)}")
            return {
                "authenticity_score": 0.0,
                "authenticity_level": "error",
                "explanation": f"Error during authenticity check: {str(e)}",
                "matching_documents": 0,
                "search_results": []
            }