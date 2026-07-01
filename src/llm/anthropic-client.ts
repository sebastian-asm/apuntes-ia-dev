import Anthropic from '@anthropic-ai/sdk'

import config from '../config.js'

export const client = new Anthropic({ apiKey: config.anthropicApiKey })

export async function askClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
    ...(systemPrompt && { system: systemPrompt })
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('Claude no retornó una respuesta de texto')
  return textBlock.text
}
