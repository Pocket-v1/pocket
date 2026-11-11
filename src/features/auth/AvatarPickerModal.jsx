import { Check } from '../../lib/icons.jsx';
import { ModalShell } from '../../components/modals/ModalShell.jsx';
import { avatarsForGender } from '../../lib/avatars.js';

export function AvatarPickerModal({current,onClose,onChoose,gender='prefer_not_to_say'}){
 const options=avatarsForGender(gender);
 const label=gender==='female'?'Female avatars':gender==='male'?'Male avatars':'All avatars';
 return <ModalShell title="Change profile picture" subtitle={`Choose from ${label.toLowerCase()} to use across Pocket.`} onClose={onClose} wide><div className="avatar-picker-gender-label">{label}<span>{options.length} pictures</span></div><div className="avatar-picker-popup-grid">{options.map((avatar,i)=><button type="button" key={avatar.id} className={`avatar-picker-popup-card ${current===avatar.id?'selected':''}`} onClick={()=>onChoose(avatar.id)} aria-label={`Choose ${gender} profile picture ${i+1}`}><img src={avatar.src} alt={`${avatar.gender} profile picture ${i+1}`} loading="lazy"/><span>{current===avatar.id?<><Check size={14}/> Selected</>:'Choose picture'}</span></button>)}</div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button></div></ModalShell>
}
