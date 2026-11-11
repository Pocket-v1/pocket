import { Download, FileSpreadsheet, FileText } from '../../lib/icons.jsx';
import { MenuButton } from '../../components/ui/MenuButton.jsx';
import { downloadDebtReport } from '../../lib/debtReport.js';

/* "Report" menu for one debt: PDF or Excel with summary, payments and upcoming installments. */
export function DebtReportMenu({debt,accounts,transactions,currency,setToast}){
 const go=async format=>{try{await downloadDebtReport(format,debt,accounts,transactions,currency)}catch{setToast&&setToast('Could not create the report')}};
 return <MenuButton label="Report" icon={Download} className="btn btn-secondary btn-sm" items={[{label:'PDF report',description:'Summary, payments and what is left',icon:FileText,onClick:()=>go('pdf')},{label:'Excel',description:'Same details in a spreadsheet',icon:FileSpreadsheet,onClick:()=>go('xlsx')}]}/>;
}
