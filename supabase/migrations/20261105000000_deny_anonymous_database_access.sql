-- Deny direct PostgREST/database access to callers that do not have a
-- Supabase Auth session. The anon key is public by design; this role must not
-- have data privileges when the application requires authentication.

-- Blocking schema usage makes the policy unambiguous, while the object-level
-- revokes below provide defence in depth if schema usage is granted later.
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL PROCEDURES IN SCHEMA public FROM anon;

-- Keep newly-created public objects private from logged-out callers too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Payment state may only be changed by trusted server code. PostgreSQL grants
-- EXECUTE on new functions to PUBLIC by default, so revoke it explicitly.
DO $block$
BEGIN
  IF to_regprocedure('public.assign_participant_number(bigint,text,text,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.assign_participant_number(bigint, text, text, text)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.assign_participant_number(bigint, text, text, text)
      TO service_role;
  END IF;
END
$block$;

COMMENT ON SCHEMA public IS
  'Application data: direct access requires an authenticated or service-role JWT.';

-- Active location rows previously had USING (is_active = true), which allowed
-- every logged-in user (and formerly anon) to enumerate every rider. Until a
-- token-scoped sharing RPC is introduced, only the owner may read a session.
DO $block$
BEGIN
  IF to_regclass('public.live_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public can view active sessions by ID" ON public.live_sessions;
    DROP POLICY IF EXISTS "Authenticated users can view their own live sessions" ON public.live_sessions;
    CREATE POLICY "Authenticated users can view their own live sessions"
      ON public.live_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = profile_id);
  END IF;
END
$block$;
