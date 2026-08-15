// Talks to the /chat endpoint on the Node service in server/.

import serviceAPI from '../api/serviceAPI'

export async function sendChatMessage(message, context = {}, history = []) {
  try {
    const { data } = await serviceAPI.post('/chat', { message, context, history })
    return { answer: data.answer, sources: data.sources || [] }
  } catch (error) {
    const reason = error.response
      ? error.response.data?.error || 'The assistant is unavailable'
      : 'Cannot reach the assistant. Is the service running on port 8082?'

    throw new Error(reason, { cause: error })
  }
}
