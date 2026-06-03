---
name: supabase-migration
description: Supabase schema change workflow for FocusOS — create migration SQL, update types, verify RLS policies.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /supabase-migration

Use when making **Supabase schema changes** in FocusOS.

## FocusOS Conventions

- All tables use `user_id` (text) for auth lookup — NOT `id`
- RLS must be enabled on every new table
- `profiles` columns: `user_id`, `name`, `username`, `streak_count`, `total_focus_minutes`, `total_sessions`, `focus_duration`, `baseline_attention_span`
- `daily_focus_log` uses `log_date` and `sessions_completed`/`sessions_count`
- `spaced_repetition` uses `next_review_date` (date), `ease_factor`, `interval_days`, `repetitions`
- `quiz_results` stores `missed_questions` and `weak_topics` as jsonb

## Workflow

1. **Read current schema** — check existing tables and policies before changing anything
2. **Write migration SQL** — place in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
3. **Enable RLS** — `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
4. **Add policies** — use `auth.uid()::text` to match `user_id` (text)
5. **Apply locally** — `npx supabase db push` or via Supabase MCP `apply_migration`
6. **Verify** — query the table to confirm schema, check policies in Supabase dashboard

## RLS Policy Template

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data"
  ON my_table FOR ALL
  USING (auth.uid()::text = user_id);
```

## Common Files

- `supabase/migrations/`
- `src/lib/supabase.js`
- Any component querying the changed table

## Commit Signal

`feat(db): add <table/column> migration`
