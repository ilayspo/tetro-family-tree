import {transaction} from './db';
import {editorContext} from './members';
import {queueNotification} from './notifications';

const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const cleanName=value=>typeof value==='string'&&value.trim().length>=2&&value.trim().length<=180?value.trim():bad('יש להזין שם באורך 2 עד 180 תווים.');
const cleanGender=value=>[null,undefined,'','male','female'].includes(value)?value||null:bad('ערך המין אינו תקין.');
const cleanText=(value,max,label)=>{const clean=String(value||'').trim();if(clean.length>max)bad(`${label} ארוך מדי.`);return clean||null;};
const cleanDate=value=>{if(!value)return null;if(!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value))bad('התאריך חייב להיות שנה, חודש ושנה או תאריך מלא.');const [year,month,day]=value.split('-').map(Number);if(month&&(month<1||month>12))bad('החודש בתאריך אינו תקין.');if(day&&new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10)!==value)bad('היום בתאריך אינו תקין.');return value;};

export const editableProfile=input=>({
 name_he:cleanName(input?.name_he),
 gender:cleanGender(input?.gender),
 birth_date:cleanDate(input?.birth_date),
 about_me:cleanText(input?.about_me,600,'הטקסט על עצמי'),
 hobbies:cleanText(input?.hobbies,600,'רשימת התחביבים'),
 workplace:cleanText(input?.workplace,300,'מקום העבודה'),
 favorite_food:cleanText(input?.favorite_food,300,'האוכל המועדף'),
 interesting_story:cleanText(input?.interesting_story,1500,'הסיפור המעניין')
});

const labels={name_he:'שם',gender:'מין',birth_date:'תאריך לידה',about_me:'על עצמי',hobbies:'תחביבים',workplace:'מקום עבודה',favorite_food:'אוכל מועדף',interesting_story:'סיפור מעניין'};
export async function updateEditableProfile({userId,treeId,targetId,expectedUpdatedAt,input}){
 const next=editableProfile(input);
 return transaction(async c=>{
  const access=await editorContext(userId,treeId,targetId,c);
  const r=await c.query('select id,name_he,gender,birth_date,about_me,hobbies,workplace,favorite_food,interesting_story,updated_at from people where tree_id=$1 and id=$2 for update',[treeId,targetId]);
  if(!r.rowCount)bad('הפרופיל אינו קיים.',404);
  const old=r.rows[0];
  if(expectedUpdatedAt&&new Date(old.updated_at).toISOString()!==expectedUpdatedAt)bad('הפרופיל השתנה מאז שפתחתם אותו. רעננו ובדקו את השינויים.',409);
  const changes={};for(const key of Object.keys(next)){if((old[key]??null)!==(next[key]??null))changes[key]={from:old[key]??null,to:next[key]??null};}
  if(!Object.keys(changes).length)return {person:old,notificationId:null,changed:[]};
  const saved=await c.query('update people set name_he=$3,gender=$4,birth_date=$5,about_me=$6,hobbies=$7,workplace=$8,favorite_food=$9,interesting_story=$10,updated_at=now() where tree_id=$1 and id=$2 returning id,name_he,gender,birth_date,about_me,hobbies,workplace,favorite_food,interesting_story,updated_at',[treeId,targetId,next.name_he,next.gender,next.birth_date,next.about_me,next.hobbies,next.workplace,next.favorite_food,next.interesting_story]);
  await c.query("insert into profile_audit_log(tree_id,target_person_id,actor_user_id,actor_person_id,action,changes) values($1,$2,$3,$4,'profile_updated',$5::jsonb)",[treeId,targetId,userId,access.actorPersonId,JSON.stringify(changes)]);
  const changed=Object.keys(changes).map(key=>labels[key]);
  const notificationId=await queueNotification(c,{treeId,recipient:process.env.ADMIN_NOTIFICATION_EMAIL||'ilayspo@gmail.com',subject:`עדכון בפרופיל המשפחתי: ${saved.rows[0].name_he}`,lines:[`עודכנו השדות: ${changed.join(', ')}`,`העריכה בוצעה על ידי ${access.access==='self'?'בעל/ת הפרופיל':'הורה שקיבל הרשאה'}`]});
  return {person:saved.rows[0],notificationId,changed};
 });
}
