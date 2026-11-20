import * as XLSX from 'xlsx';

const stamp=()=>new Date().toISOString().slice(0,10);
const templateHeaders=currency=>['Date','Type','Category','Description',`Amount (${currency})`,'Need / Want','Fixed / Variable','Payment Method','Recurring?','Notes'];

export function transactionRows(transactions,accounts,currency){
  return transactions.map(t=>({'Date':t.transaction_date,'Type':t.type,'Category':t.category,'Description':t.description,[`Amount (${currency})`]:t.amount,'Need / Want':t.need_want,'Fixed / Variable':t.fixed_variable,'Account / Wallet':accounts.find(a=>a.id===t.account_id)?.name||'No account linked','Recurring?':t.recurring?'Yes':'No','Notes':t.notes}));
}

function saveBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

export async function exportTransactions(format,transactions,accounts,currency){
  const rows=transactionRows(transactions,accounts,currency);
  const base=`pocket-transactions-${stamp()}`;
  if(format==='xlsx'){
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Transactions');
    XLSX.writeFile(wb,`${base}.xlsx`);return;
  }
  if(format==='csv'){
    const csv=XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
    saveBlob(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),`${base}.csv`);return;
  }
  if(format==='pdf'){
    const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
    const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});
    doc.setFontSize(16);doc.text('Pocket · Transactions',40,44);
    doc.setFontSize(9);doc.setTextColor(120);doc.text(`${rows.length} transactions · exported ${stamp()}`,40,60);
    autoTable(doc,{
      startY:76,
      head:[['Date','Type','Category','Description','Account',`Amount (${currency})`]],
      body:rows.map(r=>[r['Date'],r['Type'],r['Category'],r['Description']||'',r['Account / Wallet'],Number(r[`Amount (${currency})`]||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]),
      styles:{fontSize:8,cellPadding:5},headStyles:{fillColor:[49,87,246]},alternateRowStyles:{fillColor:[247,248,252]},
      columnStyles:{5:{halign:'right'}},margin:{left:40,right:40},
    });
    doc.save(`${base}.pdf`);return;
  }
  throw new Error('Unknown export format');
}

export function downloadTemplate(format,currency){
  const headers=templateHeaders(currency);
  if(format==='xlsx'){
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers]),'Transactions');
    const help=[['Column','What to enter'],['Date','YYYY-MM-DD, for example 2026-10-29 (required)'],['Type','Income or Expense (required)'],['Category','Any category name, for example Groceries'],['Description','Short note about the transaction'],[headers[4],'Number only, for example 250.50 (required)'],['Need / Want','Need or Want'],['Fixed / Variable','Fixed or Variable'],['Payment Method','Cash, Card, Bank transfer…'],['Recurring?','Yes or No'],['Notes','Optional']];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(help),'How to fill');
    XLSX.writeFile(wb,'pocket-transactions-template.xlsx');return;
  }
  const csv=XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([headers]));
  saveBlob(new Blob(['﻿'+csv+'\n'],{type:'text/csv;charset=utf-8'}),'pocket-transactions-template.csv');
}

export function exportTable(format,baseName,sheetName,rows){
  const base=`pocket-${baseName}-${stamp()}`;
  if(format==='xlsx'){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),sheetName);XLSX.writeFile(wb,`${base}.xlsx`);return;}
  const csv=XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
  saveBlob(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),`${base}.csv`);
}
