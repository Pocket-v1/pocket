import { Eye, EyeOff } from '../../lib/icons.jsx';
import { useState } from 'react';

export function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className={`password-input-wrap ${className}`.trim()}>
    <input {...props} type={visible ? 'text' : 'password'} />
    <button type="button" className="password-visibility-toggle" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>
      {visible ? <EyeOff size={17}/> : <Eye size={17}/>}
    </button>
  </span>;
}
