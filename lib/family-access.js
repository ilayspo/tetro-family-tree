import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from './db';

export const FAMILY_COOKIE='tetro_family_view';
const VERSION='v1';
const THIRTY_DAYS=60*60*24*30;

function secret(){
  const value=process.env.NEON_AUTH_COOKIE_SECRET;
  if(!value||value.length<32)throw new Error('Family access signing secret is unavailable.');
  return value;
}

function signature(payload){return createHmac('sha256',secret()).update(payload).digest('base64url');}

export function createFamilyToken(accessVersion){
  const expires=Math.floor(Date.now()/1000)+THIRTY_DAYS;
  const payload=`${VERSION}.${expires}.${Number(accessVersion)}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyFamilyToken(token){
  if(typeof token!=='string')return false;
  const [version,expiresText,accessVersionText,sig,...rest]=token.split('.');
  if(rest.length||version!==VERSION||!/^\d+$/.test(expiresText)||!/^\d+$/.test(accessVersionText)||Number(expiresText)<=Date.now()/1000||!sig)return false;
  const expected=signature(`${version}.${expiresText}.${accessVersionText}`);
  const a=Buffer.from(sig),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b)?{accessVersion:Number(accessVersionText)}:false;
}

export async function hasFamilyAccess(){
  const jar=await cookies();
  const verified=verifyFamilyToken(jar.get(FAMILY_COOKIE)?.value);if(!verified)return false;
  const setting=await query('select access_version from family_settings where singleton=true');
  return setting.rowCount===1&&setting.rows[0].access_version===verified.accessVersion;
}

export async function requireFamilyAccess(){
  if(!await hasFamilyAccess())throw Object.assign(new Error('נדרש קוד משפחתי לצפייה בעץ.'),{status:401});
}

export function hashFamilyCode(code){
  const salt=randomBytes(16).toString('base64url');
  const digest=scryptSync(String(code),salt,64).toString('base64url');
  return `scrypt$${salt}$${digest}`;
}

export function verifyFamilyCode(code,stored){
  const [kind,salt,digest,...rest]=String(stored||'').split('$');
  if(rest.length||kind!=='scrypt'||!salt||!digest)return false;
  const actual=scryptSync(String(code),salt,64),expected=Buffer.from(digest,'base64url');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
