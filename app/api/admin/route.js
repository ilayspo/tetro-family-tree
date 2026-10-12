import { requireAdmin } from '../../../lib/auth';
import { query, transaction } from '../../../lib/db';
import { action } from '../../../lib/family';
import { remove } from '../../../lib/storage';
import {createInvitation,setGuardianGrant} from '../../../lib/members';
import {queueNotification,deliverNotification} from '../../../lib/notifications';
import {hashFamilyCode} from '../../../lib/family-access';
import {listTrees,requestedTreeSlug,treeBySlug} from '../../../lib/trees';
export const dynamic='force-dynamic';
const fail=e=>{if(!e.status||e.status>=500)console.error(e);return Response.json({error:e.status?e.message:'אירעה שגיאה בשמירה. נסו שוב.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});};
export async function GET(request){try{await requireAdmin();const trees=await listTrees(),tree=await treeBySlug(requestedTreeSlug(request)||trees[0]?.slug);const [p,u,m,a,g,i,audit,settings,roots]=await Promise.all([
 query('select id,name_he,birth_date,death_date,deceased,photo_key,is_visible,updated_at,admin_note,gender,about_me,hobbies,workplace,favorite_food,interesting_story from people where tree_id=$1 order by name_he',[tree.id]),
 query('select id,relationship_status,is_current,updated_at,display_partner_id from family_units where tree_id=$1',[tree.id]),query('select unit_id,person_id,role from family_members where tree_id=$1',[tree.id]),
 query('select person_id,user_id,email,claimed_at from profile_accounts where tree_id=$1',[tree.id]),
 query('select editor_person_id,target_person_id,created_at from profile_editor_grants where tree_id=$1',[tree.id]),
 query("select id,person_id,email,expires_at,created_at from profile_invitations where tree_id=$1 and used_at is null and revoked_at is null and expires_at>now()",[tree.id]),
 query("select l.id,l.target_person_id,l.actor_person_id,l.action,l.changes,l.created_at,p.name_he as target_name from profile_audit_log l left join people p on p.tree_id=l.tree_id and p.id=l.target_person_id where l.tree_id=$1 order by l.created_at desc limit 50",[tree.id]),
 query('select access_code_updated_at from tree_settings where tree_id=$1',[tree.id]),
 query('select person_id from tree_roots where tree_id=$1 order by position',[tree.id])
 ]);return Response.json({tree,trees,rootIds:roots.rows.map(x=>x.person_id),people:p.rows,units:u.rows,members:m.rows,accounts:a.rows,grants:g.rows,invitations:i.rows,audit:audit.rows,settings:settings.rows[0]||{}},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(req){try{const admin=await requireAdmin();if(new URL(req.headers.get('origin')||req.url).host!==new URL(req.url).host)throw Object.assign(new Error('בקשה ממקור לא מורשה.'),{status:403});const body=await req.json(),tree=await treeBySlug(requestedTreeSlug(req,body));
 if(body.action==='update_tree_settings'){
  const name=String(body.name||'').trim(),title=String(body.title||'').trim(),intro=String(body.intro||'').trim()||null,mark=String(body.brandMark||'').trim()||'✦',accent=String(body.accentColor||'');
  if(name.length<2||name.length>120||title.length<2||title.length>180||intro?.length>600||mark.length>4||!/^#[0-9a-f]{6}$/i.test(accent))throw Object.assign(new Error('הגדרות המיתוג אינן תקינות.'),{status:400});
  await query('update trees set name_he=$2,title_he=$3,intro_he=$4,brand_mark=$5,accent_color=$6,updated_at=now() where id=$1',[tree.id,name,title,intro,mark,accent]);
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='set_tree_roots'){
  const roots=Array.isArray(body.rootIds)?[...new Set(body.rootIds.filter(Boolean))]:[];if(roots.length>2)throw Object.assign(new Error('אפשר לבחור עד שני ראשי עץ.'),{status:400});
  await transaction(async c=>{for(const id of roots){const person=await c.query('select 1 from people where tree_id=$1 and id=$2',[tree.id,id]);if(!person.rowCount)throw Object.assign(new Error('אחד מראשי העץ שנבחרו אינו שייך לעץ הזה.'),{status:400});}await c.query('delete from tree_roots where tree_id=$1',[tree.id]);for(let position=0;position<roots.length;position++)await c.query('insert into tree_roots(tree_id,person_id,position) values($1,$2,$3)',[tree.id,roots[position],position]);});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='set_family_code'){
  const code=typeof body.code==='string'?body.code.trim():'';
  if(code.length<4||code.length>100)throw Object.assign(new Error('הקוד המשפחתי צריך להכיל לפחות 4 תווים.'),{status:400});
  await query('insert into tree_settings(tree_id,access_code_hash,access_code_updated_at,updated_at) values($1,$2,now(),now()) on conflict(tree_id) do update set access_code_hash=excluded.access_code_hash,access_version=tree_settings.access_version+1,access_code_updated_at=now(),updated_at=now()',[tree.id,hashFamilyCode(code)]);
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='create_invite'){
  const invitation=await createInvitation({treeId:tree.id,personId:body.personId,email:body.email,adminUserId:admin.id,origin:new URL(req.url).origin});
  const notificationId=await queueNotification({query},{treeId:tree.id,recipient:invitation.email,subject:`הזמנה לעריכת הפרופיל של ${invitation.person.name_he}`,lines:[`הוזמנת לערוך את הפרופיל המשפחתי של ${invitation.person.name_he}.`,`הקישור תקף לשבעה ימים: ${invitation.url}`]});
  const delivery=await deliverNotification(notificationId);
  return Response.json({ok:true,inviteUrl:invitation.url,expiresAt:invitation.invite.expires_at,emailSent:delivery.sent},{headers:{'Cache-Control':'no-store'}});
 }
 if(body.action==='guardian_grant'){const result=await setGuardianGrant({treeId:tree.id,editorPersonId:body.editorPersonId,targetPersonId:body.targetPersonId,enabled:body.enabled===true,adminUserId:admin.id});return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});}
 if(body.action==='revoke_profile_account'){const result=await transaction(async c=>{const r=await c.query('delete from profile_accounts where tree_id=$1 and person_id=$2 returning email',[tree.id,body.personId]);await c.query('update profile_invitations set revoked_at=now() where tree_id=$1 and person_id=$2 and used_at is null and revoked_at is null',[tree.id,body.personId]);await c.query('delete from profile_editor_grants where tree_id=$1 and editor_person_id=$2',[tree.id,body.personId]);return r.rows[0]||null;});return Response.json({ok:true,revoked:!!result},{headers:{'Cache-Control':'no-store'}});}
 const result=await transaction(async c=>{await c.query('select pg_advisory_xact_lock(hashtext($1))',[tree.id]);return action(c,body,tree.id)});if(result.photoKey)try{await remove(result.photoKey)}catch(e){console.error('Deleted person photo cleanup failed',e)}delete result.photoKey;return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
