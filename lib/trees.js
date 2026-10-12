import 'server-only';
import {query} from './db';

const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

export async function treeBySlug(slug,client={query}){
  const clean=String(slug||'').trim().toLowerCase();
  if(!clean)bad('לא נבחר עץ משפחה.');
  const result=await client.query('select id,slug,name_he,title_he,intro_he,brand_mark,accent_color from trees where slug=$1',[clean]);
  if(!result.rowCount)bad('עץ המשפחה אינו קיים.',404);
  return result.rows[0];
}

export async function treeById(id,client={query}){
  const result=await client.query('select id,slug,name_he,title_he,intro_he,brand_mark,accent_color from trees where id=$1',[id]);
  if(!result.rowCount)bad('עץ המשפחה אינו קיים.',404);
  return result.rows[0];
}

export async function listTrees(client={query}){
  const result=await client.query(`select t.id,t.slug,t.name_he,t.title_he,t.intro_he,t.brand_mark,t.accent_color,
    count(p.id)::int as people_count from trees t left join people p on p.tree_id=t.id group by t.id order by t.created_at,t.id`);
  return result.rows;
}

export function requestedTreeSlug(request,body){
  const url=new URL(request.url);
  return body?.tree||url.searchParams.get('tree')||request.headers.get('x-family-tree');
}
