'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function NotificationSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    matchNotifications: true,
    applicationNotifications: true,
    weeklyDigest: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      loadSettings();
    }
  }, [status, router]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/notifications');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings({
        emailNotifications: data.emailNotifications ?? true,
        matchNotifications: data.matchNotifications ?? true,
        applicationNotifications: data.applicationNotifications ?? true,
        weeklyDigest: data.weeklyDigest ?? false,
      });
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Notification Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure how and when you receive notifications
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Notifications */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Email Notifications</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Receive email notifications for job search updates
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
          </Card>

          {/* Match Notifications */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Match Notifications</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified when new jobs match your profile
                </p>
              </div>
              <Switch
                checked={settings.matchNotifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, matchNotifications: checked }))
                }
              />
            </div>
          </Card>

          {/* Application Notifications */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Application Notifications</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Receive updates when applications are submitted
                </p>
              </div>
              <Switch
                checked={settings.applicationNotifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, applicationNotifications: checked }))
                }
              />
            </div>
          </Card>

          {/* Weekly Digest */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Weekly Digest</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get a weekly summary of your job search activity
                </p>
              </div>
              <Switch
                checked={settings.weeklyDigest}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, weeklyDigest: checked }))
                }
              />
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button onClick={() => router.back()} variant="outline">
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
