const fs=require('node:fs');
const path=require('node:path');
function buildStandalone(root,output){
 const dist=path.join(root,'dist'),scripts=['i18n.js','parser.js','exporter.js','app.js'];let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
 html=html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+fs.readFileSync(path.join(dist,'style.css'),'utf8')+'\n</style>');
 for(const file of scripts)html=html.replace('<script src="'+file+'" defer></script>','');
 html=html.replace('</body>',scripts.map(file=>'<script>\n'+fs.readFileSync(path.join(dist,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n')+'\n</body>');
 fs.writeFileSync(output,html);return output;
}
if(require.main===module){const root=path.resolve(__dirname,'..'),output=path.resolve(process.argv[2]||path.join(root,'CAM-Lens.html'));console.log(buildStandalone(root,output));}
module.exports={buildStandalone};
