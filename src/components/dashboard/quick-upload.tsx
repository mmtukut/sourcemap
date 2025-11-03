'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickUpload() {
  const router = useRouter();
  const handleUpload = () => {
    router.push('/upload');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Quick Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onClick={handleUpload}
          className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/50 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <UploadCloud className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold text-foreground">
            Drag & drop or click to upload a document
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supported: PDF, JPG, PNG (max 50MB)
          </p>
        </div>
        <Button onClick={handleUpload} className="mt-4 w-full sm:w-auto" size="lg">
          <UploadCloud className="mr-2 h-5 w-5" />
          Upload Document
        </Button>
      </CardContent>
    </Card>
  );
}
