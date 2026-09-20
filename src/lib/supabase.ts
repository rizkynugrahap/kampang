import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://pdcqiwptshqeirjqvbvp.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkY3Fpd3B0c2hxZWlyanF2YnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzE1NzYsImV4cCI6MjEwNTIwNzU3Nn0.R1A4C63LVPy1ONVU1NkUcRCWYtgqODffoMJksKbyb4Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
