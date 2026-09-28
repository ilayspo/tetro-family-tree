import {requireSession} from '../../../lib/auth';
import {query} from '../../../lib/db';
import {updateEditableProfile} from '../../../lib/profile';
import {deliverNotification} from '../../../lib/notifications';

export const dynamic='force-dynamic';
const fail=error=>{console.error(error);return Response.json({error:error.status?error.message:'אירעה שגיאה. נסו שוב.'},{status:error.status||500,headers:{'Cache-Control':'no-store'}});};
const sameOrigin=request=>{const origin=request.headers.get('origin');return !origin||new URL(origin).host===new URL(request.url).host;};

export async function GET(){
 try{
  const user=await requireSession();
  const own=await query('select person_id,email from profile_accounts where user_id=$1',[user.id]);
  if(!own.rowCount)throw Object.assign(new Error('החשבון עדיין אינו משויך לפרופיל משפחתי.'),{status:403});
  const actorId=own.rows[0].person_id;
  const people=await query(`select p.id,p.name_he,p.gender,p.birth_date,p.about_me,p.hobbies,p.workplace,p.favorite_food,p.interesting_story,p.photo_key,p.updated_at,
    case when p.id=$1 then 'self' else 'guardian' end as access
    from people p where p.id=$1 or exists(select 1 from profile_editor_grants g where g.editor_person_id=$1 and g.target_person_id=p.id)
    order by case when p.id=$1 then 0 else 1 end,p.name_he`,[actorId]);
  return Response.json({email:own.rows[0].email,actorPersonId:actorId,people:people.rows.map(p=>({...p,photo_url:p.photo_key?`/api/photo/${p.id}`:null}))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error);}
}

export async function PATCH(request){
 try{
  if(!sameOrigin(request))throw Object.assign(new Error('בקשה ממקור לא מורשה.'),{status:403});
  const user=await requireSession(),body=await request.json();
  if(!body?.personId)throw Object.assign(new Error('לא נבחר פרופיל לעריכה.'),{status:400});
  const result=await updateEditableProfile({userId:user.id,targetId:body.personId,expectedUpdatedAt:body.expectedUpdatedAt,input:body.profile});
  const delivery=result.notificationId?await deliverNotification(result.notificationId):{sent:false};
  return Response.json({ok:true,person:result.person,changed:result.changed,emailSent:delivery.sent},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error);}
}
