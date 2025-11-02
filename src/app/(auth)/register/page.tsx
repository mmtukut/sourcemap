import { RegisterForm } from '@/components/auth/register-form';
import { Logo } from '@/components/logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <Card className="mx-auto w-full max-w-md shadow-xl">
       <CardHeader className="space-y-1 text-center">
        <Logo className="justify-center mb-4" />
        <CardTitle className="text-2xl">Get Started</CardTitle>
        <CardDescription>
          Create your account to start verifying documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
