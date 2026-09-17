// Explicit allowlist: never copy a development tree or Git history wholesale.
const fs=require('node:fs');
const path=require('node:path');
const {buildStandalone}=require('./build-standalone.cjs');
const root=path.resolve(__dirname,'..'),arg=process.argv[2];
if(!arg)throw new Error('Usage: node scripts/prepare-open-source.cjs <new-output-folder>');
const dest=path.resolve(arg);if(fs.existsSync(dest))throw new Error('Output folder already exists; choose a new folder.');
const files=['README.md','README.zh-TW.md','LICENSE','.gitignore','parser.test.cjs','exporter.test.cjs','i18n.test.cjs','ipc2581.test.cjs','scripts/validate-ipc2581.py','dist/index.html','dist/style.css','dist/i18n.js','dist/parser.js','dist/exporter.js','dist/ipc2581.js','dist/app.js','scripts/build-standalone.cjs','scripts/prepare-open-source.cjs'];
for(const file of files){if(!fs.statSync(path.join(root,file)).isFile())throw new Error('Missing source file: '+file);}
fs.mkdirSync(dest,{recursive:true});for(const file of files){const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
buildStandalone(dest,path.join(dest,'CAM-Lens.html'));console.log('Public source prepared: '+dest+' ('+(files.length+1)+' files)');
