import { createNeonAuth } from '@neondatabase/auth/next/server';
import { query } from './db';
let instance;
export function getAuth(){
  if(!instance) instance=createNeonAuth({baseUrl:process.env.NEON_AUTH_BASE_URL,cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET}});
  return instance;
}
export async function requireAdmin() {
  const {data,error}=await getAuth().getSession();
  if(error || !data?.user?.id) throw Object.assign(new Error('יש להתחבר כמנהל.'),{status:401});
  const allowed=await query('select 1 from tree_admins where user_id=$1',[data.user.id]);
  if(!allowed.rowCount) throw Object.assign(new Error('אין הרשאת ניהול לחשבון הזה.'),{status:403});
  return data.user;
}
