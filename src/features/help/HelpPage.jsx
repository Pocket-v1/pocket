import { useMemo, useState } from 'react';
import { PageHeading } from '../../components/ui/PageHeading.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Search, Mail, Copy, Check } from '../../lib/icons.jsx';

// Help center: search, topics, answers, and a way to reach us.
// Built from design-system pieces: PageHeading, Tabs, panel, EmptyState, buttons.
export const SUPPORT_EMAIL = 'pocket.egypt.app@gmail.com';

const TOPICS = [
  { key: 'all', label: 'All' },
  { key: 'start', label: 'Getting started' },
  { key: 'sms', label: 'Bank SMS' },
  { key: 'plus', label: 'Plus & payments' },
  { key: 'account', label: 'Account' },
];

const FAQ = [
  ['start', 'How do I start using Pocket?', 'Add your accounts first (cash, bank, wallet) from Accounts. Then record your expenses and income with the + button. Your Overview fills up as you go.'],
  ['start', 'What is the difference between an account and a credit card?', 'Accounts hold your own money (cash, bank, e-wallet). Credit cards and installment apps like Valu, Aman or Halan are money you owe, so they are kept apart and not counted in your balance. Manage them in Debts & installments.'],
  ['start', 'How do budgets work?', 'In Budgets, pick a category and a monthly limit. Pocket adds up your expenses in that category and shows how much is left.'],
  ['start', 'How do I move money between my accounts?', 'Tap + and choose Transfer. Pick where the money comes from and where it goes. A transfer is not counted as spending.'],
  ['sms', 'How do I connect my bank SMS?', 'Open Bank SMS and follow the steps for iPhone (a Shortcuts automation) or Android (an SMS forwarder app). After that, each bank message shows up in Pocket ready to approve.'],
  ['sms', 'My bank messages are not showing up', 'Check that the automation on your phone is turned on and has internet. On iPhone, open Shortcuts and make sure the automation runs without asking. Then send yourself a test from the Bank SMS page.'],
  ['sms', 'Pocket picked the wrong account or category', 'Tap Edit on the message before you approve it. Pocket learns from your choice, so the next message from the same shop is filled the way you chose.'],
  ['sms', 'Does Pocket read all my messages?', 'No. Only the messages your phone forwards to Pocket arrive. Set your automation to forward messages from your bank and wallet senders only.'],
  ['plus', 'What does Pocket Plus add?', 'Bank SMS, adding by typing, voice or a receipt photo, and Vehicles. Everything else in Pocket stays free.'],
  ['plus', 'I paid for Plus. When does it turn on?', 'Usually within minutes, as soon as your payment arrives. Adding the transfer screenshot or the transaction number makes it faster. If it is not on within a day, contact us below.'],
  ['plus', 'How do I pay?', 'With InstaPay or a mobile wallet. Choose a plan on the Pocket Plus page, send the amount shown, then tap “I sent the money”.'],
  ['plus', 'How do I stop Plus?', 'On the Pocket Plus page, tap “Cancel at the end of the period”. You keep Plus until the date shown.'],
  ['account', 'Is my data safe?', 'Your data is private to your account and other users cannot see it. Pocket never asks for or stores card numbers or bank passwords.'],
  ['account', 'How do I change my name, photo or password?', 'Open the menu under your photo and choose Account & profile.'],
  ['account', 'How do I delete my account?', 'Send us a message from this page using the email on your account, and we delete your account and all your data.'],
];

export function HelpPage({ userEmail = '', fromPage = '', onToast }) {
  const [topic, setTopic] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(false);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return FAQ.filter(([t, question, answer]) => (topic === 'all' || t === topic) && words.every(w => `${question} ${answer}`.toLowerCase().includes(w)));
  }, [topic, q]);
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Pocket help')}&body=${encodeURIComponent(`\n\n\n---\nAccount: ${userEmail || '-'}\nPage: ${fromPage || '-'}\nDevice: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(SUPPORT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { onToast?.(SUPPORT_EMAIL); }
  }
  return <div className="help-page">
    <PageHeading eyebrow="HELP CENTER" title="How can we help?" subtitle="Quick answers about Pocket. Can't find it? Write to us." />
    <label className="help-search"><Search size={18} aria-hidden="true" /><input type="search" value={q} onChange={e => { setQ(e.target.value); setOpen(null); }} placeholder="Search: SMS, payment, budget…" aria-label="Search help" /></label>
    <Tabs label="Help topics" value={topic} onChange={v => { setTopic(v); setOpen(null); }} items={TOPICS} />
    <div className="help-layout">
      <section className="panel help-list" aria-label="Answers">
        {list.length ? list.map(([, question, answer], i) => {
          const isOpen = open === question || (q.trim() && list.length <= 2);
          return <div className={`help-item ${isOpen ? 'open' : ''}`} key={question}>
            <button type="button" className="help-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : question)}><b>{question}</b><span className="help-chev" aria-hidden="true" /></button>
            {isOpen && <p className="help-a">{answer}</p>}
          </div>;
        }) : <EmptyState inline icon={Search} title="No answer found" text="Try other words, or send us a message." />}
      </section>
      <aside className="help-contact" aria-label="Contact us">
        <div className="help-contact-head"><span className="help-contact-ic"><Mail size={20} /></span><span><b>Still need help?</b><small>We reply within a day</small></span></div>
        <a className="btn help-contact-btn" href={mailto}>Send us a message</a>
        <button type="button" className="help-contact-mail" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <>or email {SUPPORT_EMAIL} <Copy size={14} /></>}</button>
      </aside>
    </div>
  </div>;
}
