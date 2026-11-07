

export const isGoalsAccount = account => Boolean(account && (account.is_system===true || (String(account.name||'').trim().toLowerCase()==='goals' && String(account.type||'').toLowerCase().includes('saving'))));

export const FEATURE_OPTIONS = [
  {key:'overview',label:'Overview',description:'Main financial summary and dashboard'},
  {key:'transactions',label:'Transactions',description:'Add, edit, import, and export transactions'},
  {key:'accounts',label:'Accounts',description:'Bank accounts, cash, wallets, and balances'},
  {key:'calendar',label:'Cash flow calendar',description:'Transactions and upcoming payment dates'},
  {key:'budgets',label:'Budgets',description:'Monthly category budgets and limits'},
  {key:'goals',label:'Savings goals',description:'Savings targets and milestones'},
  {key:'subscriptions',label:'Subscriptions & bills',description:'Recurring payments and subscription renewals'},
  {key:'debts',label:'Debts & installments',description:'Debt balances and installment schedule'},
  {key:'insights',label:'Insights & reports',description:'Financial insights, forecasts, monthly and yearly reports'},
  {key:'expense_categories',label:'Expense categories',description:'Manage your own expense categories and subcategories'},
  {key:'bank_sms',label:'Bank SMS',description:'Read bank text messages and approve them as transactions'},
  {key:'vehicle_management',label:'Vehicle Management',description:'Manage vehicles, maintenance schedules, service history and vehicle expenses'},
];

export const PAGE_FEATURE = {'Overview':'overview','Transactions':'transactions','Bank SMS':'bank_sms','Accounts':'accounts','Cash flow calendar':'calendar','Budgets':'budgets','Savings goals':'goals','Subscriptions & bills':'subscriptions','Recurring payments':'subscriptions','Debts & installments':'debts','Insights & forecast':'insights','Reports':'insights','Insights & reports':'insights','Expense categories':'expense_categories','Vehicle Management':'vehicle_management'};

export const POCKET_VALID_PAGES = new Set(['Overview','Transactions','Bank SMS','Accounts','Cash flow calendar','Budgets','Savings goals','Subscriptions & bills','Recurring payments','Debts & installments','Insights & forecast','Insights & reports','Reports','Admin access','Expense categories','Vehicle Management']);
