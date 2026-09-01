import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wszyjsirtuwoxfqsrbiq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzenlqc2lydHV3b3hmcXNyYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTkzMjEsImV4cCI6MjEwMjU3NTMyMX0.2UmKfWxk88UIkx0z5HppglZI40EM34wDjby_2Juhtz8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)