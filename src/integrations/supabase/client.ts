// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wgmjwueuqcnnaktgreah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnbWp3dWV1cWNubmFrdGdyZWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwOTk2MDUsImV4cCI6MjA2NTY3NTYwNX0.chKB3KwynstAwNO1Fie14ZhCxHAiondupa8K-jzvs6o";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);