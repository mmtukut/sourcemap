
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
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
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="john.doe@example.com" />
              </div>
              <Separator />
               <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
            </CardContent>
            <CardContent>
                <Button>Save Changes</Button>
            </CardContent>
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
             <CardContent>
                <Button>Save Preferences</Button>
            </CardContent>
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
