/* Illustrations for the login screen (style 2). Flat, drawn in SVG, all about
   what Pocket does: cards, bills due, savings goals, cash, receipts. */

export function ArtCard({className='',style}){
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 240 150" aria-hidden="true">
  <rect x="2" y="2" width="236" height="146" rx="18" fill="#3157f6"/>
  <circle cx="196" cy="34" r="74" fill="#4d70f8" opacity=".55"/>
  <circle cx="222" cy="128" r="44" fill="#2449df" opacity=".6"/>
  <rect x="24" y="36" width="40" height="30" rx="6" fill="#f2c14e"/>
  <path d="M24 51h40M44 36v30" stroke="#d29a2a" strokeWidth="2"/>
  <text x="24" y="106" fontSize="17" fill="#fff" letterSpacing="3" fontFamily="Manrope,Arial,sans-serif" fontWeight="700">•••• 4821</text>
  <text x="24" y="130" fontSize="11" fill="#dfe6ff" letterSpacing="1.5" fontFamily="Manrope,Arial,sans-serif" fontWeight="700">POCKET CARD</text>
 </svg>;
}

export function ArtCoins({className='',style}){
 const coin=(cy,label)=><g key={cy}><rect x="17" y={cy} width="96" height="14" fill="#d99a2b"/><ellipse cx="65" cy={cy+14} rx="48" ry="16" fill="#d99a2b"/><ellipse cx="65" cy={cy} rx="48" ry="16" fill="#f4bd52" stroke="#e0a030" strokeWidth="2"/>{label&&<text x="65" y={cy+5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#a86b0e" fontFamily="Manrope,Arial,sans-serif">E£</text>}</g>;
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 130 112" aria-hidden="true">{coin(80)}{coin(58)}{coin(36,true)}</svg>;
}

export function ArtCalendar({className='',style}){
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 140 168" aria-hidden="true">
  <rect x="2" y="2" width="136" height="164" rx="18" fill="#ffffff" stroke="#e5e8f0" strokeWidth="2"/>
  <path d="M2 20a18 18 0 0 1 18-18h100a18 18 0 0 1 18 18v26H2z" fill="#e5535f"/>
  <circle cx="38" cy="2" r="6" fill="#ffffff" stroke="#c9ced9" strokeWidth="2"/><circle cx="102" cy="2" r="6" fill="#ffffff" stroke="#c9ced9" strokeWidth="2"/>
  <text x="70" y="34" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffffff" letterSpacing="2" fontFamily="Manrope,Arial,sans-serif">NOV</text>
  <text x="70" y="104" textAnchor="middle" fontSize="54" fontWeight="800" fill="#171923" fontFamily="Sora,Manrope,Arial,sans-serif">19</text>
  <rect x="26" y="122" width="88" height="26" rx="13" fill="#fdf0e1"/>
  <text x="70" y="140" textAnchor="middle" fontSize="12" fontWeight="800" fill="#a25d19" fontFamily="Manrope,Arial,sans-serif">Rent due</text>
 </svg>;
}

export function ArtNote({className='',style}){
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 270 136" aria-hidden="true">
  <rect x="2" y="2" width="266" height="132" rx="10" fill="#d8efdf" stroke="#8cc9a1" strokeWidth="2"/>
  <rect x="12" y="12" width="246" height="112" rx="6" fill="none" stroke="#8cc9a1" strokeWidth="1.5" strokeDasharray="4 4"/>
  <circle cx="135" cy="68" r="38" fill="#bfe3cb" stroke="#8cc9a1" strokeWidth="2"/>
  <text x="135" y="62" textAnchor="middle" fontSize="13" fontWeight="800" fill="#2f7a52" letterSpacing="2" fontFamily="Manrope,Arial,sans-serif">EGP</text>
  <text x="135" y="88" textAnchor="middle" fontSize="28" fontWeight="800" fill="#2f7a52" fontFamily="Sora,Manrope,Arial,sans-serif">100</text>
  <text x="26" y="34" fontSize="16" fontWeight="800" fill="#2f7a52" fontFamily="Sora,Manrope,Arial,sans-serif">100</text>
  <text x="244" y="116" textAnchor="end" fontSize="16" fontWeight="800" fill="#2f7a52" fontFamily="Sora,Manrope,Arial,sans-serif">100</text>
 </svg>;
}

export function ArtGoal({className='',style}){
 const C=2*Math.PI*34;
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 210 140" aria-hidden="true">
  <rect x="2" y="2" width="206" height="136" rx="18" fill="#ffffff" stroke="#e5e8f0" strokeWidth="2"/>
  <text x="20" y="30" fontSize="12" fontWeight="800" fill="#171923" fontFamily="Manrope,Arial,sans-serif">Emergency fund</text>
  <g transform="translate(58 86) rotate(-90)"><circle r="34" fill="none" stroke="#e5e8f0" strokeWidth="10"/><circle r="34" fill="none" stroke="#32b98a" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${C*0.68} ${C}`}/></g>
  <text x="58" y="92" textAnchor="middle" fontSize="16" fontWeight="800" fill="#171923" fontFamily="Sora,Manrope,Arial,sans-serif">68%</text>
  <text x="108" y="80" fontSize="15" fontWeight="800" fill="#171923" fontFamily="Sora,Manrope,Arial,sans-serif">EGP 34,000</text>
  <text x="108" y="98" fontSize="11" fontWeight="600" fill="#6c7182" fontFamily="Manrope,Arial,sans-serif">of EGP 50,000</text>
 </svg>;
}

export function ArtReceipt({className='',style}){
 const row=(y,w,a)=><g key={y}><rect x="20" y={y} width={w} height="7" rx="3.5" fill="#d9dde8"/><rect x={130-a} y={y} width={a} height="7" rx="3.5" fill="#c3c9d8"/></g>;
 return <svg className={`lg2-obj ${className}`} style={style} viewBox="0 0 150 206" aria-hidden="true">
  <path d="M4 4h142v186l-11.8-9-11.8 9-11.8-9-11.8 9-11.8-9-11.8 9-11.8-9-11.8 9-11.8-9L4 190z" fill="#ffffff" stroke="#e5e8f0" strokeWidth="2" strokeLinejoin="round"/>
  <text x="20" y="34" fontSize="13" fontWeight="800" fill="#171923" fontFamily="Sora,Manrope,Arial,sans-serif">Electricity</text>
  <text x="20" y="49" fontSize="9.5" fontWeight="600" fill="#6c7182" fontFamily="Manrope,Arial,sans-serif">Bills &amp; utilities</text>
  {row(68,52,28)}{row(86,40,34)}{row(104,60,24)}
  <path d="M20 128h110" stroke="#e5e8f0" strokeWidth="2" strokeDasharray="4 4"/>
  <text x="20" y="150" fontSize="11" fontWeight="700" fill="#6c7182" fontFamily="Manrope,Arial,sans-serif">Total</text>
  <text x="130" y="150" textAnchor="end" fontSize="14" fontWeight="800" fill="#171923" fontFamily="Sora,Manrope,Arial,sans-serif">EGP 840</text>
  <g transform="translate(76 168) rotate(-12)"><rect x="-34" y="-12" width="68" height="24" rx="6" fill="none" stroke="#32b98a" strokeWidth="2.5"/><text y="6" textAnchor="middle" fontSize="14" fontWeight="800" fill="#32b98a" letterSpacing="2" fontFamily="Manrope,Arial,sans-serif">PAID</text></g>
 </svg>;
}
