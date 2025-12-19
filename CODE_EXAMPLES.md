# Code Examples for Neon Migration

This guide shows you how to update your code to use Neon + Drizzle ORM instead of Supabase.

## Authentication Examples

### Before (Supabase):
```typescript
import { supabase } from '@/lib/supabase/client';

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Get user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

### After (NextAuth):
```typescript
import { signIn, signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

// Sign in
await signIn('credentials', {
  email,
  password,
  callbackUrl: '/dashboard',
});

// Get user (in component)
const { data: session } = useSession();
const user = session?.user;

// Get user (in API route)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

const session = await getServerSession(authOptions);
const user = session?.user;

// Sign out
await signOut({ callbackUrl: '/auth/login' });
```

## Database Query Examples

### Before (Supabase):
```typescript
import { supabase } from '@/lib/supabase/client';

// Select
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Insert
const { data, error } = await supabase
  .from('profiles')
  .insert({
    user_id: userId,
    full_name: 'John Doe',
  })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from('profiles')
  .update({ full_name: 'Jane Doe' })
  .eq('user_id', userId)
  .select()
  .single();

// Delete
const { error } = await supabase
  .from('profiles')
  .delete()
  .eq('id', profileId);
```

### After (Drizzle ORM):
```typescript
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Select
const [profile] = await db
  .select()
  .from(profiles)
  .where(eq(profiles.userId, userId))
  .limit(1);

// Insert
const [newProfile] = await db
  .insert(profiles)
  .values({
    userId: userId,
    fullName: 'John Doe',
  })
  .returning();

// Update
const [updatedProfile] = await db
  .update(profiles)
  .set({ fullName: 'Jane Doe' })
  .where(eq(profiles.userId, userId))
  .returning();

// Delete
await db
  .delete(profiles)
  .where(eq(profiles.id, profileId));
```

## Advanced Query Examples

### Joins (Before - Supabase):
```typescript
const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    jobs:job_id (
      title,
      company
    ),
    profiles:user_id (
      full_name
    )
  `)
  .eq('user_id', userId);
```

### Joins (After - Drizzle):
```typescript
import { db } from '@/lib/db/client';
import { applications, jobs, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const result = await db
  .select({
    application: applications,
    job: {
      title: jobs.title,
      company: jobs.company,
    },
    profile: {
      fullName: profiles.fullName,
    },
  })
  .from(applications)
  .leftJoin(jobs, eq(applications.jobId, jobs.id))
  .leftJoin(profiles, eq(applications.userId, profiles.id))
  .where(eq(applications.userId, userId));
```

### Aggregations (Before - Supabase):
```typescript
const { count } = await supabase
  .from('applications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('status', 'applied');
```

### Aggregations (After - Drizzle):
```typescript
import { db } from '@/lib/db/client';
import { applications } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';

const [result] = await db
  .select({ count: count() })
  .from(applications)
  .where(
    and(
      eq(applications.userId, userId),
      eq(applications.status, 'applied')
    )
  );

const totalCount = result.count;
```

## Real-time Subscriptions

### Before (Supabase):
```typescript
const subscription = supabase
  .channel('applications')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'applications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

### After (Polling or WebSocket):
```typescript
// Option 1: Polling with React Query
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['applications', userId],
  queryFn: async () => {
    const res = await fetch(`/api/applications?userId=${userId}`);
    return res.json();
  },
  refetchInterval: 5000, // Poll every 5 seconds
});

// Option 2: Server-Sent Events (SSE)
// In API route:
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send updates periodically
      setInterval(async () => {
        const data = await getApplications(userId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }, 5000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## File Upload (Storage)

### Before (Supabase Storage):
```typescript
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(`${userId}/resume.pdf`, file);

const { data: { publicUrl } } = supabase.storage
  .from('resumes')
  .getPublicUrl(`${userId}/resume.pdf`);
```

### After (Third-party or Local Storage):
```typescript
// Option 1: Use Vercel Blob Storage
import { put } from '@vercel/blob';

const blob = await put(`resumes/${userId}/resume.pdf`, file, {
  access: 'public',
});

const publicUrl = blob.url;

// Option 2: Use Cloudinary, AWS S3, etc.
// Or store files locally for development

// Option 3: Store as base64 in database (small files only)
const base64 = await fileToBase64(file);
await db.insert(profiles).values({
  userId,
  resumeData: base64,
});
```

## Middleware

### Before (Supabase):
```typescript
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(url, key, { cookies: ... });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect('/auth/login');
  }
}
```

### After (NextAuth):
```typescript
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    return NextResponse.redirect('/auth/login');
  }
}
```

## Environment Variables

### Before:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### After:
```env
DATABASE_URL=postgresql://user:pass@xxx.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_secret_min_32_chars
```

## Import Updates

Update all imports across your codebase:

```typescript
// Before
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/client';

// After
import { db } from '@/lib/db/client';
import { signIn, signOut, useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
```

## Session Management in Components

### Before:
```typescript
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return <div>Welcome {user?.email}</div>;
}
```

### After:
```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;

  return <div>Welcome {session.user?.email}</div>;
}
```

## Provider Setup

Add NextAuth provider to your app layout:

```typescript
// src/app/layout.tsx
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

## Testing Database Connection

```typescript
// Test file: test-neon.ts
import { db } from './src/lib/db/client';
import { users } from './src/lib/db/schema';

async function test() {
  try {
    const result = await db.select().from(users).limit(1);
    console.log('✅ Database connection successful!', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

test();
```

Run with: `npx tsx test-neon.ts`

## Common Drizzle ORM Operators

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, and, or, inArray } from 'drizzle-orm';

// Equal
.where(eq(profiles.userId, userId))

// Not equal
.where(ne(applications.status, 'rejected'))

// Greater than
.where(gt(jobMatches.matchScore, 70))

// Greater than or equal
.where(gte(applications.appliedAt, new Date('2024-01-01')))

// Less than
.where(lt(applications.retryCount, 3))

// Like (case-sensitive)
.where(like(jobs.title, '%Engineer%'))

// iLike (case-insensitive)
.where(ilike(jobs.company, '%google%'))

// AND
.where(and(
  eq(applications.userId, userId),
  eq(applications.status, 'applied')
))

// OR
.where(or(
  eq(applications.status, 'applied'),
  eq(applications.status, 'pending')
))

// IN
.where(inArray(jobs.source, ['linkedin', 'indeed']))
```

This should help you update your existing code to work with Neon and Drizzle ORM!
