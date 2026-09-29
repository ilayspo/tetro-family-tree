import { cookies } from 'next/headers';
import { query } from '../../../lib/db';
import { createFamilyToken, FAMILY_COOKIE, verifyFamilyCode } from '../../../lib/family-access';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||new URL(origin).host===new URL(req.url).host;};

export async function POST(req){
 try{
  if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
  const body=await req.json(),code=typeof body.code==='string'?body.code:'';
  const setting=await query('select access_code_hash,access_version from family_settings where singleton=true');
  if(!setting.rowCount||!setting.rows[0].access_code_hash)return Response.json({error:'הגישה המשפחתית עדיין אינה מוגדרת.'},{status:503,headers});
  if(!verifyFamilyCode(code,setting.rows[0].access_code_hash))return Response.json({error:'הקוד המשפחתי אינו נכון.'},{status:401,headers});
  const jar=await cookies();
  jar.set(FAMILY_COOKIE,createFamilyToken(setting.rows[0].access_version),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
  return Response.json({ok:true},{headers});
 }catch(error){console.error(error);return Response.json({error:'לא ניתן לאמת את הקוד כרגע.'},{status:500,headers});}
}

export async function DELETE(req){
 if(!sameOrigin(req))return Response.json({error:'בקשה ממקור לא מורשה.'},{status:403,headers});
 const jar=await cookies();jar.set(FAMILY_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 return Response.json({ok:true},{headers});
}
