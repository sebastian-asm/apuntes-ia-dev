import config from './config.js'

function main(): void {
  console.log('╔════════════════════════════════════════╗')
  console.log('║        DevAssistant - Curso IA         ║')
  console.log('╚════════════════════════════════════════╝')
  console.log('')
  console.log('✅ DevAssistant configurado correctamente')
  console.log('')
  console.log('📋 Configuración activa:')
  console.log(`   • Provider:         ${config.provider}`)
  console.log(`   • Modelo Anthropic: ${config.anthropicModel}`)
  console.log(`   • Modelo OpenAI:    ${config.openaiModel}`)
  console.log(`   • Docs path:        ${config.docsPath}`)
  console.log(`   • RAG top-K:        ${config.ragTopK}`)
  console.log('')
  console.log('🚀 Próximo paso: Sección 3 — Primera llamada a Claude API')
}

main()
