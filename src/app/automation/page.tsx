'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import {
  Settings,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Globe,
  Zap,
} from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  isActive: boolean;
  scrapingEnabled: boolean;
}

interface AutomationLog {
  id: string;
  action: string;
  status: string;
  details: string;
  executedAt: string;
}

export default function AutomationPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [scraping, setScraping] = useState<Record<string, boolean>>({});
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadData();
  }, [session, status, router]);

  const loadData = async () => {
    try {
      // Load portals
      const portalsRes = await fetch('/api/portals');
      if (portalsRes.ok) {
        const portalsData = await portalsRes.json();
        setPortals(portalsData);
      }

      // Load automation logs
      const logsRes = await fetch('/api/automation/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData || []);
      }

      // Load automation settings
      const settingsRes = await fetch('/api/settings/automation');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAutoApplyEnabled(settingsData?.autoApplyEnabled || false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapePortal = async (portalName: string) => {
    setScraping((prev) => ({ ...prev, [portalName]: true }));

    try {
      const endpoint = `/api/scrape/${portalName.toLowerCase()}`;
      const response = await fetch(endpoint, { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Scraped jobs from ${portalName}`);
        loadData(); // Refresh logs
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to scrape ${portalName}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Scraping failed');
    } finally {
      setScraping((prev) => ({ ...prev, [portalName]: false }));
    }
  };

  const toggleAutoApply = async () => {
    try {
      const response = await fetch('/api/settings/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApplyEnabled: !autoApplyEnabled }),
      });

      if (response.ok) {
        setAutoApplyEnabled(!autoApplyEnabled);
        toast.success(
          autoApplyEnabled ? 'Auto-apply disabled' : 'Auto-apply enabled'
        );
      }
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading automation...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Zap className="mr-3 h-8 w-8 text-indigo-600" />
            Automation Control Center
          </h1>
          <p className="mt-2 text-gray-600">
            Manage job scraping and auto-apply automation
          </p>
        </div>

        {/* Auto-Apply Toggle */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Auto-Apply
                </h3>
                <p className="text-sm text-gray-600">
                  Automatically apply to matched jobs based on your preferences
                </p>
              </div>
              <Button
                onClick={toggleAutoApply}
                className={
                  autoApplyEnabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 hover:bg-gray-500'
                }
              >
                {autoApplyEnabled ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Enabled
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Disabled
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Portals */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Job Portals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portals.map((portal) => (
                <div
                  key={portal.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{portal.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge
                        variant={portal.isActive ? 'default' : 'secondary'}
                      >
                        {portal.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {portal.scrapingEnabled && (
                        <Badge variant="secondary">Scraping Enabled</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleScrapePortal(portal.name)}
                    disabled={scraping[portal.name] || !portal.scrapingEnabled}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {scraping[portal.name] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Scraping...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Scrape Now
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Automation Logs */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Recent Activity
            </h3>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No automation activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.executedAt).toLocaleString()}
                      </p>
                    </div>
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
