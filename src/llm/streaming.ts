import { client } from './anthropic-client.js'
import config from '../config.js'

export async function streamClaude(prompt: string, systemPrompt?: string): Promise<string> {
  let fullResponse = ''
  const responseStream = client.messages.stream({
    model: config.anthropicModel,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    ...(systemPrompt && { system: systemPrompt })
  })

  responseStream.on('text', (chunk) => {
    process.stdout.write(chunk)
    fullResponse += chunk
  })

  await responseStream.finalMessage()
  process.stdout.write('\n')
  return fullResponse
}
