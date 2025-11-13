from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.http import JsonResponse
from rest_framework.decorators import permission_classes

from ..models import User, Document, AnalysisResult
from ..serializers import DocumentListResponseItemSerializer, AnalysisResultResponseSerializer


@extend_schema(
    description="Retrieve a list of documents for a specific user, identified by email.",
    parameters=[
        OpenApiParameter(
            name='user_email',
            type=str,
            location=OpenApiParameter.QUERY,
            required=True,
            description='Email of the user whose documents are to be retrieved.'
        )
    ],
    responses={200: DocumentListResponseItemSerializer(many=True), 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT},
)
class DocumentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_email = request.query_params.get('user_email')
        if not user_email:
            return Response({'error': 'user_email query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            # If user does not exist, they have no documents. Return empty list.
            return Response([], status=status.HTTP_200_OK)

        documents = Document.objects.filter(user_id=user).order_by('-created_at')

        # Prepare data in the format expected by the frontend
        results = []
        for doc in documents:
            # Attempt to get the latest analysis for this document
            latest_analysis = AnalysisResult.objects.filter(doc_id=doc).order_by('-created_at').first()

            score = None
            if latest_analysis:
                score = latest_analysis.confidence_score

            # Determine status based on score or document status
            doc_status = doc.status
            if doc.status == 'processed' and score is not None:
                if score >= 80:
                    doc_status = 'clear'
                elif score >= 60:
                    doc_status = 'review'
                else:
                    doc_status = 'flag'

            results.append({
                'id': doc.id,
                'name': doc.filename,
                'status': doc_status,
                'score': score,
                'date': doc.created_at.strftime('%b %d, %Y')
            })

        return Response(results, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
@extend_schema(
    responses={200: AnalysisResultResponseSerializer, 404: OpenApiTypes.OBJECT, 500: OpenApiTypes.OBJECT},
    description="Get the analysis result for a processed document, including results from vision analysis, general RAG, and newsroom RAG."
)
def get_analysis_result(request, document_id):
    """
    Get the analysis result for a processed document.
    This now includes results from vision analysis, general RAG comparison, and historical verification against newsroom archives.
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get the analysis results if they exist
    try:
        analysis_results = AnalysisResult.objects.filter(doc_id=document)
        if analysis_results.exists():
            # Return the latest analysis result
            latest_analysis = analysis_results.latest('created_at')
            
            # Extract similar proven newspapers from provenance_chain (check both old and new field names for backward compatibility)
            similar_proven_newspapers = latest_analysis.provenance_chain.get('similar_proven_newspapers', 
                latest_analysis.provenance_chain.get('similar_news', []))
            
            return Response({
                'document_id': document.id,
                'status': document.status,
                'analysis_result': {
                    'id': latest_analysis.id,
                    'confidence_score': latest_analysis.confidence_score,
                    'sub_scores': latest_analysis.sub_scores,
                    'findings': latest_analysis.findings,
                    'created_at': latest_analysis.created_at
                },
                'similar_proven_newspapers': similar_proven_newspapers
            }, status=status.HTTP_200_OK)
        else:
            # Return document status if no analysis completed yet
            status_progress_map = {
                "pending": 10,
                "processing": 50,
                "processed": 100,
                "failed": 100
            }
            progress = status_progress_map.get(document.status, 0)

            return Response({
                'document_id': document.id,
                'status': document.status,
                'progress': progress,
                'message': f'Document is {document.status}, analysis not yet completed'
            }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Error retrieving analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)