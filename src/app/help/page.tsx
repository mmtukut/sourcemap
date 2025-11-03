
'use client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const faqs = [
    {
        question: "What types of documents can I upload?",
        answer: "SourceMap supports PDF, JPG, and PNG file formats. The maximum file size is 50MB."
    },
    {
        question: "How does the confidence score work?",
        answer: "The confidence score is an AI-generated metric from 0-100 that represents the likelihood of a document's authenticity. It is based on a comprehensive analysis of metadata, visual elements, and comparison against our knowledge base. A score of 80+ is 'Clear', 60-79 is 'Needs Review', and below 60 is 'Flagged'."
    },
    {
        question: "Is my data secure?",
        answer: "Yes, we take data security very seriously. All uploaded documents are encrypted both in transit and at rest. We do not share your data with any third parties."
    },
    {
        question: "What is 'metadata analysis'?",
        answer: "Metadata analysis involves examining the hidden data within a file, such as creation date, modification history, author, and the software used to create it. Inconsistencies in metadata can be a strong indicator of tampering."
    },
    {
        question: "Can I export the analysis report?",
        answer: "Yes, you can export a comprehensive PDF report of the analysis for your records or to share with your team. You can also export the raw metadata as a JSON file."
    }
]


export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground mt-2">Find answers to common questions below.</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-left font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
       <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
           <CardDescription>If you can't find an answer, feel free to reach out to our support team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>
            You can email us at <a href="mailto:support@sourcemap.com" className="text-primary underline">support@sourcemap.com</a>.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
