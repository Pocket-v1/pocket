import { Plus } from '../../lib/icons.jsx';
import { MonthPicker } from './MonthPicker.jsx';
import { ProfileAvatar } from './ProfileAvatar.jsx';
import { TipButton } from './PageHeading.jsx';
import { PAGE_TIPS } from './pageTips.js';

// Home greeting: brand card with the person, the month switch and the main action.
export function WelcomeCard({ avatar, greeting, name, subtitle, month, setMonth, onAdd }) {
  return <section className="welcome-card" aria-label="Welcome">
    <div className="welcome-top">
      <span className="welcome-avatar"><ProfileAvatar value={avatar} className="welcome-avatar-img"/></span>
      <div className="welcome-copy"><span className="welcome-hi">{greeting},</span><h1 className="welcome-name">{name}</h1>{subtitle && <p className="welcome-sub">{subtitle}</p>}</div>
      <TipButton tips={PAGE_TIPS.overview}/>
    </div>
    <div className="welcome-actions">
      <MonthPicker month={month} setMonth={setMonth}/>
      <button className="btn welcome-add" onClick={onAdd}><Plus size={17}/> Add transaction</button>
    </div>
  </section>;
}
