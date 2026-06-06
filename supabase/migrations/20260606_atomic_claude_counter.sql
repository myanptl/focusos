-- =============================================================================
-- Atomic Claude daily-counter claim (replaces the JS read-then-write pattern
-- in api/_auth.js and supabase/functions/generate-quiz/index.ts so concurrent
-- requests cannot all pass the gate when generationsToday is below the cap).
--
-- Apply by pasting this file into the Supabase SQL Editor and running it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_claude_call(
  p_user_id text,
  p_limit   integer DEFAULT 5
)
RETURNS TABLE(claimed boolean, count_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      date := (now() AT TIME ZONE 'UTC')::date;
  v_current    integer;
  v_reset_date date;
BEGIN
  -- Lock the row for the rest of this transaction so a parallel call to
  -- claim_claude_call for the same user blocks here until we commit.
  SELECT
    COALESCE(claude_generations_today, 0),
    claude_generations_reset_date
  INTO v_current, v_reset_date
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- No profile row -> treat as not claimed; caller should fall back to Ollama.
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- New day -> reset the in-memory count before deciding.
  IF v_reset_date IS DISTINCT FROM v_today THEN
    v_current := 0;
  END IF;

  IF v_current >= p_limit THEN
    -- At or over the daily cap. Persist the reset date but DO NOT increment.
    UPDATE profiles
       SET claude_generations_today      = v_current,
           claude_generations_reset_date = v_today
     WHERE user_id = p_user_id;
    RETURN QUERY SELECT false, v_current;
    RETURN;
  END IF;

  -- Slot available -> atomically claim it.
  UPDATE profiles
     SET claude_generations_today      = v_current + 1,
         claude_generations_reset_date = v_today
   WHERE user_id = p_user_id;
  RETURN QUERY SELECT true, v_current + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_claude_call(text, integer) FROM public;
GRANT  EXECUTE
       ON FUNCTION public.claim_claude_call(text, integer)
       TO authenticated, service_role;
