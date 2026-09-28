import {createHash,randomBytes} from 'node:crypto';
import {query,transaction} from './db';

const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const inviteHash=token=>createHash('sha256').update(String(token)).digest('hex');
export const newInviteToken=()=>randomBytes(32).toString('base64url');
export const normalizeEmail=value=>{const email=String(value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)bad('יש להזין כתובת דוא״ל תקינה.');return email;};
export const maskEmail=value=>{const [local,domain]=String(value).split('@');return `${local?.slice(0,2)||'*'}${'*'.repeat(Math.max(2,(local?.length||2)-2))}@${domain||''}`;};

export async function editorContext(userId,targetId,c={query}){
 const own=await c.query('select person_id from profile_accounts where user_id=$1',[userId]);
 if(!own.rowCount)bad('החשבון אינו משויך לפרופיל משפחתי.',403);
 const actorPersonId=own.rows[0].person_id;
 if(actorPersonId===targetId)return {actorPersonId,access:'self'};
 const grant=await c.query('select 1 from profile_editor_grants where editor_person_id=$1 and target_person_id=$2',[actorPersonId,targetId]);
 if(!grant.rowCount)bad('אין לך הרשאה לערוך את הפרופיל הזה.',403);
 return {actorPersonId,access:'guardian'};
}

export async function createInvitation({personId,email,adminUserId,origin}){
 const cleanEmail=normalizeEmail(email),token=newInviteToken(),hash=inviteHash(token);
 const result=await transaction(async c=>{
  const p=await c.query('select id,name_he from people where id=$1',[personId]);
  if(!p.rowCount)bad('הפרופיל שנבחר אינו קיים.',404);
  const occupied=await c.query('select person_id from profile_accounts where lower(email)=$1 or person_id=$2',[cleanEmail,personId]);
  if(occupied.rowCount)bad(occupied.rows[0].person_id===personId?'לפרופיל הזה כבר יש חשבון פעיל.':'כתובת הדוא״ל כבר משויכת לפרופיל אחר.');
  await c.query('update profile_invitations set revoked_at=now() where person_id=$1 and used_at is null and revoked_at is null',[personId]);
  const invite=await c.query("insert into profile_invitations(person_id,email,token_hash,expires_at,created_by) values($1,$2,$3,now()+interval '7 days',$4) returning id,expires_at",[personId,cleanEmail,hash,adminUserId]);
  return {person:p.rows[0],invite:invite.rows[0]};
 });
 return {...result,email:cleanEmail,token,url:`${origin}/profile.html?invite=${encodeURIComponent(token)}`};
}

export async function invitationByToken(token,{lock=false,client}={}){
 if(typeof token!=='string'||token.length<30)bad('קישור ההזמנה אינו תקין.',404);
 const runner=client||{query};
 const suffix=lock?' for update':'';
 const r=await runner.query(`select i.*,p.name_he from profile_invitations i join people p on p.id=i.person_id where i.token_hash=$1 and i.used_at is null and i.revoked_at is null and i.expires_at>now()${suffix}`,[inviteHash(token)]);
 if(!r.rowCount)bad('ההזמנה אינה תקפה או שפג תוקפה.',410);
 return r.rows[0];
}

export async function bindInvitation({token,user}){
 return transaction(async c=>{
  const invite=await invitationByToken(token,{lock:true,client:c});
  if(String(user.email||'').trim().toLowerCase()!==invite.email)bad('החשבון המחובר אינו תואם לכתובת שאליה נשלחה ההזמנה.',403);
  const other=await c.query('select person_id from profile_accounts where user_id=$1 or lower(email)=$2',[user.id,invite.email]);
  if(other.rowCount&&other.rows[0].person_id!==invite.person_id)bad('החשבון כבר משויך לפרופיל משפחתי אחר.',409);
  await c.query('insert into profile_accounts(person_id,user_id,email) values($1,$2,$3) on conflict(person_id) do update set user_id=excluded.user_id,email=excluded.email,updated_at=now()',[invite.person_id,user.id,invite.email]);
  await c.query('update profile_invitations set used_at=now() where id=$1',[invite.id]);
  await c.query("insert into profile_audit_log(target_person_id,actor_user_id,actor_person_id,action,changes) values($1,$2,$1,'account_claimed',jsonb_build_object('email',$3))",[invite.person_id,user.id,invite.email]);
  return {personId:invite.person_id,name:invite.name_he};
 });
}

export async function setGuardianGrant({editorPersonId,targetPersonId,enabled,adminUserId}){
 return transaction(async c=>{
  if(editorPersonId===targetPersonId)bad('אין צורך בהרשאת הורה לעריכת הפרופיל האישי.');
  const relation=await c.query("select 1 from family_members child join family_members parent on parent.unit_id=child.unit_id and parent.role='parent' where child.person_id=$1 and child.role='child' and parent.person_id=$2",[targetPersonId,editorPersonId]);
  if(!relation.rowCount)bad('אפשר להעניק הרשאת ילד רק להורה שמוגדר כך בעץ.');
  if(enabled)await c.query('insert into profile_editor_grants(editor_person_id,target_person_id,granted_by) values($1,$2,$3) on conflict do nothing',[editorPersonId,targetPersonId,adminUserId]);
  else await c.query('delete from profile_editor_grants where editor_person_id=$1 and target_person_id=$2',[editorPersonId,targetPersonId]);
  await c.query("insert into profile_audit_log(target_person_id,actor_user_id,action,changes) values($1,$2,'guardian_grant',jsonb_build_object('editor_person_id',$3,'enabled',$4))",[targetPersonId,adminUserId,editorPersonId,enabled]);
  return {enabled};
 });
}
