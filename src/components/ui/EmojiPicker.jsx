import { useState } from 'react';
import { EMOJI_GROUPS, firstEmoji } from '../../lib/categoryIcons.js';

// Big emoji grid + a box to type or paste any emoji from the phone/computer keyboard.
export function EmojiPicker({ value, onChange }) {
  const [tab, setTab] = useState(0);
  const [typed, setTyped] = useState('');
  const take = text => { const em = firstEmoji(text); setTyped(''); if (em) onChange(em); else if (text.trim()) setTyped(''); };
  return <div className="emoji-picker">
    <div className="emoji-custom"><span className="emoji-current" aria-label="Selected icon">{value || '🏷️'}</span>
      <input value={typed} inputMode="text" placeholder="Type or paste any emoji from your keyboard" aria-label="Type an emoji" onChange={e => { setTyped(e.target.value); const em = firstEmoji(e.target.value); if (em) { onChange(em); } }} onBlur={() => setTyped('')} /></div>
    <div className="emoji-tabs" role="tablist">{EMOJI_GROUPS.map(([g], i) => <button type="button" role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} key={g} onClick={() => setTab(i)}>{g}</button>)}</div>
    <div className="emoji-grid" role="listbox" aria-label="Icons">{EMOJI_GROUPS[tab][1].map(em => <button type="button" key={em} role="option" aria-selected={value === em} className={value === em ? 'on' : ''} onClick={() => onChange(em)}>{em}</button>)}</div>
  </div>;
}
