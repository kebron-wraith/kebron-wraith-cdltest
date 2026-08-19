// CDL Site Management — config.js
// Central configuration and Supabase client export

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm';

// Environment variables (set in Netlify / .env)
// Access via fetch in browser or from Netlify functions
// For browser-based apps, Supabase env vars are injected at build time
export const SUPABASE_URL = 'https://dljvplrbjogncwrpmfsj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanZwbHJiam9nbmN3cnBtZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjAxMzIsImV4cCI6MjA5NDA5NjEzMn0.GmsMNKlRos6ZChy143_YrSlDB477RHPxkRqA0wGJB1E';

// App metadata
export const APP_CLIENT = 'Canaan Developers Ltd · Nairobi, Kenya';
export const LOGO_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODQiIGhlaWdodD0iODQiIHZpZXdCb3g9IjAgMCA4NCA4NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjMgMEE0MCA0MCAwIDI2IDMaY2xhc3M9ImxvZ28tZmxvYXQiIHN0eWxlPSJmb250LWZhbWlseTogJ2FyaWFsLTYyJyIgZm9udC1zaXplOiA0cHg7IGZpbGw6ICdyZWFkbWluJz48L3BhdGg+Cjwvc3ZnPgo=';

// Export Supabase client for all modules to use
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// App constants
export const APP_NAME = 'CDL Site Management';
export const APP_VERSION = 'v11.0';
export const SITES = [
  { id: 1, name: 'Site A - Nairobi' },
  { id: 2, name: 'Site B - Mombasa' },
  { id: 3, name: 'Site C - Kisumu' },
];

// AI message limits per role
export const AI_MSG_LIMITS = {
  admin: Infinity,
  company_owner: 20,
  ceo: 7,
  asset_manager: 0,
  office_manager: 7,
  finance: 7,
  project_manager: 5,
  engineer: 5,
  store_manager: 0,
  storekeeper_local: 0,
  storekeeper_import: 0,
  storekeeper_scaffolding: 0,
  procurement_officer: 5,
  transfer_officer: 5,
  data_holder: 5,
  supervisor: 5,
  site_overseer: 5,
};

// AI config — 24-key rotating pool, model auto-selects live key on 429/403
export const GEMINI_KEYS = [
  "AIzaSyAICinEgwTKHLQqVV8K4bEVhKOWCWIB348",
  "AIzaSyAKSk2eL3P2Jw0uSj-c5GMs2qnvxphTYEE",
  "AIzaSyAUqWU8lrrgX-taYvXNubrVEy6VLvKIsXA",
  "AIzaSyAjqUe-rYT7pvuxZxt3LzOFZ1X8ekjYjNc",
  "AIzaSyApXK-mrlOG0kTd_wZQHkkh7OEpCspVFV4",
  "AIzaSyApo9u5VzVHPWCsbv8Iuiq5YqtgZ9fXAbw",
  "AIzaSyBOCTeiPD_-GFJdUr9KmazChLNGJBLycK8",
  "AIzaSyBcmV3IPpX6JQxbC8KYM2BSMbNHO7xqpb8",
  "AIzaSyBlJUmadLPUZnb-bRfOQhkN9NZbUbgYfGs",
  "AIzaSyBnyXdULfaSoUAI8SXp2uMd_KuOPS7d6Lo",
  "AIzaSyBs-nyqJZYRmraLVFOuVSmY4h2K1Eg6PNw",
  "AIzaSyBzKpniibPAyvCkYecxifpXa0fPEZqAdhI",
  "AIzaSyCAoaweFAWaTd0beJxFUx_JOIaZthOxoNA",
  "AIzaSyCDg1y5GvFDmcKCog_m9TxLKsTKD_ojgF8",
  "AIzaSyCKTu-DFalHg0l8RSznu9_LOewxbSZWn5Q",
  "AIzaSyCb0qEC-r-LqTIeCndxAuDFXp7as96mEWA",
  "AIzaSyChVgNVdJYghO55ehgBYZWanUA5AuvE3sU",
  "AIzaSyCqOBo1jqaJ_lpquBtntcVMSNmKH6FCx4A",
  "AIzaSyD7YTbAtT9bAPn2yziT9F5w0iGSKV0YbV8",
  "AIzaSyDAqn2MVonJqjnyI0AcpPVmG7iZrwJJnQ8",
  "AIzaSyDOs6B9uc6FjbRbymFyQEe-hovihDBpVUs",
  "AIzaSyDY8ptW8Zn1pjXPYPO44dk9SPQVdaA5-mg",
  "AIzaSyDlBS-gXMPEiHm0CZhSwPZZZWxGOusrzwk",
  "AIzaSyDwGPJbGNNHFmNBBfQJAupsLEUvOGPC1U4"
];
export const GEMINI_MODEL_PRIMARY = "gemini-3.6-flash";
export const GEMINI_MODEL_FALLBACK = "gemini-3.6-flash";