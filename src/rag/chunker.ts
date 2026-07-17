import fs from 'node:fs/promises'
import path from 'node:path'

import type { Chunk } from '../types.js'

const MAX_CHUNK_SIZE = 2_000

export function chunkMarkdown(content: string, filePath: string): Chunk[] {
  const fileName = path.basename(filePath)
  const chunks: Chunk[] = []
  const sections = content.split(/(?=^## )/m)
  let globalPosition = 0
  let lastParagraph = ''

  for (const section of sections) {
    if (!section.trim()) continue
    const lines = section.split('\n')
    const firtLine = lines[0] ?? ''
    const isHeading = firtLine?.startsWith('## ')
    const heading = isHeading ? firtLine?.trim() : '(Introducción)'

    if (section.length <= MAX_CHUNK_SIZE) {
      const chunkContent = lastParagraph ? `${lastParagraph}\n\n${section.trim()}` : section.trim()
      chunks.push({
        id: `${fileName}-${globalPosition}`,
        content: chunkContent,
        metadata: {
          source: fileName,
          heading,
          position: globalPosition,
          charCount: chunkContent.length
        }
      })

      const paragraphs = section.trim().split(/\n\n/)
      lastParagraph = paragraphs.at(-1) ?? ''
      globalPosition++
      continue
    }

    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim().length > 0)
    let currentChunk = lastParagraph ? `${lastParagraph}\n\n` : ''

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i] ?? ''
      if (currentChunk.length > 0 && currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
        const chunkContent = isHeading ? `${heading}\n\n${currentChunk.trim()}` : currentChunk.trim()
        chunks.push({
          id: `${fileName}-${globalPosition}`,
          content: chunkContent,
          metadata: {
            source: fileName,
            heading,
            position: globalPosition,
            charCount: chunkContent.length
          }
        })

        const chunkParagraphs = currentChunk.trim().split(/\n\n/)
        lastParagraph = chunkParagraphs.at(-1) ?? ''
        currentChunk = `${lastParagraph}\n\n`
        globalPosition++
      }

      currentChunk += paragraph + '\n\n'
    }

    if (currentChunk.trim().length > 0) {
      const chunkContent = isHeading ? `${heading}\n\n${currentChunk.trim()}` : currentChunk.trim()
      chunks.push({
        id: `${fileName}-${globalPosition}`,
        content: chunkContent,
        metadata: {
          source: fileName,
          heading,
          position: globalPosition,
          charCount: chunkContent.length
        }
      })

      const finalParagraphs = currentChunk.trim().split(/\n\n/)
      lastParagraph = finalParagraphs.at(-1) ?? ''
      globalPosition++
    }
  }

  return chunks
}

export async function processDirectory(dirPath: string): Promise<Chunk[]> {
  const allChunks: Chunk[] = []
  let entries

  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    throw new Error(`No se pudo leer el directorio: ${dirPath}`)
  }

  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const file of markdownFiles) {
    const fullPath = path.join(dirPath, file.name)
    let content: string

    try {
      content = await fs.readFile(fullPath, 'utf-8')
    } catch {
      console.warn(`No se pudo leer el archiv: ${file.name}`)
      // en caso de haber un problema con el archivo
      // lo salta (no continua con el resto del códgio) y pasa al siguiente archivo
      continue
    }

    const chunks = chunkMarkdown(content, file.name)
    allChunks.push(...chunks)
    console.log(`Procesando ${file.name}... ${chunks.length} chunks generados`)
  }

  return allChunks
}
