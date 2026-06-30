import { loadEnvFile } from 'node:process'

import { AppConfig } from './types.js'

loadEnvFile()

function getRequiredEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue
  if (value === undefined) throw new Error(`La variable de entorno '${name}' no está definida`)
  return value
}

function validateProvider(provider: string): 'openai' | 'anthropic' {
  if (provider !== 'openai' && provider !== 'anthropic') {
    throw new Error(`El proveedor '${provider}' no es válido`)
  }
  return provider
}

const rawProvider = process.env['MODEL_PROVIDER'] ?? 'anthropic'

export const config: AppConfig = {
  provider: validateProvider(rawProvider),
  anthropicApiKey: getRequiredEnvVar('ANTHROPIC_API_KEY', ''),
  openaiApiKey: getRequiredEnvVar('OPENAI_API_KEY', ''),
  anthropicModel: getRequiredEnvVar('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
  openaiModel: getRequiredEnvVar('OPENAI_MODEL', 'gpt-4o-mini'),
  openaiEmbeddingModel: getRequiredEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
  docsPath: getRequiredEnvVar('DOCS_PATH', './docs/sample-project'),
  dbPath: getRequiredEnvVar('DB_PATH', './data/vectors.db'),
  ragTopK: parseInt(getRequiredEnvVar('RAG_TOP_K', '5'), 10)
}

export function validateConfig(): void {
  if (config.provider === 'anthropic' && !config.anthropicApiKey)
    throw new Error('La API de Anthropic no está definida')
  if (config.provider === 'openai' && !config.openaiApiKey) throw new Error('La API de OpenAI no está definida')
}

export default config
