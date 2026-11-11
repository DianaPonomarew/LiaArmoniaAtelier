import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { put, get, list } from '@vercel/blob';

const STUDIO='atelier@liaarmonia.com';
const secret=()=>process.env.PLANNER_EDITORIAL_SECRET||'';
const blobToken=()=>process.env.BLOB_READ_WRITE_TOKEN||'';
const appOrigin='https://www.liaarmonia.com';
const field=(x,max=280)=>String(x??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const choices=(x,max=8)=>Array.isArray(x)?[...new Set(x.map(y=>field(y,75)).filter(Boolean))].slice(0,max):[];
const validId=x=>/^[a-f0-9-]{36}$/.test(String(x||''));
const emailOK=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
function sign(s){return createHmac('sha256',secret()).update(s).digest('hex');}
function verify(id,sig){const expected=Buffer.from(sign('upload:'+id),'hex');if(!sig||!/^[a-f0-9]{64}$/i.test(sig))return false;return timingSafeEqual(expected,Buffer.from(sig,'hex'));}
const detailPath=id=>'planner-submissions/'+id+'/details.json';
async function readPrivate(path){const result=await get(path,{access:'private',token:blobToken()});if(!result?.stream)return null;return JSON.parse(await new Response(result.stream).text());}
const imageList=id=>list({prefix:'planner-submissions/'+id+'/photo-',limit:12,token:blobToken()});
async function notify(data){
 if(!process.env.RESEND_API_KEY)return false;
 const expiry=Math.floor(Date.now()/1000)+30*86400;
 const auth=expiry+'.'+sign('review:'+data.id+':'+expiry);
 const link=appOrigin+'/planner-review.html?id='+encodeURIComponent(data.id)+'&token='+encodeURIComponent(auth);
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const body='<div style="font-family:Arial,sans-serif;color:#302522;max-width:740px;margin:auto;padding:35px"><h1 style="font:normal 34px Georgia">New LIA planner profile submission</h1><p><strong>'+safe(data.studio_name)+'</strong> · '+safe(data.category)+'</p><p>Countries: '+safe(data.countries.join(', '))+'</p><p>Contact: '+safe(data.email)+'</p><p>Instagram: '+safe(data.instagram)+'</p><p>'+safe(data.bio)+'</p><p><a href="'+safe(link)+'" style="color:#532b30">Review, edit and publish this profile →</a></p><p>Private review link. Valid for 30 days. No profile is automatically published.</p></div>';
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM||'LIA ARMONÍA <onboarding@resend.dev>',to:[process.env.PRIVATE_INQUIRY_TO||STUDIO],reply_to:data.email,subject:'PLANNER PROFILE READY FOR REVIEW · '+data.studio_name,html:body,text:'New profile: '+data.studio_name+'\nEmail: '+data.email+'\nReview link: '+link})});
 if(!response.ok)throw Error('Mail provider rejected notification');
 return true;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
 if(req.headers.origin&&req.headers.origin!==appOrigin&&req.headers.origin!=='https://liaarmonia.com')return res.status(403).json({ok:false,error:'Origin not allowed'});
 if(!secret()||!blobToken())return res.status(503).json({ok:false,error:'Partner submission is temporarily unavailable'});
 let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return res.status(400).json({ok:false,error:'Invalid submission'});}
 if(b.website_confirm)return res.status(200).json({ok:true});
 const action=field(b.action,20);
 if(action==='create'){
  const fields={
   studio_name:field(b.studio_name,130),contact_name:field(b.contact_name,120),email:field(b.email,200),category:field(b.category,55),
   city:field(b.city,90),countries:choices(b.countries,12),regions:field(b.regions,280),
   services:choices(b.services,8),languages:choices(b.languages,10),styles:choices(b.styles,5),
   instagram:field(b.instagram,160),website:field(b.website,250),starting_fee:field(b.starting_fee,120),
   bio:field(b.bio,450),image_credit:field(b.image_credit,260),
   image_rights:b.image_rights===true,editorial_consent:b.editorial_consent===true,privacy_consent:b.privacy_consent===true
  };
  if(!fields.studio_name||!fields.contact_name||!emailOK(fields.email)||fields.countries.length<1||!fields.bio||fields.bio.length<30||!fields.image_rights||!fields.editorial_consent||!fields.privacy_consent)
    return res.status(400).json({ok:false,error:'Please complete the required profile information and permissions'});
  if(!['Wedding Planner','Production & Creative Partner'].includes(fields.category))return res.status(400).json({ok:false,error:'Select a valid partner category'});
  const id=randomUUID(),record={id,...fields,status:'uploading',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try{await put(detailPath(id),JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',token:blobToken()});}
  catch(e){console.error('Planner draft save failed:',e.message);return res.status(503).json({ok:false,error:'Could not save your profile draft'})}
  return res.status(200).json({ok:true,submissionId:id,uploadToken:sign('upload:'+id)});
 }
 const id=field(b.id,45);
 if(!validId(id)||!verify(id,b.uploadToken))return res.status(403).json({ok:false,error:'Submission token invalid'});
 let existing;
 try{existing=await readPrivate(detailPath(id));}catch(e){console.error('Submission read failed',e.message);}
 if(!existing)return res.status(404).json({ok:false,error:'Submission not found'});
 if(existing.status==='published')return res.status(409).json({ok:false,error:'Submission is already published'});
 if(action==='photo'){
  const n=Number(b.number),name=field(b.filename,180);
  if(!Number.isInteger(n)||n<0||n>5)return res.status(400).json({ok:false,error:'Maximum six images'});
  if(existing.status!=='uploading')return res.status(409).json({ok:false,error:'Uploads have already been finalized'});
  const payload=String(b.base64||'');
  if(payload.length>1350000)return res.status(413).json({ok:false,error:'Photo is too large after compression'});
  let bytes;try{bytes=Buffer.from(payload,'base64');}catch{return res.status(400).json({ok:false,error:'Invalid image data'})}
  if(bytes.length<100||bytes.length>1000000||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)return res.status(400).json({ok:false,error:'Only compressed JPEG images up to 1MB are supported'});
  try{await put('planner-submissions/'+id+'/photo-'+n+'.jpg',bytes,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'image/jpeg',token:blobToken()});}
  catch(e){console.error('Planner image upload failed:',e.message);return res.status(503).json({ok:false,error:'Photo upload failed'})}
  return res.status(200).json({ok:true,number:n,originalFilename:name});
 }
 if(action==='complete'){
  if(existing.status==='submitted')return res.status(200).json({ok:true,submissionId:id,alreadySubmitted:true});
  let photos;try{photos=await imageList(id);}catch(e){console.error('Photo listing failed',e.message);return res.status(503).json({ok:false,error:'Could not verify uploaded photos'})}
  if(!photos.blobs?.length)return res.status(400).json({ok:false,error:'Please upload at least one portfolio image'});
  const complete={...existing,status:'submitted',updated_at:new Date().toISOString(),image_count:photos.blobs.length};
  try{await put(detailPath(id),JSON.stringify(complete),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',token:blobToken()})}
  catch(e){console.error('Profile completion failed',e.message);return res.status(503).json({ok:false,error:'Could not complete your profile'})}
  let emailPending=true;try{emailPending=!(await notify(complete));}catch(e){console.error('Planner review notification failed',id,e.message)}
  return res.status(200).json({ok:true,submissionId:id,stored:true,emailPending});
 }
 return res.status(400).json({ok:false,error:'Unknown action'});
}
