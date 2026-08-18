const PAYMENT_STATUSES = new Set(['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed', 'reversed'])

export function normalizePayment(input) {
  if (!input?.provider || !input?.providerTransactionId || !input?.reference) throw new Error('provider, providerTransactionId and reference are required')
  if (!PAYMENT_STATUSES.has(input.status)) throw new Error('Invalid payment status')
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('amountMinor must be a positive integer')
  if (!input.currency) throw new Error('currency is required')
  return {
    id: input.id || crypto.randomUUID(),
    provider: input.provider,
    providerTransactionId: String(input.providerTransactionId),
    reference: String(input.reference),
    customerId: input.customerId || null,
    invoiceId: input.invoiceId || null,
    amountMinor: input.amountMinor,
    currency: String(input.currency).toUpperCase(),
    method: input.method || 'unknown',
    status: input.status,
    receivedAt: input.receivedAt || null,
    verifiedAt: input.verifiedAt || null,
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function shouldApplyWebhook({ eventId, seenEventIds }) {
  if (!eventId) throw new Error('eventId is required')
  return !seenEventIds.has(String(eventId))
}

export function verifyPaymentMatch({ expected, verified }) {
  if (!expected || !verified) return { ok: false, reason: 'missing_verification' }
  if (expected.reference !== verified.reference) return { ok: false, reason: 'reference_mismatch' }
  if (expected.amountMinor !== verified.amountMinor) return { ok: false, reason: 'amount_mismatch' }
  if (expected.currency.toUpperCase() !== verified.currency.toUpperCase()) return { ok: false, reason: 'currency_mismatch' }
  if (verified.status !== 'paid') return { ok: false, reason: 'payment_not_paid' }
  return { ok: true }
}

export { PAYMENT_STATUSES }
