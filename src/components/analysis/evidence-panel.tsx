import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronsRight,
} from 'lucide-react';
import { AutomatedDocumentAnalysisOutput } from '@/ai/flows/automated-document-analysis';

type EvidencePanelProps = {
  keyFindings: AutomatedDocumentAnalysisOutput['keyFindings'];
};

const findingConfig = {
  critical: {
    icon: XCircle,
    color: 'text-red-500',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
  moderate: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
  },
  consistent: {
    icon: CheckCircle2,
    color: 'text-green-500',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
};

export function EvidencePanel({ keyFindings }: EvidencePanelProps) {
  const criticalCount = keyFindings.filter(f => f.type === 'critical').length;
  const moderateCount = keyFindings.filter(f => f.type === 'moderate').length;

  return (
    <Card className="shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle>Evidence Summary</CardTitle>
        <p className="text-muted-foreground">
          {criticalCount} critical and {moderateCount} moderate issues found.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {keyFindings.map((finding, index) => {
            const config = findingConfig[finding.type];
            const Icon = config.icon;
            return (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger
                  className={`rounded-lg px-4 text-left font-semibold hover:no-underline ${config.bgColor} border-l-4 ${config.borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
                    <span>{finding.description}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 text-sm text-muted-foreground">
                    {finding.evidence ? (
                        <p>{finding.evidence}</p>
                    ) : (
                        <p>This aspect of the document is consistent with expectations.</p>
                    )}
                  <button className="mt-2 flex items-center text-sm font-semibold text-primary hover:underline">
                    Explain Why <ChevronsRight className="ml-1 h-4 w-4" />
                  </button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
