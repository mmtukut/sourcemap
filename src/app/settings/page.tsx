
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const profileSchema = z.object({
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Current password is required.'}),
    newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
});

export default function SettingsPage() {
    const { user } = useUser();
    const auth = useAuth();
    const { toast } = useToast();

    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);


    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: user?.displayName ?? '',
            email: user?.email ?? '',
        },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
        },
    });


    async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
        if (!user) return;
        setIsProfileLoading(true);

        try {
            await updateProfile(user, { displayName: values.fullName });
            toast({
                title: 'Profile Updated',
                description: 'Your name has been successfully updated.',
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message,
            });
        } finally {
            setIsProfileLoading(false);
        }
    }

     async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
        if (!user || !user.email) return;

        setIsPasswordLoading(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            
            toast({
                title: 'Password Updated',
                description: 'Your password has been changed successfully.',
            });
            passwordForm.reset();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Password Update Failed',
                description: error.code === 'auth/wrong-password' ? 'The current password you entered is incorrect.' : error.message,
            });
        } finally {
            setIsPasswordLoading(false);
        }
    }


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
      
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...profileForm.register('fullName')} defaultValue={user?.displayName ?? ''} />
                    {profileForm.formState.errors.fullName && <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user?.email ?? ''} disabled />
                </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isProfileLoading}>
                        {isProfileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
            <Separator className='my-4'/>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password here. You will be logged out after a successful change.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" {...passwordForm.register('currentPassword')} />
                         {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" {...passwordForm.register('newPassword')} />
                        {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isPasswordLoading}>
                        {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Plan</CardTitle>
              <CardDescription>Manage your subscription and view payment history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className='p-4 border rounded-lg'>
                <p className='font-semibold'>Current Plan: <span className='text-primary'>Pro Monthly</span></p>
                <p className='text-sm text-muted-foreground'>Renews on November 30, 2024.</p>
                <div className='flex gap-2 mt-4'>
                    <Button>Upgrade Plan</Button>
                    <Button variant="outline">Cancel Subscription</Button>
                </div>
              </div>
               <div>
                <h3 className='font-semibold mb-2'>Payment History</h3>
                <p className='text-sm text-muted-foreground'>No payment history available.</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analysis-complete">Analysis Complete</Label>
                  <p className="text-sm text-muted-foreground">Notify me when a document analysis is finished.</p>
                </div>
                <Switch id="analysis-complete" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monthly-summary">Monthly Summary</Label>
                  <p className="text-sm text-muted-foreground">Send me a monthly report of my usage.</p>
                </div>
                <Switch id="monthly-summary" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="promotions">Promotions & News</Label>
                  <p className="text-sm text-muted-foreground">Receive updates on new features and offers.</p>
                </div>
                <Switch id="promotions" />
              </div>
            </CardContent>
             <CardFooter>
                <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

         <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <Label>Theme</Label>
                        <p className="text-sm text-muted-foreground">The app does not yet support dark mode.</p>
                    </div>
                     <Switch disabled />
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
