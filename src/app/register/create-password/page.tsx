
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreatePasswordForm } from '@/components/auth/create-password-form';
import { Logo } from '@/components/logo';

export default function CreatePasswordPage() {
    return (
     <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="text-2xl pt-4">Set Your Password</CardTitle>
          <CardDescription>
            Just one more step to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
