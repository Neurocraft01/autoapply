const { createClient } = require('@supabase/supabase-js');

const url = 'https://gxgdefktpnxlwxgnervr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4Z2RlZmt0cG54bHd4Z25lcnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDI2MzQsImV4cCI6MjA4MTUxODYzNH0.RYkO15gLcz_LUZmX7DA_d8nf0RbOAw5VClgmpet7T-c';

console.log('Testing Supabase Connection...\n');

const supabase = createClient(url, key);

console.log('✓ Supabase client created');
console.log('URL:', url);
console.log('\nTesting auth connection...');

supabase.auth.getSession()
  .then(response => {
    if (response.error) {
      console.log('✗ Auth Error:', response.error.message);
    } else {
      console.log('✓ Auth connection successful');
      console.log('Session:', response.data.session ? 'Active session found' : 'No active session (this is normal)');
    }
  })
  .catch(err => {
    console.log('✗ Connection Error:', err.message);
  })
  .finally(() => {
    console.log('\nConnection test complete.');
    process.exit(0);
  });
