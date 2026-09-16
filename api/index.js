import {connect,database} from '../server/turso.mjs';
import {cloudHandler} from '../server/cloud.mjs';
let handler;
export default {async fetch(request){
 try{
  handler??=cloudHandler(database(connect(process.env)),process.env);
  const url=new URL(request.url),route=url.searchParams.get('route');
  if(route){url.pathname='/api/'+route;url.searchParams.delete('route')}
  if(!['GET','POST'].includes(request.method))return new Response(null,{status:405});
  const body=request.method==='POST'?await request.text():undefined;
  if(body&&Buffer.byteLength(body)>100000)return new Response('Dados muito grandes',{status:413});
  return handler(new Request(url,{method:request.method,headers:request.headers,body}));
 }catch{return Response.json({error:'Configure o banco de dados na Vercel.'},{status:503})}
}};
