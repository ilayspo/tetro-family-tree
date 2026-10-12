import { query } from '../../../lib/db';
import { requireFamilyAccess } from '../../../lib/family-access';
import {requestedTreeSlug,treeBySlug} from '../../../lib/trees';
export const dynamic='force-dynamic';
export async function GET(request){
 try {
  const tree=await treeBySlug(requestedTreeSlug(request));await requireFamilyAccess(tree.id);
  const [p,u,m,r]=await Promise.all([
   query('select id,name_he,birth_date,death_date,deceased,gender,photo_key,about_me,hobbies,workplace,favorite_food,interesting_story from people where tree_id=$1 and is_visible=true and name_he is not null order by name_he',[tree.id]),
   query('select id,relationship_status,is_current,display_partner_id from family_units where tree_id=$1',[tree.id]),
   query(`select m.unit_id,m.person_id,m.role from family_members m join people p on p.tree_id=m.tree_id and p.id=m.person_id where m.tree_id=$1 and p.is_visible=true`,[tree.id]),
   query('select person_id from tree_roots where tree_id=$1 order by position',[tree.id])
  ]);
  const ids=new Set(p.rows.map(x=>x.id));
  const families=u.rows.map(f=>({...f,parents:m.rows.filter(x=>x.unit_id===f.id&&x.role==='parent'&&ids.has(x.person_id)).map(x=>x.person_id),children:m.rows.filter(x=>x.unit_id===f.id&&x.role==='child'&&ids.has(x.person_id)).map(x=>x.person_id)})).filter(f=>f.parents.length || f.children.length);
  const res=Response.json({tree,rootIds:r.rows.map(x=>x.person_id),people:p.rows.map(x=>({...x,photo_url:x.photo_key?`/api/photo/${x.id}?tree=${encodeURIComponent(tree.slug)}`:null})),families});
  res.headers.set('Cache-Control','no-store, max-age=0');return res;
 }catch(e){if(e.status!==401)console.error(e);return Response.json({error:e.status?e.message:'הנתונים אינם זמינים כעת.'},{status:e.status||503,headers:{'Cache-Control':'no-store'}});}
}
