// Pocket AI: understands free-form money messages and answers questions about
// the user's own numbers. The Gemini key stays on the server (private_secrets).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const FREE_LIMIT = 10;
const PLUS_LIMIT = 100;
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

const SYSTEM = `You are Pocket, a personal-finance assistant inside an Egyptian money app.
The user writes in Egyptian Arabic, Arabic, Franco-Arabic (Arabic in Latin letters with numbers like 3, 7, 2) or English.
Return ONLY JSON: {"reply": string, "drafts": Draft[]}.
- If the message records money (spent, received, moved, lent), put one Draft per item in "drafts" and keep "reply" to one short line.
- If it is a question, answer in "reply" using ONLY the numbers in CONTEXT, in the user's language and tone (Egyptian Arabic if they wrote Egyptian). Be short and concrete. Never invent numbers. If CONTEXT lacks the data, say so.
- Never give investment or legal advice; general budgeting tips are fine.
Draft = {"kind":"expense"|"income"|"transfer"|"lend","amount":number,"category":string,"description":string,"account":string,"toAccount":string,"person":string,"date":"YYYY-MM-DD"}
Rules: category must be one of CONTEXT.expenseCategories (expense) or CONTEXT.incomeCategories (income); use "" if unsure.
account/toAccount must be names from CONTEXT.accounts or "". person only for lend. date defaults to CONTEXT.today; "embare7"/"امبارح"/"yesterday" = one day before.
"alf"/"الف"/"k" = 1000. Keep description short, in the user's words.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in first." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "Your session ended. Sign in again." }, 401);
    const uid = u.user.id;

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
    if (!message) return json({ error: "Type something first." }, 400);
    const context = body.context && typeof body.context === "object" ? body.context : {};
    const ctxText = JSON.stringify(context).slice(0, 12000);

    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    const owner = prof?.role === "owner";
    const { data: subs } = await admin.from("subscriptions").select("status,current_period_end,trial_ends_at").eq("user_id", uid).in("status", ["active", "trialing", "trial"]);
    const now = Date.now();
    const plus = (subs ?? []).some((s: any) => !s.current_period_end || new Date(s.current_period_end).getTime() > now || (s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now));
    const { data: custom } = await admin.from("ai_limits").select("daily_limit").eq("user_id", uid).maybeSingle();
    const limit = owner ? 100000 : (custom?.daily_limit ?? (plus ? PLUS_LIMIT : FREE_LIMIT));
    const { data: left, error: qe } = await admin.rpc("consume_ai_quota", { p_user: uid, p_limit: limit });
    if (qe) throw qe;
    if (left === -1) return json({ error: plus || custom ? "You used today's AI messages. They reset tomorrow." : `You used today's ${limit} AI messages. Pocket Plus gives you ${PLUS_LIMIT} a day.`, limit_reached: true, plus }, 429);
    const { data: sec } = await admin.from("private_secrets").select("value").eq("name", "GEMINI_API_KEY").maybeSingle();
    const key = Deno.env.get("GEMINI_API_KEY") ?? sec?.value;
    if (!key) return json({ error: "AI is not set up yet." }, 503);

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `CONTEXT: ${ctxText}\n\nMESSAGE: ${message}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500, responseMimeType: "application/json" },
    };
    let out: any = null, lastErr = "";
    for (const model of [Deno.env.get("GEMINI_MODEL"), ...MODELS].filter(Boolean)) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { out = d; break; }
      lastErr = `${model}: ${r.status} ${d?.error?.message ?? ""}`;
      if (r.status !== 404 && r.status !== 400) break;
    }
    if (!out) { console.error("Gemini failed", lastErr); return json({ error: "AI is not available right now. Try again in a minute.", detail: lastErr.slice(0, 200) }, 502); }
    const text = (out?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "")); } catch { parsed = { reply: text, drafts: [] }; }
    const drafts = Array.isArray(parsed.drafts) ? parsed.drafts.filter((d: any) => d && Number(d.amount) > 0).slice(0, 8) : [];
    await admin.from("ai_messages_log").insert({ user_id: uid, message: message.slice(0, 500), kind: drafts.length ? "record" : "question", drafts: drafts.length });
    return json({ reply: String(parsed.reply ?? "").slice(0, 1500), drafts, remaining: owner ? null : left, plus });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
