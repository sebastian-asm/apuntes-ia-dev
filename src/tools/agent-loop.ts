import Anthropic from '@anthropic-ai/sdk'

import type { ToolDefinition } from '../types.js'
import config from '../config.js'
import { TOOL_DEFINITIONS } from './definitions.js'
import { executeTool } from './executor.js'
import { client } from '../llm/anthropic-client.js'

const MAX_ITERATIONS = 10

export async function runWithTool(prompt: string, systemPrompt?: string, tools?: ToolDefinition[]): Promise<string> {
  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: prompt }]
  const sdkTools = (tools ?? TOOL_DEFINITIONS) as Anthropic.Messages.Tool[]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n💭 Pensando... (iteration ${i + 1})`)
    const response = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 4096,
      tools: sdkTools,
      messages,
      ...(systemPrompt && { system: systemPrompt })
    })

    if (response.stop_reason === 'end_turn') {
      const finalText = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
      console.log('✍️ Respuesta final generada')
      return finalText
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content })
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      )
      const results = await Promise.all(
        toolUseBlocks.map(async (block) => {
          console.log(`\n🛠️ Ejecutando herramienta: ${block.name} (${JSON.stringify(block.input)})`)
          const toolOutput = await executeTool(block.name, block.input as Record<string, unknown>)
          console.log(`✅ Herramienta completada: ${block.name}`)
          return toolOutput
        })
      )

      const toolResultContent: Anthropic.Messages.ToolResultBlockParam[] = toolUseBlocks.map((block, i) => ({
        type: 'tool_result' as const,
        tool_use_id: block.id,
        content: results[i] ?? 'Error: Resultado vacío'
      }))

      messages.push({ role: 'user', content: toolResultContent })
      continue
    }

    console.warn(`Stop reason desconocido: ${response.stop_reason} ?? 'Sin información'`)
    const consolidateMessageText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
    return consolidateMessageText || `Sesión finalizada: ${response.stop_reason ?? 'Razón desconocida'}`
  }

  console.warn(`Se alcanzó el número máximo de iteraciones: ${MAX_ITERATIONS}`)
  return `
    No se pudo completar la tarea en ${MAX_ITERATIONS} iteraciones.
    Por favor, intente nuevamente con un prompt más conciso o simplificado.
  `
}
