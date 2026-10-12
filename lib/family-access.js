import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from './db';

export const FAMILY_COOKIE='family_tree_access';
const VERSION='v2';
const THIRTY_DAYS=60*60*24*30;

function secret(){
  const value=process.env.NEON_AUTH_COOKIE_SECRET;
  if(!value||value.length<32)throw new Error('Family access signing secret is unavailable.');
  return value;
}

function signature(payload){return createHmac('sha256',secret()).update(payload).digest('base64url');}
function encode(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
function decode(value){return JSON.parse(Buffer.from(value,'base64url').toString('utf8'));}

export function createFamilyToken(grants){
  const payload=encode({exp:Math.floor(Date.now()/1000)+THIRTY_DAYS,grants});
  return `${VERSION}.${payload}.${signature(`${VERSION}.${payload}`)}`;
}

export function verifyFamilyToken(token){
  if(typeof token!=='string')return false;
  const [version,payload,sig,...rest]=token.split('.');
  if(rest.length||version!==VERSION||!payload||!sig)return false;
  const expected=signature(`${version}.${payload}`);
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return false;
  try{const value=decode(payload);return value?.exp>Date.now()/1000&&value.grants&&typeof value.grants==='object'?value:false;}catch{return false;}
}

export async function familyGrants(){
  const jar=await cookies();
  return verifyFamilyToken(jar.get(FAMILY_COOKIE)?.value)?.grants||{};
}

export async function grantFamilyAccess(treeId,accessVersion){
  const jar=await cookies(),current=verifyFamilyToken(jar.get(FAMILY_COOKIE)?.value),grants={...(current?.grants||{}),[treeId]:Number(accessVersion)};
  jar.set(FAMILY_COOKIE,createFamilyToken(grants),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:THIRTY_DAYS});
}

export async function revokeFamilyAccess(treeId){
  const jar=await cookies(),current=verifyFamilyToken(jar.get(FAMILY_COOKIE)?.value),grants={...(current?.grants||{})};delete grants[treeId];
  jar.set(FAMILY_COOKIE,createFamilyToken(grants),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:THIRTY_DAYS});
}

export async function hasFamilyAccess(treeId){
  const grants=await familyGrants(),version=grants[treeId];if(!Number.isInteger(version))return false;
  const setting=await query('select access_version from tree_settings where tree_id=$1',[treeId]);
  return setting.rowCount===1&&setting.rows[0].access_version===version;
}

export async function requireFamilyAccess(treeId){
  if(!await hasFamilyAccess(treeId))throw Object.assign(new Error('נדרש קוד משפחתי לצפייה בעץ.'),{status:401});
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
