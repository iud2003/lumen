import {build} from 'esbuild';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
await build({entryPoints:['src/main.tsx'],bundle:true,format:'iife',target:'es2022',outfile:'build/app.js',minify:true});
const html='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111313"><title>Lumen — Live Visual Control</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
await writeFile('worker/generated.js','export const html='+JSON.stringify(html)+';\nexport const js='+JSON.stringify(await readFile('build/app.js','utf8'))+';\nexport const css='+JSON.stringify(await readFile('build/app.css','utf8'))+';\nexport const sample='+JSON.stringify((await readFile('assets/motion.mp4')).toString('base64'))+';');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['worker/index.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js'});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built React client and authenticated Worker API.');
