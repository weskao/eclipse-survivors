import test from 'node:test'
import assert from 'node:assert/strict'
import { cancelStaleRuns } from './cancel-stale-ci.mjs'

const repo = 'weskao/eclipse-survivors', branch = 'feature/test', sha = 'new'
const run = (id, overrides = {}) => ({ id, head_branch: branch, head_sha: 'old', head_repository: { full_name: repo }, status: 'queued', event: 'push', path: '.github/workflows/test.yml', ...overrides })
const config = { repo, branch, sha, runId: 1 }
test('cancels old queued and running workflows across workflow names, never current or other refs', async () => {
  const cancelled = []
  const runs = [
    run(2), run(3, { status: 'in_progress', path: '.github/workflows/video.yml' }),
    run(4, { status: 'pending' }), run(5, { head_sha: sha }),
    run(6, { head_branch: 'feature/other' }), run(7, { status: 'completed' }),
    run(8, { head_repository: { full_name: 'fork/eclipse-survivors' } }),
    run(9, { path: '.github/workflows/release.yml' }),
    run(10, { event: 'pull_request' }), run(1), run(11, { event: 'workflow_dispatch' }),
    run(12, { status: 'waiting' }), run(13, { status: 'requested' }), run(2),
  ]
  await cancelStaleRuns(config, { getHead: async () => sha, listRuns: async () => runs, cancel: async id => cancelled.push(id) })
  assert.deepEqual(cancelled, [2, 3, 4, 11, 12, 13])
})
test('an obsolete sweeper cannot cancel newer work', async () => {
  const cancelled = []
  await cancelStaleRuns(config, { getHead: async () => 'newer', listRuns: async () => [run(2)], cancel: async id => cancelled.push(id) })
  assert.deepEqual(cancelled, [])
})
test('stops cancelling when branch advances during sweep', async () => {
  let checks = 0
  const cancelled = []
  await cancelStaleRuns(config, { getHead: async () => ++checks <= 2 ? sha : 'newer', listRuns: async () => [run(2), run(3)], cancel: async id => cancelled.push(id) })
  assert.deepEqual(cancelled, [2])
})
