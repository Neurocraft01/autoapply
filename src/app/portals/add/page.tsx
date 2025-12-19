'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from 'react-toastify';
import { Globe, ArrowLeft, Shield, Info } from 'lucide-react';

export default function AddPortalPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [portals, setPortals] = useState<any[]>([]);
  const [selectedPortal, setSelectedPortal] = useState('');
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    loadPortals();
  }, [session, status, router]);

  const loadPortals = async () => {
    try {
      const response = await fetch('/api/portals');
      if (response.ok) {
        const data = await response.json();
        setPortals(data || []);
      }
    } catch (error) {
      console.error('Error loading portals:', error);
      toast.error('Failed to load portals');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPortal || !credentials.username || !credentials.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Call API to save credentials (with encryption)
      const response = await fetch('/api/portals/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portal_id: selectedPortal,
          username: credentials.username,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save credentials');
      }

      toast.success('Portal credentials saved successfully!');
      router.push('/settings');
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Globe className="mr-3 h-8 w-8 text-indigo-600" />
            Add Job Portal
          </h1>
          <p className="mt-2 text-gray-600">
            Connect your account to automate job applications
          </p>
        </div>

        {/* Security Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Secure Credential Storage</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your credentials are encrypted using AES-256 encryption and stored securely.
                We never share your credentials with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Portal Credentials</CardTitle>
            <CardDescription>
              Enter your login credentials for the job portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label required>Select Portal</Label>
                <Select
                  value={selectedPortal}
                  onChange={(e) => setSelectedPortal(e.target.value)}
                  required
                >
                  <option value="">Choose a portal...</option>
                  {portals.map((portal) => (
                    <option key={portal.id} value={portal.id}>
                      {portal.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                label="Username or Email"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="your.email@example.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="••••••••"
                required
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Some portals may require additional verification
                    (like CAPTCHA) during the first login. You may need to complete this
                    manually before automation works.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : 'Save Credentials'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Supported Portals */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Supported Job Portals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {portals.map((portal) => (
              <div
                key={portal.id}
                className="border border-gray-200 rounded-lg p-3 flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{portal.name}</h3>
                  <p className="text-xs text-gray-500">{portal.url}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
