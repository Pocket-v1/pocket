#!/usr/bin/env bash
# Fails if something that looks like a private key is about to be committed or shipped to the browser.
# Run:  npm run check:secrets
set -u
bad=0
scan() { # $1 = label, $2 = regex
  if git ls-files -z | grep -zv '^package-lock.json$' | xargs -0 grep -InE "$2" -- 2>/dev/null | grep -v 'scripts/check-secrets.sh' | grep -v 'SECURITY.md' | grep -v 'README.md'; then
    echo "!! $1 found in tracked files (see above)"; bad=1
  fi
}
scan "service_role / secret key"   'sb_secret_[A-Za-z0-9_-]{10,}|service_role"?[[:space:]]*[:=][[:space:]]*["'"'"']eyJ'
scan "Supabase JWT (eyJ…)"         'eyJhbGciOi[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}'
scan "Resend API key"              're_[A-Za-z0-9]{24,}'
scan "Private key block"           '-----BEGIN [A-Z ]*PRIVATE KEY-----'
if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'; then echo "!! a .env file is tracked"; bad=1; fi
if grep -rInE 'import\.meta\.env\.(VITE_)?[A-Z_]*(SERVICE|SECRET|PRIVATE)' src 2>/dev/null; then echo "!! client code reads a secret-looking env var"; bad=1; fi
[ "$bad" = 0 ] && echo "No secrets found." 
exit $bad
