'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Target,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    weekApplications: 0,
    successRate: 0,
    activePortals: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if profile exists
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        router.push('/profile/setup');
        return;
      }

      // Load dashboard data
      await loadDashboardData(user.id);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadDashboardData = async (userId: string) => {
    try {
      // Get total applications
      const { count: totalApps } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get this week's applications
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: weekApps } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('applied_at', weekAgo.toISOString());

      // Get success rate
      const { count: successfulApps } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'applied');

      const successRate = totalApps ? Math.round((successfulApps || 0) / totalApps * 100) : 0;

      // Get active portals
      const { count: activePortals } = await supabase
        .from('portal_credentials')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setStats({
        totalApplications: totalApps || 0,
        weekApplications: weekApps || 0,
        successRate,
        activePortals: activePortals || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's your job search overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
              <p className="text-xs text-muted-foreground">All time applications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekApplications}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">Application success</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Portals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activePortals}</div>
              <p className="text-xs text-muted-foreground">Connected platforms</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => router.push('/profile/edit')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium">Update Job Preferences</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </button>

              <button
                onClick={() => router.push('/settings')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium">Automation Settings</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </button>

              <button
                onClick={() => router.push('/applications')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium">View All Applications</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">Profile setup completed</p>
                    <p className="text-xs text-gray-500">Ready to start applying</p>
                  </div>
                  <Badge variant="success">New</Badge>
                </div>

                {stats.totalApplications === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No applications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Complete your profile to start auto-applying
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {stats.totalApplications === 0 && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-indigo-900">🚀 Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Account created</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Profile setup completed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm">Configure automation settings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm">Connect job portals</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/settings')}
                className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Complete Setup
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
