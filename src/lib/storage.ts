/**
 * Storage utilities for local and cloud storage
 */

export const storageUtils = {
  /**
   * Save data to localStorage
   */
  setLocal(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error)
    }
  },

  /**
   * Get data from localStorage
   */
  getLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`Failed to read from localStorage: ${key}`, error)
      return null
    }
  },

  /**
   * Remove data from localStorage
   */
  removeLocal(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove from localStorage: ${key}`, error)
    }
  },

  /**
   * Clear all localStorage
   */
  clearLocal(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage', error)
    }
  },
}
