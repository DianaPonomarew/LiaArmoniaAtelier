/** LIA ARMONÍA — Private Wedding Inquiry. Durable intake, independent email alert. */
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

const STUDIO = 'atelier@liaarmonia.com';
const REQUIRED = ['names','email','season','location','support'];
const ORDER = [
 ['names','Names'],['email','Email'],['phone','Phone'],['season','Date / season'],
 ['location','Destination / preferred venue'],['guest_count','Guests'],['overall_budget','Approximate overall wedding budget'],
 ['support','Requested support'],['venue_status','Venue booked?'],['vision','Vision / priorities'],
 ['inquiry_id','Inquiry reference'],['submitted_at','Submitted at']
];
function value(v){ return (Array.isArray(v)?v.join(', '):String(v??'')).trim().slice(0,5000); }
function htmlEscape(v){return value(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
async function parse(req){
 if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
 const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):typeof req.body==='string'?req.body:await new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>25000)reject(new Error('too large'));});req.on('end',()=>resolve(s));req.on('error',reject);});
 if(raw.length>25000)throw Error('too large');
 if(String(req.headers['content-type']||'').includes('application/x-www-form-urlencoded'))return Object.fromEntries(new URLSearchParams(raw));
 try{return JSON.parse(raw);}catch{return Object.fromEntries(new URLSearchParams(raw));}
}
async function send(apiKey,email){
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(email)});
 if(!r.ok)throw Error('Resend returned status '+r.status);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'){ const {createHash,timingSafeEqual}=await import('node:crypto'); const q=new URL(req.url,'https://www.liaarmonia.com').searchParams.get('pipeline_check')||''; const digest=createHash('sha256').update(q).digest('hex'); const correct='e95104cb5e7aba441fe85b119bfcfdf888d2adb6c0110fcb05a6bd76512c6351'; if(!timingSafeEqual(Buffer.from(digest),Buffer.from(correct)))return res.status(404).json({error:'Not found'}); req.method='POST';req.body={names:'[TEST] Inquiry Pipeline Check',email:'atelier@liaarmonia.com',season:'November 2026 test',location:'TEST ONLY',support:'Technical verification',overall_budget:'TEST',vision:'Automated verification. No real client, no reply required.',storage_consent:'Yes'}; }
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Method not allowed'});}
 let raw;
 try{raw=await parse(req);}catch{return res.status(400).json({ok:false,error:'Invalid request body'});}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return res.status(400).json({ok:false,error:'Invalid request'});
 // Honeypot: reject without storing.
 if(value(raw.website))return res.status(200).json({ok:true});
 const fields=Object.fromEntries(Object.entries(raw).filter(([k])=>!['website','form-name','form_name'].includes(k)).map(([k,v])=>[k,value(v)]));
 const missing=REQUIRED.filter(k=>!fields[k]);if(missing.length)return res.status(400).json({ok:false,error:'Please complete the required fields',fields:missing});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))return res.status(400).json({ok:false,error:'Please enter a valid email address'});
 const id='LA-'+new Date().getUTCFullYear()+'-'+randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();
 const createdAt=new Date().toISOString();
 const record={...fields,inquiry_id:id,submitted_at:createdAt,source:'LIA ARMONÍA website',delivery_status:'pending'};
 // A submission is never marked received until its private backup has been saved.
 if(!process.env.BLOB_READ_WRITE_TOKEN){console.error('Wedding inquiry backup is not configured');return res.status(503).json({ok:false,error:'Inquiry service temporarily unavailable. Please email atelier@liaarmonia.com.'});}
 try{
  await put('wedding-inquiries/'+createdAt.slice(0,10)+'/'+id+'.json',JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',token:process.env.BLOB_READ_WRITE_TOKEN});
 }catch(error){console.error('Wedding inquiry backup failed',error.message);return res.status(503).json({ok:false,error:'We could not securely save your inquiry. Please email atelier@liaarmonia.com.'});}
 const rows=ORDER.filter(([k])=>record[k]).map(([k,label])=>'<tr><td style="padding:10px 14px;color:#a48364;border-bottom:1px solid #ddd">'+htmlEscape(label)+'</td><td style="padding:10px 14px;border-bottom:1px solid #ddd">'+htmlEscape(record[k])+'</td></tr>').join('');
 let emailDelivered=false;
 if(process.env.RESEND_API_KEY){
  try{
   await send(process.env.RESEND_API_KEY,{from:process.env.RESEND_FROM||'LIA ARMONÍA <onboarding@resend.dev>',to:[process.env.PRIVATE_INQUIRY_TO||STUDIO],reply_to:record.email,subject:'NEW WEDDING INQUIRY · '+record.names+' · '+id,html:'<div style="font-family:Arial,sans-serif;color:#26201b;max-width:720px"><h1>New LIA ARMONÍA wedding inquiry</h1><p>Secure backup: Vercel Blob / wedding-inquiries / '+htmlEscape(id)+'</p><table style="border-collapse:collapse">'+rows+'</table></div>',text:ORDER.filter(([k])=>record[k]).map(([k,label])=>label+': '+record[k]).join('\n')});
   emailDelivered=true;
  }catch(e){console.error('Wedding inquiry studio email failed for '+id+': '+e.message);}
 }else console.error('Wedding inquiry email integration not configured for '+id);
 if(emailDelivered){
  try{await send(process.env.RESEND_API_KEY,{from:process.env.RESEND_FROM||'LIA ARMONÍA <onboarding@resend.dev>',to:[record.email],reply_to:STUDIO,subject:'Your inquiry has reached LIA ARMONÍA · '+id,html:'<div style="max-width:580px;margin:auto;padding:32px;font-family:Arial,sans-serif;color:#27201c"><p style="letter-spacing:.14em;font-size:11px">LIA ARMONÍA · WEDDING DESIGN ATELIER</p><h1 style="font:400 34px Georgia,serif">Thank you, '+htmlEscape(record.names.split(/[ &,]+/)[0])+'.</h1><p>I have received your wedding inquiry and will personally review your plans and get back to you via email with the next steps.</p><p>Warmly,<br>Diana</p><small>Reference: '+htmlEscape(id)+'</small></div>'});}catch(e){console.warn('Wedding inquiry confirmation failed for '+id);}
 }
 return res.status(200).json({ok:true,inquiryId:id,emailPending:!emailDelivered,stored:true});
}
