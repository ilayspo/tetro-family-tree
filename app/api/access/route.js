import { query } from '../../../lib/db';
import { familyGrants, grantFamilyAccess, revokeFamilyAccess, verifyFamilyCode } from '../../../lib/family-access';
import {listTrees,treeBySlug} from '../../../lib/trees';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||new URL(origin).host===new URL(req.url).host;};

export async function GET(){
 try{const [trees,grants]=await Promise.all([listTrees(),familyGrants()]);return Response.json({trees:trees.map(tree=>({...tree,hasAccess:Number.isInteger(grants[tree.id])}))},{headers});}
 catch(error){console.error(error);return Response.json({error:'לא ניתן לטעון את רשימת העצים.'},{status:500,headers});}
}

export async function POST(req){
 try{
  if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
  const body=await req.json(),code=typeof body.code==='string'?body.code:'',tree=await treeBySlug(body.tree);
  const setting=await query('select access_code_hash,access_version from tree_settings where tree_id=$1',[tree.id]);
  if(!setting.rowCount||!setting.rows[0].access_code_hash)return Response.json({error:'הגישה המשפחתית עדיין אינה מוגדרת.'},{status:503,headers});
  if(!verifyFamilyCode(code,setting.rows[0].access_code_hash))return Response.json({error:'הקוד המשפחתי אינו נכון.'},{status:401,headers});
  await grantFamilyAccess(tree.id,setting.rows[0].access_version);
  return Response.json({ok:true,tree:tree.slug},{headers});
 }catch(error){console.error(error);return Response.json({error:'לא ניתן לאמת את הקוד כרגע.'},{status:500,headers});}
}

export async function DELETE(req){
 if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
 const tree=await treeBySlug(new URL(req.url).searchParams.get('tree'));await revokeFamilyAccess(tree.id);
 return Response.json({ok:true},{headers});
}
