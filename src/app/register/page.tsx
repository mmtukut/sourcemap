
import { redirect } from 'next/navigation';

// This page is no longer needed as sign-up is handled via the login page
// and the Google Sign-In flow. We redirect to login to simplify the user journey.
export default function RegisterPage() {
    redirect('/login');
}
