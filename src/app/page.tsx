
'use client';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
    const { user, isUserLoading } = useUser();

    useEffect(() => {
        if (!isUserLoading) {
            if (user) {
                redirect('/dashboard');
            } else {
                redirect('/landing');
            }
        }
    }, [user, isUserLoading]);

    // You can return a loader here while waiting for the user state
    return null;
}
