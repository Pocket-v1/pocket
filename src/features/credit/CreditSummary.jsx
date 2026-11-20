import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { CreditCard, ShoppingBag } from '../../lib/icons.jsx';
import { dueLabel, dueTone, daysUntil, money } from '../../lib/credit.js';
import { shortDate } from '../../lib/format.js';
import { providerTheme } from '../../lib/providerThemes.js';

export function DueChip({ date }) {
  if (!date) return null;
  return <span className={`cc-chip ${dueTone(daysUntil(date))}`}>{dueLabel(date)}</span>;
}

export function LimitBar({ used, limit, usedLabel = 'used', currency }) {
  const fmt = money(currency);
  const pct = limit > 0 ? Math.min(100, used / limit * 100) : 0;
  return <div>
    <div className="cc-limit-line"><b>{limit > 0 ? `${fmt(Math.max(0, limit - used))} available` : 'No limit set'}</b><span className="cc-sub">{fmt(used)} {usedLabel}{limit > 0 ? ` of ${fmt(limit)}` : ''}</span></div>
    <div className="cc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Credit limit used"><i className={pct >= 100 ? 'full' : pct > 80 ? 'hi' : ''} style={{ width: `${pct}%` }} /></div>
  </div>;
}

export function CardVisual({ account, line1, line2, icon: Icon = CreditCard, kindLabel = 'Credit card' }) {
  return <div className="cc-visual" style={{ '--cc-a': account.color || '#6c7cf5' }}>
    <span className="cc-v-icon"><Icon size={18} /></span>
    <div><small>{kindLabel}</small><strong>{account.name}</strong>{line1 && <small style={{ marginTop: 6 }}>{line1}</small>}{line2 && <small>{line2}</small>}</div>
  </div>;
}


// Generic card artwork (chip, contactless, swoosh band) — original shapes, no brand logos. The band style varies per app/card name.
const BANDS = [
  'M150 0 H205 C205 80 330 90 330 170 C330 230 372 250 372 284 H318 C318 250 276 230 276 170 C276 120 150 110 150 0 Z',
  'M-20 230 C90 150 200 260 320 170 C390 118 430 120 480 90 V150 C440 180 400 190 340 232 C220 318 110 210 -20 292 Z',
  'M250 -20 L330 -20 L190 304 L110 304 Z M345 -20 L385 -20 L245 304 L205 304 Z',
  'M-30 60 C80 -10 170 120 290 60 C370 20 420 30 490 -10 V50 C430 90 380 80 310 120 C190 190 90 60 -30 130 Z',
  'M300 -40 A190 190 0 1 1 299.9 -40 Z M300 30 A120 120 0 1 0 300.1 30 Z',
];
function CardArt({ name, accent, bandPath }) {
  const n = String(name || '').trim().toLowerCase();
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  const band = bandPath || BANDS[h % BANDS.length];
  return <svg className="pc-art" viewBox="0 0 450 284" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path d={band} fill={accent || '#fff'} fillOpacity={accent ? '.55' : '.15'} fillRule="evenodd" />
    <g transform="translate(366 84)"><rect width="46" height="36" rx="7" fill="#e9c46a" /><rect width="46" height="36" rx="7" fill="none" stroke="#a97c1b" strokeOpacity=".55" /><path d="M0 12H46M0 24H46M16 0V36M30 0V36" stroke="#a97c1b" strokeOpacity=".5" fill="none" /></g>
    <g transform="translate(374 128) scale(.8)" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6c4 4 4 10 0 14" /><path d="M13 2c7 6 7 18 0 24" /><path d="M20 -2c10 9 10 25 0 34" /></g>
  </svg>;
}

// Credit-card shaped face (Visa proportions) used for cards and installment apps everywhere.
export function PaymentCard({ account, kind = 'card', used = 0, limit = 0, next = null, currency, menu = null, onOpen, children }) {
  const fmt = money(currency);
  const t = kind === 'app' ? providerTheme(account) : { a: account.color || '#3157f6', b: `color-mix(in srgb,${account.color || '#3157f6'} 55%,#0b1033)` };
  const pct = limit > 0 ? Math.min(100, used / limit * 100) : 0;
  const Icon = kind === 'app' ? ShoppingBag : CreditCard;
  return <div className="pc-wrap">
    <div className={`pc-face ${onOpen ? 'pc-click' : ''} ${t.face ? 'pc-has-face' : ''}`} style={{ '--pc-a': t.a, '--pc-b': t.b, ...(t.face ? { backgroundImage: `url(${t.face})` } : {}) }} onClick={onOpen} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} onKeyDown={e => { if (onOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }} aria-label={onOpen ? `Open ${account.name}` : undefined}>
      {!t.face && <CardArt name={account.name} accent={t.accent} bandPath={t.band} />}<div className="pc-top"><div className="pc-id">{t.logo ? <span className="pc-logo"><img src={t.logo} alt="" /></span> : <span className="pc-mono">{kind === 'app' ? (account.name || '?').trim().charAt(0).toUpperCase() : <Icon size={16} />}</span>}<span><small>{kind === 'app' ? 'Installment app' : 'Credit card'}</small><b>{account.name}</b></span></div>{menu && <div className="pc-menu" onClick={e => e.stopPropagation()}>{menu}</div>}</div>
      <div className="pc-mid"><small>{limit > 0 ? 'Available' : 'No limit set'}</small><strong>{limit > 0 ? fmt(Math.max(0, limit - used)) : fmt(used)}</strong>
        <div className="pc-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <small>{fmt(used)} {kind === 'app' ? 'committed' : 'used'}{limit > 0 ? ` of ${fmt(limit)}` : ''}</small></div>
      <div className="pc-bottom"><div><small>Next payment</small><b>{next ? fmt(next.amount) : 'All clear'}</b></div>{next ? <span className="pc-due"><DueChip date={next.due} /></span> : <span className="pc-ok">Nothing due</span>}</div>
    </div>
    {children && <div className="pc-actions">{children}</div>}
  </div>;
}

// Big tile used on the Debts & installments list and the Overview strip.
export function CardTile({ card, summary, currency, onOpen, onPay }) {
  const fmt = money(currency);
  const next = summary.next;
  return <PaymentCard account={card} kind="card" used={summary.owed} limit={summary.limit} next={next ? { amount: next.remaining, due: next.due } : null} currency={currency} onOpen={() => onOpen(card)}>
    {next && <button className="btn btn-primary btn-sm" onClick={() => onPay(card)}>Pay {fmt(next.remaining)}</button>}<button className="btn btn-secondary btn-sm" onClick={() => onOpen(card)}>View details</button>
  </PaymentCard>;
}

export function ProviderTile({ provider, summary, currency, onOpen, onPay }) {
  const next = summary.next;
  return <PaymentCard account={provider} kind="app" used={summary.used} limit={summary.limit} next={next ? { amount: next.amount, due: next.due } : null} currency={currency} onOpen={() => onOpen(provider)}>
    {next && <button className="btn btn-primary btn-sm" onClick={() => onPay(provider, next)}>Pay</button>}<button className="btn btn-secondary btn-sm" onClick={() => onOpen(provider)}>Details</button>
  </PaymentCard>;
}
