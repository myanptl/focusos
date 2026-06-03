---
name: feature-development
description: Standard feature implementation workflow for FocusOS — plan, implement, verify, commit.
allowed_tools: ["Bash", "Read", "Write", "Edit", "Grep", "Glob"]
---

# /feature-development

Use for **new features** in FocusOS.

## FocusOS Stack

- **Frontend**: Vite + React 19, React Router v7 — files in `src/`
- **API**: Vercel serverless functions in `api/` — use `ANTHROPIC_API_KEY` (no VITE_ prefix)
- **DB/Auth**: Supabase — always `.eq('user_id', user.id)`, RLS enforced
- **Dev server**: `vercel dev` on port 3000 (not `npm run dev`)
- **Design**: bg `#0a0a0b`, accent `#b5f23a`, fonts Bebas Neue + DM Sans + JetBrains Mono

## Workflow

1. **Understand** — read relevant existing files before writing anything
2. **Plan** — identify files to create/edit, Supabase tables affected, API routes needed
3. **Implement** — smallest change that delivers the feature; no speculative abstractions
4. **Verify**:
   ```bash
   vercel dev        # start dev server
   npm run build     # check for build errors
   ```
5. **Test the UI** — open in browser, verify golden path + edge cases
6. **Commit** — `feat(<scope>): <description>`

## Common Files

- `src/pages/` — route-level page components
- `src/components/` — shared UI
- `src/lib/supabase.js` — Supabase client
- `api/` — Vercel serverless functions
- `vite.config.js` — proxies `/api` → port 3000

## Skill References

| Task | Skill |
|------|-------|
| React components | `frontend-patterns` |
| API endpoint | `api-design`, `backend-patterns` |
| Security check | `security-review` |
| Before PR | `verification-loop` |
| Supabase schema change | `/supabase-migration` |
