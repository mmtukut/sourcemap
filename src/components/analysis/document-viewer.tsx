import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function DocumentViewer() {
    const docImage = PlaceHolderImages.find(p => p.id === 'document-preview')
  return (
    <Card className="shadow-lg relative h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Document Preview</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow relative">
        <Image
          src={docImage?.imageUrl ?? "https://picsum.photos/seed/doc-preview/800/1100"}
          alt="Document preview"
          fill
          data-ai-hint="document scan"
          className="object-contain rounded-md"
        />
        {/* Visual Markers */}
        <div
          className="absolute border-2 border-red-500 bg-red-500/20 rounded-sm"
          style={{ top: '35%', left: '15%', width: '70%', height: '10%' }}
          title="File modified after signature date"
        ></div>
        <div
          className="absolute border-2 border-yellow-500 bg-yellow-500/20 rounded-sm"
          style={{ top: '60%', left: '10%', width: '80%', height: '15%' }}
          title="Font mismatch in paragraph 4"
        ></div>
      </CardContent>
       <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
                <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">100%</span>
            <Button variant="outline" size="icon">
                <ZoomIn className="h-4 w-4" />
            </Button>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page 1 / 3</span>
            <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
