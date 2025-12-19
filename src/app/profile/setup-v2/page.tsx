'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function ProfileSetupV2() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  // Redirect to main profile setup page
  router.push('/profile/setup');
  return null;
}
