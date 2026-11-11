const {spawn}=require('node:child_process');
const path=require('node:path');
require('./ensure-runtime.cjs');
const child=spawn(process.execPath,[path.resolve(__dirname,'../node_modules/electron-builder/cli.js'),'--win','--x64',...process.argv.slice(2)],{
 cwd:path.resolve(__dirname,'..'),stdio:'inherit',windowsHide:true,
 env:{...process.env,ELECTRON_BUILDER_COMPRESSION_LEVEL:process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL||'3'}
});
child.on('error',error=>{console.error(error);process.exitCode=1});
child.on('exit',code=>{process.exitCode=code??1});
