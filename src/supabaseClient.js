// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ⚠️ استبدل هذه القيم من إعدادات Supabase الخاصة بك
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// إنشاء عميل Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
