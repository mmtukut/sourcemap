"""
Simple test script to verify the file upload functionality works correctly.
"""
import requests
import os

def test_file_upload():
    """
    Test the file upload functionality using the test_memo.jpg file.
    """
    # Define the API endpoint
    upload_url = "http://localhost:8000/api/v1/analyze-file"
    
    # Path to the test file
    test_file_path = os.path.join(os.path.dirname(__file__), "test_memo.jpg")
    
    # Check if the test file exists
    if not os.path.exists(test_file_path):
        print(f"Test file does not exist: {test_file_path}")
        return
    
    print(f"Testing file upload with: {test_file_path}")
    
    # Prepare the file for upload
    with open(test_file_path, "rb") as file:
        files = {
            'file': (os.path.basename(test_file_path), file, 'image/jpeg')
        }
        
        # Add any additional form data if needed
        data = {
            'analysis_type': 'full'
        }
        
        try:
            # Make the POST request
            response = requests.post(upload_url, files=files, data=data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 201:
                print("File upload successful!")
                response_json = response.json()
                print(f"Document ID: {response_json.get('document_id')}")
            else:
                print("File upload failed!")
                
        except Exception as e:
            print(f"Error during upload: {str(e)}")

if __name__ == "__main__":
    test_file_upload()