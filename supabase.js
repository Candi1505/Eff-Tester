/* =========================================================
   CHEST COMPANION V2
   Supabase Connection

   Built by Cherubim
   Artwork by Eff
========================================================= */

const SUPABASE_URL =
  "https://prjixwuvyhiqzoekoadj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2tOyIMZ7S7-0g1VPDUOLWA_tyFemM7a";


/*
  Create the Supabase browser client.

  The publishable key is safe to use in the website.
  Never place a service-role key in GitHub.
*/

window.chestSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


console.log(
  "Chest Companion: Supabase client created."
);