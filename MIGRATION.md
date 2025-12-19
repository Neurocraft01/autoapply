# Migration Guide: Supabase to Neon

This document outlines the changes made to migrate from Supabase to Neon database.

## Key Changes

### 1. Database Provider
- **Before**: Supabase (managed PostgreSQL + Auth)
- **After**: Neon (serverless PostgreSQL) + NextAuth.js

### 2. Package Changes

#### Removed:
```json
"@supabase/ssr": "^0.8.0"
"@supabase/supabase-js": "^2.39.3"
```

#### Added:
```json
"@neondatabase/serverless": "^0.9.0"
"drizzle-orm": "^0.29.3"
"next-auth": "^4.24.5"
"drizzle-kit": "^0.20.10" (dev dependency)
```

### 3. Environment Variables

#### Removed:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

#### Added:
```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=...
```

### 4. Database Client

#### Before (src/lib/supabase/client.ts):
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(...);
```

#### After (src/lib/db/client.ts):
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
export const db = drizzle(neon(DATABASE_URL));
```

### 5. Authentication

#### Before (Supabase Auth):
```typescript
await supabase.auth.signInWithPassword({...});
await supabase.auth.getUser();
await supabase.auth.signOut();
```

#### After (NextAuth):
```typescript
import { signIn, signOut, useSession } from 'next-auth/react';
await signIn('credentials', {...});
const { data: session } = useSession();
await signOut();
```

### 6. Database Queries

#### Before (Supabase Client):
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId);
```

#### After (Drizzle ORM):
```typescript
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const data = await db
  .select()
  .from(profiles)
  .where(eq(profiles.userId, userId));
```

### 7. Schema Definition

The database schema is now defined using Drizzle ORM in TypeScript:
- Location: `src/lib/db/schema.ts`
- Type-safe
- Auto-completion support
- Migrations via drizzle-kit

### 8. Middleware Changes

The middleware now uses NextAuth's `getToken` instead of Supabase's session management.

## Files That Need Updating

If you're working on this codebase, you'll need to update:

### Authentication Files:
- `src/app/auth/login/page.tsx`
- `src/app/auth/signup/page.tsx`
- `src/app/auth/callback/*`
- `src/components/layout/DashboardLayout.tsx`

### Database Query Files:
All files that import from `@/lib/supabase/client` need to:
1. Import `db` from `@/lib/db/client`
2. Import table schemas from `@/lib/db/schema`
3. Rewrite queries using Drizzle ORM syntax

### API Routes:
All API routes need to be updated to use:
- NextAuth for authentication
- Drizzle ORM for database queries

## Setup Instructions

1. **Install new dependencies:**
   ```bash
   npm install
   ```

2. **Set up Neon database:**
   - Create account at https://neon.tech
   - Create a new project
   - Get connection string

3. **Update environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Add your Neon DATABASE_URL
   - Generate and add NEXTAUTH_SECRET

4. **Push database schema:**
   ```bash
   npx drizzle-kit push:pg
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

## Benefits of Migration

1. **Better Performance**: Neon's serverless PostgreSQL with auto-scaling
2. **Type Safety**: Drizzle ORM provides full TypeScript support
3. **Cost Effective**: Neon's pay-per-use pricing
4. **Flexibility**: Full control over authentication logic with NextAuth
5. **Developer Experience**: Drizzle Studio for database management

## Rollback Plan

If you need to rollback to Supabase:
1. Checkout previous commit before migration
2. Reinstall Supabase packages
3. Restore Supabase environment variables
4. Ensure Supabase project is still active

## Support

For issues or questions:
- Neon: https://neon.tech/docs
- Drizzle: https://orm.drizzle.team
- NextAuth: https://next-auth.js.org
