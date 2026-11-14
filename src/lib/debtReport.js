import * as XLSX from 'xlsx';
import { cleanPocketDebtNotes } from './debtNotes.js';

const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const safe=s=>String(s||'debt').trim().replace(/[^a-z0-9؀-ۿ]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'debt';
const stamp=()=>iso(new Date());

function step(date,frequency){const d=new Date(`${date}T12:00:00`);if(frequency==='Weekly')d.setDate(d.getDate()+7);else if(frequency==='Quarterly')d.setMonth(d.getMonth()+3);else if(frequency==='Yearly')d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);return iso(d);}

export function debtReportData(d,accounts=[],transactions=[],currency='EGP'){
  const acc=id=>accounts.find(a=>String(a.id)===String(id))?.name||'';
  const term=Number(d.term_months||0),paidCount=Number(d.paid_installments||0),monthly=Number(d.monthly_payment||0);
  const principal=Number(d.original_amount||0);
  const total=Number(d.total_repayment||((term&&monthly)?term*monthly:principal));
  const remaining=Number(d.remaining_amount||0);
  const paid=Number(d.amount_paid??Math.max(0,total-remaining));
  const interest=Number(d.interest_rate??(principal>0?((total-principal)/principal)*100:0));
  const linked=transactions.filter(t=>String(t.debt_id)===String(d.id));
  const payments=linked.filter(t=>t.type==='Expense').sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date)));
  const borrowed=linked.filter(t=>t.type==='Income').sort((a,b)=>String(a.transaction_date).localeCompare(String(b.transaction_date)));
  const summary=[
    ['Debt',d.name],['Type',d.debt_type||'Other'],['Lender / provider',d.lender||acc(d.provider_account_id)||'—'],['Paid from',acc(d.account_id)||'—'],
    [`Borrowed / original amount (${currency})`,money(principal)],['Interest %',interest?interest.toFixed(2):'0'],[`Total to repay (${currency})`,money(total)],
    [`Paid so far (${currency})`,money(paid)],[`Remaining (${currency})`,money(remaining)],[`Installment (${currency})`,money(monthly)],
    ['Frequency',d.frequency||'Monthly'],['Start date',d.start_date||'—'],['Installments',term?`${paidCount} of ${term} paid`:`${paidCount} paid`],['Next due',remaining>0?(d.due_date||'—'):'Fully paid'],
    ['Progress',total>0?`${Math.min(100,Math.round(paid/total*100))}%`:'—'],
  ];
  const note=cleanPocketDebtNotes(d.notes);if(note)summary.push(['Notes',note]);
  const history=[...borrowed.map(t=>({date:t.transaction_date,kind:'Money received',desc:t.description||'Borrowed money',account:acc(t.account_id),amount:Number(t.amount||0)})),...payments.map(t=>({date:t.transaction_date,kind:'Payment',desc:t.description||'Installment',account:acc(t.account_id),amount:Number(t.amount||0)}))];
  const schedule=[];
  if(remaining>0&&monthly>0&&d.due_date){let left=remaining,date=d.due_date,n=paidCount;let guard=0;while(left>0.004&&guard++<600){n+=1;const amt=Math.min(monthly,left);left=Math.max(0,Number((left-amt).toFixed(2)));schedule.push({no:n,date,amount:amt,balance:left});date=step(date,d.frequency);}}
  return {summary,history,schedule,paidTotal:payments.reduce((s,t)=>s+Number(t.amount||0),0)};
}

function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}

export async function downloadDebtReport(format,d,accounts,transactions,currency='EGP'){
  const r=debtReportData(d,accounts,transactions,currency);const base=`pocket-debt-${safe(d.name)}-${stamp()}`;
  if(format==='xlsx'){
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Item','Value'],...r.summary]),'Summary');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r.history.map(h=>({Date:h.date,Type:h.kind,Description:h.desc,Account:h.account,[`Amount (${currency})`]:h.amount}))),'History');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r.schedule.map(s=>({'#':s.no,'Due date':s.date,[`Amount (${currency})`]:s.amount,[`Balance after (${currency})`]:s.balance}))),'Upcoming');
    XLSX.writeFile(wb,`${base}.xlsx`);return;
  }
  const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
  const doc=new jsPDF({unit:'pt',format:'a4'});const W=doc.internal.pageSize.getWidth();
  doc.setFontSize(18);doc.text('Debt report',40,48);doc.setFontSize(11);doc.setTextColor(60);doc.text(String(d.name||''),40,66);
  doc.setFontSize(9);doc.setTextColor(120);doc.text(`Generated ${stamp()}`,W-40,48,{align:'right'});
  const common={styles:{fontSize:9,cellPadding:5},headStyles:{fillColor:[49,87,246]},alternateRowStyles:{fillColor:[247,248,252]},margin:{left:40,right:40}};
  autoTable(doc,{...common,startY:82,head:[['Summary','']],body:r.summary,columnStyles:{0:{fontStyle:'bold',cellWidth:190}}});
  let y=doc.lastAutoTable.finalY+22;
  doc.setFontSize(12);doc.setTextColor(30);doc.text(`Payment history (${r.history.length})`,40,y);
  autoTable(doc,{...common,startY:y+8,head:[['Date','Type','Description','Account',`Amount (${currency})`]],body:r.history.length?r.history.map(h=>[h.date,h.kind,h.desc,h.account,money(h.amount)]):[['No payments recorded yet','','','','']],columnStyles:{4:{halign:'right'}}});
  if(r.schedule.length){y=doc.lastAutoTable.finalY+22;if(y>740){doc.addPage();y=48}doc.setFontSize(12);doc.setTextColor(30);doc.text(`Upcoming installments (${r.schedule.length})`,40,y);
    autoTable(doc,{...common,startY:y+8,head:[['#','Due date',`Amount (${currency})`,`Balance after (${currency})`]],body:r.schedule.map(s=>[s.no,s.date,money(s.amount),money(s.balance)]),columnStyles:{2:{halign:'right'},3:{halign:'right'}}});}
  doc.save(`${base}.pdf`);
}
