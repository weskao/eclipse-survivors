// Public Firebase web config: it ships in the JS bundle anyway; firestore.rules and the API key's
// referrer/API restrictions are what protect the data.
export const ECLIPSE_SURVIVORS_FIREBASE = JSON.stringify({
  apiKey: 'AIzaSyC0zGHwlN9Ip8VEAw5tjoVV-A6qhTfY3gs',
  authDomain: 'eclipse-survivors-weskao.firebaseapp.com',
  projectId: 'eclipse-survivors-weskao',
  appId: '1:299260462374:web:471e7e0682a58c6cde6de7',
})

type Env = { MODE: string, VITE_ES2_FIREBASE_CONFIG?: string }
// `||` so an unset CI variable (empty string) still falls back; unit tests never reach the real project.
export const firebaseConfig = (env: Env = import.meta.env): string | undefined =>
  env.VITE_ES2_FIREBASE_CONFIG || (env.MODE === 'test' ? undefined : ECLIPSE_SURVIVORS_FIREBASE)
