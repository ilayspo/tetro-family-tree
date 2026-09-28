import { query } from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){
 try {
  const [p,u,m]=await Promise.all([
   query('select id,name_he,birth_date,death_date,deceased,gender,photo_key,about_me,hobbies,workplace,favorite_food,interesting_story from people where is_visible=true and name_he is not null order by name_he'),
   query('select id,relationship_status,is_current from family_units'),
   query(`select m.unit_id,m.person_id,m.role from family_members m join people p on p.id=m.person_id where p.is_visible=true`)
  ]);
  const ids=new Set(p.rows.map(x=>x.id));
  const families=u.rows.map(f=>({...f,parents:m.rows.filter(x=>x.unit_id===f.id&&x.role==='parent'&&ids.has(x.person_id)).map(x=>x.person_id),children:m.rows.filter(x=>x.unit_id===f.id&&x.role==='child'&&ids.has(x.person_id)).map(x=>x.person_id)})).filter(f=>f.parents.length || f.children.length);
  const res=Response.json({rootIds:['tetro-tsipora','tetro-michael'],people:p.rows.map(x=>({...x,photo_url:x.photo_key?`/api/photo/${x.id}`:null})),families});
  res.headers.set('Cache-Control','no-store, max-age=0');return res;
 }catch(e){console.error(e);return Response.json({error:'הנתונים אינם זמינים כעת.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
