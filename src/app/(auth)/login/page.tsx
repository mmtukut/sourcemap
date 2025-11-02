import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Card className="mx-auto w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <Logo className="justify-center mb-4" />
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your email and password to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
