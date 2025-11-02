import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LibraryPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Document Library</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This section will contain all your past analyses, with advanced search and filtering capabilities.</p>
        </CardContent>
      </Card>
    </div>
  );
}
