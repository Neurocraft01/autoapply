'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import {
  Settings as SettingsIcon,
  Bell,
  Zap,
  Globe,
  Shield,
  Trash2,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Automation Settings
  const [automationSettings, setAutomationSettings] = useState({
    auto_apply_enabled: false,
    max_applications_per_day: 10,
    application_interval_minutes: 30,
    business_hours_only: true,
    min_match_score: 70,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email_on_application: true,
    email_on_match: true,
    email_on_error: true,
    daily_summary: true,
  });

  // Portal Credentials
  const [portals, setPortals] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Load automation settings
        const { data: autoData } = await supabase
          .from('automation_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (autoData) {
          setAutomationSettings(autoData);
        }

        // Load portal credentials
        const { data: portalData } = await supabase
          .from('portal_credentials')
          .select(`
            *,
            portal:job_portals (
              id,
              name,
              url,
              logo_url
            )
          `)
          .eq('user_id', user.id);

        if (portalData) {
          setPortals(portalData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const saveAutomationSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('automation_settings')
        .upsert({
          user_id: user.id,
          ...automationSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const deletePortal = async (portalId: string) => {
    if (!confirm('Are you sure you want to remove this portal? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('portal_credentials')
        .delete()
        .eq('id', portalId);

      if (error) throw error;

      setPortals(portals.filter((p) => p.id !== portalId));
      toast.success('Portal removed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your automation preferences and portal connections
          </p>
        </div>

        {/* Automation Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-indigo-600" />
              Automation Settings
            </CardTitle>
            <CardDescription>Configure how the system applies to jobs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Enable Auto-Apply</label>
                <p className="text-sm text-gray-600">
                  Automatically apply to matching jobs
                </p>
              </div>
              <button
                onClick={() =>
                  setAutomationSettings({
                    ...automationSettings,
                    auto_apply_enabled: !automationSettings.auto_apply_enabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  automationSettings.auto_apply_enabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    automationSettings.auto_apply_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Applications Per Day: {automationSettings.max_applications_per_day}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={automationSettings.max_applications_per_day}
                onChange={(e) =>
                  setAutomationSettings({
                    ...automationSettings,
                    max_applications_per_day: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Interval (minutes): {automationSettings.application_interval_minutes}
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={automationSettings.application_interval_minutes}
                onChange={(e) =>
                  setAutomationSettings({
                    ...automationSettings,
                    application_interval_minutes: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Match Score: {automationSettings.min_match_score}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={automationSettings.min_match_score}
                onChange={(e) =>
                  setAutomationSettings({
                    ...automationSettings,
                    min_match_score: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-900">Business Hours Only</label>
                <p className="text-sm text-gray-600">
                  Only apply during 9 AM - 6 PM on weekdays
                </p>
              </div>
              <button
                onClick={() =>
                  setAutomationSettings({
                    ...automationSettings,
                    business_hours_only: !automationSettings.business_hours_only,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  automationSettings.business_hours_only ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    automationSettings.business_hours_only ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <Button onClick={saveAutomationSettings} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-indigo-600" />
              Notifications
            </CardTitle>
            <CardDescription>Choose when to receive email notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email_on_application', label: 'New Application', desc: 'Get notified when you apply to a job' },
              { key: 'email_on_match', label: 'New Match', desc: 'Get notified about new job matches' },
              { key: 'email_on_error', label: 'Errors', desc: 'Get notified about automation errors' },
              { key: 'daily_summary', label: 'Daily Summary', desc: 'Receive a daily summary of activities' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">{item.label}</label>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      [item.key]: !(notifications as any)[item.key],
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    (notifications as any)[item.key] ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (notifications as any)[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Job Portals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Globe className="mr-2 h-5 w-5 text-indigo-600" />
                Connected Job Portals
              </div>
              <Button size="sm" onClick={() => router.push('/portals/add')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Portal
              </Button>
            </CardTitle>
            <CardDescription>Manage your job portal credentials</CardDescription>
          </CardHeader>
          <CardContent>
            {portals.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No portals connected yet</p>
                <Button onClick={() => router.push('/portals/add')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Portal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {portals.map((portal) => (
                  <div
                    key={portal.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Globe className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{portal.portal.name}</h4>
                        <p className="text-sm text-gray-600">{portal.username}</p>
                        <Badge variant={portal.is_active ? 'success' : 'outline'} className="mt-1">
                          {portal.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePortal(portal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
