# Agent rules

- Keep `.env` (public backend URL/publishable key only) tracked and out of .gitignore; published builds read it, and without it the app points at no or the wrong backend.
- Never hardcode a fallback backend URL/key in src/integrations/supabase/client.ts; it must read only the VITE_ env values.
