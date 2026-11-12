const localDemoAccounts = [
  { username: 'test-user', password: '12345678', role: 'user', full_name: 'Test User', email: null, user_id: 'local-demo-test-user', enabled_features: ['Overview','Transactions','Accounts','Cash flow calendar','Budgets','Savings goals','Subscriptions & bills','Debts & installments','Insights & reports'].map(key=>({Overview:'overview',Transactions:'transactions','Accounts':'accounts','Cash flow calendar':'calendar',Budgets:'budgets','Savings goals':'goals','Subscriptions & bills':'recurring','Debts & installments':'debts','Insights & reports':'insights'}[key])) },
  { username: 'test-admin', password: '12345678', role: 'super_admin', full_name: 'Test Admin', email: null, user_id: 'local-demo-test-admin', enabled_features: [] }
];

const coreExpenseCategories = ['Housing','Food & Groceries','Transportation','Bills & Utilities','Health','Shopping','Entertainment','Education','Travel','Savings & Debt','Family & Giving','Other'];
const womenExpenseCategories = ['Beauty & Skincare','Hair & Nails','Personal & Period Care','Fashion & Styling'];
const menExpenseCategories = ['Grooming & Personal Care','Fitness & Sports','Style & Accessories','Car & Gear'];
const defaultExpenseCategories = [...new Set([...coreExpenseCategories,...womenExpenseCategories,...menExpenseCategories])];
let expenseCategoriesOverride = null;
const setExpenseCategoriesOverride = list => { expenseCategoriesOverride = Array.isArray(list) ? [...new Set(list.map(x=>String(x).trim()).filter(Boolean))] : null; window.dispatchEvent(new Event('pocket-expense-categories-updated')); };
const readExpenseCategories = () => { try { const saved=JSON.parse(null||'null'); return Array.isArray(saved)&&saved.length?saved.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()):null; } catch { return null; } };
const getExpenseCategories = gender => { if(expenseCategoriesOverride) return expenseCategoriesOverride; const saved=readExpenseCategories(); return saved || [...new Set([...coreExpenseCategories,...(gender==='female'?womenExpenseCategories:gender==='male'?menExpenseCategories:[])])]; };
const expenseCategories = getExpenseCategories('');
const incomeCategories = ['Salary','Freelance','Business','Bonus','Investments','Other income'];
// Explicit timezone choices used by Account & Profile; avoids a runtime crash when opening the modal.
const zones = ['Africa/Cairo','Africa/Casablanca','Africa/Johannesburg','Asia/Dubai','Asia/Riyadh','Asia/Kuwait','Asia/Qatar','Asia/Amman','Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','Asia/Tokyo','Australia/Sydney'];
const categories = [...new Set([...getExpenseCategories('female'),...getExpenseCategories('male'),...incomeCategories,'Transfer'])];
const getCategoriesForType = (type,gender) => type==='Income'?incomeCategories:type==='Transfer'?['Transfer']:getExpenseCategories(gender);
const categoryHierarchy = {
  'Housing':['Rent','Mortgage','Home maintenance','Furniture','Home supplies'],
  'Food & Groceries':['Groceries','Restaurants','Coffee','Food delivery','Takeaway'],
  'Transportation':['Fuel','Ride-hailing','Public transport','Parking','Car maintenance'],
  'Bills & Utilities':['Electricity','Water','Gas','Internet','Mobile bill'],
  'Health':['Doctor','Pharmacy','Dental care','Medical tests','Health insurance'],
  'Shopping':['Clothing','Shoes','Accessories','Electronics','Other shopping'],
  'Entertainment':['Movies','Gaming','Events','Hobbies','Activities'],
  'Education':['Courses','Books','Tuition','Certifications'],
  'Travel':['Flights','Hotels','Local transport','Activities','Travel insurance'],
  'Savings & Debt':['Savings contribution','Loan payment','Credit card payment','Debt repayment'],
  'Family & Giving':['Family support','Gifts','Donations','Charity'],
  'Beauty & Skincare':['Skincare','Makeup','Perfume','Beauty products'],
  'Hair & Nails':['Hair salon','Hair products','Manicure','Pedicure'],
  'Personal & Period Care':['Personal hygiene','Period products','Women’s health'],
  'Fashion & Styling':['Outfits','Bags','Jewelry','Occasion wear','Alterations'],
  'Grooming & Personal Care':['Barber','Shaving','Hair products','Skincare','Perfume'],
  'Fitness & Sports':['Gym','Sports gear','Sports activities','Fitness classes'],
  'Style & Accessories':['Clothing','Watches','Shoes','Bags','Accessories'],
  'Car & Gear':['Car upgrades','Car accessories','Car detailing','Equipment'],
  'Other':['Other expense']
};
const incomeSubcategories = {'Salary':['Monthly salary','Commission','Overtime'],'Freelance':['Freelance project','Consulting','Contract work'],'Business':['Sales revenue','Business profit','Other business income'],'Bonus':['Performance bonus','Gift bonus','Other bonus'],'Investments':['Dividends','Interest','Investment return'],'Other income':['Refund','Cashback','Other income']};
const uniqueOptions = values => [...new Map(values.filter(v=>typeof v==='string'&&v.trim()).map(v=>[v.trim().toLocaleLowerCase(),v.trim()])).values()];
let customSubcategoriesOverride = {};
const getCustomSubcategories = category => Array.isArray(customSubcategoriesOverride[category]) && customSubcategoriesOverride[category].length ? customSubcategoriesOverride[category] : null;
const setCustomSubcategoriesOverride = values => { customSubcategoriesOverride = values && typeof values === 'object' ? values : {}; window.dispatchEvent(new Event('pocket-subcategories-updated')); };
const saveCustomSubcategories = (category, values) => { customSubcategoriesOverride = {...customSubcategoriesOverride, [category]: uniqueOptions(values)}; window.dispatchEvent(new Event('pocket-subcategories-updated')); };
const getSubcategories = (type,category) => uniqueOptions(type==='Income'?(incomeSubcategories[category]||['Other income']):type==='Transfer'?['Transfer']:(getCustomSubcategories(category)||categoryHierarchy[category]||['Other expense']));
const palette = ['#6c7cf5','#50b99a','#f5b85b','#ee8291','#9b8af7','#59a8d8','#e79a6c','#7e9b87'];
const demoTransactions = [
  {id:'d1',transaction_date:'2026-10-01',type:'Income',category:'Salary',description:'Monthly salary',amount:28000,need_want:null,fixed_variable:'Fixed',payment_method:'Bank Transfer',recurring:true,notes:''},
  {id:'d2',transaction_date:'2026-10-02',type:'Expense',category:'Housing',subcategory:'Rent',description:'Apartment rent',amount:6500,need_want:'Need',fixed_variable:'Fixed',payment_method:'Bank Transfer',recurring:true,notes:''},
  {id:'d3',transaction_date:'2026-10-03',type:'Expense',category:'Food & Groceries',subcategory:'Groceries',description:'Groceries',amount:820,need_want:'Need',fixed_variable:'Variable',payment_method:'Debit Card',recurring:false,notes:''},
  {id:'d4',transaction_date:'2026-10-05',type:'Expense',category:'Transportation',description:'Fuel',amount:480,need_want:'Need',fixed_variable:'Variable',payment_method:'Debit Card',recurring:false,notes:''},
  {id:'d5',transaction_date:'2026-10-06',type:'Expense',category:'Shopping',description:'Personal purchase',amount:1250,need_want:'Want',fixed_variable:'Variable',payment_method:'Credit Card',recurring:false,notes:''},
  {id:'d6',transaction_date:'2026-10-08',type:'Expense',category:'Bills & Utilities',subcategory:'Mobile bill',description:'Mobile plan',amount:350,need_want:'Need',fixed_variable:'Fixed',payment_method:'Wallet',recurring:true,notes:''},
  {id:'d7',transaction_date:'2026-10-10',type:'Expense',category:'Food & Groceries',subcategory:'Restaurants',description:'Dinner',amount:290,need_want:'Want',fixed_variable:'Variable',payment_method:'Cash',recurring:false,notes:''},
  {id:'d8',transaction_date:'2026-10-12',type:'Income',category:'Freelance',description:'Project payment',amount:3500,need_want:null,fixed_variable:'Variable',payment_method:'Bank Transfer',recurring:false,notes:''},
  {id:'d9',transaction_date:'2026-10-14',type:'Expense',category:'Health',description:'Pharmacy',amount:420,need_want:'Need',fixed_variable:'Variable',payment_method:'Cash',recurring:false,notes:''},
  {id:'d10',transaction_date:'2026-10-15',type:'Expense',category:'Entertainment',description:'Cinema and coffee',amount:540,need_want:'Want',fixed_variable:'Variable',payment_method:'Debit Card',recurring:false,notes:''},
  {id:'d11',transaction_date:'2026-09-28',type:'Expense',category:'Education',subcategory:'Courses',description:'Online course',amount:900,need_want:'Want',fixed_variable:'Fixed',payment_method:'Credit Card',recurring:false,notes:''},
];
const starterGoals = [{id:'g1',name:'Emergency fund',target_amount:50000,saved_amount:12500,target_date:'2027-06-30',notes:'Build a safety net'}];
const starterRecurring = [
  {id:'r1',name:'Rent',category:'Housing',amount:6500,frequency:'Monthly',next_due_date:'2026-11-01',auto_pay:true,paid_this_cycle:false,essential:true,notes:''},
  {id:'r2',name:'Mobile plan',category:'Bills & Utilities',amount:350,frequency:'Monthly',next_due_date:'2026-11-08',auto_pay:false,paid_this_cycle:false,essential:true,notes:''},
  {id:'r3',name:'Streaming subscription',category:'Entertainment',amount:220,frequency:'Monthly',next_due_date:'2026-10-25',auto_pay:true,paid_this_cycle:false,essential:false,notes:''},
];
const isGoalsAccount = account => Boolean(account && (account.is_system===true || (String(account.name||'').trim().toLowerCase()==='goals' && String(account.type||'').toLowerCase().includes('saving'))));
const localISODate = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const monthNow = localISODate().slice(0,7);
const fmt = n => { let currency='EGP'; try { currency=null||'EGP'; } catch {} return new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:currency==='EGP'?0:2}).format(Number(n)||0); };
const firstName = name => String(name||'').trim().split(/\s+/)[0] || '';
const getGreeting = (timezone) => { let hour=new Date().getHours(); try { if(timezone) hour=Number(new Intl.DateTimeFormat('en-US',{hour:'2-digit',hourCycle:'h23',timeZone:timezone}).format(new Date())); } catch {} return hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'; };
const PROFILE_AVATARS = Array.from({length:10},(_,i)=>({id:`avatar-${String(i+1).padStart(2,'0')}`,gender:[0,2,5,6,8].includes(i)?'male':'female',src:`/avatars/avatar-${String(i+1).padStart(2,'0')}.webp`}));
const defaultAvatarForGender = gender => gender==='female'?'avatar-02':gender==='male'?'avatar-01':'avatar-01';
const avatarsForGender = gender => gender==='female'||gender==='male'?PROFILE_AVATARS.filter(avatar=>avatar.gender===gender):PROFILE_AVATARS;
const addFrequency = (date, frequency) => { const step=d=>{if(frequency==='Weekly')d.setDate(d.getDate()+7);else if(frequency==='Monthly')d.setMonth(d.getMonth()+1);else if(frequency==='Quarterly')d.setMonth(d.getMonth()+3);else d.setFullYear(d.getFullYear()+1);return d;};let d=new Date(`${date||localISODate()}T12:00:00`);d=step(d);while(localISODate(d)<=localISODate())d=step(d);return localISODate(d); };
const shortDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'No date';
const monthLabel = m => new Date(m+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const monthStart = m => `${m}-01`;
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
const FEATURE_OPTIONS = [
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
  {key:'chat',label:'Chat (type, talk, receipt photo)',description:'Add things by typing, speaking or snapping a receipt, and ask questions'},
];
const PAGE_FEATURE = {'Overview':'overview','Transactions':'transactions','Bank SMS':'bank_sms','Accounts':'accounts','Cash flow calendar':'calendar','Budgets':'budgets','Savings goals':'goals','Subscriptions & bills':'subscriptions','Recurring payments':'subscriptions','Debts & installments':'debts','Insights & forecast':'insights','Reports':'insights','Insights & reports':'insights','Expense categories':'expense_categories','Vehicle Management':'vehicle_management'};

const POCKET_VALID_PAGES = new Set(['Overview','Transactions','Bank SMS','Accounts','Cash flow calendar','Budgets','Savings goals','Subscriptions & bills','Recurring payments','Debts & installments','Insights & forecast','Insights & reports','Reports','Admin access','Expense categories','Vehicle Management']);

export { localDemoAccounts, coreExpenseCategories, womenExpenseCategories, menExpenseCategories, defaultExpenseCategories, expenseCategoriesOverride, setExpenseCategoriesOverride, readExpenseCategories, getExpenseCategories, expenseCategories, incomeCategories, zones, categories, getCategoriesForType, categoryHierarchy, incomeSubcategories, uniqueOptions, customSubcategoriesOverride, getCustomSubcategories, setCustomSubcategoriesOverride, saveCustomSubcategories, getSubcategories, palette, demoTransactions, starterGoals, starterRecurring, isGoalsAccount, localISODate, monthNow, fmt, firstName, getGreeting, PROFILE_AVATARS, defaultAvatarForGender, avatarsForGender, addFrequency, shortDate, monthLabel, monthStart, uid, FEATURE_OPTIONS, PAGE_FEATURE, POCKET_VALID_PAGES };
