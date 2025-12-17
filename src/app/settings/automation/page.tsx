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

export default function AutomationSettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    auto_apply_enabled: false,
    auto_scrape_enabled: false,
    auto_match_enabled: true,
    min_match_score: 70,
    max_applications_per_day: 10,
    scrape_frequency_hours: 24,
    preferred_portals: ['LinkedIn', 'Indeed'] as string[],
    excluded_companies: [] as string[],
    auto_apply_hours_start: '09:00:00',
    auto_apply_hours_end: '17:00:00',
  });

  const [newExcludedCompany, setNewExcludedCompany] = useState('');

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
        .from('automation_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          auto_apply_enabled: data.auto_apply_enabled,
          auto_scrape_enabled: data.auto_scrape_enabled,
          auto_match_enabled: data.auto_match_enabled,
          min_match_score: data.min_match_score,
          max_applications_per_day: data.max_applications_per_day,
          scrape_frequency_hours: data.scrape_frequency_hours,
          preferred_portals: data.preferred_portals || ['LinkedIn', 'Indeed'],
          excluded_companies: data.excluded_companies || [],
          auto_apply_hours_start: data.auto_apply_hours_start,
          auto_apply_hours_end: data.auto_apply_hours_end,
        });
      }
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('automation_settings').upsert({
        user_id: user.id,
        ...settings,
      });

      if (error) throw error;

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

  const togglePortal = (portal: string) => {
    setSettings((prev) => ({
      ...prev,
      preferred_portals: prev.preferred_portals.includes(portal)
        ? prev.preferred_portals.filter((p) => p !== portal)
        : [...prev.preferred_portals, portal],
    }));
  };

  const addExcludedCompany = () => {
    if (newExcludedCompany.trim()) {
      setSettings((prev) => ({
        ...prev,
        excluded_companies: [...prev.excluded_companies, newExcludedCompany.trim()],
      }));
      setNewExcludedCompany('');
    }
  };

  const removeExcludedCompany = (company: string) => {
    setSettings((prev) => ({
      ...prev,
      excluded_companies: prev.excluded_companies.filter((c) => c !== company),
    }));
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
                    max="50"
                    value={settings.max_applications_per_day}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        max_applications_per_day: parseInt(e.target.value) || 10,
                      }))
                    }
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={settings.auto_apply_hours_start}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          auto_apply_hours_start: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={settings.auto_apply_hours_end}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          auto_apply_hours_end: e.target.value,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Applications will only be submitted during these hours (weekdays only)
                </p>
              </div>
            )}
          </Card>

          {/* Auto Scrape */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Auto-Scrape</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically search for new jobs on connected portals
                </p>
              </div>
              <Switch
                checked={settings.auto_scrape_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, auto_scrape_enabled: checked }))
                }
              />
            </div>

            {settings.auto_scrape_enabled && (
              <div className="space-y-4 mt-6 border-t pt-4">
                <div>
                  <Label htmlFor="scrape_frequency">Scrape Frequency (hours)</Label>
                  <Input
                    id="scrape_frequency"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.scrape_frequency_hours}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        scrape_frequency_hours: parseInt(e.target.value) || 24,
                      }))
                    }
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Check for new jobs every {settings.scrape_frequency_hours} hours
                  </p>
                </div>

                <div>
                  <Label>Preferred Job Portals</Label>
                  <div className="space-y-2 mt-2">
                    {['LinkedIn', 'Indeed', 'Glassdoor', 'ZipRecruiter'].map((portal) => (
                      <div key={portal} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={portal}
                          checked={settings.preferred_portals.includes(portal)}
                          onChange={() => togglePortal(portal)}
                          className="rounded"
                        />
                        <Label htmlFor={portal} className="font-normal">
                          {portal}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Auto Match */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Auto-Match</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically calculate match scores for new jobs
                </p>
              </div>
              <Switch
                checked={settings.auto_match_enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, auto_match_enabled: checked }))
                }
              />
            </div>
          </Card>

          {/* Excluded Companies */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Excluded Companies</h2>
            <p className="text-sm text-gray-600 mb-4">
              Never auto-apply to these companies
            </p>

            <div className="flex space-x-2 mb-4">
              <Input
                placeholder="Company name"
                value={newExcludedCompany}
                onChange={(e) => setNewExcludedCompany(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExcludedCompany()}
              />
              <Button onClick={addExcludedCompany}>Add</Button>
            </div>

            <div className="space-y-2">
              {settings.excluded_companies.map((company) => (
                <div
                  key={company}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span>{company}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExcludedCompany(company)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {settings.excluded_companies.length === 0 && (
                <p className="text-sm text-gray-500">No excluded companies</p>
              )}
            </div>
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
