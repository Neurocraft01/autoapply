'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { 
  Briefcase, 
  Building2,
  MapPin,
  ExternalLink,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';

interface Job {
  id: string;
  jobTitle: string;
  companyName: string;
  location: string;
  jobUrl: string;
  salary: string;
  jobType: string;
  description: string;
  postedDate: string;
  portal: {
    name: string;
  };
}

export default function JobsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<'all' | 'full-time' | 'part-time' | 'contract'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadJobs();
  }, [session, status, router]);

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data || []);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchJobs = async () => {
    try {
      const response = await fetch('/api/jobs/match', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Found ${data.matchesCount || 0} matching jobs!`);
        router.push('/matches');
      } else {
        toast.error('Failed to match jobs');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to match jobs');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    return job.jobType?.toLowerCase().includes(filter);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
            <p className="mt-2 text-gray-600">
              Browse and match jobs from all portals
            </p>
          </div>
          <Button
            onClick={handleMatchJobs}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Find My Matches
          </Button>
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
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('full-time')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'full-time'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Full-time ({jobs.filter((j) => j.jobType?.toLowerCase().includes('full-time')).length})
          </button>
          <button
            onClick={() => setFilter('part-time')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'part-time'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Part-time ({jobs.filter((j) => j.jobType?.toLowerCase().includes('part-time')).length})
          </button>
          <button
            onClick={() => setFilter('contract')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'contract'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Contract ({jobs.filter((j) => j.jobType?.toLowerCase().includes('contract')).length})
          </button>
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-600 mb-4">
                  Click "Find New Jobs Now" on the dashboard to start scraping
                </p>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {job.jobTitle}
                        </h3>
                        {job.jobType && (
                          <Badge variant="outline">{job.jobType}</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <span>{job.companyName}</span>
                        </div>
                        
                        {job.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        
                        {job.salary && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{job.salary}</span>
                          </div>
                        )}
                        
                        {job.postedDate && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Posted {new Date(job.postedDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                          {job.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <Badge variant="secondary">{job.portal?.name || 'Unknown'}</Badge>
                      <a
                        href={job.jobUrl}
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
