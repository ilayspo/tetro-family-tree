import { getAuth } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
export const dynamic='force-dynamic';
const getAllowed=new Set(['get-session']);
const postAllowed=new Set(['sign-in/email','sign-out','request-password-reset','reset-password','email-otp/send-verification-otp','email-otp/verify-email','change-password']);
async function pathOf(context){const params=await context.params;return Array.isArray(params.path)?params.path.join('/'):String(params.path||'');}
const blocked=()=>Response.json({error:'הפעולה אינה זמינה.'},{status:404,headers:{'Cache-Control':'no-store'}});
async function knownEmail(request){
 try{const body=await request.clone().json(),email=String(body.email||'').trim().toLowerCase();if(!email)return false;const r=await query(`select 1 from neon_auth."user" u where lower(u.email)=$1 and (u.id::text in(select user_id from tree_admins) or u.id::text in(select user_id from profile_accounts)) union all select 1 from profile_invitations where email=$1 and revoked_at is null and used_at is null and expires_at>now() limit 1`,[email]);return r.rowCount>0;}catch{return false;}
}
export async function GET(request,context){const path=await pathOf(context);return getAllowed.has(path)?getAuth().handler().GET(request,context):blocked();}
export async function POST(request,context){const path=await pathOf(context);if(!postAllowed.has(path))return blocked();if(['request-password-reset','email-otp/send-verification-otp'].includes(path)&&!await knownEmail(request))return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});return getAuth().handler().POST(request,context);}
