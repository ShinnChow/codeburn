import {it,expect} from 'vitest'
import {mergeProjectsByCrossProviderKey} from '../src/parser.js'
import type {ProjectSummary} from '../src/types.js'
it('retains existing mixed-case Windows-drive cross-provider equivalence',()=>{
 const row=(projectPath:string):ProjectSummary=>({project:'Vault',projectPath,sessions:[],totalCostUSD:2,totalApiCalls:1,totalProxiedCostUSD:0})
 const rows=[...mergeProjectsByCrossProviderKey([row('C:\\Work\\Vault'),row('c:/work/vault')]).values()]
 console.log('ROOT_WINDOWS_ROWS',JSON.stringify(rows))
 expect(rows.length).toBe(1);expect(rows[0].totalCostUSD).toBe(4)
})
