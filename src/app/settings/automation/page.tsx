'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AutomationSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    auto_apply_enabled: false,
    max_daily_applications: 10,
    min_match_score: 70,
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
      const response = await fetch('/api/settings/automation');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings({
        auto_apply_enabled: data.autoApplyEnabled || data.auto_apply_enabled || false,
        max_daily_applications: data.maxDailyApplications || data.max_daily_applications || 10,
        min_match_score: data.minMatchScore || data.min_match_score || 70,
      });
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load automation settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/automation', {
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
        description: 'Automation settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save automation settings',
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
          <h1 className="text-3xl font-bold">Automation Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure how AutoApply.ai automates your job search
          </p>
        </div>

        <div className="space-y-6">
          {/* Auto Apply */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Auto-Apply</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically apply to jobs that match your criteria
                </p>
              </div>
              <Switch
                checked={settings.auto_apply_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, auto_apply_enabled: checked }))
                }
              />
            </div>

            {settings.auto_apply_enabled && (
              <div className="space-y-4 mt-6 border-t pt-4">
                <div>
                  <Label htmlFor="min_match_score">
                    Minimum Match Score ({settings.min_match_score}%)
                  </Label>
                  <input
                    id="min_match_score"
                    type="range"
                    min="0"
                    max="100"
                    value={settings.min_match_score}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        min_match_score: parseInt(e.target.value),
                      }))
                    }
                    className="w-full mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Only apply to jobs with {settings.min_match_score}% match or higher
                  </p>
                </div>

                <div>
                  <Label htmlFor="max_applications">Max Applications Per Day</Label>
                  <Input
                    id="max_applications"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_daily_applications}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        max_daily_applications: parseInt(e.target.value) || 10,
                      }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            )}
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
