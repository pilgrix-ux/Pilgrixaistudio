const getConfig = () => ({
  url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
})

const rpc = async (name, args) => {
  const { url, key } = getConfig()
  if (!url || !key) throw new Error('Persistent security state requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!response.ok) throw new Error(`Supabase security-state RPC failed: ${response.status}`)
  return response.status === 204 ? null : response.json().catch(() => null)
}

export const createPersistentSecurityStore = () => ({
  async get(key) {
    const row = await rpc('server_security_state_get', { p_state_key: key })
    if (!row) return undefined
    return row.state_value
  },
  async set(key, value, expiresAt = null) {
    await rpc('server_security_state_upsert', { p_state_key: key, p_state_value: value, p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null })
    return value
  },
  async delete(key) {
    await rpc('server_security_state_delete', { p_state_key: key })
    return true
  },
})

export const isPersistentSecurityStateConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
