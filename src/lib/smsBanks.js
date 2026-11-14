// Starter settings for common Egyptian banks. Sender names are the usual ones; edit if your bank uses another.
const AR_OUT = ['خصم', 'سحب', 'شراء', 'مشتريات', 'تم تنفيذ'];
const AR_IN = ['ايداع', 'إيداع', 'اضافة', 'إضافة', 'استلام'];
export const BANKS = [
  { name: 'CIB', senders: ['CIB'], debit: ['purchase', 'withdrawal', 'charged', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'NBE', senders: ['NBE', 'AhlyBank'], debit: ['debited', 'purchase', 'withdrawal', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'Banque Misr', senders: ['BanqueMisr', 'BM'], debit: ['debited', 'purchase', 'withdrawal', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'QNB', senders: ['QNB'], debit: ['purchase', 'withdrawal', 'debited', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'Alex Bank', senders: ['AlexBank'], debit: ['debited', 'purchase', 'withdrawal', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'HSBC', senders: ['HSBC'], debit: ['purchase', 'withdrawal', 'debited'], credit: ['credited', 'deposit'] },
  { name: 'AAIB', senders: ['AAIB'], debit: ['purchase', 'debited', 'withdrawal', ...AR_OUT], credit: ['credited', 'deposit', ...AR_IN] },
  { name: 'Valu', senders: ['VALU'], debit: ['installment', 'purchase', 'paid', ...AR_OUT], credit: ['refund', ...AR_IN] },
  { name: 'Contact', senders: ['Contact'], debit: ['installment', 'purchase', 'paid', ...AR_OUT], credit: ['refund', ...AR_IN] },
];
