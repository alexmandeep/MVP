// Debug utility to monitor localStorage changes
export const debugStorage = () => {
  console.log('🔍 Debugging localStorage...')
  
  // Log all localStorage keys
  console.log('📦 Current localStorage keys:', Object.keys(localStorage))
  
  // Log all localStorage entries
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      console.log(`📝 ${key}:`, localStorage.getItem(key)?.substring(0, 100) + '...')
    }
  }
  
  // Monitor localStorage changes
  const originalSetItem = localStorage.setItem
  const originalRemoveItem = localStorage.removeItem
  const originalClear = localStorage.clear
  
  localStorage.setItem = function(key, value) {
    console.log('📝 localStorage.setItem:', key, value.substring(0, 50) + '...')
    return originalSetItem.call(this, key, value)
  }
  
  localStorage.removeItem = function(key) {
    console.log('🗑️ localStorage.removeItem:', key)
    if (key.includes('auth-token')) {
      console.trace('🔍 Stack trace for auth token removal:')
    }
    return originalRemoveItem.call(this, key)
  }
  
  localStorage.clear = function() {
    console.log('💥 localStorage.clear() called!')
    console.trace('Clear called from:')
    return originalClear.call(this)
  }
}