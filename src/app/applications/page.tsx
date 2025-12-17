'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { 
  Briefcase, 
  Calendar,
  Building2,
  MapPin,
  ExternalLink,
  Filter,
  Download
} from 'lucide-react';

interface Application {
  id: string;
  applied_at: string;
  status: string;
  job: {
    job_title: string;
    company_name: string;
    location: string;
    job_url: string;
    portal: {
      name: string;
    };
  };
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'applied' | 'pending' | 'failed'>('all');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      await loadApplications(user.id);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const loadApplications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          id,
          applied_at,
          status,
          job:scraped_jobs (
            job_title,
            company_name,
            location,
            job_url,
            portal:job_portals (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setApplications((data as any) || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="success">Applied</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <p className="mt-2 text-gray-600">
              Track all your job applications in one place
            </p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setFilter('applied')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'applied'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Applied ({applications.filter((a) => a.status === 'applied').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pending ({applications.filter((a) => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'failed'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Failed ({applications.filter((a) => a.status === 'failed').length})
          </button>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No applications yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Complete your profile setup to start automatically applying to jobs
                </p>
                <button
                  onClick={() => router.push('/settings')}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Configure Automation
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {application.job.job_title}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <span>{application.job.company_name}</span>
                        </div>
                        
                        {application.job.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{application.job.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {formatRelativeTime(application.applied_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant="outline">{application.job.portal.name}</Badge>
                      <a
                        href={application.job.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <span>View Job</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
