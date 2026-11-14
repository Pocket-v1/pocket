import { useEffect, useRef, useState } from 'react';
import { Camera, X, Star } from '../../lib/icons.jsx';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { Field } from '../../components/ui/Field.jsx';

// Screenshots on Inbox messages. Files go to the private receipts bucket under <conversation user id>/support/.
export async function uploadSupportShot(supabase, folderUserId, file) {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error('The picture is too big (8 MB max).');
  let blob = file;
  try { // shrink large phone screenshots
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    if (scale < 1 || file.size > 1.5e6) {
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)) || file;
    }
  } catch { /* keep the original */ }
  const path = `${folderUserId}/support/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('receipts').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw new Error('Could not upload the picture.');
  return path;
}

// "Add a screenshot" button + preview chip. value = File | null.
export function ShotPicker({ value, onChange, compact = false }) {
  const ref = useRef(null);
  const [url, setUrl] = useState('');
  useEffect(() => { if (!value) { setUrl(''); return undefined; } const u = URL.createObjectURL(value); setUrl(u); return () => URL.revokeObjectURL(u); }, [value]);
  return <div className={`shot-pick ${compact ? 'compact' : ''}`}>
    <input ref={ref} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
    {value ? <span className="shot-chip"><img src={url} alt="Screenshot to send" /><span>{compact ? '' : 'Screenshot added'}</span><button type="button" aria-label="Remove screenshot" onClick={() => onChange(null)}><X size={14} /></button></span>
      : <button type="button" className={compact ? 'icon-btn shot-btn' : 'shot-add'} aria-label="Add a screenshot" onClick={() => ref.current?.click()}><Camera size={compact ? 18 : 16} />{!compact && ' Add a screenshot (optional)'}</button>}
  </div>;
}

// A picture on a message: loads a short-lived private link.
export function SupportShot({ supabase, path }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    supabase.storage.from('receipts').createSignedUrl(path, 3600).then(({ data }) => { if (alive && data?.signedUrl) setSrc(data.signedUrl); });
    return () => { alive = false; };
  }, [supabase, path]);
  if (!src) return <span className="support-shot loading" aria-label="Loading picture" />;
  return <a className="support-shot" href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="Screenshot" /></a>;
}

// After the Owner ends a chat, the user rates it: 1–5 stars and an optional comment.
const STAR_WORDS = ['', 'Bad', 'Not great', 'Okay', 'Good', 'Great'];
export function ReviewModal({ supabase, thread, onClose, onDone }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function send() {
    if (!stars) { setErr('Pick 1 to 5 stars.'); return; }
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('support_rate', { p_thread: thread.id, p_rating: stars, p_review: text.trim() || null });
    setBusy(false);
    if (error) { setErr('Could not send. Try again.'); return; }
    onDone?.(stars);
  }
  const shown = hover || stars;
  return <ModalShell title="How did we do?" subtitle="We closed your chat with the Pocket team. Tell us how it went." onClose={onClose}>
    <div className="review-form">
      <div className="review-stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={`review-star ${n <= shown ? 'on' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}><Star size={34} /></button>)}
      </div>
      <p className="review-word">{shown ? STAR_WORDS[shown] : 'Tap a star'}</p>
      <div className="form-grid"><Field label="Anything to add? (optional)" wide><textarea className="pocket-textarea" rows="3" maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="What went well, or what could be better…" /></Field></div>
      {err && <p className="cc-error" role="alert">{err}</p>}
    </div>
    <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Not now</button><button type="button" className="btn btn-primary" disabled={busy || !stars} onClick={send}>{busy ? 'Sending…' : 'Send review'}</button></div>
  </ModalShell>;
}
export function StarsLine({ value = 0 }) {
  return <span className="stars-line" aria-label={`${value} of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} className={n <= value ? 'on' : ''} />)}</span>;
}
