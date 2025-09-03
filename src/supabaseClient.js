// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// القيم هذي تجيبها من Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
