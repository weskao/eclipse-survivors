import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const active = ['queued', 'in_progress', 'pending', 'waiting', 'requested']

// Match only old branch CI, not sibling workflows for the current commit,
// forks/PR merge refs, completed runs, or a release/deployment in progress.
export async function cancelStaleRuns({ repo, branch, sha, runId }, { getHead, listRuns, cancel }) {
  if (await getHead() !== sha) return []
  const cancelled = new Set()
  for (const run of await listRuns()) {
    if (run.id === runId || cancelled.has(run.id) || run.head_sha === sha ||
        run.head_branch !== branch || run.head_repository?.full_name !== repo ||
        !active.includes(run.status) || !['push', 'workflow_dispatch'].includes(run.event) ||
        run.path?.split('@')[0] === '.github/workflows/release.yml') continue
    // A delayed/obsolete sweep must not cancel any newer branch work.
    if (await getHead() !== sha) break
    await cancel(run.id)
    cancelled.add(run.id)
  }
  return [...cancelled]
}

async function main() {
  const { GITHUB_REPOSITORY: repo, GITHUB_REF: ref, GITHUB_REF_NAME: branch,
    GITHUB_SHA: sha, GITHUB_RUN_ID: id } = process.env
  if (!ref?.startsWith('refs/heads/') || !repo || !branch || !sha || !id) return
  const api = (...args) => execFileSync('gh', ['api', ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  })
  const root = 'repos/' + repo
  const getHead = () => JSON.parse(api(root + '/git/ref/heads/' + branch.split('/').map(encodeURIComponent).join('/'))).object.sha
  const listRuns = () => active.flatMap(status => JSON.parse(api(root + '/actions/runs',
    '--method', 'GET', '-f', 'branch=' + branch, '-f', 'status=' + status,
    '-f', 'per_page=100', '--paginate', '--slurp')).flatMap(page => page.workflow_runs))
  const cancel = runId => {
    try {
      api(root + '/actions/runs/' + runId + '/cancel', '--method', 'POST')
      console.log('Cancellation requested for stale run ' + runId)
    } catch (error) {
      // A run can complete between listing and cancelling. Ignore only that race.
      if (JSON.parse(api(root + '/actions/runs/' + runId)).status !== 'completed') throw error
    }
  }
  const cancelled = await cancelStaleRuns({ repo, branch, sha, runId: Number(id) }, { getHead, listRuns, cancel })
  console.log('Handled ' + cancelled.length + ' stale CI runs on ' + branch)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
