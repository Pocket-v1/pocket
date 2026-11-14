import { Check, LoaderCircle, X } from '../../lib/icons.jsx';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const VALID = /^[a-zA-Z0-9._-]{3,32}$/;
export const usernameState = { VALID };

// Live availability check while typing. Reports 'ok' | 'taken' | 'invalid' | 'checking' | 'error' to the parent.
export function UsernameStatus({ value, onStatus }) {
  const [st, setSt] = useState('idle');
  useEffect(() => {
    const v = value.trim();
    if (!v) { setSt('idle'); onStatus?.('idle'); return; }
    if (!VALID.test(v)) { setSt('invalid'); onStatus?.('invalid'); return; }
    setSt('checking'); onStatus?.('checking');
    let live = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('username_available', { p_username: v });
      if (!live) return;
      const next = error ? 'error' : data ? 'ok' : 'taken';
      setSt(next); onStatus?.(next);
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [value]);
  if (st === 'idle') return null;
  const map = {
    checking: [<LoaderCircle size={13} className="spin" key="i"/>, 'Checking…', ''],
    ok: [<Check size={13} key="i"/>, 'Username is available', 'ok'],
    taken: [<X size={13} key="i"/>, 'This username is already taken', 'bad'],
    invalid: [<X size={13} key="i"/>, '3–32 characters: letters, numbers, dot, underscore or hyphen', 'bad'],
    error: [null, '', ''],
  };
  const [icon, text, tone] = map[st];
  return text ? <span className={`un-status ${tone}`} aria-live="polite">{icon}{text}</span> : null;
}
