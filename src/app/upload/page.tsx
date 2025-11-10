
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


// NOTE: Using a proxy to bypass CORS issues in development.
// The rewrite in next.config.js handles pointing this to the backend.
const API_BASE_URL = '/api/v1'; 

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const startAnalysis = async (documentId: string): Promise<string> => {
    setUploadStatus('starting_analysis');
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/analyze?user_id=${user?.uid}`, {
      method: 'POST',
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to start analysis');
    }

    const data = await res.json();
    if (!data.analysis_id) {
      throw new Error('Analysis ID not found in response.');
    }
    return data.analysis_id;
  };

  const pollProcessingStatus = (documentId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setUploadStatus('processing');
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/documents/${documentId}/status`);
          if (!res.ok) {
            // Stop polling on server error
            clearInterval(interval);
            return reject(new Error('Failed to get processing status'));
          }
          const data = await res.json();

          setAnalysisProgress(data.progress || 0);

          if (data.status === 'processed') {
            clearInterval(interval);
            resolve();
          } else if (data.status === 'failed') {
            clearInterval(interval);
            reject(new Error('Document processing failed on the server.'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds
    });
  };


  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    
    // For now, we only handle single file uploads as per the backend spec
    if (files.length > 1) {
        toast({
            variant: 'destructive',
            title: 'Multiple Files Not Supported',
            description: 'Please upload one document at a time for analysis.',
        });
        return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setUploadStatus('uploading');

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const uploadRes = await fetch(`${API_BASE_URL}/documents/upload?user_id=${user.uid}`, {
            method: 'POST',
            body: formData,
        });
        
        setUploadProgress(100);

        if (!uploadRes.ok) {
            const errorData = await uploadRes.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        const uploadResult = await uploadRes.json();
        const { document_id } = uploadResult;

        if (!document_id) {
            throw new Error('Document ID not found in upload response.');
        }

        toast({
          title: 'Upload Complete',
          description: 'Your document is now being processed.',
        });
        
        await pollProcessingStatus(document_id);
        
        toast({
            title: 'Processing Complete',
            description: 'Starting final analysis...',
        });

        const analysis_id = await startAnalysis(document_id);

        toast({
          title: 'Analysis Started',
          description: 'Redirecting to your analysis report.',
        });

        router.push(`/analysis/${analysis_id}`);

    } catch (error) {
        console.error('Upload & Analysis error:', error);
        setIsUploading(false);
        setUploadStatus('idle');
        toast({
          variant: 'destructive',
          title: 'An Error Occurred',
          description: (error as Error).message || 'Could not process the file. Please check the console.',
        });
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
        case 'idle':
            return 'Analyze Document';
        case 'uploading':
            return 'Uploading...';
        case 'processing':
            return 'Processing Document...';
        case 'starting_analysis':
            return 'Starting Analysis...';
        default:
            return 'Processing...';
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload Your Document</CardTitle>
          <CardDescription>
            Your files are encrypted, processed securely, and never stored.
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

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Selected File:</h3>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)} disabled={isUploading}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {isUploading && (
             <div className="mt-6 space-y-4">
                {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                  <div className="space-y-2">
                    <p className='text-sm font-medium flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' /> 
                        {uploadStatus === 'uploading' ? 'Uploading file...' : 'Processing document... this may take a moment.'}
                    </p>
                    <Progress value={uploadStatus === 'uploading' ? uploadProgress : analysisProgress} className="w-full" />
                  </div>
                )}
             </div>
          )}

        </CardContent>
        <CardFooter>
          <Button size="lg" onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {getStatusMessage()}
                </>
            ) : 'Analyze Document'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
