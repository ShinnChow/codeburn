import {describe,it,expect} from 'vitest'
import {mergeProjectsByCrossProviderKey} from '../src/parser.js'
import type {ProjectSummary} from '../src/types.js'
function summary(projectPath:string,cost:number,savings=0):ProjectSummary {
  return {project:projectPath.split('/').pop()!,projectPath,sessions:[],totalCostUSD:cost,totalSavingsUSD:savings,totalApiCalls:1,totalProxiedCostUSD:0}
}
describe('root identity and adjacent additive values',()=>{
 it('preserves distinct case-sensitive absolute roots before payload allocation',()=>{
  const rows=[...mergeProjectsByCrossProviderKey([summary('/a/Vault',2),summary('/a/vault',3)]).values()]
  expect(rows.map(r=>r.projectPath).sort()).toEqual(['/a/Vault','/a/vault'])
  expect(rows.map(r=>r.totalCostUSD).sort()).toEqual([2,3])
 })
 it('keeps a lossy lowercase alias unallocated when it matches two absolute roots',()=>{
  const rows=[...mergeProjectsByCrossProviderKey([summary('/a/Vault',2),summary('/a/vault',3),summary('a-vault',7)]).values()]
  expect(rows.length).toBe(3)
  expect(rows.map(r=>r.totalCostUSD).sort((a,b)=>a-b)).toEqual([2,3,7])
 })
 it('preserves additive savings when the same actual root is grouped',()=>{
  const rows=[...mergeProjectsByCrossProviderKey([summary('/repos/shared',10,30),summary('/repos/shared',5,2)]).values()]
  expect(rows.length).toBe(1)
  expect(rows[0].totalCostUSD).toBe(15)
  expect(rows[0].totalSavingsUSD).toBe(32)
 })
})
