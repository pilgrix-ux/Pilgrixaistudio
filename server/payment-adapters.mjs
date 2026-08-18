export function createPaymentProviderRegistry({ providers = {} } = {}) {
  return Object.freeze({
    get(name) {
      const provider = providers[name]
      if (!provider) throw new Error(`Payment provider not configured: ${name}`)
      if (typeof provider.createCheckout !== 'function' || typeof provider.verifyTransaction !== 'function') {
        throw new Error(`Payment provider ${name} must implement createCheckout and verifyTransaction`)
      }
      return provider
    },
  })
}

/**
 * Provider adapters are intentionally empty until credentials are supplied.
 * Production adapters must verify webhooks server-side and then call the provider
 * API before Pilgrix grants subscription value.
 */
export const PAYMENT_PROVIDER_NAMES = Object.freeze(['paystack', 'stripe'])
