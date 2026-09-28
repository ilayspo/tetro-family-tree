import { randomUUID } from 'node:crypto';
const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const statuses=new Set(['unknown','married','partnered','divorced','separated','former']);
const name=v=>typeof v==='string'&&v.trim().length>=2&&v.trim().length<=180?v.trim():bad('יש להזין שם בעברית (2 עד 180 תווים).');
const note=v=>{const value=typeof v==='string'?v.trim():'';if(value.length>2000)bad('הערת הניהול ארוכה מדי.');return value||null;};
function date(v){if(!v)return null;if(!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(v))bad('התאריך חייב להיות שנה, חודש ושנה או תאריך מלא.');const [y,m,d]=v.split('-').map(Number);if(m&&(m<1||m>12))bad('חודש לא תקין.');if(d&&new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==v)bad('יום לא תקין.');return v;}
async function person(c,id){const r=await c.query('select * from people where id=$1',[id]);if(!r.rowCount)bad('האדם שנבחר אינו קיים.');return r.rows[0];}
async function members(c,id,role){const r=await c.query('select person_id from family_members where unit_id=$1 and role=$2',[id,role]);return r.rows.map(x=>x.person_id);}
async function unit(c,parents,{status='unknown',current=null}={}){
 if(!parents.length||parents.length>2||new Set(parents).size!==parents.length)bad('יש לבחור הורה אחד או שני הורים שונים.');
 if(!statuses.has(status)||![null,true,false].includes(current))bad('מצב הקשר אינו תקין.');
 for(const id of parents)await person(c,id);
 const match=await c.query(`select u.id from family_units u join family_members m on m.unit_id=u.id and m.role='parent' group by u.id having count(*)=$1 and array_agg(m.person_id order by m.person_id)=$2::text[]`,[parents.length,[...parents].sort()]);
 if(match.rowCount)return match.rows[0].id;
 const r=await c.query('insert into family_units(relationship_status,is_current) values($1,$2) returning id',[status,current]);
 for(const id of parents)await c.query("insert into family_members(unit_id,person_id,role) values($1,$2,'parent')",[r.rows[0].id,id]);
 return r.rows[0].id;
}
async function checkCycle(c,child,parents){
 for(const parent of parents){if(parent===child)bad('אדם לא יכול להיות הורה של עצמו.');const r=await c.query(`with recursive descendants(id) as (select person_id from family_members where unit_id in (select unit_id from family_members where person_id=$1 and role='parent') and role='child' union select m.person_id from family_members m join family_members p on p.unit_id=m.unit_id and p.role='parent' join descendants d on d.id=p.person_id where m.role='child') select 1 from descendants where id=$2 limit 1`,[child,parent]);if(r.rowCount)bad('הקשר ייצור מעגל הורות. בדקו את ההורים והילדים שכבר הוגדרו.');}
}
async function childTo(c,child,parents,replace=false){
 await person(c,child);for(const p of parents)await person(c,p);
 await checkCycle(c,child,parents);
 const old=await c.query("select unit_id from family_members where person_id=$1 and role='child'",[child]);
 if(old.rowCount&&!replace)bad('לאדם הזה כבר הוגדרו הורים. השתמשו בעריכת שיוך ההורים.');
 const id=await unit(c,parents);
 if(old.rowCount)await c.query("delete from family_members where person_id=$1 and role='child'",[child]);
 await c.query("insert into family_members(unit_id,person_id,role) values($1,$2,'child')",[id,child]);
 await c.query('update family_units set updated_at=now() where id=$1 or id=$2',[id,old.rows[0]?.unit_id||null]);
 return id;
}
export async function action(c,body){
 const a=body.action;
 if(a==='create'){
  const id=randomUUID();const p=body.person||{};
  const duplicate=await c.query('select id from people where name_he=$1 and birth_date is not distinct from $2 limit 1',[name(p.name_he),date(p.birth_date)]);if(duplicate.rowCount)bad('כבר קיים אדם עם אותו שם ותאריך לידה. פתחו את הפרופיל הקיים ובדקו אותו לפני הוספה.');
  await c.query('insert into people(id,name_he,name_ru,birth_date,death_date,deceased,is_visible,admin_note) values($1,$2,$3,$4,$5,$6,$7,$8)',[id,name(p.name_he),p.name_ru?.trim()||null,date(p.birth_date),date(p.death_date),p.deceased===true,p.is_visible===true,note(p.admin_note)]);
  if(body.link){const {kind,target,other,status,current}=body.link;await person(c,target);
   if(kind==='child')await childTo(c,id,[target,...(other?[other]:[])]);
   else if(kind==='parent')await childTo(c,target,[id,...(other?[other]:[])]);
   else if(kind==='partner')await unit(c,[id,target],{status,current});
   else bad('סוג הקשר אינו תקין.');
  }
  return {id};
 }
 if(a==='update'){
  const p=body.person||{};await person(c,body.id);
  if(['tetro-tsipora','tetro-michael'].includes(body.id)&&p.is_visible!==true)bad('לא ניתן להסתיר את ראשי העץ.');
  await c.query('update people set name_he=$2,name_ru=$3,birth_date=$4,death_date=$5,deceased=$6,is_visible=$7,admin_note=$8,updated_at=now() where id=$1',[body.id,name(p.name_he),p.name_ru?.trim()||null,date(p.birth_date),date(p.death_date),p.deceased===true?true:p.deceased===false?false:null,p.is_visible===true,note(p.admin_note)]);return {id:body.id};
 }
 if(a==='delete'){
  if(['tetro-tsipora','tetro-michael'].includes(body.id))bad('אי אפשר למחוק את ראשי העץ.');
  const p=await person(c,body.id);
  const children=await c.query("select distinct child.person_id from family_members parent join family_members child on child.unit_id=parent.unit_id and child.role='child' where parent.person_id=$1 and parent.role='parent'",[body.id]);
  if(children.rowCount)bad('לא ניתן למחוק הורה של ילדים בעץ. תקנו קודם את שיוך הילדים.');
  await c.query('delete from people where id=$1',[body.id]);
  await c.query('delete from family_units u where not exists(select 1 from family_members m where m.unit_id=u.id)');
  return {photoKey:p.photo_key};
 }
 if(a==='visibility'){
  await person(c,body.id);if(['tetro-tsipora','tetro-michael'].includes(body.id)&&body.visible===false)bad('לא ניתן להסתיר את ראשי העץ.');
  await c.query('update people set is_visible=$2,updated_at=now() where id=$1',[body.id,body.visible===true]);return {};
 }
 if(a==='link'){
  const {kind,source,target,other,status,current}=body;if(!source||!target||source===target)bad('בחרו שני אנשים שונים.');
  if(kind==='child')return {unitId:await childTo(c,source,[target,...(other?[other]:[])])};
  if(kind==='parent')return {unitId:await childTo(c,target,[source,...(other?[other]:[])])};
  if(kind==='partner')return {unitId:await unit(c,[source,target],{status,current})};
  bad('בחרו סוג קשר תקין.');
 }
 if(a==='reassign'){
  const {child,parents}=body;if(!Array.isArray(parents))bad('בחרו הורים.');
  return {unitId:await childTo(c,child,parents,true)};
 }
 if(a==='unit'){
  const u=await c.query('select id from family_units where id=$1',[body.id]);if(!u.rowCount)bad('הקשר אינו קיים.');if(!statuses.has(body.status)||![null,true,false].includes(body.current))bad('מצב קשר אינו תקין.');
  await c.query('update family_units set relationship_status=$2,is_current=$3,updated_at=now() where id=$1',[body.id,body.status,body.current]);return {};
 }
 if(a==='unlink'){
  const {unitId,personId,role}=body;if(!['parent','child'].includes(role))bad('סוג קשר אינו תקין.');
  const affected=await members(c,unitId,'child');
  if(role==='parent'&&affected.length&&(await members(c,unitId,'parent')).length===1)bad('אי אפשר להסיר את ההורה היחיד בלי לשייך את הילדים להורה אחר תחילה.');
  if(role==='parent'&&affected.length&&!body.confirmAffected)bad('הסרת ההורה תשפיע על הילדים: '+affected.join(', '));
  await c.query('delete from family_members where unit_id=$1 and person_id=$2 and role=$3',[unitId,personId,role]);
  await c.query('delete from family_units where id=$1 and not exists(select 1 from family_members where unit_id=$1)',[unitId]);return {affected};
 }
 if(a==='batch'){
  const {profiles=[],units=[],origins=[],partners=[],removePartners=[]}=body;
  if(![profiles,units,origins,partners,removePartners].every(Array.isArray)||[profiles,units,origins,partners,removePartners].reduce((n,x)=>n+x.length,0)>100)bad('בקשת השמירה גדולה מדי. שמרו עד 100 שינויים בכל פעם.');
  const unique=(items,key)=>{if(new Set(items.map(x=>x[key])).size!==items.length)bad('אותו פריט נערך פעמיים בשמירה.');};
  unique(profiles,'id');unique(units,'id');unique(origins,'child');unique(removePartners,'id');
  const matchParents=(a,b)=>a.length===b.length&&[...a].sort().every((v,i)=>v===[...b].sort()[i]);
  for(const p of profiles){const old=await person(c,p.id);if(new Date(old.updated_at).toISOString()!==p.expectedUpdatedAt)bad('הפרופיל של '+old.name_he+' השתנה מאז שפתחתם אותו. רעננו את הניהול ובדקו את השינויים.',409);await action(c,{action:'update',id:p.id,person:p.person});}
  const duplicate=await c.query('select name_he,birth_date from people group by name_he,birth_date having count(*)>1 limit 1');
  if(duplicate.rowCount)bad('יש שני פרופילים עם אותו שם ותאריך לידה. בדקו את העריכה לפני השמירה.');
  for(const u of units){const old=await c.query('select updated_at from family_units where id=$1',[u.id]);if(!old.rowCount||new Date(old.rows[0].updated_at).toISOString()!==u.expectedUpdatedAt)bad('מצב אחד הקשרים השתנה מאז שפתחתם אותו. רעננו את הניהול.',409);await action(c,{action:'unit',id:u.id,status:u.status,current:u.current});}
  for(const p of partners){if(!Array.isArray(p.parents)||p.parents.length!==2||new Set(p.parents).size!==2)bad('בחרו שני בני זוג שונים.');const existing=await c.query("select u.id from family_units u join family_members m on m.unit_id=u.id and m.role='parent' group by u.id having count(*)=2 and array_agg(m.person_id order by m.person_id)=$1::text[]",[[...p.parents].sort()]);if(existing.rowCount)bad('הקשר הזה כבר קיים. ערכו את מצב הקשר הקיים.');await unit(c,p.parents,{status:p.status,current:p.current});}
  for(const o of origins){if(!Array.isArray(o.parents)||o.parents.length>2||!Array.isArray(o.expectedParents))bad('יש לבחור עד שני הורים.');const old=await c.query("select parent.person_id,child.unit_id from family_members child join family_members parent on parent.unit_id=child.unit_id and parent.role='parent' where child.person_id=$1 and child.role='child'",[o.child]);if(!matchParents(old.rows.map(x=>x.person_id),o.expectedParents))bad('ההורים של '+(await person(c,o.child)).name_he+' השתנו מאז שפתחתם את המסך. רעננו ובדקו שוב.',409);if(o.parents.length)await childTo(c,o.child,o.parents,true);else {await c.query("delete from family_members where person_id=$1 and role='child'",[o.child]);if(old.rows[0])await c.query('update family_units set updated_at=now() where id=$1',[old.rows[0].unit_id]);}}
  for(const p of removePartners){const old=await c.query('select * from family_units where id=$1',[p.id]);if(!old.rowCount||new Date(old.rows[0].updated_at).toISOString()!==p.expectedUpdatedAt)bad('הקשר השתנה מאז שפתחתם את המסך. רעננו ובדקו שוב.',409);const existing=await members(c,p.id,'parent'),children=await members(c,p.id,'child');if(existing.length!==2||!matchParents(existing,p.expectedParents)||children.length)bad('אפשר להסיר קשר זוגי רק אחרי שיוך מחדש של כל הילדים שלו.');await c.query('delete from family_units where id=$1',[p.id]);}
  await c.query('delete from family_units u where not exists(select 1 from family_members m where m.unit_id=u.id)');
  return {saved:profiles.length+units.length+origins.length+partners.length+removePartners.length};
 }
 bad('פעולה לא מוכרת.');
}
