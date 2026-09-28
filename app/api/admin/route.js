import { requireAdmin } from '../../../lib/auth';
import { query, transaction } from '../../../lib/db';
import { action } from '../../../lib/family';
import { remove } from '../../../lib/storage';
export const dynamic='force-dynamic';
const fail=e=>{console.error(e);return Response.json({error:e.status?e.message:'אירעה שגיאה בשמירה. נסו שוב.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});};
export async function GET(){try{await requireAdmin();const [p,u,m]=await Promise.all([query('select * from people order by name_he'),query('select * from family_units'),query('select * from family_members')]);return Response.json({people:p.rows,units:u.rows,members:m.rows},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(req){try{await requireAdmin();if(new URL(req.headers.get('origin')||req.url).host!==new URL(req.url).host)throw Object.assign(new Error('בקשה ממקור לא מורשה.'),{status:403});const body=await req.json();const result=await transaction(async c=>{await c.query('select pg_advisory_xact_lock(8842401)');return action(c,body)});if(result.photoKey)try{await remove(result.photoKey)}catch(e){console.error('Deleted person photo cleanup failed',e)}delete result.photoKey;return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
