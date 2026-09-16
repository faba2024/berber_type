import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('vercel-public',{recursive:true});
for(const file of ['index.html','app.js','admin.js','redesign.js','style.css','admin.css','redesign.css','hero.png','interior.png','reference.png'])await copyFile('dist/'+file,'vercel-public/'+file);
console.log('Arquivos públicos preparados.');
