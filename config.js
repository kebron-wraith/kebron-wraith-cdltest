// CDL Site Management — config.js
// Central configuration and Supabase client export

import { createClient } from '@supabase/supabase-js';

// Environment variables (set in Netlify / .env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

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