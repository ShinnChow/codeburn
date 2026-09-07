import {describe,it,expect} from 'vitest'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createPiProvider} from '../src/providers/pi.js'
import {parseProviderSources,mergeProjectsByCrossProviderKey} from '../src/parser.js'
import {CACHE_VERSION} from '../src/session-cache.js'

describe('root real Pi case identity decode and cache roundtrip',()=>{
 it('preserves exact cwd through cold parse, warm read and serialized cache reload',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'codex-root-pi-case-'))
  try {
   for (const [index,cwd] of ['/a/Vault','/a/vault'].entries()) {
    const folder=join(dir,'sessions','source-'+index);await mkdir(folder,{recursive:true})
    const rows=[{type:'session',version:3,id:'case-'+index,cwd,timestamp:'2026-09-07T01:00:00Z'},
     {type:'message',id:'message-'+index,timestamp:'2026-09-07T01:01:00Z',message:{role:'assistant',model:'gpt-5.4',content:[],responseId:'response-'+index,usage:{input:1000,output:200,cacheRead:0,cacheWrite:0,cost:{total:1}}}}]
    await writeFile(join(folder,'session.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n')
   }
   const sources=await createPiProvider(join(dir,'sessions')).discoverSessions();expect(sources).toHaveLength(2)
   let cache={version:CACHE_VERSION,providers:{}}
   for (const stage of ['cold','warm','reloaded']) {
    if(stage==='reloaded'){const file=join(dir,'cache.json');await writeFile(file,JSON.stringify(cache));cache=JSON.parse(await readFile(file,'utf8'))}
    const parsed=await parseProviderSources('pi',sources,new Set(),cache)
    const paths=parsed.map(p=>p.projectPath).sort()
    const merged=[...mergeProjectsByCrossProviderKey(parsed).values()]
    console.log('ROOT_PI_CASE',stage,JSON.stringify(paths),JSON.stringify(merged.map(p=>p.projectPath)))
    expect(paths,stage+' parser roots').toEqual(['/a/Vault','/a/vault'])
    expect(merged.map(p=>p.projectPath).sort(),stage+' merged roots').toEqual(['/a/Vault','/a/vault'])
   }
  } finally {await rm(dir,{recursive:true,force:true})}
 })
})
