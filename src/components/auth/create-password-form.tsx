
'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Loader2 } from 'lucide-right';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const formSchema = z
  .object({
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

export function CreatePasswordForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<{ fullName: string, email: string } | null>(null);

  useEffect(() => {
    const details = sessionStorage.getItem('registrationDetails');
    if (details) {
      setRegistrationDetails(JSON.parse(details));
    } else {
      // If details are not found, redirect back to the start of registration
      router.replace('/register');
    }
  }, [router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!registrationDetails) {
        toast({
            variant: 'destructive',
            title: 'Registration Failed',
            description: 'Could not retrieve your details. Please start over.',
        });
        router.push('/register');
        return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registrationDetails.email,
        values.password
      );
      
      // Update user's profile with full name
      await updateProfile(userCredential.user, {
        displayName: registrationDetails.fullName,
      });

      // Clear the stored details and redirect
      sessionStorage.removeItem('registrationDetails');
      toast({
        title: 'Account Created!',
        description: 'Welcome to SourceMap.',
      });
      // The main layout will handle redirecting to the dashboard
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.code === 'auth/email-already-in-use' 
            ? 'This email is already registered. Please sign in.' 
            : 'An unexpected error occurred. Please try again.',
      });
      setIsLoading(false);
    }
  }

  if (!registrationDetails) {
    return <div className='flex justify-center'><Loader2 className='animate-spin'/></div>;
  }

  return (
    <Form {...form}>
      <div className="mb-4 p-2 border rounded-md bg-secondary/50">
        <p className="text-sm font-medium">Account for:</p>
        <p className="text-sm text-muted-foreground">{registrationDetails.email}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </Form>
  );
}
