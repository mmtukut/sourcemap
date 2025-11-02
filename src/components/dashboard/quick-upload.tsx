'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickUpload() {
  const router = useRouter();
  const handleUpload = () => {
    router.push('/upload');
  };

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle>Quick Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onClick={handleUpload}
          className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-center hover:border-primary hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary dark:hover:bg-gray-700"
        >
          <FileUp className="h-12 w-12 text-gray-400" />
          <p className="mt-4 font-semibold text-gray-600 dark:text-gray-300">
            Drag & drop or click to upload a document
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Supported: PDF, JPG, PNG (max 50MB)
          </p>
        </div>
        <Button onClick={handleUpload} className="mt-4 w-full sm:w-auto" size="lg">
          <Upload className="mr-2 h-5 w-5" />
          Upload Document
        </Button>
      </CardContent>
    </Card>
  );
}
