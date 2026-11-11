/** TEMPORARY READ-ONLY audit for the studio owner; remove immediately after inspection. */
import { createHash, timingSafeEqual } from 'node:crypto';
const expected = '18cc906b8b5a78fcb8a1a74716ca216a10b6803041bd7b34937371f38b7d7b55';
const isoStart = '2026-10-01T00:00:00Z';
function authorized(token) {
  const actual = createHash('sha256').update(token || '').digest('hex');
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const token = new URL(req.url, 'https://www.liaarmonia.com').searchParams.get('audit');
  if (req.method !== 'GET' || !authorized(token)) return res.status(404).json({error: 'Not found'});
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({error:'Resend is not configured'});
  const headers = { Authorization: 'Bearer ' + key };
  const records = [];
  let cursor, pages=0, scanned=0, truncated=false, readError=null;
  const interesting = /(inquir|consultation|contact|lead|request|brief|wedding design|collaboration)/i;
  try {
    while (pages < 15) {
      const u = new URL('https://api.resend.com/emails');
      u.searchParams.set('limit', '100');
      if (cursor) u.searchParams.set('after', cursor);
      const r=await fetch(u,{headers});
      if(!r.ok){readError='Resend list status '+r.status+' '+(await r.text()).slice(0,200);break;}
      const body=await r.json();
      const list=Array.isArray(body.data)?body.data:[];
      pages++;scanned+=list.length;
      for(const item of list){
        if (!interesting.test(String(item.subject||''))) continue;
        if (Date.parse(item.created_at||0) < Date.parse(isoStart)) continue;
        const to=(item.to||[]).join(', ');
        // Only studio-owned notifications and confirmations.
        if (!/liaarmonia\.com/i.test(to) && !/NEW PRIVATE DESIGN INQUIRY|New atelier inquiry|New collaboration inquiry/i.test(String(item.subject||''))) continue;
        records.push({id:item.id,created_at:item.created_at,subject:item.subject,to:item.to,last_event:item.last_event,reply_to:item.reply_to});
      }
      if (!body.has_more || !list.length || Date.parse(list[list.length-1].created_at||0)<Date.parse(isoStart)) break;
      cursor=list[list.length-1].id;
    }
    if(pages>=15)truncated=true;
    const enriched=await Promise.all(records.slice(0,80).map(async item=>{
      try {
        const r=await fetch('https://api.resend.com/emails/'+encodeURIComponent(item.id),{headers});
        if(!r.ok)return {...item,detail_status:r.status};
        const detail=await r.json();
        return {...item, text: String(detail.text||'').slice(0,11000), html: detail.text?'':String(detail.html||'').slice(0,11000)};
      }catch(e){return {...item,detail_error: 'retrieve error'};}
    }));
    return res.status(200).json({pages,scanned,count:records.length,truncated,readError,records:enriched});
  }catch(e){return res.status(502).json({pages,scanned,count:records.length,error:'Audit fetch failed'});}
}
