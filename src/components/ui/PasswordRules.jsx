import { Check, Circle } from '../../lib/icons.jsx';

export const passwordRules = pw => [
  { key: 'len', label: 'At least 10 characters', ok: pw.length >= 10 },
  { key: 'case', label: 'Upper and lower case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { key: 'num', label: 'At least one number', ok: /\d/.test(pw) },
  { key: 'sym', label: 'At least one symbol (! @ # $ …)', ok: /[^A-Za-z0-9]/.test(pw) },
];
export const passwordOk = pw => passwordRules(pw).every(r => r.ok);

export function PasswordRules({ value = '' }) {
  const rules = passwordRules(value);
  const done = rules.filter(r => r.ok).length;
  const label = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][done];
  return <div className="pw-rules" aria-live="polite">
    <div className="pw-meter" data-level={done}><i/><i/><i/><i/><b>{value ? label : 'Password strength'}</b></div>
    <ul>{rules.map(r => <li key={r.key} className={r.ok ? 'ok' : ''}>{r.ok ? <Check size={13}/> : <Circle size={11}/>}{r.label}</li>)}</ul>
  </div>;
}
