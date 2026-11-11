import { Search, PanelLeftClose, PanelLeftOpen, ArrowLeftRight, ArrowUpRight, Bell, CalendarDays, CarFront, ChartNoAxesCombined, Check, ChevronDown, CircleDollarSign, CreditCard, Fuel, History, LayoutDashboard, Lock, LogOut, Mail, Menu, MessageSquare, Moon, Repeat2, Settings, SlidersHorizontal, Sun, Target, UserRound, Users, Wallet, Wrench, X, XCircle } from 'lucide-react';
import { useSheetManager } from './hooks/useSheetManager.js';
import * as XLSX from 'xlsx';
import { exportTransactions, downloadTemplate } from './lib/transferFile.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmActionModal } from './components/modals/ConfirmActionModal.jsx';
import { ProfileAvatar } from './components/ui/ProfileAvatar.jsx';
import { storedTheme, saveTheme, bootTheme } from './lib/theme.js';
import { WorkspaceSkeleton } from './components/ui/WorkspaceSkeleton.jsx';
import { AccountModal } from './features/accounts/AccountModal.jsx';
import { AccountsPage } from './features/accounts/AccountsPage.jsx';
import { SmsPage } from './features/sms/SmsPage.jsx';
import { AccessManagementPage } from './features/admin/AccessManagementPage.jsx';
import { EmailStatusBar } from './components/ui/EmailStatusBar.jsx';
import { WelcomeWizard } from './features/overview/WelcomeWizard.jsx';
import { AppTour } from './components/ui/AppTour.jsx';
import { AccessRestricted } from './features/admin/AccessRestricted.jsx';
import { VehicleManagementPage } from './features/admin/VehicleManagementPage.jsx';
import { AccountProfileModal } from './features/auth/AccountProfileModal.jsx';
import { AuthScreen } from './features/auth/AuthScreen.jsx';
import { AvatarPickerModal } from './features/auth/AvatarPickerModal.jsx';
import { BudgetModal } from './features/budgets/BudgetModal.jsx';
import { BudgetsPage } from './features/budgets/BudgetsPage.jsx';
import { DebtModal } from './features/debts/DebtModal.jsx';
import { DebtPaymentChoiceModal } from './features/debts/DebtPaymentChoiceModal.jsx';
import { DebtsPage } from './features/debts/DebtsPage.jsx';
import { GoalModal } from './features/goals/GoalModal.jsx';
import { GoalsPage } from './features/goals/GoalsPage.jsx';
import { InsightsReportsPage } from './features/insights/InsightsReportsPage.jsx';
import { CashFlowCalendar } from './features/overview/CashFlowCalendar.jsx';
import { Overview } from './features/overview/Overview.jsx';
import { RecurringModal } from './features/recurring/RecurringModal.jsx';
import { QuickAdd } from './components/ui/QuickAdd.jsx';
import { GlobalSearch } from './components/ui/GlobalSearch.jsx';
import { RecurringPage } from './features/recurring/RecurringPage.jsx';
import { ExpenseCategoriesPage } from './features/settings/ExpenseCategoriesPage.jsx';
import { SettingsModal } from './features/settings/SettingsModal.jsx';
import { ImportModal } from './features/transactions/ImportModal.jsx';
import { setCategoryIconOverrides } from './lib/categoryIcons.js';
import { ChatSheet } from './components/ui/ChatSheet.jsx';
import { TransactionModal } from './features/transactions/TransactionModal.jsx';
import { TransactionsPage } from './features/transactions/TransactionsPage.jsx';
import { PROFILE_AVATARS, defaultAvatarForGender } from './lib/avatars.js';
import { customSubcategoriesOverride, incomeCategories, getCategoriesForType, expenseCategories, expenseCategoriesOverride, getExpenseCategories, setCustomSubcategoriesOverride, setExpenseCategoriesOverride } from './lib/categories.js';
import { FEATURE_OPTIONS, PAGE_FEATURE, isGoalsAccount } from './lib/features.js';
import { addFrequency, fmt, getGreeting, localISODate, monthNow, monthStart, titleCaseName, uid } from './lib/format.js';
import { authRedirectUrl, cloudReady, supabase } from './lib/supabase.js';
import { clearLoginFailures, formatWait, loginLockSeconds, recordLoginFailure } from './lib/loginThrottle.js';
import { CardPayModal } from './features/credit/CardPayModal.jsx';
import { CreditAccountModal } from './features/credit/CreditAccountModal.jsx';
import { ProviderPayModal } from './features/credit/ProviderPayModal.jsx';
import { CARD_TYPE, PROVIDER_TYPE, accountFlows, cardSummary, isCard, isLiability, isMoneyAccount, isProvider, providerSummary, reportView, limitLeft, planLimitUse } from './lib/credit.js';

function readPocketStartupPage(){ return 'Overview'; }

function App(){
  useSheetManager();
  // Track the visual viewport so mobile sheets resize above the on-screen keyboard.
  useEffect(()=>{
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const height = viewport?.height || window.innerHeight;
      const offsetTop = viewport?.offsetTop || 0;
      document.documentElement.style.setProperty('--pocket-visual-viewport-height', `${Math.round(height)}px`);
      document.documentElement.style.setProperty('--pocket-visual-viewport-top', `${Math.round(offsetTop)}px`);
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    const onFocusIn = event => {
      const field = event.target;
      if (!(field instanceof HTMLElement) || !field.matches('input, textarea, select, [contenteditable="true"]')) return;
      // Scroll only the modal's content area. scrollIntoView() can move the page
      // behind a fixed sheet on mobile and makes the sheet jump when the keyboard opens.
      window.setTimeout(() => {
        updateViewport();
        const sheet = field.closest('.modal, .modal-shell, section[role="dialog"], section[role="alertdialog"], .auth-popup-card');
        const scrollArea = field.closest('.modal-body, .category-wizard-card-content, .vehicle-wizard-form, .vehicle-form, .settings-accordion-list, form') || sheet;
        if (!scrollArea) return;
        const fieldRect = field.getBoundingClientRect();
        const areaRect = scrollArea.getBoundingClientRect();
        const keyboardTop = window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
        const visibleBottom = Math.min(areaRect.bottom, keyboardTop) - 24;
        const visibleTop = Math.max(areaRect.top, window.visualViewport?.offsetTop || 0) + 16;
        if (fieldRect.bottom > visibleBottom) scrollArea.scrollTop += fieldRect.bottom - visibleBottom;
        else if (fieldRect.top < visibleTop) scrollArea.scrollTop -= visibleTop - fieldRect.top;
      }, 220);
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.removeEventListener('focusin', onFocusIn);
      document.documentElement.style.removeProperty('--pocket-visual-viewport-height');
      document.documentElement.style.removeProperty('--pocket-visual-viewport-top');
    };
  },[]);
  // Restore the last visited page on refresh and on the next visit in this browser.
  const [page,setPage] = useState(readPocketStartupPage);
  const [vehicleSidebarTab,setVehicleSidebarTab] = useState('vehicles');
  const [vehicleReminderNotifications,setVehicleReminderNotifications] = useState([]);
  useEffect(()=>{
    try { void 0; } catch {}
  },[page]);
  useEffect(()=>{
    const saveCurrentPage = () => { try { void 0; } catch {} };
    window.addEventListener('pagehide', saveCurrentPage);
    return () => window.removeEventListener('pagehide', saveCurrentPage);
  },[page]);
  const [transactions,setTransactions] = useState([]);
  const [expenseCategoryRevision,setExpenseCategoryRevision] = useState(0);
  useEffect(()=>{const refresh=()=>setExpenseCategoryRevision(v=>v+1);window.addEventListener('pocket-expense-categories-updated',refresh);return()=>window.removeEventListener('pocket-expense-categories-updated',refresh)},[]);
  const [budgets,setBudgets] = useState([]);
  const [goals,setGoals] = useState([]);
  const [recurring,setRecurring] = useState([]);
  const [accounts,setAccounts] = useState([]);
  const [defaultAccountId,setDefaultAccountId] = useState(()=>{try{return null||''}catch{return ''}});
  const [debts,setDebts] = useState([]);
  const [month,setMonth] = useState(monthNow);
  const [search,setSearch] = useState('');
  const [typeFilter,setTypeFilter] = useState('All types');
  const [categoryFilter,setCategoryFilter] = useState('All categories');
  const [amountSort,setAmountSort] = useState('date-desc');
  const [modal,setModal] = useState(null);
  const [confirmDialog,setConfirmDialog] = useState(null);
  const [debtPaymentTarget,setDebtPaymentTarget] = useState(null);
  const [debtFocus,setDebtFocus] = useState(null);
  const [searchOpen,setSearchOpen] = useState(false);
  const [quickAction,setQuickAction] = useState(null);
  const [creditKind,setCreditKind] = useState('card');
  const [debtPresetProvider,setDebtPresetProvider] = useState('');
  const [convertTx,setConvertTx] = useState(null);
  const [txPresetAccount,setTxPresetAccount] = useState('');
  const [cardPay,setCardPay] = useState(null);
  const [providerPay,setProviderPay] = useState(null);
  const [accountsView,setAccountsView] = useState('grid');
  const [smsFocusAccount,setSmsFocusAccount]=useState(null);
  const [pendingSms,setPendingSms] = useState(0);
  const [wizardOpen,setWizardOpen] = useState(false);
  const requestConfirm=(title,description,onConfirm,confirmLabel='Delete',options={})=>setConfirmDialog({title,description,onConfirm,confirmLabel,...options});
  const [editing,setEditing] = useState(null);
  const [toast,setToast] = useState('');
  const [notificationToast,setNotificationToast] = useState(null);
  const seenNotificationIds = useRef(null);
  const [session,setSession] = useState(null);
  useEffect(()=>{if(!cloudReady||!session?.user?.id)return;let alive=true;(async()=>{const {data,error}=await supabase.from('expense_categories').select('name,is_enabled').eq('user_id',session.user.id).order('name');if(!alive)return;if(!error&&Array.isArray(data)&&data.length){setExpenseCategoriesOverride(data.filter(x=>x.is_enabled!==false).map(x=>x.name));}})();return()=>{alive=false}},[session?.user?.id]);
  const [profile,setProfile] = useState(()=>{try{return !cloudReady ? JSON.parse(null||'null') : null}catch{return null}});
  const [profileLoaded,setProfileLoaded] = useState(false);
  const [profileLoadError,setProfileLoadError] = useState('');
  const [profileRetry,setProfileRetry] = useState(0);
  const [dataLoadError,setDataLoadError] = useState('');
  const [dataLoadAttempt,setDataLoadAttempt] = useState(0);
  const [adminUsers,setAdminUsers] = useState([]);
  const [adminLoading,setAdminLoading] = useState(false);
  const [accessRequestCounts,setAccessRequestCounts] = useState({total:0,pending:0});
  const [authEmail,setAuthEmail] = useState('');
  const [authMsg,setAuthMsg] = useState('');
  const [authMode,setAuthMode] = useState('choice');
  const [authName,setAuthName] = useState('');
  const [authUsername,setAuthUsername] = useState('');
  const [authGender,setAuthGender] = useState('');
  const [authPassword,setAuthPassword] = useState('');
  const [stayLoggedIn,setStayLoggedIn] = useState(false);
  const [sessionExpiredNotice,setSessionExpiredNotice] = useState(false);
  const [authConfirmPassword,setAuthConfirmPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [authLoading,setAuthLoading] = useState(true);
  // If Stay logged in is unchecked, sign out after 15 minutes without user activity.
  useEffect(()=>{
    if(!cloudReady || !session?.user || stayLoggedIn) return;
    let timer;
    const expire = async () => {
      setSessionExpiredNotice(true);
      await supabase.auth.signOut();
      setAuthMsg('You were signed out after 15 minutes of inactivity. Sign in again to continue.');
      setAuthMode('signin');
    };
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(expire, 15 * 60 * 1000); };
    const events = ['pointerdown','pointermove','keydown','touchstart','scroll'];
    events.forEach(event=>window.addEventListener(event,reset,{passive:true}));
    reset();
    return ()=>{window.clearTimeout(timer);events.forEach(event=>window.removeEventListener(event,reset));};
  },[cloudReady,session?.user?.id,stayLoggedIn]);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [isDesktopNav,setIsDesktopNav] = useState(()=>typeof window==='undefined'||window.innerWidth>900);
  const [navTip,setNavTip] = useState(null);
  useEffect(()=>{const f=()=>setIsDesktopNav(window.innerWidth>900);window.addEventListener('resize',f);return()=>window.removeEventListener('resize',f)},[]);
  const [accountMenuOpen,setAccountMenuOpen] = useState(false);
  const [notificationsOpen,setNotificationsOpen] = useState(false);
  const [importPreview,setImportPreview] = useState([]);
  const [year,setYear] = useState(String(new Date().getFullYear()));
  const [clock,setClock] = useState(Date.now());
  const [currency,setCurrency] = useState(()=>{try{return null||'EGP'}catch{return 'EGP'}});
  const [timezone,setTimezone] = useState(()=>{try{return null||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}});
  const [profileName,setProfileName] = useState(()=>{try{return null||''}catch{return ''}});
  const [profileSaving,setProfileSaving] = useState(false);
  const [theme,setTheme] = useState(()=>storedTheme());
  const [design,setDesign] = useState(()=>null||'classic');
  const [sidebarSize,setSidebarSize] = useState(()=>null||'comfortable');
  const [workspaceSectionName,setWorkspaceSectionName] = useState(()=>{try{return null||'MY SPACE'}catch{return 'MY SPACE'}});
  const [workspaceSectionEditing,setWorkspaceSectionEditing] = useState(false);
  const [workspaceSectionDraft,setWorkspaceSectionDraft] = useState(()=>{try{return null||'MY SPACE'}catch{return 'MY SPACE'}});
  const [profileAvatar,setProfileAvatar] = useState(()=>{const saved=null;return PROFILE_AVATARS.some(a=>a.id===saved)?saved:'avatar-01'});
  const [avatarPickerGender,setAvatarPickerGender] = useState('prefer_not_to_say');
  const [backupForUsers,setBackupForUsers] = useState(false);
  const [accessRequestsOpen,setAccessRequestsOpen] = useState(true);
  const [emailBarHidden,setEmailBarHidden] = useState(()=>{try{return sessionStorage.getItem('pocket-email-bar-hidden')==='1';}catch{return false;}});
  const [paidBusy,setPaidBusy] = useState([]);
  const [localLoaded,setLocalLoaded] = useState(false);
  const [settingsCloudUserId,setSettingsCloudUserId] = useState('');
  const [accountsLoaded,setAccountsLoaded] = useState(false);
  const [accessRequestBusy,setAccessRequestBusy] = useState(false);

  useEffect(()=>{
    if(!accountMenuOpen && !notificationsOpen) return;
    const handlePointerDown = (event) => {
      if(!(event.target instanceof Element)) return;
      if(accountMenuOpen && !event.target.closest('.account-popover') && !event.target.closest('.account-trigger')) setAccountMenuOpen(false);
      if(notificationsOpen && !event.target.closest('.notification-popover') && !event.target.closest('.notification-btn')) setNotificationsOpen(false);
    };
    const handleKeyDown = (event) => { if(event.key === 'Escape') { setAccountMenuOpen(false); setNotificationsOpen(false); } };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('pointerdown', handlePointerDown); document.removeEventListener('keydown', handleKeyDown); };
  },[accountMenuOpen,notificationsOpen]);

  // Sheets/modals manage their own scroll lock + Escape (useSheetManager). This only locks for the header popovers.
  useEffect(()=>{
    if(!(notificationsOpen || accountMenuOpen)) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return ()=>{ document.body.style.overflow = previousOverflow; };
  },[notificationsOpen,accountMenuOpen]);

  useEffect(()=>{
    void 0;
    void 0;
    document.documentElement.lang='en';
    document.documentElement.dir='ltr';
    void 0;
    void 0;
    void 0;
    document.documentElement.dataset.theme=session?theme:'light';
    document.documentElement.dataset.design='classic';
    if(session)saveTheme(theme);
  },[theme,design,sidebarSize,profileAvatar,session]);

  useEffect(()=>{
    if(!cloudReady){setAuthMsg('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use Pocket. Local/demo storage is disabled.');setAuthLoading(false);return;}
    let alive=true;
    supabase.auth.getSession().then(({data,error})=>{
      if(!alive)return;
      if(error)setAuthMsg(error.message);
      const authHash = new URLSearchParams(window.location.hash.replace(/^#/,''));
      if(authHash.get('type')==='recovery'){
        setAuthMode('update-password');
        setAuthPassword('');
        setAuthConfirmPassword('');
        setAuthMsg('Choose a new password for your Pocket account.');
      }
      const authError = authHash.get('error_description') || authHash.get('error');
      if(authError){setAuthMode('signin');setAuthMsg(decodeURIComponent(authError.replace(/\+/g,' ')));}
      setSession(data?.session||null);
      setAuthLoading(false);
    }).catch(error=>{
      if(!alive)return;
      setAuthMsg(error?.message||'Could not restore your session. Please sign in again.');
      setSession(null);
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      if(event==='PASSWORD_RECOVERY'){
        setAuthMode('update-password');
        setAuthPassword('');
        setAuthConfirmPassword('');
        setAuthMsg('Choose a new password for your Pocket account.');
      }
      setSession(s);
      setAuthLoading(false);
    });
    // Coming back with the browser Back button (e.g. from Google sign-in) restores the page from the
    // back/forward cache with the old "busy" state, so the Sign in button would stay on "Please wait…".
    const onPageShow=e=>{if(e.persisted){setBusy(false);setAuthLoading(false);}};
    window.addEventListener('pageshow',onPageShow);
    return ()=>{alive=false;subscription.unsubscribe();window.removeEventListener('pageshow',onPageShow)};
  },[]);
  useEffect(()=>{
    let alive=true;
    if(!cloudReady || !session?.user?.id){setProfile(null);setAdminUsers([]);setProfileLoadError('');setProfileLoaded(true);return ()=>{alive=false};}
    setProfileLoaded(false);setProfileLoadError('');
    (async()=>{
      try {
        const {data,error}=await supabase.from('profiles').select('id,email,full_name,role,enabled_features,created_at').eq('id',session.user.id).maybeSingle();
        if(!alive)return;
        if(error){setProfile(null);setProfileLoadError('Could not load your access profile. Check your connection and Supabase profile policies.');return;}
        if(!data){setProfile(null);setProfileLoadError('Your access profile could not be found. Contact the Pocket administrator.');return;}
        setProfile(data);
        const {data:settingData}=await supabase.from('app_settings').select('value').eq('key','backup_restore_for_users').maybeSingle();
        if(alive)setBackupForUsers(settingData?.value===true);
        const {data:intakeData}=await supabase.from('app_settings').select('value').eq('key','access_requests_enabled').maybeSingle();
        if(alive)setAccessRequestsOpen(intakeData?.value!==false);
        if(['owner','super_admin'].includes(data.role)){
          setAdminLoading(true);
          const {data:users,error:usersError}=await supabase.rpc('admin_list_users');
          if(alive){if(usersError)setToast('Could not load user access list: '+usersError.message);else setAdminUsers(await withEmailStatus(users||[]));setAdminLoading(false);}
        } else {setAdminUsers([]);setAdminLoading(false);}
      } catch (error) {
        if(alive)setProfileLoadError(error?.message||'Could not load your access profile.');
      } finally {
        if(alive)setProfileLoaded(true);
      }
    })();
    return ()=>{alive=false};
  },[session?.user?.id,profileRetry]);
  useEffect(()=>{
    if(session?.user){
      const meta=session.user.user_metadata||{};
      const nextCurrency=meta.currency||'EGP';
      const nextTimezone=meta.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
      setCurrency(nextCurrency);setTimezone(nextTimezone);
      void 0;void 0;
      if(meta.full_name)setProfileName(meta.full_name);
      // Keep a user's explicit Pocket avatar if one is saved; otherwise use the photo supplied by Google OAuth.
      const googlePhoto=meta.picture||meta.avatar_url||meta.photo_url||session.user.identities?.find(identity=>identity.provider==='google')?.identity_data?.picture;
      if(meta.avatar)setProfileAvatar(meta.avatar);
      else if(googlePhoto)setProfileAvatar(googlePhoto);
      else {const genderDefault=defaultAvatarForGender(meta.gender);setProfileAvatar(genderDefault);void 0;}
    }
  },[session?.user?.id]);
  useEffect(()=>{
    if(!cloudReady || !session?.user) {setAccountsLoaded(!cloudReady);return;}
    let alive=true;
    (async()=>{
      setAccountsLoaded(false);
      setDataLoadError('');
      setBusy(true);
      try {
        const [t,b,g,r,a,d]=await Promise.all([
          supabase.from('transactions').select('*').order('transaction_date',{ascending:false}),
          supabase.from('budgets').select('*').order('month',{ascending:false}),
          supabase.from('savings_goals').select('*').order('created_at',{ascending:false}),
          supabase.from('recurring_payments').select('*').order('next_due_date',{ascending:true}),
          supabase.from('financial_accounts').select('*').order('created_at',{ascending:true}),
          supabase.from('debts').select('*').order('due_date',{ascending:true})
        ]);
        if(!alive)return;
        const errors=[t,b,g,r,a,d].filter(result=>result.error).map(result=>result.error.message);
        if(!t.error)setTransactions(t.data||[]);
        if(!b.error)setBudgets(b.data||[]);
        if(!g.error)setGoals(g.data||[]);
        if(!r.error)setRecurring(r.data||[]);
        if(!a.error)setAccounts(a.data||[]);
        if(!d.error)setDebts(d.data||[]);
        supabase.from('sms_inbox').select('id',{count:'exact',head:true}).eq('status','pending').then(r=>{if(!r.error&&alive)setPendingSms(r.count||0)});
        if(errors.length)setDataLoadError(`Some data could not be loaded: ${[...new Set(errors)].join(' · ')}`);
      } catch(error) {
        if(alive)setDataLoadError(error?.message||'Could not load your workspace data.');
      } finally {
        if(alive){setAccountsLoaded(true);setBusy(false);}
      }
    })();
    return ()=>{alive=false};
  },[session?.user?.id,dataLoadAttempt]);
  // Financial records are persisted only through Supabase; no browser/local data cache is used.
  useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(t)},[]);
  useEffect(()=>{const k=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(v=>!v)}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t)},[toast]);


  // Sync account preferences to Supabase; browser storage is not used for application data.
  useEffect(()=>{
    const uid=session?.user?.id;
    if(!cloudReady||!uid)return;
    let alive=true;
    (async()=>{
      const {data,error}=await supabase.from('user_settings').select('settings').eq('user_id',uid).maybeSingle();
      if(!alive)return;
      if(!error&&data?.settings){
        const v=data.settings;
        if(v.currency){setCurrency(v.currency);void 0}
        if(v.timezone){setTimezone(v.timezone);void 0}
        if(v.profileName!==undefined){setProfileName(v.profileName||'');void 0}
        if(v.theme)setTheme(v.theme);
        
        if(v.sidebarSize){setSidebarSize(v.sidebarSize);void 0}
        if(v.profileAvatar){setProfileAvatar(v.profileAvatar);void 0}
        if(v.defaultAccountId!==undefined){setDefaultAccountId(v.defaultAccountId||'');void 0}
        if(v.accountsView==='list'||v.accountsView==='grid')setAccountsView(v.accountsView);
        if(typeof v.workspaceSectionName==='string'&&v.workspaceSectionName.trim()){setWorkspaceSectionName(v.workspaceSectionName.trim().slice(0,32));setWorkspaceSectionDraft(v.workspaceSectionName.trim().slice(0,32));}
        if(v.categoryIcons&&typeof v.categoryIcons==='object')setCategoryIconOverrides(v.categoryIcons);
        if(Array.isArray(v.expenseCategories)){void 0;setExpenseCategoriesOverride(v.expenseCategories)}
        if(v.subcategories&&typeof v.subcategories==='object'){setCustomSubcategoriesOverride(v.subcategories);}
      }
      if(alive)setSettingsCloudUserId(uid);
    })();
    return()=>{alive=false};
  },[session?.user?.id,cloudReady]);
  useEffect(()=>{
    const uid=session?.user?.id;
    if(!cloudReady||!uid||settingsCloudUserId!==uid)return;
    const subcategories=customSubcategoriesOverride||{};
    const savedCategories=expenseCategoriesOverride||[];
    (async()=>{const {data:existingRow,error:readError}=await supabase.from('user_settings').select('settings').eq('user_id',uid).maybeSingle();if(readError){console.error('Could not read settings before syncing:',readError.message);return;}const preserved=existingRow?.settings&&typeof existingRow.settings==='object'?existingRow.settings:{};const settings={...preserved,currency,timezone,profileName,theme,design,sidebarSize,profileAvatar,defaultAccountId,accountsView,workspaceSectionName,
      expenseCategories:Array.isArray(savedCategories)?savedCategories:[],subcategories};
    const {error}=await supabase.from('user_settings').upsert({user_id:uid,settings,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)console.error('Could not sync settings to Supabase:',error.message);})();
  },[session?.user?.id,cloudReady,settingsCloudUserId,currency,timezone,profileName,theme,design,sidebarSize,profileAvatar,defaultAccountId,accountsView,workspaceSectionName,expenseCategoryRevision]);
    const reportTx=useMemo(()=>reportView(transactions,accounts),[transactions,accounts]);
    const monthTx=useMemo(()=>reportTx.filter(t=>(t.transaction_date||'').slice(0,7)===month),[reportTx,month]);
  const income=monthTx.filter(t=>t.type==='Income').reduce((s,t)=>s+Number(t.amount||0),0);
  const expenses=monthTx.filter(t=>t.type==='Expense').reduce((s,t)=>s+Number(t.amount||0),0);
  const net=income-expenses, savingsRate=income?net/income*100:0;
  const filtered=useMemo(()=>transactions.filter(t=>{
    const q=search.toLowerCase();
    const matchesSearch=(t.description||'').toLowerCase().includes(q)||(t.category||'').toLowerCase().includes(q)||(t.notes||'').toLowerCase().includes(q);
    return matchesSearch && (typeFilter==='All types'||t.type===typeFilter) && (categoryFilter==='All categories'||t.category===categoryFilter);
  }),[transactions,search,typeFilter,categoryFilter]);
  const monthlySeries=useMemo(()=>Array.from({length:6},(_,i)=>{
    const [yy,mm]=month.split('-').map(Number);const d=new Date(yy,mm-1,1,12);d.setMonth(d.getMonth()-(5-i));const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const list=reportTx.filter(t=>(t.transaction_date||'').slice(0,7)===m);
    return {month:new Date(m+'-15T12:00:00').toLocaleDateString('en-US',{month:'short'}),Income:list.filter(t=>t.type==='Income').reduce((s,t)=>s+Number(t.amount),0),Expenses:list.filter(t=>t.type==='Expense').reduce((s,t)=>s+Number(t.amount),0)};
  }),[reportTx,month]);
  const categoryData=useMemo(()=>expenseCategories.map(c=>({name:c,value:monthTx.filter(t=>t.type==='Expense'&&t.category===c).reduce((s,t)=>s+Number(t.amount),0)})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value),[monthTx]);
  const needs=monthTx.filter(t=>t.type==='Expense'&&t.need_want==='Need').reduce((s,t)=>s+Number(t.amount),0);
  const wants=monthTx.filter(t=>t.type==='Expense'&&t.need_want==='Want').reduce((s,t)=>s+Number(t.amount),0);
  const monthBudgets=budgets.filter(b=>(b.month||'').slice(0,7)===month);
  const totalBudget=monthBudgets.reduce((s,b)=>s+Number(b.amount||0),0);
  const totalSaved=goals.reduce((s,g)=>s+Number(g.saved_amount||0)+transactions.filter(t=>t.type==='Transfer'&&String(t.goal_id)===String(g.id)).reduce((v,t)=>{const from=accounts.find(a=>String(a.id)===String(t.account_id)),to=accounts.find(a=>String(a.id)===String(t.to_account_id));if(isGoalsAccount(from))return v-Number(t.amount||0);if(isGoalsAccount(to))return v+Number(t.amount||0);const fs=String(from?.type||'').toLowerCase().includes('saving'),ts=String(to?.type||'').toLowerCase().includes('saving');return v+(fs&&!ts?-1:1)*Number(t.amount||0)},0),0);
  const goalTarget=goals.reduce((s,g)=>s+Number(g.target_amount||0),0);
  const activeRecurring=recurring.filter(r=>r.is_active!==false);
  const upcoming=activeRecurring.filter(r=>!r.paid_this_cycle).sort((a,b)=>(a.next_due_date||'').localeCompare(b.next_due_date||'')).slice(0,4);
  const todayISO=localISODate();
  const activeMonth=todayISO.slice(0,7);
  const budgetAlerts=budgets.filter(b=>(b.month||'').slice(0,7)===activeMonth).map(b=>{const spent=reportTx.filter(t=>t.type==='Expense'&&(t.transaction_date||'').slice(0,7)===activeMonth&&t.category===b.category).reduce((sum,t)=>sum+Number(t.amount||0),0);const pct=Number(b.amount)>0?spent/Number(b.amount)*100:0;return {...b,spent,pct};}).filter(b=>b.pct>=90).map(b=>({id:`budget-${b.id}`,kind:'budget',name:`${b.category} budget at ${Math.round(b.pct)}%`,detail:`${fmt(b.spent)} of ${fmt(b.amount)} used`,target:'Budgets',amount:null,pct:b.pct}));
  const notificationDueLimit=(()=>{const date=new Date(`${todayISO}T12:00:00`);date.setDate(date.getDate()+2);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`})();
  const debtReminderInfo=d=>{const raw=String(d.notes||'');const match=raw.match(/\[POCKET_DEBT_DETAILS\]\s*(\{[^\n]*\})/);if(!match)return {reminder:'2 days before',paymentMode:'Installments'};try{const data=JSON.parse(match[1]);return {reminder:data.reminder||'2 days before',paymentMode:data.payment_mode||'Installments'}}catch{return {reminder:'2 days before',paymentMode:'Installments'}}};
  const debtAlerts=debts.filter(d=>{if(!(Number(d.remaining_amount||0)>0&&d.due_date))return false;const pref=debtReminderInfo(d).reminder;const lead=pref==='1 week before'?7:pref==='2 days before'?2:pref==='1 day before'?1:0;const alertStart=new Date(`${d.due_date}T12:00:00`);alertStart.setDate(alertStart.getDate()-lead);const startISO=`${alertStart.getFullYear()}-${String(alertStart.getMonth()+1).padStart(2,'0')}-${String(alertStart.getDate()).padStart(2,'0')}`;return d.due_date<todayISO||todayISO>=startISO;}).map(d=>({id:`debt-${d.id}`,kind:'debt',name:d.name,detail:`${d.due_date<todayISO?'Overdue':d.due_date===todayISO?'Due today':`Due ${debtReminderInfo(d).reminder}`} · ${d.due_date}`,target:'Debts & installments',amount:Number(d.monthly_payment||d.remaining_amount||0)}));
  const cardAlertLimit=(()=>{const date=new Date(`${todayISO}T12:00:00`);date.setDate(date.getDate()+3);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`})();
  const cardAlerts=accounts.filter(isCard).flatMap(c=>cardSummary(c,transactions,todayISO,debts).groups.filter(g=>g.due<=cardAlertLimit).map(g=>({id:`card-${c.id}-${g.due}`,kind:'debt',name:`${c.name} payment`,detail:`${g.due<todayISO?'Overdue':g.due===todayISO?'Due today':'Due soon'} · ${g.due}`,target:'Debts & installments',amount:g.remaining})));
  const notificationPayments=activeRecurring.filter(r=>!r.paid_this_cycle&&r.next_due_date&&r.next_due_date<=notificationDueLimit).sort((a,b)=>(a.next_due_date||'').localeCompare(b.next_due_date||''));
  const notificationItems=[...budgetAlerts,...debtAlerts,...cardAlerts,...notificationPayments.map(r=>({id:`recurring-${r.id}`,kind:'recurring',name:r.name,detail:r.next_due_date?`${r.next_due_date<todayISO?'Overdue':r.next_due_date===todayISO?'Due today':'Due soon'} · ${new Date(r.next_due_date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${r.frequency||'Recurring'}`:'Upcoming payment',target:'Recurring payments',amount:Math.max(0,Number(r.amount||0)-Number(r.paid_amount||0))}))];
  const allNotificationItems=[...notificationItems,...vehicleReminderNotifications];
  useEffect(()=>{
    const currentIds=new Set(notificationItems.map(item=>String(item.id)));
    if(seenNotificationIds.current===null){seenNotificationIds.current=currentIds;return;}
    const added=notificationItems.find(item=>!seenNotificationIds.current.has(String(item.id)));
    seenNotificationIds.current=currentIds;
    if(added){setNotificationToast(added);}
  },[notificationItems.map(item=>item.id).join('|')]);
  useEffect(()=>{if(!notificationToast)return;const timer=setTimeout(()=>setNotificationToast(null),4800);return()=>clearTimeout(timer)},[notificationToast]);
  const displayName=titleCaseName(session ? (session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'there') : (profileName||'there'));
  const greeting=getGreeting(session?.user?.user_metadata?.timezone||timezone);
  void clock; void currency;

  async function saveRecord(table,record,existingId){
    if(!cloudReady || !session?.user){setToast('Connect to Supabase and sign in before saving data.');return null;}
    const payload={...record,user_id:session.user.id};delete payload.id;
    const res=existingId?await supabase.from(table).update(payload).eq('id',existingId).select().single():await supabase.from(table).insert(payload).select().single();
    if(res.error){setToast(res.error.message);return null;}return res.data;
  }
  async function removeRecord(table,id,setter,list){
    if(!cloudReady || !session?.user){setToast('Connect to Supabase and sign in before changing data.');return;}
    if(table==='financial_accounts'&&isGoalsAccount((list||[]).find(x=>String(x.id)===String(id)))){setToast('The system Goals account cannot be deleted.');return;}
    const deletedTransaction=table==='transactions'?(transactions||[]).find(t=>String(t.id)===String(id)):null;
    const linkedDebtPayment=deletedTransaction&&deletedTransaction.type==='Expense'&&deletedTransaction.debt_id&&String(deletedTransaction.notes||'').startsWith('Debt installment ')?deletedTransaction:null;
    const linkedDebt=linkedDebtPayment?(debts||[]).find(d=>String(d.id)===String(linkedDebtPayment.debt_id)):null;
    try{
      if(cloudReady&&session?.user){
        // Ask Supabase to return the deleted row so an RLS/no-match delete cannot
        // silently look successful in the UI.
        const {data,error}=await supabase.from(table).delete().eq('id',id).eq('user_id',session.user.id).select('id');
        if(error){setToast(`Could not delete item: ${error.message}`);return;}
        if(!data||data.length===0){
          setToast('Could not delete this item. Check your connection and account permissions, then refresh and try again.');
          return;
        }
      }
      setter(old=>Array.isArray(old)?old.filter(x=>String(x.id)!==String(id)):list.filter(x=>String(x.id)!==String(id)));
      if(linkedDebtPayment&&linkedDebt){
        const amount=Number(linkedDebtPayment.amount||0);
        const total=Number(linkedDebt.total_repayment||linkedDebt.original_amount||0);
        const nextPaid=Math.max(0,Number(linkedDebt.paid_installments||0)-1);
        const nextAmountPaid=Math.max(0,Number((Number(linkedDebt.amount_paid??Math.max(0,total-Number(linkedDebt.remaining_amount||0))-amount)).toFixed(2)));
        const nextRemaining=Math.min(total,Math.max(0,Number((Number(linkedDebt.remaining_amount||0)+amount).toFixed(2))));
        let previousDue=linkedDebt.due_date||null;
        if(previousDue){const d=new Date(`${previousDue}T12:00:00`);if(linkedDebt.frequency==='Weekly')d.setDate(d.getDate()-7);else if(linkedDebt.frequency==='Quarterly')d.setMonth(d.getMonth()-3);else if(linkedDebt.frequency==='Yearly')d.setFullYear(d.getFullYear()-1);else d.setMonth(d.getMonth()-1);previousDue=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
        const debtPayload={name:linkedDebt.name,debt_type:linkedDebt.debt_type||'Other',lender:linkedDebt.lender||'',account_id:linkedDebt.account_id||null,original_amount:Number(linkedDebt.original_amount||0),remaining_amount:nextRemaining,monthly_payment:Number(linkedDebt.monthly_payment||0),due_date:previousDue,frequency:linkedDebt.frequency||'Monthly',notes:linkedDebt.notes||'',start_date:linkedDebt.start_date||null,term_months:linkedDebt.term_months||null,total_repayment:total,interest_rate:Number(linkedDebt.interest_rate||0),paid_installments:nextPaid,amount_paid:nextAmountPaid};
        const savedDebt=await saveRecord('debts',debtPayload,linkedDebt.id);
        if(savedDebt){setDebts(old=>old.map(d=>String(d.id)===String(linkedDebt.id)?savedDebt:d));setToast('Transaction deleted and debt balance restored');}
        else setToast('Transaction deleted, but the debt update failed. Refresh and check the debt card.');
      }else setToast('Deleted successfully');
    }catch(err){
      setToast(err?.message||'Could not delete item. Please try again.');
    }
  }
  async function toggleRecurringActive(r){
    if(!r?.id||!supabase)return;
    const next=r.is_active===false;
    setRecurring(list=>list.map(x=>x.id===r.id?{...x,is_active:next}:x));
    const {error}=await supabase.from('recurring_payments').update({is_active:next}).eq('id',r.id).eq('user_id',session.user.id);
    if(error){setRecurring(list=>list.map(x=>x.id===r.id?{...x,is_active:!next}:x));setToast(error.message);return;}
    setToast(next?`${r.name} is active again.`:`${r.name} is paused. It will not show in reminders or the calendar.`);
  }
  async function deleteRecurringPayment(payment){
    if(!payment?.id)return;
    requestConfirm('Delete recurring payment?', `“${payment.name||'This recurring payment'}” will be permanently removed. This action cannot be undone.`, async()=>{
    try{
      if(cloudReady && session?.user){
        // Do not request a returned row: DELETE + SELECT can fail when a project's
        // SELECT grants/policies differ, even though the user is allowed to delete.
        const {error}=await supabase.from('recurring_payments').delete().eq('id',payment.id).eq('user_id',session.user.id);
        if(error){setToast(`Could not delete payment: ${error.message}`);return;}
      }
      setRecurring(old=>old.filter(item=>String(item.id)!==String(payment.id)));
      setToast('Recurring payment deleted');
    }catch(error){setToast(error?.message||'Could not delete payment. Please try again.');}
    });
  }
  async function submitTransaction(form){
    if(!editing && !accounts.some(a=>!isGoalsAccount(a))){
      setModal(null);
      setToast('Add an account or wallet first. Go to Accounts → Add account, then come back to add your transaction.');
      setPage('Accounts');
      return;
    }
    if(!form.account_id || !accounts.some(account=>String(account.id)===String(form.account_id))){
      setToast('Choose an account or wallet for this transaction before saving.');
      return;
    }
    if(form.type==='Transfer' && (!form.to_account_id || String(form.to_account_id)===String(form.account_id))){setToast('Choose two different accounts or wallets for a transfer.');return;}
    const source=accounts.find(a=>String(a.id)===String(form.account_id));
    const destination=form.type==='Transfer'?accounts.find(a=>String(a.id)===String(form.to_account_id)):null;
    if(form.type!=='Transfer'&&isGoalsAccount(source)){setToast('The Goals account can only be used for transfers.');return;}
    if((isProvider(source)&&form.type!=='Expense')||isProvider(destination)){setToast('An installment app can only be used for purchases. Pay it from Debts & installments.');return;}
    if(form.type==='Transfer'&&isCard(source)){setToast('Could not move money out of a credit card. Add the purchase as an expense on the card instead.');return;}
    if(form.type==='Transfer'&&(isGoalsAccount(source)||isGoalsAccount(destination))&&(!form.goal_id||!goals.some(g=>String(g.id)===String(form.goal_id)))){setToast('Choose which savings goal this transfer belongs to.');return;}
    if(form.type==='Transfer'&&isGoalsAccount(source)){
      const selectedGoal=goals.find(g=>String(g.id)===String(form.goal_id));
      const goalBalance=Number(selectedGoal?.saved_amount||0)+transactions.filter(t=>t.type==='Transfer'&&String(t.goal_id)===String(form.goal_id)&&String(t.id)!==String(editing?.id)).reduce((sum,t)=>{const from=accounts.find(a=>String(a.id)===String(t.account_id)),to=accounts.find(a=>String(a.id)===String(t.to_account_id));if(isGoalsAccount(from))return sum-Number(t.amount||0);if(isGoalsAccount(to))return sum+Number(t.amount||0);return sum+Number(t.amount||0)},0);
      if(Number(form.amount)>goalBalance){setToast(`This goal only has ${new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Math.max(0,goalBalance))} available to withdraw.`);return;}
    }
    const sourceIn=transactions.filter(t=>(t.type==='Income'&&String(t.account_id)===String(source?.id))||(t.type==='Transfer'&&String(t.to_account_id)===String(source?.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);
    const sourceOut=transactions.filter(t=>((t.type==='Expense'||t.type==='Transfer')&&String(t.account_id)===String(source?.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);
    let available=Number(source?.opening_balance||0)+sourceIn-sourceOut+((isCard(source)||isProvider(source))?(Number(source.credit_limit)>0?Number(source.credit_limit):1e12):0);
    if(isProvider(source)&&Number(source.credit_limit)>0){const planOwed=providerSummary(source,debts,undefined,transactions).used;available=Number(source.credit_limit)-planOwed;}
    if(isCard(source)&&Number(source.credit_limit)>0){available=Number(source.credit_limit)-cardSummary(source,transactions,undefined,debts).owed;}
    if(editing && String(editing.account_id)===String(source?.id) && (editing.type==='Expense'||editing.type==='Transfer')) available+=Number(editing.amount||0);
    if((form.type==='Expense'||form.type==='Transfer') && Number(form.amount)>available){const shown=new Intl.NumberFormat('en-EG',{style:'currency',currency,maximumFractionDigits:2}).format(Math.max(0,available));setToast((isCard(source)||isProvider(source))?`Could not add: this is over the limit on ${source.name}. Available credit: ${shown}.`:`Insufficient balance in ${source?.name||'this account'}. Available: ${shown}.`);return;}
    const payload={transaction_date:form.transaction_date,type:form.type,category:form.type==='Transfer'?'Transfer':form.category,subcategory:form.type==='Transfer'?(form.goal_id?(goals.find(g=>String(g.id)===String(form.goal_id))?.name||'Transfer'):'Transfer'):(form.subcategory||null),description:form.description,amount:Number(form.amount),need_want:form.type==='Expense'?form.need_want:null,fixed_variable:form.fixed_variable,payment_method:accounts.find(a=>String(a.id)===String(form.account_id))?.name||'Unassigned',account_id:form.account_id||null,to_account_id:form.type==='Transfer'?form.to_account_id||null:null,goal_id:form.type==='Transfer'?(form.goal_id||null):null,debt_id:form.type==='Income'&&form.loan_mode==='new'?null:(form.debt_id||null),recurring:form.type==='Transfer'?false:form.recurring,notes:form.notes};
    const saved=await saveRecord('transactions',payload,editing?.id);if(!saved)return;
    setTransactions(old=>editing?old.map(x=>x.id===editing.id?saved:x):[saved,...old]);
    if(form.type==='Income'&&form.loan_mode==='new'){setEditing(null);setTxPresetAccount('');setConvertTx(saved);setDebtPresetProvider('');setModal('debt');setToast(editing?'Income saved · now add the debt details':'Income added · now add the debt details');return true;}
    if(form.type==='Income'&&form.loan_mode==='link'&&form.debt_id&&!editing){
      const d=(debts||[]).find(x=>String(x.id)===String(form.debt_id));const add=Number(form.amount)||0;
      if(d&&add>0){const r2=n=>Number(Number(n).toFixed(2));
        const dp={name:d.name,debt_type:d.debt_type||'Other',lender:d.lender||'',account_id:d.account_id||null,original_amount:r2(Number(d.original_amount||0)+add),remaining_amount:r2(Number(d.remaining_amount||0)+add),monthly_payment:d.monthly_payment,due_date:d.due_date||null,frequency:d.frequency||'Monthly',notes:d.notes||'',start_date:d.start_date||null,term_months:d.term_months||null,total_repayment:r2(Number(d.total_repayment||d.original_amount||0)+add),interest_rate:Number(d.interest_rate||0),paid_installments:d.paid_installments||0,amount_paid:Number(d.amount_paid||0)};
        const ds=await saveRecord('debts',dp,d.id);
        if(ds){setDebts(old=>old.map(x=>x.id===d.id?ds:x));setModal(null);setEditing(null);setTxPresetAccount('');setToast(`Income added · ${d.name} increased by ${fmt(add)}`);return true;}
        setToast('Income added, but the debt could not be updated');return true;
      }
    }
    setModal(null);setEditing(null);setTxPresetAccount('');setToast(editing?'Transaction updated':'Transaction added');return true;
  }
  async function addGoal(form){
    const p={name:form.name,goal_type:form.goal_type||'Other',target_amount:Number(form.target_amount),saved_amount:Number(form.saved_amount||0),target_date:form.target_date||null,notes:form.notes||''};
    const saved=await saveRecord('savings_goals',p,editing?.id);if(!saved)return;
    setGoals(old=>editing?old.map(x=>x.id===editing.id?saved:x):[saved,...old]);setModal(null);setEditing(null);setToast('Goal saved');
  }
  async function addRecurring(form){
    const p={name:form.name,category:form.category,subcategory:form.subcategory||null,amount:Number(form.amount),frequency:form.frequency,next_due_date:form.next_due_date||null,account_id:form.account_id||null,auto_pay:form.auto_pay,paid_this_cycle:form.paid_this_cycle,last_paid_date:editing?.last_paid_date||null,pay_by_date:form.pay_by_date||null,paid_amount:Math.min(Number(editing?.paid_amount||0),Number(form.amount)),essential:form.essential,notes:form.notes||''};
    const saved=await saveRecord('recurring_payments',p,editing?.id);if(!saved)return;
    setRecurring(old=>editing?old.map(x=>x.id===editing.id?saved:x):[saved,...old]);setModal(null);setEditing(null);setToast('Payment saved');
  }
  async function addBudget(form){
    const p={category:form.category,month:monthStart(form.month),amount:Number(form.amount)};
    const saved=await saveRecord('budgets',p,editing?.id);if(!saved)return;
    // Immediately replace by id OR category/month so the card always uses the latest saved amount.
    // This also handles older rows whose ID changed during a migration/import.
    const savedMonth=(saved.month||p.month||'').slice(0,7);
    setBudgets(old=>{
      const match=x=>String(x.id)===String(saved.id)||(x.category===saved.category&&(x.month||'').slice(0,7)===savedMonth);
      return [saved,...old.filter(x=>!match(x))];
    });
    if(savedMonth)setMonth(savedMonth);
    setPage('Budgets');
    setModal(null);setEditing(null);setToast('Budget updated');
    // Refresh from Supabase after the write; only replace state if the read succeeds.
    if(cloudReady&&session?.user){
      const {data,error}=await supabase.from('budgets').select('*').order('month',{ascending:false});
      if(!error&&Array.isArray(data))setBudgets(data);
    }
  }
  async function saveAccount(form){
    const goalsEdit=isGoalsAccount(editing);
    const payload=goalsEdit?{name:editing.name,type:editing.type,opening_balance:Number(form.opening_balance||0),opening_balance_date:form.opening_balance_date||editing.opening_balance_date||localISODate(),color:form.color||editing.color||'#6c7cf5'}:{name:form.name.trim(),type:form.type,opening_balance:Number(form.opening_balance||0),opening_balance_date:form.opening_balance_date||localISODate(),color:form.color||'#6c7cf5'};
    const saved=await saveRecord('financial_accounts',payload,editing?.id);if(!saved)return;
    setAccounts(old=>editing?old.map(x=>x.id===editing.id?saved:x):[saved,...old]);setModal(null);setEditing(null);setToast('Account saved');
  }
  async function createSetupAccount(form){
    const payload={name:form.name.trim(),type:form.type,opening_balance:Number(form.opening_balance||0),opening_balance_date:form.opening_balance_date||localISODate(),color:form.color||'#6c7cf5'};
    const saved=await saveRecord('financial_accounts',payload);if(!saved)return false;
    setAccounts(old=>[saved,...old]);setToast('Your account is ready. You can start using Pocket now.');return true;
  }
  async function saveCreditAccount(form){
    const isCardKind=form.kind==='card';
    const owed=Math.abs(Number(form.owed||0));
    const payload={name:form.name.trim(),type:isCardKind?CARD_TYPE:PROVIDER_TYPE,opening_balance:isCardKind?-owed:0,opening_balance_date:isCardKind&&owed>0?(form.owed_date||localISODate()):(editing?.opening_balance_date||localISODate()),color:form.color||'#6c7cf5',credit_limit:Number(form.limit)||0,statement_day:isCardKind?(Number(form.statement_day)||null):null,grace_days:isCardKind?(form.grace_days===''||form.grace_days==null?25:Number(form.grace_days)):null,pay_from_account_id:form.pay_from||null};
    const saved=await saveRecord('financial_accounts',payload,editing?.id);if(!saved)return;
    setAccounts(old=>editing?old.map(x=>x.id===editing.id?saved:x):[...old,saved]);
    if(!editing&&page==='Debts & installments')setDebtFocus(saved.id);
    setModal(null);setEditing(null);setToast(isCardKind?'Credit card saved':'Installment app saved');
  }
  async function payCreditCard({amount,accountId,paymentDate}){
    const card=cardPay?.card;const source=accounts.find(a=>String(a.id)===String(accountId));
    if(!card||!source||!isMoneyAccount(source)){setToast('Choose the account you are paying from.');return false;}
    const balance=accountFlows(source,transactions).balance;
    if(Number(amount)>balance){setToast(`Insufficient balance in ${source.name}. Available: ${fmt(balance)}.`);return false;}
    const payload={transaction_date:paymentDate||localISODate(),type:'Transfer',category:'Transfer',subcategory:'Credit card payment',description:`Payment · ${card.name}`,amount:Number(amount),need_want:null,fixed_variable:'Fixed',payment_method:source.name,account_id:source.id,to_account_id:card.id,goal_id:null,debt_id:null,recurring:false,notes:'Credit card payment'};
    const saved=await saveRecord('transactions',payload);if(!saved)return false;
    setTransactions(old=>[saved,...old]);setCardPay(null);setToast(`Paid ${fmt(amount)} to ${card.name}`);return true;
  }
  async function payProviderGroup({items,accountId,paymentDate}){
    const provider=providerPay?.provider;let paid=0;
    for(const it of items){if(it.plan.id==='loose'){const src=accounts.find(a=>String(a.id)===String(accountId));const bal=accountFlows(src,transactions).balance;if(it.amount>bal){setToast(`Insufficient balance in ${src?.name}. Available: ${fmt(bal)}.`);return false;}const saved=await saveRecord('transactions',{transaction_date:paymentDate||localISODate(),type:'Transfer',category:'Transfer',subcategory:'Installment app payment',description:`Payment · ${provider.name}`,amount:Number(it.amount),need_want:null,fixed_variable:'Fixed',payment_method:src.name,account_id:src.id,to_account_id:provider.id,goal_id:null,debt_id:null,recurring:false,notes:'Installment app payment'});if(!saved)return false;setTransactions(old=>[saved,...old]);paid++;continue;}const ok=await recordDebtInstallment(it.plan,{mode:'transaction',amount:it.amount,accountId,paymentDate});if(!ok){if(paid)setToast(`Paid ${paid} of ${items.length} installments. The rest did not go through.`);return false;}paid++;}
    setProviderPay(null);setToast(`Paid ${items.length} installment${items.length===1?'':'s'} on ${provider?.name||'your app'}`);return true;
  }
  async function saveDebt(form){
    const principal=Number(form.original_amount||0), installment=Number(form.monthly_payment||0), term=Math.max(0,Number(form.term_months||0));
    const totalRepayment=term>0&&installment>0?Number((installment*term).toFixed(2)):Number(form.total_repayment||principal);
    const startDate=form.start_date||null,dueDate=form.due_date||null;const paidCount=Math.max(0,Math.min(term||600,Number(form.paid_installments??editing?.paid_installments??0)||0));
    const amountPaid=Math.min(totalRepayment,Math.max(0,Number((paidCount*installment).toFixed(2))));
    const remaining=Math.max(0,Number((totalRepayment-amountPaid).toFixed(2)));
    const interestRate=principal>0&&totalRepayment>0?Number((((totalRepayment-principal)/principal)*100).toFixed(2)):0;
    const providerId=['Installment','Buy now, pay later'].includes(form.debt_type)?(form.provider_account_id||null):null;
    const providerAcc=providerId?accounts.find(a=>String(a.id)===String(providerId)):null;
    if(providerAcc&&Number(providerAcc.credit_limit)>0){const avail=limitLeft(providerAcc,debts,transactions)+(convertTx&&String(convertTx.account_id)===String(providerAcc.id)?Number(convertTx.amount||0):0)+(editing&&String(editing.provider_account_id)===String(providerAcc.id)?planLimitUse(editing):0);const need=totalRepayment>0?Math.max(0,principal-Number(form.down_payment||0))*Math.min(1,remaining/totalRepayment):remaining;if(need>avail+0.005){setToast(`Could not save: only ${fmt(avail)} is left on ${providerAcc.name}.`);return;}}
    const payload={provider_account_id:providerId,name:form.name.trim(),debt_type:form.debt_type||'Other',lender:form.lender||'',account_id:form.account_id||null,original_amount:principal,remaining_amount:remaining,monthly_payment:installment,due_date:form.due_date||null,frequency:'Monthly',notes:form.notes||'',start_date:form.start_date||null,term_months:term||null,total_repayment:totalRepayment,interest_rate:interestRate,paid_installments:paidCount,amount_paid:amountPaid};
    const saved=await saveRecord('debts',payload,editing?.id);if(!saved)return;
    setDebts(old=>editing?old.map(x=>x.id===editing.id?saved:x):[saved,...old]);if(convertTx&&!editing){const t=await saveRecord('transactions',{...convertTx,debt_id:saved.id},convertTx.id);if(t)setTransactions(old=>old.map(x=>x.id===t.id?t:x));}setConvertTx(null);setModal(null);setEditing(null);setDebtPresetProvider('');setToast(convertTx&&!editing?(convertTx.type==='Income'?'Debt saved and linked to your income':'Purchase turned into installments'):'Debt saved');
  }
  async function closeDebt(debt){
    const note=`Closed early on ${localISODate()} with ${fmt(Number(debt.remaining_amount||0))} unpaid.`;
    const saved=await saveRecord('debts',{remaining_amount:0,notes:[debt.notes,note].filter(Boolean).join('\n')},debt.id);
    if(!saved)return;setDebts(old=>old.map(x=>x.id===debt.id?saved:x));setToast(`${debt.name} closed`);
  }
  async function reopenDebt(debt){
    // Reopen = forget installments that were only auto-counted from the due date; keep real payments recorded as transactions.
    const total=Number(debt.total_repayment||debt.original_amount||0);
    const real=transactions.filter(t=>String(t.debt_id)===String(debt.id)&&t.type==='Expense');
    const realPaid=Math.min(total,real.reduce((n,t)=>n+Number(t.amount||0),0));
    const remaining=Math.max(0,Number((total-realPaid).toFixed(2)));
    if(!(remaining>0)){setToast('This debt has real payments covering all of it, so there is nothing left to reopen.');return;}
    const note=`Reopened on ${localISODate()}.`;
    const saved=await saveRecord('debts',{remaining_amount:remaining,amount_paid:Number(realPaid.toFixed(2)),paid_installments:real.length,notes:[debt.notes,note].filter(Boolean).join('\n')},debt.id);
    if(!saved)return;setDebts(old=>old.map(x=>x.id===debt.id?saved:x));setToast(`${debt.name} is active again`);
  }
  async function recordDebtInstallment(debt, options={}){
    if(typeof options==='string') options={accountId:options};
    const {mode='transaction', amount:enteredAmount, accountId:chosenAccountId, paymentDate=localISODate()}=options||{};
    const accountId=chosenAccountId||debt.account_id;
    const account=accounts.find(a=>String(a.id)===String(accountId));
    if(mode==='transaction'&&!account){setToast('Choose the account to pay this installment from.');return false;}
    if(mode==='transaction'&&isGoalsAccount(account)){setToast('The Goals account can only be used for transfers.');return false;}
    if(mode==='transaction'&&isLiability(account)){setToast('Choose a bank, cash or wallet account to pay from.');return false;}
    const total=Number(debt.total_repayment||debt.original_amount||0), installment=Number(debt.monthly_payment||0), paid=Number(debt.paid_installments||0), amountPaid=Number(debt.amount_paid??Math.max(0,total-Number(debt.remaining_amount||0)));
    const installmentAmount=Math.min(installment,Number(debt.remaining_amount||0));
    const actualPaid=mode==='transaction'?Number(enteredAmount??installmentAmount):Number(enteredAmount??installmentAmount);
    if(installmentAmount<=0||!(actualPaid>0)){setToast('Enter the amount you paid.');return false;}
    const partialPay=actualPaid<installmentAmount;
    if(mode==='transaction'){
      const accountIn=transactions.filter(t=>(t.type==='Income'&&String(t.account_id)===String(account.id))||(t.type==='Transfer'&&String(t.to_account_id)===String(account.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);
      const accountOut=transactions.filter(t=>((t.type==='Expense'||t.type==='Transfer')&&String(t.account_id)===String(account.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);
      const balance=Number(account.opening_balance||0)+accountIn-accountOut;
      if(actualPaid>balance){setToast(`Insufficient balance in ${account.name}. Available: ${fmt(balance)}.`);return false;}
    }
    const reduceBy=partialPay?actualPaid:installmentAmount;const nextPaid=partialPay?paid:paid+1, nextAmountPaid=Math.min(total,Number((amountPaid+reduceBy).toFixed(2))), nextRemaining=Math.max(0,Number((total-nextAmountPaid).toFixed(2)));
    let nextDue=debt.due_date||null;if(nextDue&&!partialPay){const d=new Date(`${nextDue}T12:00:00`);if(debt.frequency==='Weekly')d.setDate(d.getDate()+7);else if(debt.frequency==='Quarterly')d.setMonth(d.getMonth()+3);else if(debt.frequency==='Yearly')d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);nextDue=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    let txSaved=null;
    if(mode==='transaction'){
      const extraFees=Math.max(0,Number((actualPaid-installmentAmount).toFixed(2)));
      const txPayload={transaction_date:paymentDate,type:'Expense',category:'Debt repayment',subcategory:debt.debt_type||'Installment',description:`Installment · ${debt.name}`,amount:actualPaid,need_want:'Need',fixed_variable:'Fixed',payment_method:account.name,account_id:account.id,to_account_id:null,goal_id:null,debt_id:debt.id,recurring:false,notes:`${partialPay?'Partial payment for installment '+(paid+1):'Debt installment '+nextPaid}${extraFees>0?` · Extra fees: ${fmt(extraFees)}`:''}`};
      txSaved=await saveRecord('transactions',txPayload);if(!txSaved)return false;
    }
    const payload={name:debt.name,debt_type:debt.debt_type||'Other',lender:debt.lender||'',account_id:debt.account_id||account?.id||null,original_amount:Number(debt.original_amount||0),remaining_amount:nextRemaining,monthly_payment:installment,due_date:nextDue,frequency:debt.frequency||'Monthly',notes:debt.notes||'',start_date:debt.start_date||null,term_months:debt.term_months||null,total_repayment:total,interest_rate:Number(debt.interest_rate||0),paid_installments:nextPaid,amount_paid:nextAmountPaid};
    const saved=await saveRecord('debts',payload,debt.id);if(!saved){if(txSaved)await removeRecord('transactions',txSaved.id,setTransactions,transactions);return false;}
    if(txSaved)setTransactions(old=>[txSaved,...old]);setDebts(old=>old.map(x=>x.id===debt.id?saved:x));setToast(mode==='transaction'?`Installment recorded from ${account.name}${actualPaid>installmentAmount?' including extra fees':''}`:'Installment recorded without creating a transaction');return true;
  }

  async function chatSave(d){
    const base={transaction_date:d.date,subcategory:'',description:d.description||'',need_want:'Need',fixed_variable:'Variable',account_id:d.accountId||'',to_account_id:'',goal_id:'',debt_id:'',recurring:false,notes:'Added by typing',loan_mode:'none'};
    if(d.kind==='expense'||d.kind==='income')return !!(await submitTransaction({...base,type:d.type,category:d.category,amount:d.amount}));
    if(d.kind==='transfer')return !!(await submitTransaction({...base,type:'Transfer',category:'Transfer',description:'Transfer',amount:d.amount,to_account_id:d.toAccountId||'',goal_id:d.goalId||''}));
    if(d.kind==='goal'){if(!d.goalId){setToast('Choose a goal first.');return false;}return !!(await submitTransaction({...base,type:'Transfer',category:'Transfer',description:'Goal deposit',amount:d.amount,to_account_id:d.goalsAccountId,goal_id:d.goalId}));}
    if(d.kind==='debt'){const debt=debts.find(x=>String(x.id)===String(d.debtId));if(!debt)return false;return !!(await recordDebtInstallment(debt,{accountId:d.accountId,amount:d.amount,paymentDate:d.date}));}
    if(d.kind==='bill'){const r=recurring.find(x=>String(x.id)===String(d.billId));if(!r)return false;return !!(await markRecurringPaid(r,{accountId:d.accountId,amount:d.amount}));}
    return false;
  }
  async function signIn(e){
    e.preventDefault(); if(!supabase)return;
    const locked=loginLockSeconds();if(locked){setAuthMsg(`Too many sign-in attempts. Try again in ${formatWait(locked)}.`);return;}
    setBusy(true);setAuthMsg('');setSessionExpiredNotice(false);
    const loginId=authEmail.trim();
    const loginEmail=loginId.includes('@')?loginId:`${loginId.toLowerCase().replace(/[^a-z0-9._-]/g,'-')}@users.pocket.local`;
    const {error}=await supabase.auth.signInWithPassword({email:loginEmail,password:authPassword});
    setBusy(false);
    if(!error)clearLoginFailures();
    if(error){
      const message=String(error.message||'');
      if(/email not confirmed|email_not_confirmed|confirm your email/i.test(message)){
        setAuthMsg('Your email is not confirmed yet. Check your inbox or resend the confirmation email below.');
      }else if(/rate limit|too many|429/i.test(message)||error.status===429){
        setAuthMsg('Too many attempts right now. Please wait a few minutes and try again.');
      }else{
        const wait=recordLoginFailure();
        setAuthMsg(wait?`${message} Too many attempts — try again in ${formatWait(wait)}.`:message);
      }
    }
  }
  async function resendConfirmation(){
    if(!supabase)return;
    const email=authEmail.trim();
    if(!email){setAuthMsg('Enter your email address first, then resend the confirmation email.');return;}
    setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.resend({
      type:'signup',
      email,
      options:{emailRedirectTo:authRedirectUrl()}
    });
    setBusy(false);
    setAuthMsg(error ? error.message : 'If this address has a pending confirmation, a new confirmation email has been sent. Check your inbox and spam folder.');
  }
  async function signInWithGoogle(){
    if(!supabase){setAuthMsg('Google sign-in is unavailable until Supabase is configured.');return;}
    setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectUrl()}});
    if(error){setBusy(false);setAuthMsg(error.message);}
  }
  async function signUp(e){
    e.preventDefault(); if(!supabase)return;
    if(authPassword.length<10){setAuthMsg('Use a password with at least 10 characters.');return;}
    const username=authUsername.trim();
    if(!/^[a-zA-Z0-9._-]{3,32}$/.test(username)){setAuthMsg('Choose a username (3–32 characters: letters, numbers, dots, underscores or hyphens).');return;}
    setBusy(true);setAuthMsg('');
    if(!authEmail.trim()){
      const {error:fnError}=await supabase.functions.invoke('public-signup',{body:{full_name:authName.trim(),gender:authGender,avatar:defaultAvatarForGender(authGender),username,password:authPassword}});
      if(fnError){let msg=fnError.message;try{const j=await fnError.context?.json?.();if(j?.error)msg=j.error;}catch{}setBusy(false);setAuthMsg(msg||'Could not create the account.');return;}
      const {error:inError}=await supabase.auth.signInWithPassword({email:`${username.toLowerCase().replace(/[^a-z0-9._-]/g,'-')}@users.pocket.local`,password:authPassword});
      setBusy(false);
      if(inError){setAuthMode('signin');setAuthMsg('Account created! Sign in with your username.');}
      return;
    }
    const {data,error}=await supabase.auth.signUp({
      email:authEmail.trim(),
      password:authPassword,
      options:{data:{full_name:authName.trim(),username,gender:authGender,avatar:defaultAvatarForGender(authGender)},emailRedirectTo:authRedirectUrl()}
    });
    setBusy(false);
    if(error){setAuthMsg(error.message);return;}
    if(data.session){setAuthMsg('Account created successfully.');}
    else {setAuthMode('signin');setAuthMsg('Account created! Check your email to confirm your address, then sign in.');}
  }
  async function sendEmailVerification(){
    const email=session?.user?.email;if(!supabase||!email)return false;
    const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:authRedirectUrl()}});
    setToast(error?error.message:`Verification email sent to ${email}. Check your inbox and spam folder.`);return !error;
  }
  async function addAccountEmail(email){
    const clean=String(email||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)){setToast('Enter a valid email address.');return false;}
    const {error}=await supabase.auth.updateUser({email:clean},{emailRedirectTo:authRedirectUrl()});
    setToast(error?error.message:`We sent a confirmation link to ${clean}. After you confirm it, you can also sign in with this email.`);return !error;
  }
  async function resetPassword(e){
    e.preventDefault(); if(!supabase)return;
    setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.resetPasswordForEmail(authEmail.trim(),{redirectTo:authRedirectUrl()});
    setBusy(false);
    setAuthMsg(error?error.message:'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
  }
  async function updatePassword(e){
    e.preventDefault(); if(!supabase)return;
    if(authPassword.length<10){setAuthMsg('Use a password with at least 10 characters.');return;}
    if(authPassword!==authConfirmPassword){setAuthMsg('The passwords do not match.');return;}
    setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.updateUser({password:authPassword});
    if(error){setBusy(false);setAuthMsg(error.message);return;}
    await supabase.auth.signOut();
    setBusy(false);setAuthMode('signin');setAuthPassword('');setAuthConfirmPassword('');
    setAuthMsg('Password updated successfully. Sign in with your new password.');
  }
  async function createManagedUser(payload){
    if(!cloudReady){setToast('Creating users is available only in Supabase Cloud. These local demo accounts are fixed test accounts.');return false;}
    if(!['owner','super_admin'].includes(profile?.role))return false;
    const {data,error}=await supabase.functions.invoke('admin-create-user',{body:payload});
    if(error){setToast(error.message||'Could not create user');return false;}
    if(data?.error){setToast(data.error);return false;}
    setToast(data?.emailProvided?'User created successfully.':'User created. They can sign in with username; email recovery is unavailable until an email is added.');
    await refreshAdminUsers();
    return true;
  }
  async function refreshAdminUsers(){
    
    if(!['owner','super_admin'].includes(profile?.role))return;
    setAdminLoading(true);
    const {data,error}=await supabase.rpc('admin_list_users');
    if(error)setToast('Could not refresh users: '+error.message);else setAdminUsers(await withEmailStatus(data||[]));
    setAdminLoading(false);
  }
  async function deleteManagedUser(userId){
    if(!cloudReady){setToast('Built-in demo accounts cannot be deleted.');return;}
    if(!['owner','super_admin'].includes(profile?.role))return;
    const target=adminUsers.find(u=>u.user_id===userId);
    requestConfirm('Delete user account?', `Delete ${target?.email||'this user'} and all associated Pocket financial records? This cannot be undone.`, async()=>{
      const {error}=await supabase.rpc('admin_delete_user',{p_target_user_id:userId});
      if(error){setToast(error.message||'Could not delete user');return;}
      setToast('User and associated records deleted');await refreshAdminUsers();
    });
  }
  async function updateUserAccess(userId, enabledFeatures, role=null){
    if(!cloudReady){setToast('Demo account permissions are fixed for local testing.');return;}
    if(!['owner','super_admin'].includes(profile?.role))return;
    const {error}=await supabase.rpc('admin_update_user_access',{p_target_user_id:userId,p_enabled_features:enabledFeatures,p_role:role});
    if(error){setToast(error.message||'Could not update user access');return;}
    setToast('User access updated');
    await refreshAdminUsers();
  }
  async function exportTransactionsAs(format){
    if(!transactions.length){setToast('No transactions to export yet.');return;}
    try{await exportTransactions(format,transactions,accounts,currency);setToast(`Exported ${transactions.length} transactions as ${format==='xlsx'?'Excel':format.toUpperCase()}.`);}
    catch(err){setToast('Could not export: '+(err?.message||err));}
  }
  function downloadTemplateAs(format){downloadTemplate(format,currency);setToast(`Template downloaded (${format==='xlsx'?'Excel':'CSV'}). Fill it in, then use Import.`);}
  function exportCSV(){
    const ws=XLSX.utils.json_to_sheet(transactions.map(t=>({'Date':t.transaction_date,'Type':t.type,'Category':t.category,'Description':t.description,[`Amount (${currency})`]:t.amount,'Need / Want':t.need_want,'Fixed / Variable':t.fixed_variable,'Account / Wallet':accounts.find(a=>a.id===t.account_id)?.name||'No account linked','Recurring?':t.recurring?'Yes':'No','Notes':t.notes})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Transactions');XLSX.writeFile(wb,'forma-transactions.xlsx');
  }
  async function setBackupVisibility(enabled){
    if(!isAdmin){setToast('Only the Owner or Super Admin can change this setting');return;}
    if(cloudReady){
      const {error}=await supabase.from('app_settings').upsert({key:'backup_restore_for_users',value:!!enabled,updated_at:new Date().toISOString()},{onConflict:'key'});
      if(error){setToast('Could not save backup visibility: '+error.message);return;}
    }
    setBackupForUsers(!!enabled);setToast(enabled?'Backup & restore enabled for users':'Backup & restore hidden from users');
  }

  async function saveProfile(form){
    const name=String(form.full_name||'').trim();
    if(!name){setToast('Please enter your name');return;}
    setProfileSaving(true);
    try {
      if(cloudReady && session?.user){
        const {data,error}=await supabase.auth.updateUser({data:{...session.user.user_metadata,full_name:name,gender:form.gender||session.user.user_metadata?.gender||'prefer_not_to_say',currency:form.currency,timezone:form.timezone,avatar:form.avatar||profileAvatar}});
        if(error) throw error;
        const {error:profileError}=await supabase.from('profiles').update({full_name:name,updated_at:new Date().toISOString()}).eq('id',session.user.id);
        if(profileError) throw profileError;
        if(data?.user)setSession(old=>old?{...old,user:data.user}:old);
      }
      void 0;
      void 0;
      void 0;
      setProfileName(name);setCurrency(form.currency);setTimezone(form.timezone);if(form.avatar){setProfileAvatar(form.avatar);void 0;}
      setToast('Profile settings saved');setModal(null);
    } catch(err){setToast(err.message||'Could not save profile settings');}
    finally{setProfileSaving(false);}
  }
  function exportBackup(){
    const backup={app:'Forma Personal Finance',version:1,exported_at:new Date().toISOString(),currency,timezone,profile:{full_name:displayName},data:{transactions,budgets,goals,recurring,accounts,debts}};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`forma-backup-${localISODate()}.json`;a.click();URL.revokeObjectURL(url);
    setToast('Full backup exported');
  }
  async function restoreBackup(e){
    const file=e.target.files?.[0];if(!file)return;
    try{
      const backup=JSON.parse(await file.text());
      const data=backup?.data;
      if(backup?.app!=='Forma Personal Finance'||!data||!Array.isArray(data.transactions)||!Array.isArray(data.budgets)||!Array.isArray(data.goals)||!Array.isArray(data.recurring)) throw new Error('This is not a valid Forma backup.');
      if(!confirm('Restore this backup? Matching cloud record IDs will be updated; records without cloud IDs may be added. Keep a separate backup before continuing.')) return;
      if(cloudReady&&session?.user){
        for(const [table,rows] of [['transactions',data.transactions],['budgets',data.budgets],['savings_goals',data.goals],['recurring_payments',data.recurring],['financial_accounts',data.accounts||[]],['debts',data.debts||[]]]){
          for(const row of rows){
            const record={...row};
            if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(record.id||''))) delete record.id;
            let result;
            if(table==='budgets'){delete record.id;result=await supabase.from(table).upsert({...record,user_id:session.user.id},{onConflict:'user_id,category,month'});}
            else result=await supabase.from(table).upsert({...record,user_id:session.user.id},{onConflict:'id'});
            const {error}=result;
            if(error)throw error;
          }
        }
        if(backup.profile?.full_name||backup.currency||backup.timezone){
          const {data:userData,error:userError}=await supabase.auth.updateUser({data:{...session.user.user_metadata,full_name:backup.profile?.full_name||session.user.user_metadata?.full_name||'',currency:backup.currency||currency,timezone:backup.timezone||timezone}});
          if(userError)throw userError;if(userData?.user)setSession(old=>old?{...old,user:userData.user}:old);
        }
        const [t,b,g,r,a,d]=await Promise.all([supabase.from('transactions').select('*'),supabase.from('budgets').select('*'),supabase.from('savings_goals').select('*'),supabase.from('recurring_payments').select('*'),supabase.from('financial_accounts').select('*'),supabase.from('debts').select('*')]);
        if(t.error||b.error||g.error||r.error||a.error||d.error)throw new Error('Backup imported but data refresh failed. Reload the app.');
        setTransactions(t.data||[]);setBudgets(b.data||[]);setGoals(g.data||[]);setRecurring(r.data||[]);setAccounts(a.data||[]);setDebts(d.data||[]);
      } else {
        setTransactions(data.transactions);setBudgets(data.budgets);setGoals(data.goals);setRecurring(data.recurring);setAccounts((data.accounts||[]).map(a=>({...a,opening_balance_date:a.opening_balance_date||(a.created_at?String(a.created_at).slice(0,10):localISODate())})));setDebts(data.debts||[]);
      }
      if(backup.currency){void 0;setCurrency(backup.currency)}
      if(backup.timezone){void 0;setTimezone(backup.timezone)}
      if(backup.profile?.full_name){void 0;setProfileName(backup.profile.full_name)}
      setToast('Backup restored');
    }catch(err){setToast(err.message||'Could not restore backup');}
    finally{e.target.value='';}
  }
  async function markRecurringPaid(r,opts={}){
    const accId=opts.accountId||r.account_id||null;const record=opts.record!==false;
    if(paidBusy.includes(r.id))return false;
    setPaidBusy(old=>[...old,r.id]);
    try{
      const paidDate=localISODate();
      const already=Number(r.paid_amount||0),remaining=Math.max(0,Number(r.amount||0)-already);
      const payAmt=opts.amount!=null&&opts.amount!==''?Math.min(Number(opts.amount),remaining):remaining;
      if(!(payAmt>0))throw new Error('Enter an amount greater than zero.');
      const isPart=payAmt<remaining-0.004,newPaid=Math.round((already+payAmt)*100)/100,done=newPaid>=Number(r.amount||0)-0.004;
      const nextDue=addFrequency(r.next_due_date||paidDate,r.frequency);
      const gap=r.pay_by_date&&r.next_due_date?Math.round((new Date(r.pay_by_date+'T12:00:00')-new Date(r.next_due_date+'T12:00:00'))/864e5):null;
      const shiftPayBy=nd=>gap!=null&&gap>=0?localISODate(new Date(new Date(nd+'T12:00:00').getTime()+gap*864e5)):null;
      const patch=done?{next_due_date:nextDue,paid_this_cycle:true,last_paid_date:paidDate,paid_amount:0,...(r.pay_by_date?{pay_by_date:shiftPayBy(nextDue)}:{})}:{paid_amount:newPaid};
      if(!record){
        if(cloudReady&&session?.user){const {error}=await supabase.from('recurring_payments').update(patch).eq('id',r.id);if(error)throw error;}
        setRecurring(old=>old.map(x=>x.id===r.id?{...x,...patch}:x));
      } else if(cloudReady&&session?.user&&!isPart&&already===0){
        const {error}=await supabase.rpc('mark_recurring_payment_paid',{p_payment_id:r.id,p_paid_date:paidDate,p_account_id:accId});
        if(error)throw error;
        const [t,rec]=await Promise.all([supabase.from('transactions').select('*').order('transaction_date',{ascending:false}),supabase.from('recurring_payments').select('*').order('next_due_date',{ascending:true})]);
        if(t.error||rec.error)throw new Error('Payment recorded. Reload the app if the refreshed list is not visible.');
        let recRows=rec.data||[];
        if(r.pay_by_date){const fresh=recRows.find(x=>x.id===r.id);const nd=fresh?.next_due_date;const np=nd?shiftPayBy(nd):null;if(np){const {error:e2}=await supabase.from('recurring_payments').update({pay_by_date:np}).eq('id',r.id);if(!e2)recRows=recRows.map(x=>x.id===r.id?{...x,pay_by_date:np}:x);}}
        setTransactions(t.data||[]);setRecurring(recRows);
      } else {
        if(!cloudReady&&already===0&&!isPart&&r.last_paid_date&&r.next_due_date&&paidDate<r.next_due_date)throw new Error('This payment was already recorded for the current cycle.');
        const account=accounts.find(a=>String(a.id)===String(accId));if(!account)throw new Error('Choose an account or wallet in this recurring payment before marking it paid.');if(isGoalsAccount(account))throw new Error('The Goals account can only be used for transfers.');const accountIn=transactions.filter(t=>(t.type==='Income'&&String(t.account_id)===String(account.id))||(t.type==='Transfer'&&String(t.to_account_id)===String(account.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);const accountOut=transactions.filter(t=>((t.type==='Expense'||t.type==='Transfer')&&String(t.account_id)===String(account.id))).reduce((sum,t)=>sum+Number(t.amount||0),0);if(isProvider(account))throw new Error('Choose a bank, cash, wallet or credit card account for this payment.');const available=Number(account.opening_balance||0)+accountIn-accountOut+(isCard(account)?(Number(account.credit_limit)>0?Number(account.credit_limit):1e12):0);if(payAmt>available)throw new Error(`Insufficient balance in ${account.name}. Available: ${fmt(available)}.`);
        const partial=isPart||already>0;
        const tx={transaction_date:paidDate,type:'Expense',category:r.category||'Bills & Utilities',subcategory:r.subcategory||null,description:`Recurring payment: ${r.name}${partial?(done?' (final part)':' (part)'):''}`,amount:payAmt,need_want:'Need',fixed_variable:'Fixed',payment_method:account.name,account_id:account.id,recurring:true,notes:`Generated from recurring payment ${r.name}${partial?` · ${fmt(newPaid)} of ${fmt(r.amount)} paid`:''}`};
        let savedTx={...tx,id:uid()};
        if(cloudReady&&session?.user){
          const ins=await supabase.from('transactions').insert({...tx,user_id:session.user.id}).select().single();if(ins.error)throw ins.error;savedTx=ins.data;
          const {error:e3}=await supabase.from('recurring_payments').update(patch).eq('id',r.id);if(e3)throw e3;
        }
        setTransactions(old=>[savedTx,...old]);setRecurring(old=>old.map(x=>x.id===r.id?{...x,...patch}:x));
      }
      setToast(!record?(done?'Marked as paid · no transaction created':'Part payment saved · no transaction created'):done?'Payment recorded and next due date updated':`Part payment recorded · ${fmt(Math.max(0,Number(r.amount||0)-newPaid))} left`);
      return true;
    }catch(err){setToast(err.message||'Could not mark payment as paid');return false;}
    finally{setPaidBusy(old=>old.filter(id=>id!==r.id));}
  }

  async function withEmailStatus(users){
    try{const {data}=await supabase.rpc('admin_list_user_email_status');const m=new Map((data||[]).map(r=>[r.user_id,r.email_verified]));return users.map(u=>({...u,email_verified:m.has(u.user_id)?m.get(u.user_id):undefined}));}catch{return users;}
  }

  async function requestAccess(){
    if(!cloudReady || !session?.user){setToast('Sign in to request access.');return;}
    if(accessRequestBusy)return;
    setAccessRequestBusy(true);
    try{
      const {error}=await supabase.functions.invoke('request-access',{body:{}});
      if(error)throw error;
      setToast('Access request submitted. The administrator can review it in Pocket.');
    }catch(err){
      setToast(err?.context?.status===403?'Access requests are turned off right now. Please contact the administrator.':(err?.message||'Could not send your access request. Please try again later.'));
    }finally{setAccessRequestBusy(false);}
  }

  async function handleImport(e){
    const file=e.target.files?.[0];if(!file)return;
    try{
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const ws=wb.Sheets['Transactions']||wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      const mapped=rows.map((r,i)=>{
        const get=(...keys)=>{const k=Object.keys(r).find(x=>keys.some(y=>x.toLowerCase().trim()===y.toLowerCase()));return k?r[k]:''};
        const rawDate=get('Date','transaction_date');let date='';
        if(rawDate instanceof Date)date=localISODate(rawDate);else if(typeof rawDate==='number')date=XLSX.SSF.format('yyyy-mm-dd',rawDate);else if(rawDate)date=String(rawDate).slice(0,10);
        return {transaction_date:date,type:String(get('Type')||'Expense'),category:String(get('Category')||'Other'),description:String(get('Description')||''),amount:Number(get('Amount (EGP)','Amount (USD)','Amount (EUR)','Amount (GBP)','Amount (SAR)','Amount (AED)','Amount (CAD)','Amount (AUD)','Amount','amount')||0),need_want:String(get('Need / Want','Need/Wants')||'Need'),fixed_variable:String(get('Fixed / Variable')||'Variable'),payment_method:String(get('Payment Method')||'Cash'),recurring:['yes','true','1'].includes(String(get('Recurring?','Recurring')).toLowerCase()),notes:String(get('Notes')||'')};
      }).filter(x=>x.transaction_date&&x.amount>=0&&['Income','Expense'].includes(x.type));
      setImportPreview(mapped);setModal('import');
    }catch(err){setToast('Could not read this workbook. Check its Transactions sheet.');}
    e.target.value='';
  }
  async function confirmImport(){
    let added=[];
    for(const row of importPreview){const saved=await saveRecord('transactions',row);if(saved)added.push(saved);}
    setTransactions(old=>[...added,...old]);setModal(null);setImportPreview([]);setToast(`Imported ${added.length} transactions`);
  }

  const needsAccountSetup=cloudReady ? Boolean(session?.user && accountsLoaded && !accounts.some(a=>!isGoalsAccount(a))) : Boolean(localLoaded && !accounts.some(a=>!isGoalsAccount(a)));
  const isAdmin=(cloudReady && ['owner','super_admin'].includes(profile?.role));
  useEffect(()=>{
    if(!isAdmin||!supabase){setAccessRequestCounts({total:0,pending:0});return;}
    let alive=true;
    const refreshCounts=async()=>{try{const {data,error}=await supabase.rpc('admin_list_access_requests');if(error)throw error;const rows=Array.isArray(data)?data:[];if(alive)setAccessRequestCounts({total:rows.length,pending:rows.filter(r=>r.status==='pending').length});}catch{if(alive)setAccessRequestCounts({total:0,pending:0});}};
    refreshCounts();
    const onChanged=()=>refreshCounts();
    window.addEventListener('pocket-access-requests-updated',onChanged);
    return()=>{alive=false;window.removeEventListener('pocket-access-requests-updated',onChanged);};
  },[isAdmin,page,session?.user?.id]);
  const allowedFeatures=!cloudReady||isAdmin?FEATURE_OPTIONS.map(f=>f.key):(Array.isArray(profile?.enabled_features)?profile.enabled_features:[]);
  useEffect(()=>{let live=true;async function loadVehicleAlerts(){if(!supabase||!session?.user?.id||!allowedFeatures.includes('vehicle_management')){setVehicleReminderNotifications([]);return;}try{const [plansResult,vehiclesResult,fuelResult,svcResult]=await Promise.all([supabase.from('maintenance_plans').select('id,title,vehicle_id,next_due_date,next_due_odometer,last_service_odometer,status'),supabase.from('vehicles').select('id,name,current_odometer,odometer_unit'),supabase.from('vehicle_fuel_logs').select('vehicle_id,odometer'),supabase.from('vehicle_service_records').select('vehicle_id,odometer')]);if(!live||plansResult.error||vehiclesResult.error)return;const today=todayISO,limit=new Date(Date.now()+30*86400000).toISOString().slice(0,10),vehicles=vehiclesResult.data||[],plans=plansResult.data||[];const odoOf=id=>Math.max(Number(vehicles.find(v=>String(v.id)===String(id))?.current_odometer||0),...(fuelResult.data||[]).filter(x=>String(x.vehicle_id)===String(id)).map(x=>Number(x.odometer||0)),...(svcResult.data||[]).filter(x=>String(x.vehicle_id)===String(id)).map(x=>Number(x.odometer||0)),...plans.filter(x=>String(x.vehicle_id)===String(id)).map(x=>Number(x.last_service_odometer||0)));setVehicleReminderNotifications(plans.filter(p=>{if(p.status==='completed')return false;const cur=odoOf(p.vehicle_id);return (p.next_due_date&&p.next_due_date<=limit)||(p.next_due_odometer!=null&&Number(p.next_due_odometer)-cur<=500)}).map(p=>{const v=vehicles.find(x=>x.id===p.vehicle_id),cur=odoOf(p.vehicle_id),unit=v?.odometer_unit||'km',left=p.next_due_odometer!=null?Number(p.next_due_odometer)-cur:null,kmOver=left!=null&&left<=0,dateOver=Boolean(p.next_due_date&&p.next_due_date<today),overdue=kmOver||dateOver;const why=kmOver?`${Math.abs(left).toLocaleString()} ${unit} past due`:dateOver?`due ${p.next_due_date}`:left!=null&&left<=500?`only ${left.toLocaleString()} ${unit} left`:`due ${p.next_due_date}`;return {id:`vehicle-maintenance-${p.id}`,kind:'maintenance',name:`${p.title||'Vehicle maintenance'} · ${v?.name||'Vehicle'}`,detail:`${overdue?'Maintenance overdue':'Maintenance due soon'} · ${why}`,target:'Vehicle Management',amount:null}}));}catch{}}loadVehicleAlerts();return()=>{live=false}},[supabase,session?.user?.id,allowedFeatures.join('|'),page]);
  // New sidebar pages inherit the same access rule as the standard Workspace pages
  // unless an explicit feature mapping is added to PAGE_FEATURE.
  const getPageFeature=(name)=>PAGE_FEATURE[name]||'overview';
  const visibleNavGroups=[{label:'WORKSPACE',items:[['Overview',LayoutDashboard],['Transactions',ArrowLeftRight],['Bank SMS',MessageSquare],['Accounts',Wallet],['Cash flow calendar',CalendarDays],['Budgets',CreditCard],['Savings goals',Target],['Subscriptions & bills',Repeat2],['Debts & installments',CircleDollarSign]]},{label:'ANALYZE',items:[['Insights & reports',ChartNoAxesCombined]]}].map(g=>({...g,items:g.items.map(([name,Icon])=>[name,Icon,!allowedFeatures.includes(getPageFeature(name))])}));
  const wizardKey=`pocket-welcome-${session?.user?.id||'local'}`;
  useEffect(()=>{if(!cloudReady||!session?.user?.id||!accountsLoaded||busy)return;let seen=false;try{seen=localStorage.getItem(wizardKey)==='1'}catch{}if(!seen&&accounts.length===0&&transactions.length===0&&allowedFeatures.length>0)setWizardOpen(true)},[accountsLoaded,busy,session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeWizard=()=>{setWizardOpen(false);try{localStorage.setItem(wizardKey,'1')}catch{}};
  const tourKey=`pocket-tour-${session?.user?.id||'local'}`;
  const [tourOpen,setTourOpen]=useState(false);
  const closeTour=()=>{setTourOpen(false);try{localStorage.setItem(tourKey,'1')}catch{}};
  useEffect(()=>{const h=()=>setTourOpen(true);window.addEventListener('pocket:tour',h);return()=>window.removeEventListener('pocket:tour',h)},[]);
  useEffect(()=>{if(!cloudReady||!session?.user?.id||!accountsLoaded||busy||wizardOpen)return;let seen=true;try{seen=localStorage.getItem(tourKey)==='1'}catch{}const fresh=Date.now()-new Date(session.user.created_at||0).getTime()<14*864e5;if(!seen&&fresh)setTourOpen(true)},[accountsLoaded,busy,session?.user?.id,wizardOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const wizardSteps=[{key:'tx',feat:'transactions',emoji:'🧾',title:'Record a transaction',desc:'Add an expense or income. It takes about 20 seconds.',cta:'Add a transaction',action:()=>{if(!accounts.length){setToast('Add an account first, then record a transaction.');return}setEditing(null);setModal('transaction')}},{key:'sms',feat:'bank_sms',emoji:'💬',title:'Connect your bank SMS',desc:'Bank messages land in Pocket and you approve them as transactions.',cta:'Open Bank SMS',action:()=>setPage('Bank SMS')},{key:'credit',feat:'accounts',emoji:'💳',title:'Add a credit card or installment app',desc:'Track Valu, Halan, Aman and your cards with their limits.',cta:'Add a card',action:()=>creditActions.addCard()},{key:'budget',feat:'budgets',emoji:'🎯',title:'Set a monthly budget',desc:'Pick a category and a limit so you can see where money goes.',cta:'Set a budget',action:()=>{setEditing(null);setModal('budget')}},{key:'goal',feat:'goals',emoji:'🐷',title:'Create a savings goal',desc:'Something to save towards, with a target date.',cta:'Create a goal',action:()=>{setEditing(null);setModal('goal')}},{key:'bill',feat:'subscriptions',emoji:'🔁',title:'Add a recurring bill',desc:'Rent, subscriptions or installments, so nothing is missed.',cta:'Add a bill',action:()=>{setEditing(null);setModal('recurring')}}].filter(st=>allowedFeatures.includes(st.feat));
  const canSeeCurrentPage=['Admin access','Access requests','Access management'].includes(page)?isAdmin:page==='Access restricted'?true:allowedFeatures.includes(getPageFeature(page));
  const openCredit=id=>{setDebtFocus(id);setPage('Debts & installments')};
  const creditActions={
    open:openCredit,
    addCard:()=>{setEditing(null);setCreditKind('card');setModal('credit-account')},
    addProviderApp:()=>{setEditing(null);setCreditKind('provider');setModal('credit-account')},
    editAccount:a=>{setEditing(a);setCreditKind(isCard(a)?'card':'provider');setModal('credit-account')},
    payCard:(card,choice=0)=>setCardPay({card,choice}),
    payProvider:(provider,group)=>setProviderPay({provider,group}),
    addPurchase:card=>{setEditing(null);setTxPresetAccount(card.id);setModal('transaction')},
    convertPurchase:(provider,tx)=>{setEditing(null);setConvertTx(tx);setDebtPresetProvider(provider.id);setModal('debt')},
    addPlan:provider=>{setEditing(null);setDebtPresetProvider(provider.id);setModal('debt')}
  };
  // Keep the browser / phone status-bar colour in sync with the screen behind it (loading, login or app, light or dark).
  useEffect(()=>{
    const meta=document.querySelector('meta[name="theme-color"]');
    if(!meta)return;
    const loading=cloudReady&&(authLoading||(session&&!profileLoaded));
    if(loading){meta.setAttribute('content',bootTheme()==='dark'?'#131925':'#f7f8fa');return;}
    const id=requestAnimationFrame(()=>{try{const c=getComputedStyle(document.body).backgroundColor;if(c&&c!=='rgba(0, 0, 0, 0)')meta.setAttribute('content',c);}catch{}});
    return ()=>cancelAnimationFrame(id);
  },[authLoading,session,profileLoaded,theme]);
  if(cloudReady && (authLoading || (session && !profileLoaded))){
    let loadTheme='light';
    loadTheme=bootTheme();
    return <main className="pocket-loading-screen" data-lg-theme={loadTheme} role="status" aria-live="polite" aria-label="Loading Pocket">
    <div className="pocket-loading-glow pocket-loading-glow-one" aria-hidden="true"/><div className="pocket-loading-glow pocket-loading-glow-two" aria-hidden="true"/>
    <section className="pocket-loading-card">
      <div className="pocket-loading-brand"><span className="pocket-loading-logo"><img src="/brand/pocket-mark.svg" alt=""/></span><span>Pocket</span></div>
      <div className="pocket-loading-orbit" aria-hidden="true"><span className="pocket-loading-orbit-core"><img src="/brand/pocket-mark.svg" alt=""/></span></div>
      <h1>Getting things ready</h1>
      <p>Connecting to your secure workspace</p>
      <div className="pocket-loading-progress" aria-hidden="true"><span/></div>
      <div className="pocket-loading-foot"><span className="pocket-loading-status-dot"/> Secure sign-in <span className="pocket-loading-separator">·</span> Your data stays protected</div>
    </section>
  </main>;}
  if(cloudReady && (!session || authMode==='update-password')) return <AuthScreen {...{authMode,setAuthMode,authName,setAuthName,authGender,setAuthGender,authEmail,setAuthEmail,authUsername,setAuthUsername,authPassword,setAuthPassword,authConfirmPassword,setAuthConfirmPassword,authMsg,setAuthMsg,stayLoggedIn,setStayLoggedIn,busy,signIn,signInWithGoogle,signUp,resetPassword,updatePassword,resendConfirmation}} />;
  if(!cloudReady) return <main className="auth-page pocket-auth-page"><section className="auth-panel pocket-auth-panel"><div className="auth-choice-card pocket-auth-choice-card"><div className="auth-mobile-brand pocket-mobile-brand"><b>Pocket</b></div><h2>Connect Pocket to Supabase</h2><p className="auth-subtitle">Local and browser-based data storage is disabled. Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your deployment environment, then redeploy.</p></div></section></main>;
  return <div className={`app-shell sidebar-${isDesktopNav?sidebarSize:'comfortable'}`} lang="en" dir="ltr">
    <aside className={`sidebar ${sidebarOpen?'sidebar-open':''}`} onMouseOver={e=>{if(!(isDesktopNav&&sidebarSize==='compact')){if(navTip)setNavTip(null);return}const el=e.target.closest('[data-label]');if(!el){if(navTip)setNavTip(null);return}const r=el.getBoundingClientRect();setNavTip({label:el.dataset.label,top:r.top+r.height/2,left:r.right+10})}} onMouseLeave={()=>setNavTip(null)}>
      <div className="brand"><button type="button" data-label="Overview" className="brand-home" onClick={()=>{setPage('Overview');setSidebarOpen(false);}} aria-label="Pocket home — Overview"><div className="brand-mark"><img className="brand-logo-mark" src="/brand/pocket-mark.svg" alt="" /></div><span>Pocket</span></button><button className="icon-btn mobile-close" onClick={()=>setSidebarOpen(false)} aria-label="Close navigation"><X size={18}/></button></div><div className="sidebar-collapse-row"><button type="button" data-label="Expand sidebar" className="icon-btn sidebar-collapse-btn" onClick={()=>setSidebarSize(sidebarSize==='compact'?'comfortable':'compact')} title={sidebarSize==='compact'?'Expand sidebar':'Collapse sidebar'} aria-label={sidebarSize==='compact'?'Expand sidebar':'Collapse sidebar'}>{sidebarSize==='compact'?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>
      <div className="sidebar-scroll">
      <div className="sidebar-navigation-tools"><span className="sidebar-section-title">MONEY</span></div>
      {visibleNavGroups.filter(group=>group.label==='WORKSPACE').map(group=><div className="nav-group sidebar-flat-group" key={group.label}>{group.items.filter(([name])=>['Overview','Transactions','Bank SMS','Accounts'].includes(name)).map(([name,Icon,locked])=><button key={name} data-label={name} className={`nav-item ${page===name?'active':''} ${locked?'locked':''}`} onClick={()=>{setPage(name);setSidebarOpen(false)}}><Icon size={18}/><span>{name}</span>{locked&&<Lock size={13} className="nav-lock" aria-label="Locked"/>}{name==='Transactions'&&<span className="nav-count">{transactions.length}</span>}{name==='Bank SMS'&&pendingSms>0&&<span className="nav-count">{pendingSms}</span>}</button>)}</div>)}
      {visibleNavGroups.filter(group=>group.label==='ANALYZE').map(group=><div className="nav-group sidebar-flat-group" key={group.label}>{group.items.map(([name,Icon,locked])=><button key={name} data-label={name} className={`nav-item ${page===name?'active':''} ${locked?'locked':''}`} onClick={()=>{setPage(name);setSidebarOpen(false)}}><Icon size={18}/><span>{name}</span>{locked&&<Lock size={13} className="nav-lock" aria-label="Locked"/>}</button>)}</div>)}
      <div className="sidebar-section-heading"><span>PLAN</span></div>
      {visibleNavGroups.filter(group=>group.label==='WORKSPACE').map(group=><div className="nav-group sidebar-flat-group" key={'plan-'+group.label}>{group.items.filter(([name])=>['Cash flow calendar','Budgets','Savings goals','Subscriptions & bills','Debts & installments'].includes(name)).map(([name,Icon,locked])=><button key={name} data-label={name} className={`nav-item ${page===name?'active':''} ${locked?'locked':''}`} onClick={()=>{setDebtFocus(null);setPage(name);setSidebarOpen(false)}}><Icon size={18}/><span>{name}</span>{locked&&<Lock size={13} className="nav-lock" aria-label="Locked"/>}</button>)}</div>)}
      {<><div className="sidebar-section-heading"><span>VEHICLES</span></div><div className="nav-group sidebar-flat-group">{[['vehicles','My vehicles',CarFront],['maintenance','Maintenance',Wrench],['history','Service history',History],['fuel','Fuel log',Fuel]].map(([key,label,Icon])=><button key={key} data-label={label} className={`nav-item ${page==='Vehicle Management'&&vehicleSidebarTab===key?'active':''} ${allowedFeatures.includes('vehicle_management')?'':'locked'}`} onClick={()=>{setVehicleSidebarTab(key);setPage('Vehicle Management');setSidebarOpen(false)}}><Icon size={18}/><span>{label}</span>{!allowedFeatures.includes('vehicle_management')&&<Lock size={13} className="nav-lock" aria-label="Locked"/>}</button>)}</div></>}
      {(isAdmin||allowedFeatures.includes('expense_categories'))&&<><div className="sidebar-section-heading"><span>ADMIN</span></div><div className="nav-group sidebar-flat-group">{isAdmin&&<><button data-label="Requests" className={`nav-item ${page==='Access requests'?'active':''}`} onClick={()=>{setPage('Access requests');setSidebarOpen(false)}}><Mail size={18}/><span>Requests</span><span className="nav-count">{accessRequestCounts.pending}</span></button><button data-label="Users" className={`nav-item ${page==='Admin access'?'active':''}`} onClick={()=>{setPage('Admin access');setSidebarOpen(false)}}><Users size={18}/><span>Users</span></button></>}{(isAdmin||allowedFeatures.includes('expense_categories'))&&<button data-label="Expense categories" className={`nav-item ${page==='Expense categories'?'active':''}`} onClick={()=>{setPage('Expense categories');setSidebarOpen(false)}}><SlidersHorizontal size={18}/><span>Expense categories</span></button>}</div></>}
      </div>
      <div className="sidebar-bottom"><div className="sidebar-profile"><button type="button" data-label="Profile" className="sidebar-profile-open" onClick={()=>setModal('profile')} aria-label="View profile"><span className="sidebar-profile-avatar avatar-image"><ProfileAvatar value={profileAvatar}/></span><span className="sidebar-profile-copy"><b>{displayName}</b><span>View profile</span></span></button><button type="button" data-label="Settings" className="icon-btn sidebar-settings-button" onClick={()=>setModal('app-settings')} title="Settings" aria-label="Settings"><Settings size={18}/></button></div></div>
    </aside>
    {navTip&&<div className="sidebar-tooltip" style={{top:navTip.top,left:navTip.left}}>{navTip.label}</div>}
    {sidebarOpen&&<div className="scrim" onClick={()=>setSidebarOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-toggle" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><b className="breadcrumb-current">{page==='Vehicle Management'?({vehicles:'My Vehicles',maintenance:'Maintenance',history:'Service History',fuel:'Fuel Log'}[vehicleSidebarTab]||'My Vehicles'):page}</b></div><div className="topbar-actions"><button type="button" className="topbar-search" onClick={()=>setSearchOpen(true)} aria-label="Search Pocket" title="Search (Ctrl+K)"><Search size={16}/><span>Search</span><kbd>Ctrl K</kbd></button><button type="button" className="icon-btn theme-toggle-btn" onClick={()=>setTheme(current=>current==='dark'?'light':'dark')} title={theme==='dark'?'Switch to light mode':'Switch to dark mode'} aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><div className="top-action-wrap"><button className={`icon-btn notification-btn ${notificationsOpen?'is-open':''}`} onClick={()=>{setNotificationsOpen(v=>!v);setAccountMenuOpen(false)}} title="Notifications" aria-label={`Notifications${allNotificationItems.length?`, ${allNotificationItems.length} alerts`:''}`} aria-expanded={notificationsOpen}><Bell size={18}/>{allNotificationItems.length>0&&<span className="notification-count-badge" aria-hidden="true">{allNotificationItems.length>99?'99+':allNotificationItems.length}</span>}</button>{notificationsOpen&&<div className="top-popover notification-popover"><div className="popover-heading"><div><b>Notifications</b><span>{allNotificationItems.length?`${allNotificationItems.length} alert${allNotificationItems.length===1?'':'s'}`:'You’re all caught up'}</span></div><span className="popover-icon"><Bell size={16}/></span></div>{allNotificationItems.length?allNotificationItems.map(item=><button className="notification-item" key={item.id} onClick={()=>{if(item.kind==='maintenance'){setVehicleSidebarTab('maintenance');setPage('Vehicle Management')}else setPage(item.target);setNotificationsOpen(false)}}><span className="notification-item-icon">{item.kind==='budget'?<ChartNoAxesCombined size={16}/>:item.kind==='debt'?<CreditCard size={16}/>:item.kind==='maintenance'?<Wrench size={16}/>:<CalendarDays size={16}/>}</span><span className="notification-item-copy"><b>{item.name}</b><small>{item.detail}</small></span>{item.amount!==null&&<strong>{fmt(item.amount)}</strong>}</button>):<div className="notification-empty"><span><Check size={18}/></span><b>No alerts right now</b><small>Debt installments, budget limits, upcoming payments, and vehicle maintenance reminders will appear here.</small></div>}<button className="popover-footer-action" onClick={()=>{setPage('Budgets');setNotificationsOpen(false)}}>Review budgets <ArrowUpRight size={15}/></button></div>}</div><div className="top-action-wrap"><button className={`account-trigger ${accountMenuOpen?'is-open':''}`} onClick={()=>{setAccountMenuOpen(v=>!v);setNotificationsOpen(false)}} aria-label="Open account menu" aria-expanded={accountMenuOpen}><span className="top-avatar avatar-image"><ProfileAvatar value={profileAvatar}/></span><ChevronDown size={14}/></button>{accountMenuOpen&&<div className="top-popover account-popover"><div className="account-popover-identity"><span className="account-large-avatar avatar-image"><ProfileAvatar value={profileAvatar}/></span><div><b>{displayName}</b>{(()=>{const em=session?.user?.email||'';const real=em&&!em.endsWith('@users.pocket.local');const ok=real&&Boolean(session?.user?.email_confirmed_at);return <><span className="account-popover-email">{real?em:''}</span>{session&&<span className={`status-tag email-status ${!real?'is-none':ok?'status-good':'status-pending'}`}>{!real?'No email':ok?'Email verified':'Email not verified'}</span>}</>})()}<small>{profile?.role==='owner'?'Owner':profile?.role==='super_admin'?'Super admin':session?'User':'Local workspace'}</small></div></div><button className="account-menu-item" onClick={e=>{e.preventDefault();e.stopPropagation();setNotificationsOpen(false);setAccountMenuOpen(false);setModal('profile')}}><UserRound size={16}/><span>Account & profile</span></button>{session&&<button className="account-menu-item signout-menu-item" onClick={async()=>{setAccountMenuOpen(false);const {error}=await supabase.auth.signOut();if(error)setToast(error.message);else setToast('Signed out successfully')}}><LogOut size={16}/><span>Sign out</span></button>}</div>}</div></div></header>
      {!emailBarHidden&&<EmailStatusBar user={session?.user} onAddEmail={()=>setModal('profile')} onSendVerification={sendEmailVerification} onDismiss={()=>{setEmailBarHidden(true);try{sessionStorage.setItem('pocket-email-bar-hidden','1')}catch{}}}/>}
      <div className="page-wrap">
        {profileLoadError&&<div className="workspace-error" role="alert"><div><b>Couldn’t verify your access</b><p>{profileLoadError}</p></div><button className="btn btn-secondary btn-sm" onClick={()=>{setProfileLoaded(false);setProfileLoadError('');setProfileRetry(v=>v+1)}}>Retry</button></div>}
        {dataLoadError&&<div className="workspace-error" role="alert"><div><b>Some workspace data didn’t load</b><p>{dataLoadError}</p></div><button className="btn btn-secondary btn-sm" onClick={()=>setDataLoadAttempt(v=>v+1)}>Retry loading</button></div>}
        {cloudReady&&session&&!accountsLoaded?<WorkspaceSkeleton/>: <>
        {!canSeeCurrentPage&&!(isAdmin&&['Expense categories','Admin access','Access requests','Access management'].includes(page))&&<AccessRestricted profile={profile} onBack={()=>setPage(allowedFeatures[0]?FEATURE_OPTIONS.find(f=>f.key===allowedFeatures[0])?.label:'Overview')} onRequestAccess={requestAccess} requestBusy={accessRequestBusy} requestsOpen={accessRequestsOpen}/> }
        {page==='Expense categories'&&(isAdmin||allowedFeatures.includes('expense_categories'))&&<ExpenseCategoriesPage session={session} supabase={supabase}/>}
        {canSeeCurrentPage&&page==='Vehicle Management'&&<VehicleManagementPage session={session} supabase={supabase} transactions={transactions} setTransactions={setTransactions} accounts={accounts} debts={debts} currency={currency} onToast={setToast} onMakeInstallments={(provider,tx)=>{setPage('Debts & installments');creditActions.convertPurchase(provider,tx)}} requestedTab={vehicleSidebarTab} quickAction={quickAction}/>}
        {['Access management','Admin access','Access requests'].includes(page)&&isAdmin&&<AccessManagementPage supabase={supabase} onToast={setToast} users={adminUsers} loading={adminLoading} profile={profile} onUpdate={updateUserAccess} onDelete={deleteManagedUser} onCreate={createManagedUser} onRefresh={refreshAdminUsers} initialTab={page==='Admin access'?'users':'requests'}/>}
        {canSeeCurrentPage&&page==='Overview'&&<Overview {...{recurring:activeRecurring,onboardingKey:`pocket-onboarding-${session?.user?.id||'local'}`,onboardingSteps:[{key:'account',feat:'accounts',title:'Add an account or wallet',hint:'Cash, bank or e-wallet — where your money lives',done:accounts.some(a=>!isLiability(a)),action:()=>{setEditing(null);setModal('account')}},{key:'tx',feat:'transactions',title:'Record your first transaction',hint:'An expense or income, takes 20 seconds',done:transactions.length>0,action:()=>{if(!accounts.length){setToast('Add an account first, then record a transaction.');return}setEditing(null);setModal('transaction')}},{key:'sms',feat:'bank_sms',title:'Connect your bank SMS',hint:'Bank messages become transactions after your approval',done:transactions.some(t=>String(t.notes||'').startsWith('From bank SMS')),action:()=>setPage('Bank SMS')},{key:'credit',feat:'accounts',title:'Add a credit card or installment app',hint:'Valu, Halan, Aman, your cards…',done:accounts.some(a=>isLiability(a)),action:()=>creditActions.addCard()},{key:'budget',feat:'budgets',title:'Set a monthly budget',hint:'Pick a category and a limit',done:budgets.length>0,action:()=>{setEditing(null);setModal('budget')}},{key:'goal',feat:'goals',title:'Create a savings goal',hint:'Something to save towards',done:goals.length>0,action:()=>{setEditing(null);setModal('goal')}},{key:'bill',feat:'subscriptions',title:'Add a recurring bill',hint:'Rent, subscriptions, installments',done:recurring.length>0,action:()=>{setEditing(null);setModal('recurring')}}].filter(st=>allowedFeatures.includes(st.feat)),debts,creditActions,month,setMonth,transactions,accounts,monthTx,income,expenses,net,savingsRate,monthlySeries,categoryData,needs,wants,monthBudgets,totalBudget,totalSaved,goalTarget,upcoming,goals,setPage,setModal,setEditing,setToast,displayName,greeting,profileAvatar,session,supabase,currency,setVehicleSidebarTab,canViewVehicles:allowedFeatures.includes('vehicle_management')}}/>}
        {canSeeCurrentPage&&page==='Transactions'&&<TransactionsPage {...{transactions,reportTx,accounts,debts,filtered,search,setSearch,typeFilter,setTypeFilter,categoryFilter,setCategoryFilter,amountSort,setAmountSort,setModal,setEditing,setPage,setToast,removeRecord,setTransactions,handleImport,exportCSV,exportTransactionsAs,downloadTemplateAs,currency,requestConfirm,recordDebtInstallment,activeCategoryOptions:getExpenseCategories(profile?.gender)}}/>}
        {canSeeCurrentPage&&page==='Accounts'&&<AccountsPage {...{debts,creditActions,accountsView,setAccountsView,accounts,transactions,setModal,setEditing,removeRecord,setAccounts,currency,requestConfirm,defaultAccountId,setDefaultAccountId,pendingSms}} openSms={allowedFeatures.includes('bank_sms')?(from,id)=>{if(id)setSmsFocusAccount(id);setPage('Bank SMS')}:null}/>}
        {canSeeCurrentPage&&page==='Bank SMS'&&<SmsPage focusAccount={smsFocusAccount} onFocusDone={()=>setSmsFocusAccount(null)} debts={debts} recurring={recurring} onPayDebt={recordDebtInstallment} onPayBill={markRecurringPaid} accounts={accounts} transactions={transactions} session={session} supabase={supabase} currency={currency} gender={session?.user?.user_metadata?.gender||''} setToast={setToast} onPendingChange={setPendingSms} onUndoTx={async ids=>{for(const id of ids)await removeRecord('transactions',id,setTransactions,transactions);}} onApprove={async payload=>{const saved=await saveRecord('transactions',payload);if(saved)setTransactions(o=>[saved,...o]);return saved}}/>}
        {canSeeCurrentPage&&page==='Cash flow calendar'&&<CashFlowCalendar {...{transactions,recurring:activeRecurring,accounts,debts,month,setMonth,currency}}/>}
        {canSeeCurrentPage&&page==='Debts & installments'&&<DebtsPage {...{debts,accounts,transactions,debtFocus,setDebtFocus,credit:creditActions,setAccounts,setModal,setEditing,removeRecord,setDebts,currency,requestConfirm,recordDebtInstallment,closeDebt,reopenDebt,setDebtPaymentTarget,setToast}}/>}
        {canSeeCurrentPage&&(page==='Insights & reports'||page==='Insights & forecast'||page==='Reports')&&<InsightsReportsPage {...{transactions:reportTx,month,setMonth,budgets,recurring:activeRecurring,goals,debts,currency,setPage,accounts,showVehicles:allowedFeatures.includes('vehicle_management')}}/>}
        {canSeeCurrentPage&&page==='Budgets'&&<BudgetsPage {...{budgets,transactions:reportTx,month,setMonth,setModal,setEditing,setToast,removeRecord,setBudgets,requestConfirm}}/>}
        {canSeeCurrentPage&&page==='Savings goals'&&<GoalsPage {...{goals,transactions,accounts,setModal,setEditing,setToast,removeRecord,setGoals,totalSaved,goalTarget,requestConfirm}}/>}
        {canSeeCurrentPage&&(page==='Recurring payments'||page==='Subscriptions & bills')&&<RecurringPage {...{accounts,recurring,toggleRecurringActive,setModal,setEditing,setToast,removeRecord,setRecurring,markRecurringPaid,paidBusy,deleteRecurringPayment}}/>}
        </>}
      </div>
      <footer className="footer"><span>Pocket Finance <span className="footer-dot">•</span> Make room for what matters.</span><span>Currency: {currency}</span></footer>
    </main>
    {(modal==='transaction'||modal==='account-from-transaction')&&<TransactionModal presetAccountId={txPresetAccount} transactions={transactions} currency={currency} accounts={accounts} goals={goals} debts={debts} recordDebtInstallment={recordDebtInstallment} defaultAccountId={defaultAccountId} gender={session?.user?.user_metadata?.gender||''} session={session} initial={editing} onClose={()=>{setModal(null);setEditing(null);setTxPresetAccount('')}} onSave={submitTransaction} onAddAccount={()=>setModal('account-from-transaction')}/>}
    {modal==='goal'&&<GoalModal currency={currency} initial={editing} onClose={()=>{setModal(null);setEditing(null)}} onSave={addGoal}/>}
    {modal==='recurring'&&<RecurringModal currency={currency} accounts={accounts} initial={editing} onClose={()=>{setModal(null);setEditing(null)}} onSave={addRecurring}/>}
    {modal==='budget'&&<BudgetModal currency={currency} initial={editing} month={month} onClose={()=>{setModal(null);setEditing(null)}} onSave={addBudget}/>}
     {modal==='app-settings'&&<SettingsModal {...{onClose:()=>setModal(null),design,setDesign,sidebarSize,setSidebarSize,isAdmin,backupForUsers,setBackupVisibility,exportCSV,exportBackup,handleImport,restoreBackup,session,supabase,onOpenProfile:()=>setModal('profile')}}/>}
    {modal==='profile'&&<AccountProfileModal {...{sendEmailVerification,addAccountEmail,onClose:()=>setModal(null),openAvatarPicker:gender=>{setAvatarPickerGender(gender||session?.user?.user_metadata?.gender||'prefer_not_to_say');setModal('avatar-picker')},session,saveProfile,profileSaving,profileName:session?.user?.user_metadata?.full_name||profileName,gender:session?.user?.user_metadata?.gender||'prefer_not_to_say',currency,timezone,profileAvatar}}/>}
    {modal==='avatar-picker'&&<AvatarPickerModal current={profileAvatar} gender={avatarPickerGender} onClose={()=>setModal('profile')} onChoose={avatar=>{setProfileAvatar(avatar);setModal('profile')}} />}
    {tourOpen&&!wizardOpen&&<AppTour onClose={closeTour}/>}
    {wizardOpen&&<WelcomeWizard name={displayName.split(' ')[0]} currency={currency} canAccount={allowedFeatures.includes('accounts')} steps={wizardSteps} onClose={closeWizard} onCreateAccount={createSetupAccount}/>}
    {modal==='account'&&<AccountModal initial={editing} onClose={()=>{setModal(null);setEditing(null)}} onSave={saveAccount}/> }
    {modal==='account-from-transaction'&&<AccountModal initial={null} onClose={()=>setModal('transaction')} onSave={async form=>{const payload={name:form.name.trim(),type:form.type,opening_balance:Number(form.opening_balance||0),opening_balance_date:form.opening_balance_date||localISODate(),color:form.color||'#6c7cf5'};const saved=await saveRecord('financial_accounts',payload);if(!saved)return;setAccounts(old=>[saved,...old]);setModal('transaction');setToast('Account added. Select it for your transaction.')}}/>}
    {modal==='debt'&&<DebtModal currency={currency} accounts={accounts} debts={debts} transactions={transactions} convertTx={convertTx} providerAccounts={convertTx&&convertTx.type!=='Income'?accounts.filter(a=>String(a.id)===String(convertTx.account_id)):accounts.filter(isProvider)} presetProviderId={debtPresetProvider} onChooseAccountKind={kind=>{setEditing(null);setDebtPresetProvider('');setCreditKind(kind);setModal('credit-account')}} initial={editing} onClose={()=>{setModal(null);setEditing(null);setDebtPresetProvider('');setConvertTx(null)}} onSave={saveDebt}/> }
    {modal==='credit-account'&&<CreditAccountModal kind={creditKind} currency={currency} accounts={accounts} initial={editing} onClose={()=>{setModal(null);setEditing(null)}} onSave={saveCreditAccount}/>}
    {cardPay&&<CardPayModal card={accounts.find(a=>String(a.id)===String(cardPay.card.id))||cardPay.card} summary={cardSummary(accounts.find(a=>String(a.id)===String(cardPay.card.id))||cardPay.card,transactions,undefined,debts)} accounts={accounts} transactions={transactions} currency={currency} initialChoice={cardPay.choice} onClose={()=>setCardPay(null)} onSubmit={payCreditCard}/>}
    {providerPay&&<ProviderPayModal provider={providerPay.provider} group={providerPay.group} accounts={accounts} transactions={transactions} currency={currency} onClose={()=>setProviderPay(null)} onSubmit={payProviderGroup}/>}
    {modal==='debt-payment'&&debtPaymentTarget&&<DebtPaymentChoiceModal debt={debtPaymentTarget} accounts={accounts} currency={currency} onClose={()=>{setModal(null);setDebtPaymentTarget(null)}} onSubmit={async opts=>{const ok=await recordDebtInstallment(debtPaymentTarget,opts);if(ok){setModal(null);setDebtPaymentTarget(null)}}}/> }
    {modal==='import'&&<ImportModal rows={importPreview} onClose={()=>{setModal(null);setImportPreview([])}} onConfirm={confirmImport}/>}
    {confirmDialog&&<ConfirmActionModal dialog={confirmDialog} onCancel={()=>setConfirmDialog(null)} onConfirm={async()=>{const action=confirmDialog.onConfirm;setConfirmDialog(null);await action?.()}}/>}
    <GlobalSearch open={searchOpen} onClose={()=>setSearchOpen(false)} {...{transactions,accounts,debts,recurring,goals,currency}} loadVehicles={allowedFeatures.includes('vehicle_management')&&cloudReady&&session?.user?async()=>{const {data}=await supabase.from('vehicles').select('id,name,make,model,plate');return data||[]}:null} onPick={r=>{if(r.kind==='transaction'){setSearch(r.title||'');setPage('Transactions')}else if(r.kind==='account'){const a=accounts.find(x=>String(x.id)===String(r.id));if(a&&isLiability(a))openCredit(a.id);else setPage('Accounts')}else if(r.kind==='debt')setPage('Debts & installments');else if(r.kind==='recurring')setPage('Subscriptions & bills');else if(r.kind==='goal')setPage('Savings goals');else if(r.kind==='vehicle'){setVehicleSidebarTab('vehicles');setPage('Vehicle Management')}}}/>
    {<ChatSheet accounts={accounts} debts={debts} recurring={activeRecurring} goals={goals} currency={currency} defaultAccountId={defaultAccountId} expenseCats={getCategoriesForType('Expense',session?.user?.user_metadata?.gender||'')} incomeCats={incomeCategories} onSave={chatSave}/>}
    <QuickAdd showVehicles={allowedFeatures.includes('vehicle_management')} onTransaction={()=>{if(!accounts.length){setToast('Add an account or wallet first. Go to Accounts → Add account.');setPage('Accounts');return}setEditing(null);setModal('transaction')}} onFuel={()=>{setVehicleSidebarTab('fuel');setPage('Vehicle Management');setQuickAction({type:'fuel',n:Date.now()})}} onService={()=>{setVehicleSidebarTab('history');setPage('Vehicle Management');setQuickAction({type:'service',n:Date.now()})}}/>
    {toast&&<div className={`toast ${/insufficient balance|error|failed|could not/i.test(toast)?'toast-error':'toast-success'}`} role="status">{/insufficient balance|error|failed|could not/i.test(toast)?<XCircle size={18}/>:<Check size={17}/>}<span>{toast}</span></div>}
    {notificationToast&&<div role="button" tabIndex={0} className="notification-toast" onClick={()=>{setPage(notificationToast.target);setNotificationToast(null)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){setPage(notificationToast.target);setNotificationToast(null)}}} aria-label={`Open notification: ${notificationToast.name}`}><span className={`notification-toast-icon ${notificationToast.kind}`}><Bell size={17}/></span><span className="notification-toast-copy"><b>New notification</b><strong>{notificationToast.name}</strong><small>{notificationToast.detail}</small></span><button type="button" className="notification-toast-close" aria-label="Dismiss notification" onClick={e=>{e.stopPropagation();setNotificationToast(null)}}><X size={15}/></button></div>}
  </div>;
}

export default App;
