import { useCallback, useState } from 'react'

/**
 * Hook for managing editor state
 */
export function useEditorState(): {
  activeProjectId: string | null
  selectedAssetId: string | null
  isLoading: boolean
  error: string | null
  setActiveProject: (projectId: string | null) => void
  setSelectedAsset: (assetId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
} {
  const [activeProjectId, setActiveProject] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAsset] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return {
    activeProjectId,
    selectedAssetId,
    isLoading,
    error,
    setActiveProject,
    setSelectedAsset,
    setLoading,
    setError,
  }
}

/**
 * Hook for handling async operations
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  immediate = true,
): {
  data: T | null
  loading: boolean
  error: Error | null
  execute: () => Promise<void>
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [fn])

  // Execute on mount if immediate is true
  if (immediate) {
    execute().catch(console.error)
  }

  return { data, loading, error, execute }
}
