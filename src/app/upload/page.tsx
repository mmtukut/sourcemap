
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, File, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

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
  
  const handleUpload = () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                setTimeout(() => router.push('/analysis/1'), 500); // Redirect after a short delay
                return 100;
            }
            return prev + 10;
        });
    }, 200);
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload Your Documents</CardTitle>
          <CardDescription>
            Drag and drop your files or click to browse. Supports PDF, JPG, and PNG up to 50MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Drag & drop files here</p>
            <p className="text-sm text-muted-foreground">or</p>
            <Label htmlFor="file-upload" className="mt-2 text-primary underline cursor-pointer">
              browse your files
            </Label>
            <Input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} />
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Selected Files:</h3>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {isUploading && (
             <div className="mt-6 space-y-2">
                <p className='text-sm font-medium'>Uploading and analyzing...</p>
                <Progress value={progress} className="w-full" />
             </div>
          )}

        </CardContent>
        <CardFooter>
          <Button size="lg" onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? 'Analyzing...' : `Analyze ${files.length} Document(s)`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
