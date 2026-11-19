import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('src/flow.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const flow=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
fs.writeFileSync('docs/audio/flow-snapshot.json',JSON.stringify({steps:flow.steps,saturation:flow.saturation,mrsopa:flow.mrsopa,doppes:flow.doppes},null,2));
