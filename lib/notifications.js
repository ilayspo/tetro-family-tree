import {query} from './db';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export async function queueNotification(client,{recipient,subject,lines}){
 const text=[subject,'',...lines].join('\n');
 const html=`<div dir="rtl" style="font-family:Arial,sans-serif"><h2>${escape(subject)}</h2><ul>${lines.map(line=>`<li>${escape(line)}</li>`).join('')}</ul><p><a href="https://tetro-family-tree.vercel.app/admin.html">פתיחת ממשק הניהול</a></p></div>`;
 const r=await client.query('insert into notification_outbox(recipient,subject,text_body,html_body) values($1,$2,$3,$4) returning id',[recipient,subject,text,html]);
 return r.rows[0].id;
}

export async function deliverNotification(id){
 const r=await query("select * from notification_outbox where id=$1 and status<>'sent'",[id]);
 if(!r.rowCount)return {sent:false};
 const item=r.rows[0],key=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
 if(!key||!from){await query("update notification_outbox set status='failed',attempts=attempts+1,last_error='Email provider is not configured' where id=$1",[id]);return {sent:false,reason:'not_configured'};}
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[item.recipient],subject:item.subject,text:item.text_body,html:item.html_body})});
  if(!response.ok)throw Error(`Email provider returned ${response.status}`);
  await query("update notification_outbox set status='sent',attempts=attempts+1,sent_at=now(),last_error=null where id=$1",[id]);return {sent:true};
 }catch(error){await query("update notification_outbox set status='failed',attempts=attempts+1,last_error=$2 where id=$1",[id,String(error.message).slice(0,500)]);return {sent:false,reason:'delivery_failed'};}
}
