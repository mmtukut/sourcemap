import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-4 text-lg text-gray-500">
            Have a question or feedback? Wed love to hear from you.
          </p>
        </div>
        <form className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <Textarea id="message" rows={5} placeholder="Enter your message" />
          </div>
          <div>
            <Button asChild type="submit" variant="default" size="lg" fullWidth>
              <Link href="#">Send Message</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
