import * as readline from 'readline'

import { client } from '../llm/anthropic-client.js'
import { Conversation } from './conversation.js'
import { DOCUMENTATION_ASSISTANT_PROMPT } from '../llm/prompts.js'
import config from '../config.js'

export async function startCLI(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const conversation = new Conversation(DOCUMENTATION_ASSISTANT_PROMPT)
  console.log('╔════════════════════════════════════════╗')
  console.log('║          DevAssistant v0.1             ║')
  console.log('║    Asistente de Documentación IA       ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')
  console.log('💬 Escribe tu pregunta y presiona Enter.')
  console.log('Comandos: /clear, /stats, /exit')
  console.log('')

  const promptUser = (): void => {
    rl.question('👉 ', async (input) => {
      const userInput = input.trim()
      if (!userInput) {
        promptUser()
        return
      }

      if (userInput === '/stats') {
        const stats = conversation.getStats()
        console.log(`\n📊 Estadísticas de la conversación:`)
        console.log(`🔸 Turnos: ${stats.turns}`)
        console.log(`🔸 Tokens de entrada acumulados: ${stats.inputTokens}`)
        console.log(`🔸 Tokens de salida acumulados: ${stats.outputTokens}`)
        console.log(`🔸 Tokens estimados del contexto actual: ${conversation.estimateCurrentTokens()}\n`)
        promptUser()
        return
      }

      if (userInput === '/exit') {
        const stats = conversation.getStats()
        console.log(`\n📝 Resumen:`)
        console.log(`🔸 ${stats.turns} turno${stats.turns > 1 ? 's' : ''}`)
        console.log(`🔸 ${stats.inputTokens} tokens de entrada`)
        console.log(`🔸 ${stats.outputTokens} tokens de salida`)
        rl.close()
        return
      }

      if (userInput === '/clear') {
        conversation.clear()
        console.log('🧹 ¡Conversación reiniciada!\n')
        promptUser()
        return
      }

      try {
        conversation.addUserMessage(userInput)
        process.stdout.write('🤖 Claude está escribiendo... \n')
        let fullMessage = ''
        const record = conversation.getHistory()
        const stream = client.messages.stream({
          model: config.anthropicModel,
          max_tokens: 1024,
          system: DOCUMENTATION_ASSISTANT_PROMPT,
          messages: record
        })

        stream.on('text', (chunk) => {
          process.stdout.write(chunk)
          fullMessage += chunk
        })

        const finalMessage = await stream.finalMessage()
        conversation.addUsage(finalMessage.usage.input_tokens, finalMessage.usage.output_tokens)
        process.stdout.write('\n')
        conversation.addAssistantMessage(fullMessage)
      } catch (error) {
        const err = error as Error
        console.error('Error', err.message)
      }
      promptUser()
    })
  }
  promptUser()
}
