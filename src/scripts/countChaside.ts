import { supabase } from './utils/supabase'; // fake, just write a standalone connection? We have .env
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const s = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: test } = await s.from('tests').select('id').ilike('testname', '%chaside%').single();
  if(!test) return;
  const { data: qs } = await s.from('questions').select('chaside_scale').eq('testid', test.id);
  const counts = {};
  for(let q of qs || []) {
    counts[q.chaside_scale] = (counts[q.chaside_scale] || 0) + 1;
  }
  console.log('CHASIDE BAND COUNTS:', counts);
  console.log('TOTAL:', qs?.length);
}
run();
