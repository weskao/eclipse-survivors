import test from 'node:test'
import assert from 'node:assert/strict'
import { heroVideoCaptureConfig } from './es2-hero-video-config.mjs'

test('production gameplay recording never enables pending hero art', () => {
  const config = heroVideoCaptureConfig('http://127.0.0.1:4173/?foo=bar', false)
  assert.equal(config.url, 'http://127.0.0.1:4173/?foo=bar')
  assert.equal(config.output, 'artifacts/es2-hero-video')
  assert.equal(config.status, 'production')
})

test('candidate gameplay recording enables only the existing development QA switch', () => {
  const config = heroVideoCaptureConfig('http://127.0.0.1:4174/?foo=bar', true)
  const url = new URL(config.url)
  assert.equal(url.searchParams.get('es2HeroArtQA'), '1')
  assert.equal(url.searchParams.get('foo'), 'bar')
  assert.equal(config.output, 'artifacts/es2-hero-video/candidate-qa')
  assert.equal(config.status, 'QA_PENDING')
})
