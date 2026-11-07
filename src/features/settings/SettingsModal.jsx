import { BellRing, ChevronDown, Database, Download, FileJson, FileSpreadsheet, LoaderCircle, LockKeyhole, Pencil, Plus, ShieldCheck, SlidersHorizontal, Trash2, Upload, UserRound, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { defaultExpenseCategories, getExpenseCategories, getSubcategories, saveCustomSubcategories, setExpenseCategoriesOverride } from '../../lib/categories.js';
import { authRedirectUrl } from '../../lib/supabase.js';

export function SettingsModal(p){
 const {onClose,design,setDesign,sidebarSize,setSidebarSize,isAdmin,backupForUsers,setBackupVisibility,exportCSV,exportBackup,handleImport,restoreBackup,session,supabase,onOpenProfile}=p;
 const defaultPrefs={budgetAlerts:true,debtAlerts:true,recurringAlerts:true,firstPage:'Overview',dateFormat:'DD/MM/YYYY',financialMonth:'1'};
 const [prefs,setPrefs]=useState(defaultPrefs);
 const [prefsLoaded,setPrefsLoaded]=useState(false);
 const [emailTest,setEmailTest]=useState({busy:false,msg:'',ok:true});
 const accountEmail=String(session?.user?.email||''),hasRealEmail=Boolean(accountEmail&&!accountEmail.endsWith('@users.pocket.local')),emailVerified=Boolean(hasRealEmail&&session?.user?.email_confirmed_at);
 const sendTestEmail=async()=>{setEmailTest({busy:true,msg:'',ok:true});try{const {data,error}=await supabase.functions.invoke('send-notification-emails',{body:{test:true}});if(error){let m=error.message;try{const b=await error.context?.json?.();if(b?.error)m=b.error}catch{}throw new Error(m)}if(data&&data.ok===false)throw new Error(data.error||'Could not send');setEmailTest({busy:false,msg:`Test email sent to ${accountEmail}. Check your inbox (and spam).`,ok:true})}catch(e){setEmailTest({busy:false,msg:e.message||'Could not send the test email.',ok:false})}};
 useEffect(()=>{let alive=true;(async()=>{if(!supabase||!session?.user?.id){setPrefsLoaded(true);return;}const {data,error}=await supabase.from('user_settings').select('settings').eq('user_id',session.user.id).maybeSingle();if(!alive)return;if(!error&&data?.settings?.settingsPrefs)setPrefs({...defaultPrefs,...data.settings.settingsPrefs});setPrefsLoaded(true);})();return()=>{alive=false}},[session?.user?.id]);
 const [open,setOpen]=useState('Profile & Account');
 const [passwordResetStatus,setPasswordResetStatus]=useState(null);
 const [expenseCats,setExpenseCats]=useState(()=>getExpenseCategories('').map(name=>({name,is_enabled:true})));
 const [categoryBusy,setCategoryBusy]=useState(false),[deleteExpenseCatConfirm,setDeleteExpenseCatConfirm]=useState(null);
 const [categoryError,setCategoryError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{if(!supabase||!session?.user?.id){setExpenseCats(getExpenseCategories('').map(name=>({name,is_enabled:true})));return;}setCategoryBusy(true);const {data,error}=await supabase.from('expense_categories').select('id,name,is_enabled').eq('user_id',session.user.id).order('name');if(!alive)return;if(error){setCategoryError('Could not load categories from Supabase. Run the included SQL migration, then try again.');setExpenseCats(getExpenseCategories('').map(name=>({name,is_enabled:true})));}else if(data?.length){setExpenseCats(data.map(x=>({name:x.name,is_enabled:x.is_enabled!==false})));setExpenseCategoriesOverride(data.filter(x=>x.is_enabled!==false).map(x=>x.name));}else{setExpenseCats(defaultExpenseCategories.map(name=>({name,is_enabled:true})));setCategoryError('No saved categories yet. Add your current categories to Supabase using the included migration/setup SQL.');}setCategoryBusy(false)})();return()=>{alive=false}},[session?.user?.id]);
 const [newExpenseCat,setNewExpenseCat]=useState('');
 const [editingExpenseCat,setEditingExpenseCat]=useState('');
 const [editingExpenseValue,setEditingExpenseValue]=useState('');
 const [expandedSubcategoryCategory,setExpandedSubcategoryCategory]=useState('');
 const [editingSubcategoryText,setEditingSubcategoryText]=useState('');
 const saveExpenseCats=async(next,operation={})=>{const clean=[...new Set(next.map(x=>String(typeof x==='string'?x:x.name).trim()).filter(Boolean))];setCategoryError('');if(!supabase||!session?.user?.id){setCategoryError('Please sign in to save categories to Supabase.');return false;}setCategoryBusy(true);try{if(operation.deleteName){const {error}=await supabase.from('expense_categories').delete().eq('user_id',session.user.id).eq('name',operation.deleteName);if(error)throw error;}if(operation.rename){const {error}=await supabase.from('expense_categories').update({name:operation.rename.to}).eq('user_id',session.user.id).eq('name',operation.rename.from);if(error)throw error;}if(operation.addName){const {error}=await supabase.from('expense_categories').insert({user_id:session.user.id,name:operation.addName});if(error)throw error;}const {data:latest}=await supabase.from('expense_categories').select('name,is_enabled').eq('user_id',session.user.id).order('name');const rows=latest?.length?latest.map(x=>({name:x.name,is_enabled:x.is_enabled!==false})):clean.map(name=>({name,is_enabled:true}));setExpenseCats(rows);setExpenseCategoriesOverride(rows.filter(x=>x.is_enabled).map(x=>x.name));return true;}catch(e){setCategoryError(e?.message||'Could not save categories to Supabase.');return false;}finally{setCategoryBusy(false)}};
 const update=async(key,value)=>{const next={...prefs,[key]:value};setPrefs(next);if(!supabase||!session?.user?.id){setCategoryError('Please sign in to save preferences to Supabase.');return;}const {data,error:readError}=await supabase.from('user_settings').select('settings').eq('user_id',session.user.id).maybeSingle();if(readError){setCategoryError(readError.message);return;}const current=data?.settings&&typeof data.settings==='object'?data.settings:{};const {error}=await supabase.from('user_settings').upsert({user_id:session.user.id,settings:{...current,settingsPrefs:next},updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)setCategoryError(error.message);};
 const sections=[
  {title:'Profile & Account',desc:'Personal details, currency and regional preferences.',icon:<UserRound size={18}/>,body:<><p className="small-muted">Update your name, profile picture, currency and time zone.</p><button className="btn btn-secondary" onClick={onOpenProfile}><UserRound size={15}/>Manage account & profile</button><p className="small-muted" style={{marginTop:10}}>Signed in as {session?.user?.email||'Local demo workspace'}</p></>},
  {title:'Notification Preferences',desc:'Choose which reminders appear in Pocket and get emailed to you.',icon:<BellRing size={18}/>,body:<><div className="email-alerts-card"><div className="access-intake-toggle"><span><b>Email me my reminders</b><small>{emailVerified?`One daily email to ${accountEmail} when a payment is due soon or overdue.`:hasRealEmail?'Verify your email first (see the bar at the top of Pocket) to receive reminder emails.':'Add and verify an email in Account & profile to receive reminder emails.'}</small></span><button type="button" role="switch" aria-checked={!!prefs.emailAlerts} aria-label="Email me my reminders" className={`switch${prefs.emailAlerts?' on':''}`} disabled={!emailVerified} onClick={()=>update('emailAlerts',!prefs.emailAlerts)}><i/></button></div>{emailVerified&&<div className="email-alerts-test"><button type="button" className="btn btn-secondary btn-sm" disabled={emailTest.busy} onClick={sendTestEmail}>{emailTest.busy?'Sending…':'Send me a test email'}</button>{emailTest.msg&&<small className={emailTest.ok?'is-ok':'is-err'}>{emailTest.msg}</small>}</div>}</div><div className="settings-preference-list">{[['budgetAlerts','Budget limit alerts','Notify me when a budget reaches 90%.'],['debtAlerts','Debt reminders','Show upcoming and overdue installment reminders.'],['recurringAlerts','Recurring payments','Show reminders for upcoming recurring payments.']].map(([key,label,help])=><div className="setting-toggle" key={key}><span><b>{label}</b><small>{help}</small></span><button type="button" role="switch" aria-checked={!!prefs[key]} aria-label={label} className={`switch${prefs[key]?' on':''}`} onClick={()=>update(key,!prefs[key])}><i/></button></div>)}</div></>},
  {title:'Security & Privacy',desc:'Review your account access and protect your financial data.',icon:<ShieldCheck size={18}/>,body:<><div className="settings-info-row"><LockKeyhole size={17}/><div><b>Account authentication</b><p className="small-muted">Your account is protected by Pocket sign-in and Supabase authentication.</p></div></div>{session&&<><button className="btn btn-secondary" type="button" onClick={async()=>{setPasswordResetStatus({type:'loading',message:'Sending password reset request…'});try{if(!supabase)throw new Error('Password reset is unavailable in local demo mode.');const {error}=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:authRedirectUrl()});if(error)throw error;setPasswordResetStatus({type:'success',message:`Password reset request submitted for ${session.user.email}. If this email is registered, a reset link should arrive shortly. Check your inbox and spam folder.`});}catch(error){setPasswordResetStatus({type:'error',message:error?.message||'Could not submit the password reset request. Please try again.'});}}} disabled={passwordResetStatus?.type==='loading'}>{passwordResetStatus?.type==='loading'?'Sending…':'Request password reset'}</button>{passwordResetStatus&&<p className={`password-reset-status ${passwordResetStatus.type}`} role="status" aria-live="polite">{passwordResetStatus.message}</p>}</>}<p className="small-muted" style={{marginTop:10}}>Never share exported backups; they may contain private financial information.</p></>},
  {title:'Data Management',desc:'Back up, restore or import your financial records.',icon:<Database size={18}/>,body:<>{(isAdmin||backupForUsers)?<><div className="settings-actions"><button className="btn btn-secondary" onClick={exportBackup}><FileJson size={16}/>Full JSON backup</button><button className="btn btn-secondary" onClick={exportCSV}><Download size={16}/>Export transactions</button><label className="btn btn-secondary file-btn"><Upload size={16}/>Restore JSON backup<input type="file" accept="application/json,.json" onChange={restoreBackup}/></label><label className="btn btn-secondary file-btn"><FileSpreadsheet size={16}/>Import Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport}/></label></div><p className="small-muted" style={{marginTop:10}}>Backup files contain private financial data. Keep them secure.</p></>:<p className="small-muted">Backup and restore tools are currently limited to Owner and Super Admins.</p>}</>},
  {
   title:'Expense Categories',
   desc:'Add, rename or remove categories used in expense transactions.',
   icon:<SlidersHorizontal size={18}/>,
   body:(
    <div className="expense-category-settings">
     <p className="small-muted">Your current expense categories are listed below. Changes are saved to your Pocket account in Supabase.</p>
     <form className="expense-category-add" onSubmit={e=>{
      e.preventDefault();
      const value=newExpenseCat.trim();
      const exists=expenseCats.some(c=>String(typeof c==='string'?c:c.name).toLowerCase()===value.toLowerCase());
      if(value&&!exists){saveExpenseCats([...expenseCats,value],{addName:value}).then(ok=>{if(ok)setNewExpenseCat('')});}
     }}>
      <input aria-label="New expense category" placeholder="New category name" value={newExpenseCat} onChange={e=>setNewExpenseCat(e.target.value)} maxLength={50}/>
      <button className="btn btn-primary" type="submit" disabled={!newExpenseCat.trim()||expenseCats.some(c=>String(typeof c==='string'?c:c.name).toLowerCase()===newExpenseCat.trim().toLowerCase())}><Plus size={15}/>Add category</button>
     </form>
     <div className="expense-category-list">
      {categoryBusy&&<p className="small-muted">Loading / saving categories…</p>}
      {categoryError&&<p className="small-muted" role="alert">{categoryError}</p>}
      {expenseCats.map(item=>{
       const cat=typeof item==='string'?item:item.name;
       const enabled=typeof item==='string'?true:item.is_enabled!==false;
       return <div className="expense-category-row" key={cat}>
        <label className="expense-category-visibility">
         <input type="checkbox" checked={enabled} disabled={categoryBusy} onChange={async e=>{
          const nextEnabled=e.target.checked;
          setCategoryBusy(true);setCategoryError('');
          if(!supabase||!session?.user?.id){setCategoryError('Please sign in to update category visibility.');setCategoryBusy(false);return;}
          const {error}=await supabase.from('expense_categories').update({is_enabled:nextEnabled}).eq('user_id',session.user.id).eq('name',cat);
          if(error){setCategoryError(error.message||'Could not update category visibility.');}
          else {const next=expenseCats.map(x=>(typeof x==='string'?x:x.name)===cat?{name:cat,is_enabled:nextEnabled}:x);setExpenseCats(next);setExpenseCategoriesOverride(next.filter(x=>typeof x==='string'||x.is_enabled!==false).map(x=>typeof x==='string'?x:x.name));}
          setCategoryBusy(false);
         }}/>
        </label>
        {editingExpenseCat===cat ? (
         <div className="category-edit-form">
          <input aria-label="Rename category" value={editingExpenseValue} onChange={e=>setEditingExpenseValue(e.target.value)} maxLength={50}/>
          <label className="category-subcategory-editor"><span>Subcategories <small>Separate each subcategory with a comma</small></span><textarea value={editingSubcategoryText} onChange={e=>setEditingSubcategoryText(e.target.value)} rows={2}/></label>
          <div className="category-edit-actions">
           <button className="btn btn-primary btn-sm" onClick={async()=>{
            const value=editingExpenseValue.trim();
            const duplicate=expenseCats.some(c=>{const name=typeof c==='string'?c:c.name;return name!==cat&&name.toLowerCase()===value.toLowerCase()});
            if(!value||duplicate)return;
            const ok=await saveExpenseCats(expenseCats.map(c=>(typeof c==='string'?c:c.name)===cat?{name:value,is_enabled:typeof c==='string'?true:c.is_enabled}:c),{rename:{from:cat,to:value}});
            if(ok){const values=editingSubcategoryText.split(',').map(x=>x.trim()).filter(Boolean);if(supabase&&session?.user?.id){if(value!==cat){const {error:renameError}=await supabase.from('expense_subcategories').update({category_name:value}).eq('user_id',session.user.id).eq('category_name',cat);if(renameError){setCategoryError(renameError.message||'Category renamed, but subcategories could not be renamed in Supabase.');return;}}const {error:deleteError}=await supabase.from('expense_subcategories').delete().eq('user_id',session.user.id).eq('category_name',value);if(deleteError){setCategoryError(deleteError.message||'Could not save subcategories.');return;}if(values.length){const {error:insertError}=await supabase.from('expense_subcategories').insert(values.map(name=>({user_id:session.user.id,category_name:value,name})));if(insertError){setCategoryError(insertError.message||'Could not save subcategories.');return;}}}saveCustomSubcategories(value,values);if(value!==cat){try{const saved=JSON.parse(null||'{}');delete saved[cat];void 0;}catch{}}setEditingExpenseCat('');setExpandedSubcategoryCategory('');}
           }} disabled={!editingExpenseValue.trim()||categoryBusy}>Save</button>
           <button className="btn btn-secondary btn-sm" onClick={()=>{setEditingExpenseCat('');setExpandedSubcategoryCategory('')}}>Cancel</button>
          </div>
         </div>
        ) : (
         <>
          <span>{cat}</span>
          <div className="row-actions">
           <button type="button" className="icon-btn" title="Edit category and subcategories" aria-label={'Edit '+cat+' and subcategories'} onClick={()=>{setEditingExpenseCat(cat);setEditingExpenseValue(cat);setExpandedSubcategoryCategory(cat);setEditingSubcategoryText(getSubcategories('Expense',cat).join(', '));}}><Pencil size={14}/></button>
           <button type="button" className="icon-btn danger-hover" aria-label={'Delete '+cat} onClick={()=>setDeleteExpenseCatConfirm({name:cat})}><Trash2 size={14}/></button>
          </div>
         </>
        )}
       </div>;
      })}
     </div>
     <p className="small-muted">Note: removing a category won’t delete or rewrite historical transactions.</p>
    </div>
   )
  },
  {title:'Preferences',desc:'Personalize how dates and navigation behave.',icon:<SlidersHorizontal size={18}/>,body:<div className="settings-preference-grid"><label className="field"><span>First page after opening Pocket</span><select value={prefs.firstPage} onChange={e=>update('firstPage',e.target.value)}>{['Overview','Transactions','Accounts','Budgets','Debts','Goals','Recurring payments','Insights & reports'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>Date format</span><select value={prefs.dateFormat} onChange={e=>update('dateFormat',e.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></label><label className="field"><span>Financial year starts</span><select value={prefs.financialMonth} onChange={e=>update('financialMonth',e.target.value)}>{Array.from({length:12},(_,i)=>i+1).map(m=><option value={String(m)} key={m}>{new Date(2026,m-1,1).toLocaleString('en',{month:'long'})}</option>)}</select></label></div>},
  ...(isAdmin?[{title:'User Permissions',desc:'Control access to administrative data tools.',icon:<Users size={18}/>,body:<label className="setting-toggle"><span><b>Show Backup & restore to regular users</b><small>When off, only Owner and Super Admins can see these tools.</small></span><input type="checkbox" checked={backupForUsers} onChange={e=>setBackupVisibility(e.target.checked)}/></label>}]:[])
 ];
 return <><ModalShell title="Settings" subtitle="Manage your account, preferences, notifications and data." onClose={onClose} wide><div className="settings-accordion-list">{sections.filter(section=>!['Profile & Account','Expense Categories'].includes(section.title)).map(section=><section className={`settings-card ${open===section.title?'is-expanded':''}`} key={section.title}><button type="button" className="settings-card-trigger" onClick={()=>setOpen(open===section.title?'':section.title)} aria-expanded={open===section.title}><span className="settings-card-icon">{section.icon}</span><span className="settings-card-copy"><b>{section.title}</b><small>{section.desc}</small></span><ChevronDown size={17} className="settings-card-chevron"/></button>{open===section.title&&<div className="settings-card-content">{section.body}</div>}</section>)}</div><div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div></ModalShell>{deleteExpenseCatConfirm&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!categoryBusy)setDeleteExpenseCatConfirm(null)}}><section className="modal-shell category-wizard-card category-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="settings-delete-category-title"><div className="modal-header"><div><h2 id="settings-delete-category-title">Delete expense category?</h2><p>Remove <b>{deleteExpenseCatConfirm.name}</b>? Existing transactions will keep their saved category name. This change will be saved to your Pocket account.</p></div><button className="icon-btn" disabled={categoryBusy} onClick={()=>setDeleteExpenseCatConfirm(null)}><X size={18}/></button></div>{categoryError&&<div className="workspace-error" role="alert">{categoryError}</div>}<div className="category-wizard-actions"><button className="btn btn-secondary" disabled={categoryBusy} onClick={()=>setDeleteExpenseCatConfirm(null)}>Cancel</button><button className="btn btn-danger" disabled={categoryBusy} onClick={async()=>{const cat=deleteExpenseCatConfirm.name;setCategoryBusy(true);setCategoryError('');try{const ok=await saveExpenseCats(expenseCats.filter(c=>(typeof c==='string'?c:c.name)!==cat),{deleteName:cat});if(ok){setDeleteExpenseCatConfirm(null);setExpandedSubcategoryCategory('')}}catch(e){setCategoryError(e?.message||'Could not delete this category.')}finally{setCategoryBusy(false)}}}>{categoryBusy?<LoaderCircle size={15}/>:<Trash2 size={15}/>} Delete category</button></div></section></div>}</>
}
