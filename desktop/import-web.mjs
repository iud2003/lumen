import {openStorage} from './server.mjs';
import {join} from 'node:path';
const source=process.argv[2]||'http://localhost:8787';
const directory=process.argv[3]||join(process.env.APPDATA,'Lumen Desktop','data');
const storage=await openStorage(directory);
try{
 const list=await fetch(source+'/api/shows');if(!list.ok)throw Error('Start the local site with LOCAL_DEV:true before importing.');
 const shows=await list.json();let count=0;
 for(const entry of shows){
  if(storage.db.prepare('SELECT id FROM shows WHERE id=?').get(entry.id))continue;
  const response=await fetch(source+'/api/shows/'+encodeURIComponent(entry.id));if(!response.ok)throw Error('Could not read '+entry.name);
  const {show}=await response.json();
  const assets=show.state.assets.filter(a=>!a.id.startsWith('sample-'));
  for(const asset of assets){
   const file=await fetch(new URL(asset.url,source));if(!file.ok)throw Error('Could not import '+asset.name);
   const size=Number(file.headers.get('content-length'))||asset.size||0;
   const mime=file.headers.get('content-type')||'application/octet-stream';
   await storage.BUCKET.put(asset.id,file.body);
   storage.db.prepare('INSERT OR IGNORE INTO media VALUES (?,?,?,?,?,?,?)').run(asset.id,'local-operator',show.id,asset.name,asset.kind,size,mime);
  }
  storage.db.prepare('INSERT INTO shows VALUES (?,?,?,?,?,?)').run(show.id,'local-operator',show.name,JSON.stringify(show.state),show.version,Date.now());count++;
 }
 console.log('Imported '+count+' shows into '+directory);
}finally{storage.close()}
