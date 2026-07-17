import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { generateEmbeddings } from './embeddings.js'
import { processDirectory } from './chunker.js'
import { VectorStore } from './vector.js'
import config from '../config.js'

const PREVIEW_JSON = path.join(path.dirname(config.dbPath), 'chunks-preview.json')

export async function runIngest(docsPath: string = config.docsPath): Promise<void> {
  console.log('Iniciando la ingestión de documentos...')
  console.log(`Directorio: ${docsPath}`)
  console.log('')

  const chunks = await processDirectory(docsPath)
  const countChunks = chunks.length ?? 0
  if (countChunks === 0) console.log('No se encontraron archivos .md en el directorio')
  console.log(`Total de chunks generados: ${countChunks}`)
  console.log(`Generando embeddings para ${countChunks} chunks...`)

  const texts = chunks.map((chunk) => chunk.content)
  const embeddings = await generateEmbeddings(texts)
  const dimensions = embeddings[0]?.length ?? 0
  console.log(`Embeddings generados con ${dimensions} dimensiones cada uno`)

  const preview = chunks.map((chunk, i) => ({
    id: chunk.id,
    content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
    metadata: chunk.metadata,
    embeddingsPreview: (embeddings[i] ?? []).slice(0, 5),
    embeddingsDims: embeddings[i] ?? 0
  }))

  await fs.mkdir(path.dirname(PREVIEW_JSON), { recursive: true })
  await fs.writeFile(PREVIEW_JSON, JSON.stringify(preview, null, 2), 'utf-8')
  console.log(`Guardando en vector store SQLite: ${config.dbPath}`)

  const store = new VectorStore(config.dbPath)
  store.clear()

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = embeddings[i]
    if (chunk && embedding) store.insert(chunk, embedding)
  }

  console.log(`Vector store guardado: ${store.size} chunks en ${config.dbPath}`)
  console.log(`\nTotal: ${countChunks} chunks procesados`)
  console.log(`\nPreview en: ${PREVIEW_JSON}`)
  console.log(`\nIngestión completa, listo para la búsqueda semántica`)
}

runIngest().catch((error: Error) => console.error(`Error durante la ingestión: ${error.message}`))
