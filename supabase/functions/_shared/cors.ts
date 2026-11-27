// CORS for Pocket's Edge Functions.
// Set the ALLOWED_ORIGINS function secret to a comma-separated list of the origins that may call
// these functions, e.g. "https://your-pocket-domain.vercel.app,http://localhost:5173".
// Requests from any other browser origin get no Access-Control-Allow-Origin header, so the browser blocks them.
// If ALLOWED_ORIGINS is not set, every origin is allowed (the previous behaviour), so existing deployments keep working.
const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const origin = req.headers.get('Origin') || '';
  if (!allowed.length) headers['Access-Control-Allow-Origin'] = '*';
  else if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/** Wraps a handler: answers the CORS preflight and adds CORS headers to every response. */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    const res = await handler(req);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  };
}
