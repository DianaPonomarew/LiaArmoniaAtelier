import { createHmac, timingSafeEqual } from 'node:crypto';
import { get, put, list } from '@vercel/blob';
const blobToken=()=>process.env.BLOB_READ_WRITE_TOKEN||'';
const secret=()=>process.env.PLANNER_EDITORIAL_SECRET||'';
const idOkay=id=>/^[a-f0-9-]{36}$/.test(String(id||''));
const path=id=>'planner-submissions/'+id+'/details.json';
const indexPath='planner-directory/index.json';
const COLLECTION_LAUNCH_UTC=Date.parse('2027-01-15T17:00:00Z');
const launched=()=>Date.now()>=COLLECTION_LAUNCH_UTC;

function hmac(data){return createHmac('sha256',secret()).update(data).digest('hex')}
function same(a,b){if(!/^[a-f0-9]{64}$/i.test(String(a||'')))return false;return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))}
function authorized(id,t){
 const chunks=String(t||'').split('.');if(chunks.length!==2)return false;
 const expire=Number(chunks[0]);if(!Number.isSafeInteger(expire)||expire<Math.floor(Date.now()/1000)||expire>Math.floor(Date.now()/1000)+31*86400)return false;
 return same(chunks[1],hmac('review:'+id+':'+expire));
}
async function readJson(key){const r=await get(key,{access:'private',token:blobToken()});if(!r?.stream)return null;return JSON.parse(await new Response(r.stream).text())}
const txt=(x,n)=>String(x??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const listText=(x,n=10)=>[...new Set((Array.isArray(x)?x:String(x||'').split(/[,;\n]/)).map(s=>txt(s,65)).filter(Boolean))].slice(0,n);
const validHref=u=>{try{const v=new URL(String(u));return ['https:','http:'].includes(v.protocol)?v.href:''}catch{return ''}};
async function writeIndex(profiles){
 await put(indexPath,JSON.stringify({schema_version:2,updated_at:new Date().toISOString(),profiles}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',token:blobToken()})
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!blobToken()||!secret())return res.status(503).json({ok:false,error:'Editorial review service unavailable'});
 const id=String(req.query.id||req.body?.id||''),t=String(req.query.token||req.body?.token||'');
 if(!idOkay(id)||!authorized(id,t))return res.status(403).json({ok:false,error:'Invalid or expired review link'});
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).end()}
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!=='https://www.liaarmonia.com')return res.status(403).json({ok:false,error:'Origin not allowed'});
 let record;try{record=await readJson(path(id))}catch(e){console.error('Review draft read failed',e.message)}
 if(!record)return res.status(404).json({ok:false,error:'Profile submission was not found'});
 if(req.method==='GET'){
  if(req.query.action==='photo'){
   const n=Number(req.query.number);if(!Number.isInteger(n)||n<0||n>5)return res.status(400).end();
   try{const p=await get('planner-submissions/'+id+'/photo-'+n+'.jpg',{access:'private',token:blobToken()});if(!p?.stream)return res.status(404).end();
    res.setHeader('Content-Type','image/jpeg');res.setHeader('X-Content-Type-Options','nosniff');return res.status(200).send(Buffer.from(await new Response(p.stream).arrayBuffer()));
   }catch(e){return res.status(404).end()}
  }
  const images=await list({prefix:'planner-submissions/'+id+'/photo-',limit:12,token:blobToken()});
  return res.status(200).json({ok:true,profile:{...record,contact_email:record.email},photoCount:images.blobs?.length||0});
 }
 let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return res.status(400).json({ok:false,error:'Malformed request'})}
 const action=txt(b.action,20);
 if(!['publish','unpublish'].includes(action))return res.status(400).json({ok:false,error:'Unknown editorial action'});
 if(action==='publish'&&b.editor_approval!==true)return res.status(400).json({ok:false,error:'Explicit editorial approval required'});
 let index=[];
 try{const current=await readJson(indexPath);index=Array.isArray(current?.profiles)?current.profiles:[]}
 catch(e){if(!/not found|404|does not exist/i.test(String(e.message)))return res.status(503).json({ok:false,error:'Could not retrieve published profiles'})}
 if(action==='unpublish'){
  await writeIndex(index.filter(p=>p.id!==id));
  await put(path(id),JSON.stringify({...record,status:'unpublished',updated_at:new Date().toISOString()}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',token:blobToken()});
  return res.status(200).json({ok:true,status:'unpublished'});
 }
 if(!record.editorial_consent||!record.image_rights||!record.privacy_consent)return res.status(409).json({ok:false,error:'Submission permissions are incomplete'});
 if(!['submitted','published','unpublished'].includes(record.status))return res.status(409).json({ok:false,error:'Profile is not ready for publishing'});
 const images=await list({prefix:'planner-submissions/'+id+'/photo-',limit:12,token:blobToken()});
 if(!images.blobs?.some(x=>x.pathname.endsWith('/photo-0.jpg')))return res.status(409).json({ok:false,error:'The required lead image is missing'});
 const fields=b.profile||{};
 const profile={
  id,status:'approved',publication_consent:true,
  studio_name:txt(fields.studio_name||record.studio_name,130),
  category:txt(record.category,55),
  short_description:txt(fields.short_description||record.bio,140),
  bio:txt(fields.bio||record.bio,450),
  city:txt(fields.city??record.city,90),
  countries:listText(fields.countries||record.countries,12),
  regions:listText(fields.regions??record.regions,16),
  services:listText(fields.services||record.services,8),
  languages:listText(fields.languages||record.languages,10),
  styles:listText(fields.styles||record.styles,5),
  starting_fee:txt(fields.starting_fee??record.starting_fee,120),
  instagram:validHref(fields.instagram||record.instagram)|| (record.instagram?.startsWith('@')? 'https://www.instagram.com/'+record.instagram.replace(/^@/,'')+'/':''),
  website:validHref(fields.website||record.website),
  image:'/api/planner-public-image?id='+encodeURIComponent(id)+'&number=0',
  image_alt:'Selected wedding portfolio of '+txt(fields.studio_name||record.studio_name,120),
  image_credit:txt(fields.image_credit??record.image_credit,260),
  image_count:images.blobs.length
 };
 if(!profile.studio_name||profile.countries.length===0||!profile.short_description)return res.status(400).json({ok:false,error:'Studio name, short description and country are required'});
 try{
  await writeIndex([...index.filter(p=>p.id!==id),profile]);
  await put(path(id),JSON.stringify({...record,status:'published',updated_at:new Date().toISOString(),approved_at:new Date().toISOString()}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',token:blobToken()});
  return res.status(200).json({ok:true,status:launched()?'published':'scheduled',launch_date:'2027-01-15',publicUrl:'https://www.liaarmonia.com/planners.html',studio:profile.studio_name});
 }catch(e){console.error('Editorial publish failed:',e.message);return res.status(503).json({ok:false,error:'Publication failed. Please retry.'})}
}
