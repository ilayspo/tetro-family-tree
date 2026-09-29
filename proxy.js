import { NextResponse } from 'next/server';

const COOKIE='tetro_family_view';
const encoder=new TextEncoder();
function base64url(bytes){let text='';for(const byte of new Uint8Array(bytes))text+=String.fromCharCode(byte);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function valid(token){
 try{
  const [version,expiresText,accessVersionText,sig,...rest]=String(token||'').split('.');
  if(rest.length||version!=='v1'||!/^\d+$/.test(expiresText)||!/^\d+$/.test(accessVersionText)||Number(expiresText)<=Date.now()/1000||!sig)return false;
  const secret=process.env.NEON_AUTH_COOKIE_SECRET;if(!secret||secret.length<32)return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected=base64url(await crypto.subtle.sign('HMAC',key,encoder.encode(`${version}.${expiresText}.${accessVersionText}`)));
  if(expected.length!==sig.length)return false;let diff=0;for(let i=0;i<sig.length;i++)diff|=expected.charCodeAt(i)^sig.charCodeAt(i);return diff===0;
 }catch{return false;}
}

export async function proxy(request){
 if(await valid(request.cookies.get(COOKIE)?.value))return NextResponse.next();
 const url=request.nextUrl.clone();url.pathname='/access.html';url.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);return NextResponse.redirect(url);
}

export const config={matcher:['/','/tree.html']};
