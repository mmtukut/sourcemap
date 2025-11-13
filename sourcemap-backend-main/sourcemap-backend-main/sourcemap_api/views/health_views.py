from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema
from ..serializers import HealthCheckResponseSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
@extend_schema(
    responses=HealthCheckResponseSerializer,
    description="Health check endpoint to verify the application is running."
)
def health_check(request):
    """
    Health check endpoint to verify the application is running.
    """
    return Response({"status": "ok", "message": "SourceMap Backend is running"}, status=status.HTTP_200_OK)