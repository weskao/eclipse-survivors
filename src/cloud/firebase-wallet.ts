import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getFirestore, runTransaction } from 'firebase/firestore'
import { validWallet, walletPlan, type CloudWallet } from './wallet-policy'
import { cloudRuntime } from './cloud-runtime'

export type { User }
export function createCloudClient(raw: string) {
  const runtime = cloudRuntime()
  if (runtime.mode === 'unavailable' || raw !== runtime.config) throw Error('Cloud runtime unavailable')
  const config = JSON.parse(raw) as FirebaseOptions
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId || config.projectId === 'skyline-rush-weskao')
    throw Error('Missing or incorrect Eclipse Survivors Firebase configuration')
  const app = getApps().find(item => item.name === 'eclipse-survivors') ?? initializeApp(config, 'eclipse-survivors')
  const auth = getAuth(app), db = getFirestore(app)
  if (runtime.mode === 'emulator') {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true })
      connectFirestoreEmulator(db, '127.0.0.1', 8180)
    }
  }
  return {
    watch: (listener: (user: User | null) => void, error: () => void) => onAuthStateChanged(auth, listener, error),
    login: () => signInWithPopup(auth, new GoogleAuthProvider()),
    logout: () => signOut(auth),
    async sync(uid: string, baseline: CloudWallet | null, local: number, restoreOnly = false) {
      if (runtime.mode === 'auth-only') throw Error('Unlocked phone saves never sync to live Firestore')
      if (auth.currentUser?.uid !== uid || !Number.isSafeInteger(local) || local < 0) throw Error('Invalid wallet session')
      const ref = doc(db, 'twilightEmbers', uid)
      return runTransaction(db, async transaction => {
        if (auth.currentUser?.uid !== uid) throw Error('Account changed')
        const snapshot = await transaction.get(ref)
        const remote: unknown = snapshot.exists() ? snapshot.data() : { revision: 0, embers: 0 }
        if (!validWallet(remote)) throw Error('Invalid cloud wallet')
        const kind = restoreOnly ? 'restore' : walletPlan(baseline, local, remote)
        // A first authenticated zero balance still gets a durable owner-only document.
        if (!snapshot.exists() && !baseline && local === 0 && kind === 'restore') {
          const wallet = { embers: runtime.projectId === 'demo-eclipse-survivors-unlocked' ? 100_000 : 0, revision: 1 }
          transaction.set(ref, wallet)
          return { kind: 'restore' as const, wallet }
        }
        if (kind !== 'upload') return { kind, wallet: remote }
        if (remote.revision >= Number.MAX_SAFE_INTEGER || auth.currentUser?.uid !== uid) throw Error('Invalid revision or account changed')
        const wallet = { revision: remote.revision + 1, embers: local }
        transaction.set(ref, wallet)
        return { kind, wallet }
      })
    },
  }
}
