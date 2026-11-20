import React, { useState } from 'react';
import { Eye, EyeOff } from '../lib/icons.jsx';

export function WorkspaceSkeleton(){
  return <section className="workspace-skeleton" aria-label="Loading workspace" aria-busy="true">
    <div className="skeleton-heading"><div className="skeleton-block skeleton-eyebrow"/><div className="skeleton-block skeleton-title"/><div className="skeleton-block skeleton-subtitle"/></div>
    <div className="skeleton-metrics">{[1,2,3,4].map(item=><div className="skeleton-panel" key={item}><div className="skeleton-block skeleton-label"/><div className="skeleton-block skeleton-value"/><div className="skeleton-block skeleton-line"/></div>)}</div>
    <div className="skeleton-columns"><div className="skeleton-panel skeleton-chart"><div className="skeleton-block skeleton-label"/><div className="skeleton-block skeleton-chart-shape"/></div><div className="skeleton-panel skeleton-chart"><div className="skeleton-block skeleton-label"/><div className="skeleton-block skeleton-chart-shape compact"/></div></div>
    <p className="skeleton-status"><span className="pocket-loading-status-dot"/> Loading your workspace securely…</p>
  </section>;
}

export function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className={`password-input-wrap ${className}`.trim()}>
    <input {...props} type={visible ? 'text' : 'password'} />
    <button type="button" className="password-visibility-toggle" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>
      {visible ? <EyeOff size={17}/> : <Eye size={17}/>}
    </button>
  </span>;
}
