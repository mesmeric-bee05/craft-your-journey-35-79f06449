import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Phone, MapPin, Globe, Clock, Upload, Trash2, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'At least 2 characters').max(100, 'Max 100 characters'),
  phone: z.string().trim().max(20, 'Max 20 characters').optional().or(z.literal('')),
  bio: z.string().max(500, 'Max 500 characters').optional().or(z.literal('')),
  location: z.string().trim().max(100, 'Max 100 characters').optional().or(z.literal('')),
  language: z.string(),
  timezone: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const timezones = [
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT)' },
  { value: 'Africa/Cairo', label: 'Egypt Time (EET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
];

export function ProfileSettings() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile();
  const { uploading, uploadAvatar, deleteAvatar } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      bio: '',
      location: '',
      language: 'en',
      timezone: 'Africa/Nairobi',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        language: profile.language || 'en',
        timezone: profile.timezone || 'Africa/Nairobi',
      });
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSubmit = async (values: ProfileFormValues) => {
    await updateProfile({ ...values, avatar_url: avatarUrl || null });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file);
    if (url) {
      if (avatarUrl) await deleteAvatar(avatarUrl);
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = async () => {
    if (avatarUrl) {
      await deleteAvatar(avatarUrl);
      setAvatarUrl('');
      await updateProfile({ avatar_url: null });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>Update your personal information and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {form.watch('full_name')?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarChange} className="hidden" id="avatar-upload" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {uploading ? 'Uploading...' : 'Change Avatar'}
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={uploading} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP. Max 2MB.</p>
              </div>
            </div>

            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" />Full Name</FormLabel>
                <FormControl><Input {...field} placeholder="Your full name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</FormLabel>
              <Input value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" />Phone Number</FormLabel>
                <FormControl><Input {...field} placeholder="+254 700 000 000" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="bio" render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl><Textarea {...field} placeholder="Tell us about yourself" rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location</FormLabel>
                <FormControl><Input {...field} placeholder="City, Country" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="language" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Globe className="h-4 w-4" />Language</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {languages.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="timezone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4" />Timezone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
