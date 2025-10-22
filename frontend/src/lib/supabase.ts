import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://wftvnobmkbewqjkzndln.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdHZub2Jta2Jld3Fqa3puZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTg3NjgsImV4cCI6MjA3NjAzNDc2OH0.113fWrUn1LHXfAoehqpkjcDfFDEXLHBkvM9XPpn7mE0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);