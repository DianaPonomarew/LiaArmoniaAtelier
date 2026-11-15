import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { put, get, list } from '@vercel/blob';

const STUDIO='atelier@liaarmonia.com';
const REFERRAL_TERMS_VERSION='1.0-2026-11-14';
const wordCount=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
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
 const body='<div style="font-family:Arial,sans-serif;color:#302522;max-width:740px;margin:auto;padding:35px"><h1 style="font:normal 34px Georgia">New LIA planner profile submission</h1><p><strong>'+safe(data.studio_name)+'</strong> · '+safe(data.category)+'</p><p>Countries: '+safe(data.countries.join(', '))+'</p><p>Contact: '+safe(data.email)+'</p><p>Instagram: '+safe(data.instagram)+'</p><p>'+safe(data.bio)+'</p><p>Passion: '+safe(data.passion)+'</p><p>Signature focus: '+safe(data.signature_focus)+'</p><p>Referral terms: '+safe(data.referral_terms_version)+' accepted '+safe(data.referral_accepted_at)+'</p><p><a href="'+safe(link)+'" style="color:#532b30">Review, edit and publish this profile →</a></p><p>Private review link. Valid for 30 days. No profile is automatically published.</p></div>';
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
   bio:field(b.bio,450),passion:field(b.passion,400),signature_focus:field(b.signature_focus,330),image_credit:field(b.image_credit,260),
   referral_agreement:b.referral_agreement===true&&b.referral_terms_version===REFERRAL_TERMS_VERSION&&!b.individual_terms_intake,individual_terms_intake:b.individual_terms_intake===true,individual_terms_ack:b.individual_terms_ack===true,referral_terms_version:b.individual_terms_intake===true?'individual-review':REFERRAL_TERMS_VERSION,
   image_rights:b.image_rights===true,editorial_consent:b.editorial_consent===true,privacy_consent:b.privacy_consent===true
  };
  if(!fields.studio_name||!fields.contact_name||!emailOK(fields.email)||fields.countries.length<1||!fields.bio||fields.bio.length<30||!fields.passion||wordCount(fields.passion)>50||!fields.signature_focus||wordCount(fields.signature_focus)>40||!(fields.referral_agreement||(fields.individual_terms_intake&&fields.individual_terms_ack))||!fields.image_rights||!fields.editorial_consent||!fields.privacy_consent)
    return res.status(400).json({ok:false,error:'Please complete the required profile information and permissions'});
  if(!['Wedding Planner','Production & Creative Partner'].includes(fields.category))return res.status(400).json({ok:false,error:'Select a valid partner category'});
  const id=randomUUID(),now=new Date().toISOString();const record={id,...fields,status:'uploading',created_at:now,updated_at:now,referral_accepted_at:fields.referral_agreement?now:null,referral_acceptance_method:fields.referral_agreement?'required_unchecked_clickwrap':null,individual_profile_ack_at:fields.individual_terms_intake&&fields.individual_terms_ack?now:null,referral_acceptance_ip:req.headers['x-forwarded-for']?.split(',')[0]?.trim().slice(0,60)||null,referral_acceptance_user_agent:String(req.headers['user-agent']||'').slice(0,300)};
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
 if(action==='photo'||action==='portrait'){
  const n=Number(b.number),name=field(b.filename,180);
  if(action==='photo'&&(!Number.isInteger(n)||n<0||n>5))return res.status(400).json({ok:false,error:'Maximum six portfolio images'});
  if(existing.status!=='uploading')return res.status(409).json({ok:false,error:'Uploads have already been finalized'});
  const payload=String(b.base64||'');
  if(payload.length>1350000)return res.status(413).json({ok:false,error:'Photo is too large after compression'});
  let bytes;try{bytes=Buffer.from(payload,'base64');}catch{return res.status(400).json({ok:false,error:'Invalid image data'})}
  if(bytes.length<100||bytes.length>1000000||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)return res.status(400).json({ok:false,error:'Only compressed JPEG images up to 1MB are supported'});
  try{await put('planner-submissions/'+id+'/'+(action==='portrait'?'portrait.jpg':'photo-'+n+'.jpg'),bytes,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'image/jpeg',token:blobToken()});}
  catch(e){console.error('Planner image upload failed:',e.message);return res.status(503).json({ok:false,error:'Photo upload failed'})}
  return res.status(200).json({ok:true,kind:action,number:action==='photo'?n:null,originalFilename:name});
 }
 if(action==='complete'){
  if(existing.status==='submitted')return res.status(200).json({ok:true,submissionId:id,alreadySubmitted:true});
  let photos;try{photos=await imageList(id);}catch(e){console.error('Photo listing failed',e.message);return res.status(503).json({ok:false,error:'Could not verify uploaded photos'})}
  if((photos.blobs?.length||0)<3||(photos.blobs?.length||0)>6)return res.status(400).json({ok:false,error:'Please upload 3 to 6 wedding portfolio images'});
  try{const portrait=await get('planner-submissions/'+id+'/portrait.jpg',{access:'private',token:blobToken()});if(!portrait?.stream)return res.status(400).json({ok:false,error:'Please upload one portrait or team photo'});}catch(e){if(/not found|404|does not exist/i.test(String(e.message)))return res.status(400).json({ok:false,error:'Please upload one portrait or team photo'});console.error('Portrait verification failed',e.message);return res.status(503).json({ok:false,error:'Could not verify portrait upload'});}
  const complete={...existing,status:'submitted',updated_at:new Date().toISOString(),image_count:photos.blobs.length,portrait_uploaded:true};
  try{await put(detailPath(id),JSON.stringify(complete),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',token:blobToken()})}
  catch(e){console.error('Profile completion failed',e.message);return res.status(503).json({ok:false,error:'Could not complete your profile'})}
  let emailPending=true;try{emailPending=!(await notify(complete));}catch(e){console.error('Planner review notification failed',id,e.message)}
  let partnerConfirmationPending=true;
  if(process.env.RESEND_API_KEY){
   try{const confirmation=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM||'LIA ARMONÍA <onboarding@resend.dev>',to:[complete.email],subject:'Your LIA ARMONÍA Partner Profile Confirmation',text:'Thank you for submitting your invited partner profile. Your reference is '+id+'\\n\\n'+(complete.individual_terms_intake?'Your profile is being prepared under our individually discussed partnership route. Your submission does not amend any earlier agreed referral terms and does not itself constitute a new commission agreement. Any outstanding referral terms will be confirmed separately before introducing a client.':'You accepted the Referral Partnership Terms version '+complete.referral_terms_version+' on '+complete.referral_accepted_at+'.\\nSave a copy: https://www.liaarmonia.com/partner-referral-terms.html\\n\\nCommission: 15% of net planning fees actually received from qualifying referrals, payable within 14 calendar days after each client payment.')+'\\n\\nWe will prepare your studio profile for review before the collection launch. Questions? atelier@liaarmonia.com\\n\\nLIA ARMONÍA'})});partnerConfirmationPending=!confirmation.ok;if(!confirmation.ok)console.error('Partner confirmation email rejected',id,confirmation.status)}catch(e){console.error('Partner confirmation notification failed',id,e.message)}
  }
  return res.status(200).json({ok:true,submissionId:id,stored:true,emailPending,partnerConfirmationPending});
 }
 return res.status(400).json({ok:false,error:'Unknown action'});
}
