export function createFeedbackStore({ persistence } = {}) {
  const memory = []
  return {
    async save(event) {
      if (persistence?.save) return persistence.save(event)
      memory.push(event)
      return event
    },
    async listByUser(userId) {
      if (persistence?.listByUser) return persistence.listByUser(userId)
      return memory.filter((event) => event.userId === userId)
    },
  }
}
