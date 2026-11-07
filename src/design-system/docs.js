import '../styles.css';
import '../styles/sheets.css';
import '../styles/credit.css';
import './tokens.css';
import './components.css';
import './patterns.css';
import './docs.css';
import legacy from './legacy-tokens.json';

const root = document.documentElement;
document.body.classList.add('ds-doc-body');
const COLORS = [
  ['Brand', [['--ds-brand','Brand'],['--ds-brand-hover','Brand hover'],['--ds-brand-soft','Brand soft']]],
  ['Status', [['--ds-success','Success / income'],['--ds-warning','Warning'],['--ds-danger','Danger'],['--ds-ok','Chip OK'],['--ds-warn','Chip warning'],['--ds-bad','Chip late']]],
  ['Surfaces', [['--ds-page','Page'],['--ds-surface','Card / panel'],['--ds-surface-raised','Raised card, popover'],['--ds-soft','Soft fill'],['--ds-hover','Hover fill'],['--ds-border','Border'],['--ds-border-strong','Strong border']]],
  ['Text', [['--ds-text','Text'],['--ds-text-muted','Muted text'],['--ds-text-subtle','Hints, placeholders'],['--ds-on-brand','Text on brand fill'],['--ds-secondary-text','Secondary button text']]],
  ['Fuel kinds', [['--ds-fuel-80','80 Octane'],['--ds-fuel-92','92 Octane'],['--ds-fuel-95','95 Octane'],['--ds-fuel-98','98 Octane'],['--ds-fuel-diesel','Diesel'],['--ds-fuel-gas','Gas'],['--ds-fuel-electric','Electric']]],
 ['Form controls', [['--ds-control-bg','Input background'],['--ds-control-border','Input border'],['--ds-control-text','Input text']]],
];
const SCALE = [['--ds-fs-3xl','Page title'],['--ds-fs-2xl','Big number'],['--ds-fs-xl','Section title'],['--ds-fs-lg','Card title'],['--ds-fs-md','Body'],['--ds-fs-sm','Label'],['--ds-fs-xs','Small'],['--ds-fs-2xs','Micro']];
const RADII = [['--ds-radius-sm','Small'],['--ds-radius-md','Buttons, inputs'],['--ds-radius-lg','Cards, panels'],['--ds-radius-pill','Chips']];
const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const val = n => getComputedStyle(root).getPropertyValue(n).trim();
const hex = n => { const c = document.createElement('i'); c.style.color = `var(${n})`; document.body.appendChild(c); const rgb = getComputedStyle(c).color; c.remove(); const m = rgb.match(/[\d.]+/g) || []; return '#' + m.slice(0,3).map(x => Math.round(+x).toString(16).padStart(2,'0')).join(''); };

const swatches = COLORS.map(([g, items]) => `<h3>${g}</h3><div class="ds-swatches">${items.map(([n,l]) => `<div class="ds-swatch"><i style="background:var(${n})"></i><div><b>${l}</b><span class="hex" data-hex="${n}"></span><code>${n}</code></div></div>`).join('')}</div>`).join('');
const scale = SCALE.map(([n,l]) => `<div class="ds-spec"><span>${l}<br><code>${n}</code> <code data-val="${n}"></code></span><div style="font-size:var(${n});font-family:${n==='--ds-fs-3xl'||n==='--ds-fs-xl'?'var(--ds-font-display)':'var(--ds-font-ui)'};font-weight:${n==='--ds-fs-md'||n==='--ds-fs-sm'?500:700}">Make room for what matters · EGP 12,450</div></div>`).join('');
const radii = RADII.map(([n,l]) => `<div class="ds-swatch"><i style="background:var(--ds-brand-soft);border-radius:var(${n});margin:12px;border:1px solid var(--ds-brand)"></i><div><b>${l}</b><code>${n}</code><code data-val="${n}"></code></div></div>`).join('');
const legacyRows = legacy.map(l => `<tr><td><code>${esc(l.name)}</code></td><td>${l.uses}</td><td>${l.fallbacks.map(f => `<code>${esc(f)}</code>`).join(' ')}</td></tr>`).join('');
const icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/></svg>';

document.getElementById('ds-root').innerHTML = `<div class="ds-doc">
 <div class="ds-doc-top"><div><h1>Pocket Design System</h1><p class="lede" style="margin:0">Colors, fonts, controls and components. Everything on this page reads <code>src/design-system/tokens.css</code>, so a change there updates this page and the whole app.</p></div>
  <div class="ds-switch"><label>Theme <select id="ds-theme"><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Accent <select id="ds-accent"><option value="">Default</option><option value="lavender">Lavender</option><option value="ocean">Ocean</option><option value="forest">Forest</option></select></label></div></div>
 <ul class="ds-nav"><li><a href="#colors">Colors</a></li><li><a href="#type">Typography</a></li><li><a href="#controls">Inputs</a></li><li><a href="#buttons">Buttons</a></li><li><a href="#cards">Cards &amp; chips</a></li><li><a href="#patterns">Patterns</a></li><li><a href="#credit">Credit card</a></li><li><a href="#legacy">Legacy tokens</a></li></ul>

 <h2 id="colors">Colors</h2><p class="lede">Hex values update live when you switch theme or accent.</p>${swatches}
 <h3>Shape</h3><div class="ds-swatches">${radii}</div>

 <h2 id="type">Typography</h2><p class="lede">Sora for headings and the brand, Manrope for everything else. Sizes come from the <code>--ds-fs-*</code> scale.</p>
 <div class="ds-spec"><span>Display<br><code>--ds-font-display</code></span><div style="font-family:var(--ds-font-display);font-size:28px;font-weight:800;letter-spacing:-.04em">Sora · Pocket 1234567890</div></div>
 <div class="ds-spec"><span>UI<br><code>--ds-font-ui</code></span><div style="font-family:var(--ds-font-ui);font-size:18px;font-weight:600">Manrope · Accounts, Debts &amp; installments 1234567890</div></div>
 ${scale}

 <h2 id="controls">Inputs</h2><p class="lede">All inputs, selects and textareas use one text size, <code>--ds-control-fs</code>: 13px on desktop, 16px on phones and touch screens (smaller than 16px makes iOS zoom the page when you tap a field).</p>
 <div class="ds-note">Live check: this input is <b id="ds-live-fs">…</b> right now (window <b id="ds-live-w">…</b>). Resize the window below 760px and it switches to 16px.</div>
 <div class="ds-grid">
  <label class="field"><span>Text input</span><input id="ds-in" placeholder="Card name, e.g. CIB Mastercard" /></label>
  <label class="field"><span>Number</span><input type="number" placeholder="60000" /></label>
  <label class="field"><span>Select</span><select><option>Bank account</option><option>Cash</option><option>E-wallet</option></select></label>
  <label class="field"><span>Date</span><input type="date" value="2026-10-29" /></label>
  <label class="field" style="grid-column:1/-1"><span>Notes</span><textarea rows="3" placeholder="Anything to remember"></textarea></label>
 </div>

 <h2 id="buttons">Buttons</h2>
 <div class="ds-row"><button class="btn btn-primary">Primary</button><button class="btn btn-secondary">Secondary</button><button class="btn btn-danger">Delete</button><button class="btn btn-primary" disabled>Disabled</button><button class="btn btn-secondary btn-sm">Small</button></div>

 <h2 id="cards">Cards &amp; chips</h2>
 <div class="ds-grid">
  <div class="metric-card"><div class="metric-top"><span>Tracked balance</span><span class="metric-icon blue">${icon}</span></div><div class="metric-value">EGP 99,610</div><div class="metric-foot"><span>opening balances + linked activity</span></div></div>
  <section class="panel ds-card-demo"><b>Panel</b><p style="color:var(--ds-text-muted);font-size:var(--ds-fs-md);margin:6px 0 0">Used for lists, forms and details.</p></section>
 </div>
 <h3>Status chips</h3><div class="ds-row"><span class="cc-chip">In 23 days</span><span class="cc-chip ok">Paid</span><span class="cc-chip warn">In 4 days</span><span class="cc-chip bad">Overdue by 27 days</span></div>

 <h2 id="patterns">Patterns</h2><p class="lede">Used in wizards and popups. Styles live in <code>patterns.css</code>.</p>
 <h3>Wizard action row</h3><p class="lede">Back or Cancel on the left, the main action on the right. Same in every popup. Never lifts or spins on hover.</p>
 <div class="ds-card-demo"><div class="modal-actions"><button class="btn btn-secondary">Back</button><button class="btn btn-primary">Continue</button></div></div>
 <h3>Repeatable rows</h3><p class="lede">A list the user can add to and remove from, like tanks and batteries of a vehicle.</p>
 <div class="ds-repeat"><div class="ds-repeat-head"><b>Tanks &amp; batteries</b><small>Gas is in m³ and batteries in kWh.</small></div><div class="ds-repeat-row"><select><option>Petrol</option><option>Gas</option></select><input placeholder="Name (optional)"/><span class="ds-repeat-unit"><input type="number" placeholder="Capacity" value="50"/><em>L</em></span><button type="button" class="icon-btn" aria-label="Remove">✕</button></div><button type="button" class="btn btn-secondary ds-repeat-add">Add tank or battery</button></div>

 <h2 id="credit">Credit card</h2><p class="lede">The card and limit bar used in Debts &amp; installments.</p>
 <div class="ds-grid"><div class="cc-visual"><span class="cc-v-icon">${icon}</span><div><small>Credit card</small><strong>CIB Mastercard</strong><small>Statement on the 25th · Pay within 25 days</small></div></div>
 <div class="ds-card-demo"><div style="display:flex;justify-content:space-between;font-weight:700"><span>EGP 51,050 available</span><span style="color:var(--ds-text-muted);font-weight:500">EGP 8,950 used of EGP 60,000</span></div><div class="cc-bar" style="margin-top:10px"><i style="width:15%"></i></div></div></div>

 <h2 id="legacy">Legacy tokens to clean up</h2><p class="lede">${legacy.length} variable names are used in the CSS but never defined, so each use falls back to its own hard-coded color. That is why the same "border" or "text" color differs between pages. Several fallbacks are deliberately dark (for example on the login screen), so mapping them all to one value would break those screens. Move them to <code>--ds-*</code> tokens one screen at a time.</p>
 <div class="ds-scroll"><table class="ds-token-table"><thead><tr><th>Variable</th><th>Uses</th><th>Most common fallbacks</th></tr></thead><tbody>${legacyRows}</tbody></table></div>
</div>`;

const refresh = () => {
  document.querySelectorAll('[data-hex]').forEach(e => { e.textContent = hex(e.dataset.hex); });
  document.querySelectorAll('[data-val]').forEach(e => { e.textContent = val(e.dataset.val); });
  const i = document.getElementById('ds-in');
  document.getElementById('ds-live-fs').textContent = getComputedStyle(i).fontSize;
  document.getElementById('ds-live-w').textContent = window.innerWidth + 'px';
};
document.getElementById('ds-theme').addEventListener('change', e => { root.setAttribute('data-theme', e.target.value); refresh(); });
document.getElementById('ds-accent').addEventListener('change', e => { e.target.value ? root.setAttribute('data-design', e.target.value) : root.removeAttribute('data-design'); refresh(); });
window.addEventListener('resize', refresh);
refresh();
