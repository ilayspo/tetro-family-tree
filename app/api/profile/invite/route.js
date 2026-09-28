import {getAuth,requireSession} from '../../../../lib/auth';
import {invitationByToken,bindInvitation,maskEmail} from '../../../../lib/members';

export const dynamic='force-dynamic';
const fail=error=>{console.error(error);return Response.json({error:error.status?error.message:'לא ניתן להשלים את ההזמנה כרגע.'},{status:error.status||500,headers:{'Cache-Control':'no-store'}});};
const sameOrigin=request=>{const origin=request.headers.get('origin');return !origin||new URL(origin).host===new URL(request.url).host;};

export async function GET(request){
 try{const token=new URL(request.url).searchParams.get('token');const invite=await invitationByToken(token);return Response.json({name:invite.name_he,email:maskEmail(invite.email),expiresAt:invite.expires_at},{headers:{'Cache-Control':'no-store'}});}catch(error){return fail(error);}
}

export async function POST(request){
 try{
  if(!sameOrigin(request))throw Object.assign(new Error('בקשה ממקור לא מורשה.'),{status:403});
  const body=await request.json(),invite=await invitationByToken(body.token);
  if(body.action==='claim'){
   const user=await requireSession();
   const result=await bindInvitation({token:body.token,user});
   return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
  }
  const password=String(body.password||'');if(password.length<8)throw Object.assign(new Error('הסיסמה צריכה להכיל לפחות 8 תווים.'),{status:400});
  const result=await getAuth().signUp.email({email:invite.email,password,name:invite.name_he});
  if(result?.error)throw Object.assign(new Error(result.error.message||'יצירת החשבון נכשלה.'),{status:result.error.status||400});
  const user=result?.data?.user||result?.data;
  if(!user?.id)throw Object.assign(new Error('החשבון נוצר אך השיוך לפרופיל עדיין לא הושלם. התחברו ואשרו שוב את ההזמנה.'),{status:409});
  const bound=await bindInvitation({token:body.token,user:{...user,email:user.email||invite.email}});
  return Response.json({ok:true,...bound},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return fail(error);}
}
