// Cache management utilities to prevent stale data issues

export const clearAuthCache = () => {
  try {
    // Clear localStorage items that might cause stale auth state
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session')
    );
    
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage as well
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('session')
    );
    
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    
    console.log('Auth cache cleared');
  } catch (error) {
    console.warn('Failed to clear auth cache:', error);
  }
};

export const detectStaleCache = (): boolean => {
  try {
    // Check if we're on a page reload
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigation?.type === 'reload';
    
    // Check for stale localStorage data
    const lastAuthCheck = localStorage.getItem('lastAuthCheck');
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    if (isReload && lastAuthCheck && parseInt(lastAuthCheck) < fiveMinutesAgo) {
      return true;
    }
    
    // Update the auth check timestamp
    localStorage.setItem('lastAuthCheck', now.toString());
    
    return false;
  } catch (error) {
    console.warn('Failed to detect stale cache:', error);
    return false;
  }
};

export const clearQueryCache = () => {
  try {
    // Force clear React Query cache on reload issues
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('query') || name.includes('supabase')) {
            caches.delete(name);
          }
        });
      });
    }
  } catch (error) {
    console.warn('Failed to clear query cache:', error);
  }
};