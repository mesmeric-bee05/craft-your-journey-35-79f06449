// Deployment shim: the Supabase bundler can follow HTTPS imports, but not the
// relative ../_shared paths of a single-file upload. Importing the real handler
// over HTTPS lets the bundler resolve its relatives against the repository URL.
import "https://raw.githubusercontent.com/mesmeric-bee05/craft-your-journey-35-79f06449/main/supabase/functions/seed-inbox-data/index.ts";
