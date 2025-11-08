
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    quote: "SourceMap helped us cut verification time from weeks to minutes. We can pursue stories we would have abandoned before.",
    name: "Aisha Bello",
    title: "Investigative Desk, Premium Times",
    avatar: "https/i.pravatar.cc/150?u=aisha-bello"
  },
  {
    quote: "The explainability helps me defend my story to editors and courts.",
    name: "David Okon",
    title: "Freelance Journalist",
    avatar: "https/i.pravatar.cc/150?u=david-okon"
  },
  {
    quote: "In an era of rampant misinformation, SourceMap is essential infrastructure for Nigerian journalism. It's a shield against fake news.",
    name: "Chiamaka Eze",
    title: "Editor, The Cable",
    avatar: "https/i.pravatar.cc/150?u=chiamaka-eze"
  }
]

export function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl">
            Trusted by Leading Journalists
          </h2>
          <p className="mx-auto max-w-3xl text-muted-foreground md:text-xl/relaxed">
            Hear what reporters and editors on the front lines have to say about SourceMap.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="flex flex-col justify-between glass-card">
              <CardContent className="pt-6">
                <blockquote className="text-lg font-semibold leading-snug">
                  “{testimonial.quote}”
                </blockquote>
              </CardContent>
              <footer className="mt-4 p-6 pt-0 flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold font-headline">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                </div>
              </footer>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
