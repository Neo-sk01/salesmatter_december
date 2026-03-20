"use server"

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function clearDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Delete all records by filtering where a primary key exists / is not null
    await supabase.from('email_events').delete().not('id', 'is', null);
    await supabase.from('email_messages').delete().not('message_id', 'is', null);
    await supabase.from('processed_files').delete().not('id', 'is', null);
    
    // Attempt to clear leads if the table exists
    const { error } = await supabase.from('leads').delete().not('id', 'is', null);
    if (error && error.code !== '42P01') { 
        // 42P01 is relation does not exist, safe to ignore if leads table isn't created yet
        console.error('Error clearing leads:', error.message);
    }
    
    revalidatePath('/', 'layout'); // Revalidate all paths to clear cached data from the UI
    return { success: true };
  } catch (error) {
    console.error('Failed to clear database:', error);
    return { success: false, error: 'Failed to clear database' };
  }
}
