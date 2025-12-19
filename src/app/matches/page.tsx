'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { 
  TrendingUp,
  Building2,
  MapPin,
  ExternalLink,
  CheckCircle,
  DollarSign,
  Target
} from 'lucide-react';

interface Match {
  id: string;
  matchScore: number;
  job: {
    id: string;
    jobTitle: string;
    companyName: string;
    location: string;
    jobUrl: string;
    salary: string;
    description: string;
    portal: {
      name: string;
    };
  };
}

export default function MatchesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadMatches();
  }, [session, status, router]);

  const loadMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data || []);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    setApplying(jobId);
    try {
      const response = await fetch('/api/automation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        toast.success('Application submitted successfully!');
        // Remove from matches
        setMatches(matches.filter(m => m.job.id !== jobId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to apply');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply');
    } finally {
      setApplying(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
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
            <Target className="mr-3 h-8 w-8 text-indigo-600" />
            Job Matches
          </h1>
          <p className="mt-2 text-gray-600">
            Jobs that match your profile and preferences
          </p>
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No matches yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Click "Find My Matches" on the jobs page to analyze available jobs
                </p>
                <Button
                  onClick={() => router.push('/jobs')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  View All Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow border-l-4 border-indigo-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {match.job.jobTitle}
                        </h3>
                        <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(match.matchScore)}`}>
                          {match.matchScore}% Match
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{match.job.companyName}</span>
                        </div>
                        
                        {match.job.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{match.job.location}</span>
                          </div>
                        )}
                        
                        {match.job.salary && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium text-green-600">{match.job.salary}</span>
                          </div>
                        )}
                      </div>

                      {match.job.description && (
                        <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                          {match.job.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleApply(match.job.id)}
                          disabled={applying === match.job.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {applying === match.job.id ? 'Applying...' : 'Apply Now'}
                        </Button>
                        
                        <a
                          href={match.job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          <span>View Original</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Badge variant="secondary">{match.job.portal?.name || 'Unknown'}</Badge>
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
