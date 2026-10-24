-- Lock the public schema against Supabase's auto-generated REST API (anon/authenticated keys).
-- The app talks to Postgres only through Prisma as the table owner, which bypasses RLS,
-- so enabling RLS with no policies denies API access without affecting the app.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
