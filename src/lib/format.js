

export function titleCaseName(value){return String(value||'').trim().replace(/\s+/g,' ').split(' ').map(part=>part?part.charAt(0).toLocaleUpperCase()+part.slice(1).toLocaleLowerCase():'').join(' ');}

// Explicit timezone choices used by Account & Profile; avoids a runtime crash when opening the modal.
export const zones = ['Africa/Cairo','Africa/Casablanca','Africa/Johannesburg','Asia/Dubai','Asia/Riyadh','Asia/Kuwait','Asia/Qatar','Asia/Amman','Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','Asia/Tokyo','Australia/Sydney'];

export const palette = ['#6c7cf5','#50b99a','#f5b85b','#ee8291','#9b8af7','#59a8d8','#e79a6c','#7e9b87'];

export const localISODate = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export const monthNow = localISODate().slice(0,7);

// The user's main (display) currency. App sets it from the profile; every fmt() call follows it.
let displayCurrency='EGP';
export const setDisplayCurrency = c => { if (c) displayCurrency = String(c).toUpperCase(); };
export const getDisplayCurrency = () => displayCurrency;
/** Format an amount in a specific currency (e.g. a USD account's balance). */
export const fmtIn = (n, currency) => { const c = String(currency || displayCurrency).toUpperCase(); try { return new Intl.NumberFormat('en-EG',{style:'currency',currency:c,maximumFractionDigits:c==='EGP'?0:2}).format(Number(n)||0); } catch { return `${(Number(n)||0).toLocaleString('en-EG')} ${c}`; } };
export const fmt = n => fmtIn(n, displayCurrency);
export const CURRENCIES = ['EGP','USD','EUR','GBP','SAR','AED','KWD','QAR','JOD','MAD','TRY','JPY','CAD','AUD','CHF'];

export const firstName = name => String(name||'').trim().split(/\s+/)[0] || '';

export const getGreeting = (timezone) => { let hour=new Date().getHours(); try { if(timezone) hour=Number(new Intl.DateTimeFormat('en-US',{hour:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date())); } catch {} return hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'; };

// Next due date after `date`, moved forward until it is after `today`.
// Month steps keep the original day and clamp to the month's last day (Jan 31 -> Feb 28 -> Mar 31), instead of overflowing into the next month.
export const addFrequency = (date, frequency, today = localISODate()) => {
  const start = new Date(`${date||today}T12:00:00`);
  const anchorDay = start.getDate();
  const addMonths = (d, n) => { const y=d.getFullYear(), m=d.getMonth()+n; const last=new Date(y, m+1, 0, 12).getDate(); return new Date(y, m, Math.min(anchorDay, last), 12); };
  const step = d => frequency==='Weekly' ? new Date(d.getFullYear(), d.getMonth(), d.getDate()+7, 12) : frequency==='Monthly' ? addMonths(d,1) : frequency==='Quarterly' ? addMonths(d,3) : addMonths(d,12);
  let d=step(start); while(localISODate(d)<=today) d=step(d); return localISODate(d);
};

export const shortDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'No date';

export const monthLabel = m => new Date(m+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});

export const monthStart = m => `${m}-01`;

export const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
