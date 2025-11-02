'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  FileUp,
  X,
  Loader2,
  FileCheck2,
  ChevronsUpDown,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload a file smaller than 50MB.',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload a file smaller than 50MB.',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleStartAnalysis = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please upload a document to start the analysis.',
      });
      return;
    }
    setIsAnalyzing(true);
    // Simulate analysis and redirect
    setTimeout(() => {
      const fakeAnalysisId = '1';
      router.push(`/analysis/${fakeAnalysisId}/processing`);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Upload & Analyze</h1>
        <p className="mt-1 text-muted-foreground">
          Start by uploading your document and selecting analysis options.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card text-center hover:border-primary"
            >
              <FileUp className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-semibold">
                Drag and drop your document here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">or</p>
              <Button
                variant="outline"
                className="mt-2"
                asChild
              >
                <label>
                  Browse Files
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                Accepted: PDF, JPG, JPEG, PNG | Max size: 50MB
              </p>
            </div>
          ) : (
            <div className="relative flex items-center gap-4 rounded-lg border p-4">
              <FileCheck2 className="h-10 w-10 text-green-500" />
              <div className="flex-grow">
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="absolute right-2 top-2 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Analysis Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox id="metadata" defaultChecked />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="metadata" className="font-semibold">
                Metadata Analysis (Recommended)
              </Label>
              <p className="text-sm text-muted-foreground">
                Extract creation date, author, device, and other file metadata.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox id="visual" defaultChecked />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="visual" className="font-semibold">
                Visual Tampering Detection (Recommended)
              </Label>
              <p className="text-sm text-muted-foreground">
                Check for manipulated signatures, font inconsistencies, and
                image edits.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox id="rag" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="rag" className="font-semibold">
                RAG Context Search
              </Label>
              <p className="text-sm text-muted-foreground">
                Compare with known authentic documents in the knowledge base.
                (Uses more credits)
              </p>
            </div>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="link" className="p-0">
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                Advanced Settings
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Advanced settings are not available in this demo.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          size="lg"
          onClick={handleStartAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Start Analysis
        </Button>
      </div>
      <Toaster />
    </div>
  );
}
