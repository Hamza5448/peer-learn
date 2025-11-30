import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ⚠️ REPLACE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = "https://uaewsddruvxgtgqyyyiu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZXdzZGRydXZ4Z3RncXl5eWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjQyMDksImV4cCI6MjA4MDAwMDIwOX0.B7Q_IPieha22BwRTWKOlfKq1e9GiX8MvDT5QMIGWQRw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("✅ Supabase Client Initialized");