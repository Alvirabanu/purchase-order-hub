import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bxgstnspuebcjddeqohl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_juLM2PSJNCYLUzbN0V5JOg_h91nU6Zz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
