const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('legacy entry resolves shared assets and styles from its real location',()=>{
 const filename='prototipo-01/prototipo/index.html',html=read(filename);
 const refs=[...html.matchAll(/(?:src|href)="([^"]*shared\/[^"#]+)"/g)].map(m=>m[1]);assert.ok(refs.length>=4);
 for(const relative of refs)assert.ok(fs.existsSync(path.resolve(root,path.dirname(filename),relative)),relative);
 assert.match(html,/data-theme="nido"/);
});
test('manifest resolves generated assets and the single original PDF',()=>{
 const manifest=JSON.parse(read('shared/assets/manifest.json'));
 for(const group of Object.values(manifest))for(const asset of Object.values(group))assert.ok(fs.existsSync(path.resolve(root,'shared/assets',asset)),asset);
 assert.ok(!fs.existsSync(path.join(root,'prototipo-02/public/sources/poster-sin-2025.pdf')));
});
test('shared UI does not depend on a prototype-specific import',()=>{
 const dir=path.join(root,'shared/ui/src/components');const files=fs.readdirSync(dir).filter(f=>f.endsWith('.tsx'));assert.equal(files.length,10);
 for(const file of files)assert.doesNotMatch(fs.readFileSync(path.join(dir,file),'utf8'),/@\/|prototipo-0[12]/);
 assert.ok(!fs.existsSync(path.join(root,'prototipo-02/src/components/ui/button.tsx')));
 assert.match(read('prototipo-02/src/App.tsx'),/@nls\/ui\/components\/button/);
});
test('CSS consumers share semantic tokens and external components are scanned',()=>{
 const legacy=read('shared/design-system/legacy-components.css');assert.match(legacy,/var\(--primary\)/);assert.match(legacy,/var\(--ring\)/);
 assert.match(read('shared/design-system/tokens.css'),/data-theme="nido"/);
 assert.match(read('prototipo-02/src/index.css'),/shared\/design-system\/tokens.css/);
 assert.match(read('shared/design-system/tailwind.css'),/@source "\.\.\/ui\/src"/);
});
