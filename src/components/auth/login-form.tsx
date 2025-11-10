
'use client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.1 0 127.9 111.8 16 244 16c73.1 0 134.3 29.3 179.7 73.4l-63.8 61.2C337 114.6 295.6 92.4 244 92.4c-83.8 0-152.2 68.3-152.2 152.2s68.4 152.2 152.2 152.2c97.9 0 133-72.3 137.3-108.9H244v-75.5h243.9c1.3 12.8 2.1 26.6 2.1 41.8z"></path>
    </svg>
);


export function LoginForm() {
  const auth = useAuth();

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
  };

  return (
    <div className="grid gap-4">
      <Button onClick={handleGoogleSignIn} className="w-full" variant="outline">
        <GoogleIcon />
        Sign in with Google
      </Button>
    </div>
  );
}
