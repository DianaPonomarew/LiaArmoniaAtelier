import { get } from '@vercel/blob';
const token=()=>process.env.BLOB_READ_WRITE_TOKEN||'';
export default async function handler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=120');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});}
 if(!token())return res.status(503).json({ok:false,error:'Collection temporarily unavailable'});
 try{
  const data=await get('planner-directory/index.json',{access:'private',token:token()});
  if(!data?.stream)return res.status(200).json({profiles:[]});
  const parsed=JSON.parse(await new Response(data.stream).text());
  const profiles=Array.isArray(parsed.profiles)?parsed.profiles.filter(p=>p.status==='approved'&&p.publication_consent===true):[];
  return res.status(200).json({profiles});
 }catch(err){
  // The initial unpublished collection has no index blob.
  if(/not found|404|does not exist/i.test(String(err.message)))return res.status(200).json({profiles:[]});
  console.error('Planner directory load failed:',err.message);
  return res.status(503).json({ok:false,error:'Collection is currently unavailable'});
 }
}