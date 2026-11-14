import { useEffect, useRef, useState } from 'react';
import { Camera, X } from '../../lib/icons.jsx';

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
