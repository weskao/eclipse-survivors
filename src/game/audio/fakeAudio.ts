// Test-only fake AudioContext: records every node the engine creates. Not imported by game code.
import type { AudioContextLike } from './engine'

export class FakeParam {
  value = 0
  readonly calls: Array<{ fn: string; args: number[] }> = []
  setValueAtTime(v: number, t: number): void { this.calls.push({ fn: 'setValueAtTime', args: [v, t] }) }
  exponentialRampToValueAtTime(v: number, t: number): void { this.calls.push({ fn: 'exponentialRampToValueAtTime', args: [v, t] }) }
  setTargetAtTime(v: number, t: number, c: number): void { this.calls.push({ fn: 'setTargetAtTime', args: [v, t, c] }) }
}

export class FakeNode {
  readonly targets: object[] = []
  connect(dest: object): void { this.targets.push(dest) }
}

export class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine'
  readonly frequency = new FakeParam()
  startedAt: number | null = null
  stoppedAt: number | null = null
  start(t: number): void { this.startedAt = t }
  stop(t: number): void { this.stoppedAt = t }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam()
}

export class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass'
  readonly frequency = new FakeParam()
}

export class FakeBuffer {
  readonly data: Float32Array
  constructor(readonly length: number, readonly sampleRate: number) { this.data = new Float32Array(length) }
  get duration(): number { return this.length / this.sampleRate }
  getChannelData(_channel: number): Float32Array { return this.data }
}

export class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null
  loop = false
  offset = 0
  startedAt: number | null = null
  stoppedAt: number | null = null
  start(t: number, offset = 0): void { this.startedAt = t; this.offset = offset }
  stop(t: number): void { this.stoppedAt = t }
}

export class FakeAudioContext implements AudioContextLike {
  currentTime = 0
  state: AudioContextState = 'running'
  sampleRate = 48000
  readonly destination = {}
  readonly oscillators: FakeOscillator[] = []
  readonly gains: FakeGain[] = []
  readonly sources: FakeBufferSource[] = []
  readonly buffers: FakeBuffer[] = []
  suspendCalls = 0
  suspend(): Promise<void> { this.suspendCalls++; this.state = 'suspended'; return Promise.resolve() }
  readonly filters: FakeFilter[] = []
  resumeCalls = 0
  resume(): Promise<void> {
    this.resumeCalls++
    this.state = 'running'
    return Promise.resolve()
  }
  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }
  createOscillator(): FakeOscillator { const n = new FakeOscillator(); this.oscillators.push(n); return n }
  createGain(): FakeGain { const n = new FakeGain(); this.gains.push(n); return n }
  createBuffer(_channels: number, length: number, sampleRate: number): FakeBuffer { const b = new FakeBuffer(length, sampleRate); this.buffers.push(b); return b }
  createBufferSource(): FakeBufferSource { const n = new FakeBufferSource(); this.sources.push(n); return n }
  createBiquadFilter(): FakeFilter { const n = new FakeFilter(); this.filters.push(n); return n }
}
