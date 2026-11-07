

export const coreExpenseCategories = ['Housing','Food & Groceries','Transportation','Bills & Utilities','Health','Shopping','Entertainment','Education','Travel','Savings & Debt','Family & Giving','Other'];

export const womenExpenseCategories = ['Beauty & Skincare','Hair & Nails','Personal & Period Care','Fashion & Styling'];

export const menExpenseCategories = ['Grooming & Personal Care','Fitness & Sports','Style & Accessories','Car & Gear'];

export const defaultExpenseCategories = [...new Set([...coreExpenseCategories,...womenExpenseCategories,...menExpenseCategories])];

export let expenseCategoriesOverride = null;

export const setExpenseCategoriesOverride = list => { expenseCategoriesOverride = Array.isArray(list) ? [...new Set(list.map(x=>String(x).trim()).filter(Boolean))] : null; try{expenseCategories.splice(0,expenseCategories.length,...getExpenseCategories(''))}catch{} window.dispatchEvent(new Event('pocket-expense-categories-updated')); };

export const readExpenseCategories = () => { try { const saved=JSON.parse(null||'null'); return Array.isArray(saved)&&saved.length?saved.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()):null; } catch { return null; } };

export const getExpenseCategories = gender => { if(expenseCategoriesOverride) return expenseCategoriesOverride; const saved=readExpenseCategories(); return saved || [...new Set([...coreExpenseCategories,...(gender==='female'?womenExpenseCategories:gender==='male'?menExpenseCategories:[])])]; };

export const expenseCategories = getExpenseCategories('');

export const incomeCategories = ['Salary','Freelance','Business','Bonus','Investments','Other income'];

export const categories = [...new Set([...getExpenseCategories('female'),...getExpenseCategories('male'),...incomeCategories,'Transfer'])];

export const getCategoriesForType = (type,gender) => type==='Income'?incomeCategories:type==='Transfer'?['Transfer']:getExpenseCategories(gender);

export const categoryHierarchy = {
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

export const incomeSubcategories = {'Salary':['Monthly salary','Commission','Overtime'],'Freelance':['Freelance project','Consulting','Contract work'],'Business':['Sales revenue','Business profit','Other business income'],'Bonus':['Performance bonus','Gift bonus','Other bonus'],'Investments':['Dividends','Interest','Investment return'],'Other income':['Refund','Cashback','Other income']};

export const uniqueOptions = values => [...new Map(values.filter(v=>typeof v==='string'&&v.trim()).map(v=>[v.trim().toLocaleLowerCase(),v.trim()])).values()];

export let customSubcategoriesOverride = {};

export const getCustomSubcategories = category => Array.isArray(customSubcategoriesOverride[category]) && customSubcategoriesOverride[category].length ? customSubcategoriesOverride[category] : null;

export const setCustomSubcategoriesOverride = values => { customSubcategoriesOverride = values && typeof values === 'object' ? values : {}; window.dispatchEvent(new Event('pocket-subcategories-updated')); };

export const saveCustomSubcategories = (category, values) => { customSubcategoriesOverride = {...customSubcategoriesOverride, [category]: uniqueOptions(values)}; window.dispatchEvent(new Event('pocket-subcategories-updated')); };

export const getSubcategories = (type,category) => uniqueOptions(type==='Income'?(incomeSubcategories[category]||['Other income']):type==='Transfer'?['Transfer']:(getCustomSubcategories(category)||categoryHierarchy[category]||['Other expense']));
