import * as readline from 'readline'

import { askWithRAG } from '../rag/rag-chain.js'
import { Conversation } from './conversation.js'
import { DOCUMENTATION_ASSISTANT_PROMPT } from '../llm/prompts.js'
import { generateEmbeddings } from '../rag/embeddings.js'
import { processDirectory } from '../rag/chunker.js'
import { resetStore, retrieveContent } from '../rag/retriever.js'
import { TOOL_DEFINITIONS } from '../tools/definitions.js'
import { VectorStore } from '../rag/vector.js'
import config from '../config.js'

async function ingestDocs(docsPath: string): Promise<void> {
  console.log(`\nIniciando ingestión desde: ${docsPath}`)
  const chunks = await processDirectory(docsPath)
  if (chunks.length === 0) {
    console.log('No se encontraron archivos .md en ese directorio.')
    return
  }

  console.log(`Generando embeddings para ${chunks.length} chunks...`)
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content))
  const store = new VectorStore(config.dbPath)
  store.clear()

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = embeddings[i]
    if (chunk && embedding) store.insert(chunk, embedding)
  }

  console.log(`${store.size} chunks almacenados en ${config.dbPath}`)
  store.close()

  // Reiniciar el singleton
  resetStore()
  console.log('Vector store actualizado — listo para búsquedas\n')
}

export async function startCLI(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const conversation = new Conversation(DOCUMENTATION_ASSISTANT_PROMPT)
  console.log('╔════════════════════════════════════════╗')
  console.log('║         DevAssistant v0.3              ║')
  console.log('║   Asistente de Documentación RAG       ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')
  console.log('💬 Escribe tu pregunta y presiona Enter.')
  console.log('💡 Tip: usa /ingest para cargar documentación')
  console.log('   Comandos: /ingest [path], /clear, /stats, /tools, /exit')
  console.log('')
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

      if (userInput === '/tools') {
        console.log(`\nTools disponibles (${TOOL_DEFINITIONS.length}):`)
        for (const tool of TOOL_DEFINITIONS) {
          const params = Object.keys(tool.input_schema.properties).join(', ')
          console.log(`   • ${tool.name}(${params})`)
          console.log(`     ${tool.description.split('.')[0]}.`)
        }
        console.log('')
        promptUser()
        return
      }

      if (userInput.startsWith('/ingest')) {
        const inputParts = userInput.split(' ')
        const docsDirectory = inputParts[1] ?? config.docsPath
        try {
          await ingestDocs(docsDirectory)
        } catch (error) {
          const err = error as Error
          console.error(`\nError durante la ingestión: ${err.message}`)
        }
        console.log('')
        promptUser()
        return
      }

      try {
        conversation.addUserMessage(userInput)
        const chunks = await retrieveContent(userInput)
        if (chunks.length === 0) {
          const message = 'No hay documentación disponible en el Vector Store\n' + 'Usa el comando /ingest'
          console.log(message)
        }
        const response = await askWithRAG(userInput, (outputChunk) => {
          process.stdout.write(outputChunk)
        })
        process.stdout.write(`\nClaude: ${response}\n\n`)
        conversation.addAssistantMessage(response)
      } catch (error) {
        const err = error as Error
        console.error('Error', err.message)
      }
      promptUser()
    })
  }
  promptUser()
}
