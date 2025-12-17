'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function NotificationSettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    email_notifications: true,
    application_confirmations: true,
    job_matches: true,
    daily_summary: true,
    error_alerts: true,
    match_threshold: 80,
    daily_summary_time: '09:00:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          application_confirmations: data.application_confirmations,
          job_matches: data.job_matches,
          daily_summary: data.daily_summary,
          error_alerts: data.error_alerts,
          match_threshold: data.match_threshold,
          daily_summary_time: data.daily_summary_time,
        });
      }
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('notification_settings').upsert({
        user_id: user.id,
        ...settings,
      });

      if (error) throw error;

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

  if (loading) {
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
            Manage how and when you receive notifications
          </p>
        </div>

        <div className="space-y-6">
          {/* Master Toggle */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Email Notifications</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Master switch for all email notifications
                </p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, email_notifications: checked }))
                }
              />
            </div>
          </Card>

          {settings.email_notifications && (
            <>
              {/* Application Confirmations */}
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Application Confirmations</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Get notified when an application is submitted
                    </p>
                  </div>
                  <Switch
                    checked={settings.application_confirmations}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, application_confirmations: checked }))
                    }
                  />
                </div>
              </Card>

              {/* Job Match Notifications */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Job Match Notifications</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Get notified when high-matching jobs are found
                    </p>
                  </div>
                  <Switch
                    checked={settings.job_matches}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, job_matches: checked }))
                    }
                  />
                </div>

                {settings.job_matches && (
                  <div className="mt-4 border-t pt-4">
                    <Label htmlFor="match_threshold">
                      Match Threshold ({settings.match_threshold}%)
                    </Label>
                    <input
                      id="match_threshold"
                      type="range"
                      min="0"
                      max="100"
                      value={settings.match_threshold}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          match_threshold: parseInt(e.target.value),
                        }))
                      }
                      className="w-full mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Only notify for jobs with {settings.match_threshold}% match or higher
                    </p>
                  </div>
                )}
              </Card>

              {/* Daily Summary */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">Daily Summary</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Receive a daily summary of your job search activity
                    </p>
                  </div>
                  <Switch
                    checked={settings.daily_summary}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, daily_summary: checked }))
                    }
                  />
                </div>

                {settings.daily_summary && (
                  <div className="mt-4 border-t pt-4">
                    <Label htmlFor="summary_time">Delivery Time</Label>
                    <Input
                      id="summary_time"
                      type="time"
                      value={settings.daily_summary_time}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          daily_summary_time: e.target.value,
                        }))
                      }
                      className="mt-2 max-w-xs"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      You'll receive your daily summary at this time
                    </p>
                  </div>
                )}
              </Card>

              {/* Error Alerts */}
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Error Alerts</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Get notified when automation errors occur
                    </p>
                  </div>
                  <Switch
                    checked={settings.error_alerts}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, error_alerts: checked }))
                    }
                  />
                </div>
              </Card>
            </>
          )}

          {/* Preview Section */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2">Notification Preview</h3>
            <p className="text-sm text-gray-600">
              {settings.email_notifications
                ? `You will receive ${
                    [
                      settings.application_confirmations && 'application confirmations',
                      settings.job_matches && 'job matches',
                      settings.daily_summary && 'daily summaries',
                      settings.error_alerts && 'error alerts',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'no notifications'
                  }.`
                : 'All email notifications are disabled.'}
            </p>
          </Card>

          <div className="flex space-x-4">
            <Button onClick={saveSettings} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
