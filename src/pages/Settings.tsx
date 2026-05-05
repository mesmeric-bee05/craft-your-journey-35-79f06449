import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { BusinessSettings } from '@/components/settings/BusinessSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ChannelSettings } from '@/components/settings/ChannelSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { SLASettings } from '@/components/settings/SLASettings';
import { CSATSettings } from '@/components/settings/CSATSettings';
import { CannedResponsesSettings } from '@/components/settings/CannedResponsesSettings';
import { TeamSettings } from '@/components/settings/TeamSettings';
import { User, Bell, Link2, Shield, Clock, Star, MessageSquare, Users, Building2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="business" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Business</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="channels" className="gap-2">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Channels</span>
              </TabsTrigger>
              <TabsTrigger value="sla" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">SLA</span>
              </TabsTrigger>
              <TabsTrigger value="csat" className="gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">CSAT</span>
              </TabsTrigger>
              <TabsTrigger value="canned" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Canned</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="business">
            <BusinessSettings />
          </TabsContent>

          <TabsContent value="team">
            <TeamSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="channels">
            <ChannelSettings />
          </TabsContent>

          <TabsContent value="sla">
            <SLASettings />
          </TabsContent>

          <TabsContent value="csat">
            <CSATSettings />
          </TabsContent>

          <TabsContent value="canned">
            <CannedResponsesSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
