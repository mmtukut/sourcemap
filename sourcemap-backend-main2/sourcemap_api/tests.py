from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APITestCase
from .models import Document, User
import json
from pathlib import Path
import tempfile


class DocumentUploadTest(APITestCase):
    def setUp(self):
        self.client = Client()
        # Create a temporary file for testing
        self.temp_file = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        self.temp_file.write(b'%PDF-1.4 fake pdf content')
        self.temp_file.close()

    def test_document_upload(self):
        """Test uploading a document"""
        with open(self.temp_file.name, 'rb') as file:
            response = self.client.post(
                reverse('document-upload'),
                {'file': file, 'user_id': 'test_user'},
                format='multipart'
            )
        self.assertEqual(response.status_code, 201)
        
        # Check that a document was created in the database
        self.assertEqual(Document.objects.count(), 1)

    def tearDown(self):
        # Clean up the temporary file
        Path(self.temp_file.name).unlink(missing_ok=True)


class DocumentStatusTest(TestCase):
    def test_get_document_status(self):
        """Test getting document status"""
        # Create a test document
        document = Document.objects.create(
            filename='test.pdf',
            storage_path='/test/path',
            status='processed'
        )
        
        response = self.client.get(reverse('document-status', args=[document.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, document.status)


class HealthCheckTest(TestCase):
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get(reverse('health-check'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'ok')