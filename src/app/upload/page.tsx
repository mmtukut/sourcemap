
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';


const API_BASE_URL = '/api/v1'; 

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: 'Please select a file smaller than 50MB.',
        });
        setFile(null);
      } else {
        setFile(selectedFile);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const selectedFile = event.dataTransfer.files[0];
       if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: 'Please select a file smaller than 50MB.',
        });
        setFile(null);
      } else {
        setFile(selectedFile);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveFile = () => {
    setFile(null);
  };
  
  const handleUpload = async () => {
    if (!file || !user) return;
    
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('analysis_type', 'full');


    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/analyze-file?user_id=${user.uid}`, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            setIsUploading(false);
            if (xhr.status === 200 || xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                if (response.document_id) {
                     toast({
                        title: 'Analysis Complete',
                        description: 'Redirecting to your analysis report.',
                    });
                    router.push(`/analysis/${response.document_id}`);
                } else {
                     throw new Error('Analysis completed, but no document ID was returned.');
                }
            } else {
                 const errorData = JSON.parse(xhr.responseText || '{}');
                 throw new Error(errorData.detail || 'Analysis failed on the server.');
            }
        };

        xhr.onerror = () => {
            setIsUploading(false);
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'A network error occurred during the upload.',
            });
        };
        
        xhr.send(formData);


    } catch (error) {
        console.error('Analysis error:', error);
        setIsUploading(false);
        toast({
          variant: 'destructive',
          title: 'An Error Occurred',
          description: (error as Error).message || 'Could not process the file. Please try again.',
        });
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload Your Document</CardTitle>
          <CardDescription>
            Your file will be uploaded and analyzed synchronously. Please keep this window open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Drag &amp; drop a file here</p>
            <p className="text-sm text-muted-foreground">or</p>
            <Label htmlFor="file-upload" className="mt-2 text-primary underline cursor-pointer">
              browse your files
            </Label>
            <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/jpeg,image/png" />
          </div>

          {file && (
            <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Selected File:</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={isUploading}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
            </div>
          )}
          
          {isUploading && (
             <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <p className='text-sm font-medium flex items-center gap-2'>
                      <Loader2 className='h-4 w-4 animate-spin' /> 
                      Uploading & Analyzing... this may take a moment.
                  </p>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
             </div>
          )}

        </CardContent>
        <CardFooter>
          <Button size="lg" onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                </>
            ) : 'Analyze Document'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
