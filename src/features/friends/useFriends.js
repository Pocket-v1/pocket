import { useCallback, useEffect, useState } from 'react';

// Friends, loans friends gave me, and payments on shared loans.
export function useFriends({supabase,userId,enabled}){
 const [friends,setFriends]=useState([]);const [owe,setOwe]=useState([]);const [payments,setPayments]=useState([]);const [myLoans,setMyLoans]=useState(null);
 const refresh=useCallback(async()=>{
  if(!supabase||!userId||!enabled)return;
  const [f,o,p,m]=await Promise.all([supabase.rpc('friends_list'),supabase.rpc('loans_i_owe'),supabase.from('loan_payments').select('*').order('created_at',{ascending:false}),supabase.from('loans_given').select('*').eq('user_id',userId).order('lent_on',{ascending:false})]);
  if(!f.error)setFriends(f.data||[]);if(!o.error)setOwe(o.data||[]);if(!p.error)setPayments(p.data||[]);if(!m.error)setMyLoans(m.data||[]);
 },[supabase,userId,enabled]);
 useEffect(()=>{refresh();if(!enabled)return;const t=setInterval(refresh,20000);const h=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',h);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',h)}},[refresh,enabled]);
 const accepted=friends.filter(f=>f.status==='accepted');
 return {friends,accepted,owe,payments,myLoans,refresh};
}
