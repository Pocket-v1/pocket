// Language support (English / Arabic) with right-to-left layout.
// The UI is written in English; in Arabic mode a translator swaps visible text that has a dictionary entry
// (src/lib/i18n/ar.js), including placeholders, titles and aria-labels. Text without an entry stays English.
import ar from './ar.js';

const KEY = 'pocket-language';
const dict = { ar };
const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);
const original = new WeakMap(); // text node -> English text it showed
let lang = 'en';
let observer = null;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };

export const LANGUAGES = [{ code: 'en', label: 'English' }, { code: 'ar', label: 'العربية' }];
export const getLang = () => lang;

/** Translate one string (for code that builds text in JS). */
export function t(text) {
  if (lang === 'en' || text == null) return text;
  return dict[lang]?.[String(text).trim()] ?? text;
}

function lookup(raw) {
  const key = raw.trim();
  if (!key) return null;
  const hit = dict[lang]?.[key];
  return hit == null ? null : raw.replace(key, hit);
}

const skipped = el => !el || SKIP.has(el.tagName) || el.closest?.('[data-no-translate]');

function translateText(node) {
  const parent = node.parentElement;
  if (skipped(parent)) return;
  // An <option> without a value attribute submits its text, so translating it would change the value.
  if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) return;
  const value = node.nodeValue;
  const out = lookup(value);
  if (out != null && out !== value) { original.set(node, value); node.nodeValue = out; }
}

function translateAttrs(el) {
  if (skipped(el) && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
  if (el.closest?.('[data-no-translate]')) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const out = lookup(v);
    if (out != null && out !== v) { el.setAttribute(`data-i18n-${a}`, v); el.setAttribute(a, out); }
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) { translateText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n); else translateAttrs(n);
  }
}

function restoreTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) { const o = original.get(n); if (o != null) { n.nodeValue = o; original.delete(n); } }
    else for (const a of ATTRS) { const o = n.getAttribute(`data-i18n-${a}`); if (o != null) { n.setAttribute(a, o); n.removeAttribute(`data-i18n-${a}`); } }
  }
}

function start() {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') translateText(m.target);
      else if (m.type === 'attributes') translateAttrs(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  translateTree(document.body);
}

function stop() { observer?.disconnect(); observer = null; restoreTree(document.body); }

/** Switch language: updates <html lang/dir>, remembers the choice on this device, and translates the page. */
export function setLang(next) {
  lang = dict[next] ? next : 'en';
  write(lang);
  const html = document.documentElement;
  html.lang = lang; html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (lang === 'en') stop(); else { stop(); start(); }
  window.dispatchEvent(new Event('pocket-language-changed'));
}

/** Call once at startup. */
export function initLang() {
  setLang(read() || 'en');
}
