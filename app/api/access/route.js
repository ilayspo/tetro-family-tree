import { query } from '../../../lib/db';
import { grantFamilyAccess, revokeFamilyAccess, verifyFamilyCode } from '../../../lib/family-access';
import {treeBySlug} from '../../../lib/trees';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||new URL(origin).host===new URL(req.url).host;};

export async function GET(){return Response.json({ok:true},{headers});}

export async function POST(req){
 try{
  if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
  const body=await req.json(),code=typeof body.code==='string'?body.code:'';
  const settings=await query(`select t.id,t.slug,s.access_code_hash,s.access_version
    from trees t join tree_settings s on s.tree_id=t.id
    where s.access_code_hash is not null order by t.id`);
  let matched=null;
  for(const row of settings.rows){
   const valid=verifyFamilyCode(code,row.access_code_hash);
   if(valid&&!matched)matched=row;
  }
  if(!matched)return Response.json({error:'הקוד המשפחתי אינו נכון.'},{status:401,headers});
  await grantFamilyAccess(matched.id,matched.access_version);
  return Response.json({ok:true,tree:matched.slug},{headers});
 }catch(error){console.error(error);return Response.json({error:'לא ניתן לאמת את הקוד כרגע.'},{status:500,headers});}
}

export async function DELETE(req){
 if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
 const tree=await treeBySlug(new URL(req.url).searchParams.get('tree'));await revokeFamilyAccess(tree.id);
 return Response.json({ok:true},{headers});
}
