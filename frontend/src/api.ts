import { useCallback, useEffect, useState } from 'react'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
  } catch { throw new ApiError('Não foi possível conectar. Verifique sua conexão e tente novamente.', 0) }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (response.status === 401 && path.startsWith('/admin') && !path.includes('/auth/')) {
      window.dispatchEvent(new Event('session-expired'))
    }
    const detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? 'Confira os campos preenchidos. Há um valor inválido.' : 'Não foi possível concluir. Tente novamente.'
    throw new ApiError(detail, response.status)
  }
  return response.status === 204 ? undefined as T : response.json()
}

export const json = (method: string, data?: unknown): RequestInit => ({ method, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) })
export const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let active = true
    setLoading(true)
    api<T>(path).then(result => { if (active) { setData(result); setError('') } })
      .catch(e => { if (active) setError(message(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [path, version])
  return { data, setData, error, loading, refresh }
}
