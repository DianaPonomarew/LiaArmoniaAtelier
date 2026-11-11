import { get } from '@vercel/blob';
const token=()=>process.env.BLOB_READ_WRITE_TOKEN||'';
const COLLECTION_LAUNCH_UTC=Date.parse('2027-01-15T17:00:00Z');
const launched=()=>Date.now()>=COLLECTION_LAUNCH_UTC;

const idOkay=id=>/^[a-f0-9-]{36}$/.test(String(id||''));
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 if(!launched())return res.status(404).end();
 const id=String(req.query.id||''),number=Number(req.query.number),portrait=req.query.portrait==='1';
 if(!idOkay(id)||(!portrait&&(!Number.isInteger(number)||number<0||number>5)))return res.status(400).end();
 if(!token())return res.status(503).end();
 try{
  const idx=await get('planner-directory/index.json',{access:'private',token:token()});
  if(!idx?.stream)return res.status(404).end();
  const body=JSON.parse(await new Response(idx.stream).text());
  const published=Array.isArray(body.profiles)&&body.profiles.some(p=>p.id===id&&p.status==='approved'&&p.publication_consent===true);
  if(!published)return res.status(404).end();
  const photo=await get('planner-submissions/'+id+'/'+(portrait?'portrait.jpg':'photo-'+number+'.jpg'),{access:'private',token:token()});
  if(!photo?.stream)return res.status(404).end();
  res.setHeader('Content-Type','image/jpeg');
  res.setHeader('Cache-Control','public, s-maxage=120, max-age=120');
  res.setHeader('X-Content-Type-Options','nosniff');
  const bytes=Buffer.from(await new Response(photo.stream).arrayBuffer());
  return res.status(200).send(bytes);
 }catch(e){console.error('Public planner image failed',e.message);return res.status(404).end();}
}