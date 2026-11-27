/** Guest saves retain their original keys. Google accounts never read or overwrite guest saves. */
export function accountStorage(storage: Storage, uid: string, namespace = 'account'): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const prefix = 'eclipse-survivors.' + namespace + '.' + encodeURIComponent(uid) + ':'
  return {
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  }
}
