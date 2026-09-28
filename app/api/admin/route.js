import { requireAdmin } from '../../../lib/auth';
import { query, transaction } from '../../../lib/db';
import { action } from '../../../lib/family';
import { remove } from '../../../lib/storage';
import {createInvitation,setGuardianGrant} from '../../../lib/members';
import {queueNotification,deliverNotification} from '../../../lib/notifications';
export const dynamic='force-dynamic';
const fail=e=>{console.error(e);return Response.json({error:e.status?e.message:'אירעה שגיאה בשמירה. נסו שוב.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});};
export async function GET(){try{await requireAdmin();const [p,u,m,a,g,i,audit]=await Promise.all([
 query('select id,name_he,birth_date,death_date,deceased,photo_key,is_visible,updated_at,admin_note,gender,about_me,hobbies,workplace,favorite_food,interesting_story from people order by name_he'),
 query('select * from family_units'),query('select * from family_members'),
 query('select person_id,user_id,email,claimed_at from profile_accounts'),
 query('select editor_person_id,target_person_id,created_at from profile_editor_grants'),
 query("select id,person_id,email,expires_at,created_at from profile_invitations where used_at is null and revoked_at is null and expires_at>now()"),
 query("select l.id,l.target_person_id,l.actor_person_id,l.action,l.changes,l.created_at,p.name_he as target_name from profile_audit_log l left join people p on p.id=l.target_person_id order by l.created_at desc limit 50")
 ]);return Response.json({people:p.rows,units:u.rows,members:m.rows,accounts:a.rows,grants:g.rows,invitations:i.rows,audit:audit.rows},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(req){try{const admin=await requireAdmin();if(new URL(req.headers.get('origin')||req.url).host!==new URL(req.url).host)throw Object.assign(new Error('בקשה ממקור לא מורשה.'),{status:403});const body=await req.json();
 if(body.action==='create_invite'){
  const invitation=await createInvitation({personId:body.personId,email:body.email,adminUserId:admin.id,origin:new URL(req.url).origin});
  const notificationId=await queueNotification({query},{recipient:invitation.email,subject:`הזמנה לעריכת הפרופיל של ${invitation.person.name_he}`,lines:[`הוזמנת לערוך את הפרופיל המשפחתי של ${invitation.person.name_he}.`,`הקישור תקף לשבעה ימים: ${invitation.url}`]});
  const delivery=await deliverNotification(notificationId);
  return Response.json({ok:true,inviteUrl:invitation.url,expiresAt:invitation.invite.expires_at,emailSent:delivery.sent},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='guardian_grant'){const result=await setGuardianGrant({editorPersonId:body.editorPersonId,targetPersonId:body.targetPersonId,enabled:body.enabled===true,adminUserId:admin.id});return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});}
 if(body.action==='revoke_profile_account'){const result=await transaction(async c=>{const r=await c.query('delete from profile_accounts where person_id=$1 returning email',[body.personId]);await c.query('update profile_invitations set revoked_at=now() where person_id=$1 and used_at is null and revoked_at is null',[body.personId]);await c.query('delete from profile_editor_grants where editor_person_id=$1',[body.personId]);return r.rows[0]||null;});return Response.json({ok:true,revoked:!!result},{headers:{'Cache-Control':'no-store'}});}
 const result=await transaction(async c=>{await c.query('select pg_advisory_xact_lock(8842401)');return action(c,body)});if(result.photoKey)try{await remove(result.photoKey)}catch(e){console.error('Deleted person photo cleanup failed',e)}delete result.photoKey;return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
