import { Component } from 'react';
import { reportError } from '../lib/monitoring.js';

/** Last line of defence: a runtime error shows a recovery screen instead of a blank white page. */
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Pocket crashed:', error, info?.componentStack); reportError(error, { componentStack: info?.componentStack }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div role="alert" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Manrope, Arial, sans-serif',textAlign:'center'}}>
      <div style={{maxWidth:380}}>
        <h1 style={{fontSize:22,margin:'0 0 8px'}}>Something went wrong</h1>
        <p style={{color:'#6b7280',lineHeight:1.5,margin:'0 0 18px'}}>Pocket hit an unexpected problem. Your data is safe in the cloud — reload to continue.</p>
        <button type="button" onClick={()=>window.location.reload()} style={{height:46,padding:'0 22px',border:0,borderRadius:12,background:'#3355f5',color:'#fff',fontWeight:700,fontSize:15}}>Reload Pocket</button>
      </div>
    </div>;
  }
}
