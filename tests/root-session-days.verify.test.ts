import {it,expect} from 'vitest'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
it('one real session spanning two days is one period project session',()=>{
 const dir=mkdtempSync(join(homedir(),'root-session-days-'));const claude=join(dir,'claude');const projects=join(claude,'projects','project-a');mkdirSync(projects,{recursive:true})
 const now=new Date(Date.now()-60000);const older=new Date(now.getTime()-5*86400000);const sessionId='same-actual-session';const cwd='/tmp/same-session-project'
 const rows=[older,now].flatMap((date,i)=>[
  {type:'user',sessionId,timestamp:date.toISOString(),cwd,message:{role:'user',content:'task'+i}},
  {type:'assistant',sessionId,timestamp:date.toISOString(),cwd,message:{id:'response'+i,role:'assistant',model:'claude-sonnet-4-5',content:[{type:'text',text:'done'}],usage:{input_tokens:1000,output_tokens:200,cache_creation_input_tokens:0,cache_read_input_tokens:0}}}
 ])
 writeFileSync(join(projects,sessionId+'.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n')
 const env={...process.env,CLAUDE_CONFIG_DIR:claude,CODEBURN_CACHE_DIR:join(dir,'cache'),CODEBURN_DESKTOP_SESSIONS_DIR:join(dir,'desktop')}
 const cli=(args:string[])=>{const r=spawnSync(process.execPath,['dist/cli.js',...args],{cwd:process.cwd(),env,encoding:'utf8',timeout:60000});expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout)}
 cli(['models','--format','json','--period','week'])
 const json=cli(['status','--format','menubar-json','--period','week','--provider','claude','--no-timeline'])
 const row=json.current.topProjects.find((r:any)=>r.id===cwd)
 console.log('ROOT_REAL_SESSION_DAYS',JSON.stringify({headline:json.current.sessions,row}))
 expect(row.sessionDetails).toHaveLength(1)
 expect(row.sessions).toBe(1)
},120000)
