import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { resolve,extname,sep } from 'node:path'
const projectRoot=fileURLToPath(new URL('../',import.meta.url))
const posterSource=fileURLToPath(new URL('../fonti/Poster Rianimazione 2025 DEFINITIVO.pdf',import.meta.url))
export default defineConfig({
 plugins:[react(),tailwindcss(),{
  name:'shared-original-source',
  configureServer(server){server.middlewares.use((req,res,next)=>{
   let pathname:string;try{pathname=decodeURIComponent(req.url?.split('?')[0]??'')}catch{return next()}
   if(pathname==='/sources/poster-sin-2025.pdf'){res.setHeader('Content-Type','application/pdf');return res.end(readFileSync(posterSource))}
   const allowed=['/prototipo-01/prototipo/','/shared/assets/','/shared/design-system/','/fonti/'];
   if(!allowed.some(prefix=>pathname.startsWith(prefix)))return next();
   const file=resolve(projectRoot,'.'+pathname);
   if(!allowed.some(prefix=>file.startsWith(resolve(projectRoot,'.'+prefix)+sep)))return next();
   const types:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.json':'application/json'};
   try{const contents=readFileSync(file);res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');return res.end(contents)}catch{return next()}
  })},
  generateBundle(){this.emitFile({type:'asset',fileName:'sources/poster-sin-2025.pdf',source:readFileSync(posterSource)})}
 }],
 publicDir:'../shared/assets',base:'./',css:{postcss:{plugins:[]}},
 server:{fs:{allow:[projectRoot]},proxy:{'/api/assistant':{target:'http://127.0.0.1:5181',changeOrigin:true}}},
 resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))},dedupe:['react','react-dom']},
 test:{environment:'jsdom',include:['src/**/*.test.{ts,tsx}'],restoreMocks:true}
})
