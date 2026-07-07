import fs from 'node:fs/promises'
import path from 'node:path'

const PROJECT_ROOT = process.cwd()
const MAX_FILE_SIZE = 50_000
const MAX_SEARCH_RESULTS = 20
const CONTEXT_LINES = 2

function resolveSecurePath(targetPath: string): string | null {
  const absolutePath = path.resolve(PROJECT_ROOT, targetPath)
  const projectWithSep = PROJECT_ROOT + path.sep
  if (!absolutePath.startsWith(projectWithSep) && absolutePath !== PROJECT_ROOT) return null
  return absolutePath
}

async function collectFiles(dirPath: string, extension?: string): Promise<string[]> {
  const result: string[] = []
  let entries

  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    return result
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, extension)
      result.push(...subFiles)
    } else if (entry.isFile()) {
      if (!extension || entry.name.endsWith(extension)) {
        result.push(fullPath)
      }
    }
  }
  return result
}

async function executeListFiles(params: { path: string; extension?: string }): Promise<string> {
  const securePath = resolveSecurePath(params.path)
  if (!securePath) return `Error: la ruta ${params.path} intenta acceder fuera del proyecto`

  try {
    const stat = await fs.stat(securePath)
    if (!stat.isDirectory()) return `La ruta ${params.path} no es un directorio`
  } catch {
    return `Error: el directorio ${params.path} no existe`
  }

  const files = await collectFiles(securePath, params.extension)
  if (files.length === 0) {
    const filterFile = params.extension ? `con extensión ${params.extension}` : ''
    return `No se encontraron archivos ${filterFile} en ${params.path}`
  }

  const relativeFiles = files.map((file) => path.relative(PROJECT_ROOT, file))
  return relativeFiles.join('\n')
}

async function executeReadFile(params: { filePath: string }): Promise<string> {
  const securePath = resolveSecurePath(params.filePath)
  if (!securePath) return `Error: el archivo ${params.filePath} intenta acceder fuera del proyecto`

  try {
    const stat = await fs.stat(securePath)
    if (!stat.isFile()) return `La ruta ${params.filePath} no es un archivo`
    if (stat.size > MAX_FILE_SIZE)
      return `El archivo ${params.filePath} excede el tamaño máximo permitido de ${MAX_FILE_SIZE} bytes`

    const content = await fs.readFile(securePath, 'utf-8')
    if (content.length > MAX_FILE_SIZE) return content.slice(0, MAX_FILE_SIZE) + `\n\n (Archivo truncado)`
    return content
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return `Error: el archivo ${params.filePath} no existe`
    return `Error: no se pudo acceder al archivo ${params.filePath}`
  }
}

async function executeSearchCode(params: { pattern: string; path?: string; fileExtension?: string }): Promise<string> {
  const searchPath = params.path ?? ''
  const securePath = resolveSecurePath(searchPath)
  if (!securePath) return `Error: la ruta ${searchPath} intenta acceder fuera del proyecto`
  const files = await collectFiles(securePath, params.fileExtension)
  const results: string[] = []
  let totalMatches = 0

  for (const file of files) {
    if (totalMatches >= MAX_SEARCH_RESULTS) break
    let content: string

    try {
      content = await fs.readFile(file, 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')
    const relativePath = path.relative(PROJECT_ROOT, file)

    for (let i = 0; i < lines.length; i++) {
      if (totalMatches >= MAX_SEARCH_RESULTS) break
      const line = lines[i] ?? ''
      if (!line.includes(params.pattern)) continue
      totalMatches++

      const contextBlock: string[] = []
      const startLine = Math.max(0, i - CONTEXT_LINES)
      const endLine = Math.min(lines.length - 1, i + CONTEXT_LINES)

      for (let j = startLine; j <= endLine; j++) {
        const contextLine = lines[j] ?? ''
        const lineNumber = j + 1
        const prefix = j === i ? '>' : ' '
        contextBlock.push(`${prefix} ${relativePath}: ${lineNumber}: ${contextLine}`)
      }
      results.push(contextBlock.join('\n'))
    }
  }

  if (results.length === 0) return `No se encontraron coincidencias para el patrón "${params.pattern}"`
  const header =
    totalMatches >= MAX_SEARCH_RESULTS ? `Coincidencias: ${MAX_SEARCH_RESULTS}` : `Coincidencias: ${MAX_SEARCH_RESULTS}`
  return header + results.join('\n\n')
}

export async function executeTool(name: string, params: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'list_files': {
      const p = params as { path: string; extension?: string }
      if (typeof p.path !== 'string') return 'Se requiere un parámetro "path" de tipo string'
      return await executeListFiles({
        path: p.path,
        extension: typeof p.extension === 'string' ? p.extension : undefined
      })
    }

    case 'read_file': {
      const p = params as { filePath: string }
      if (typeof p.filePath !== 'string') return 'Se requiere un parámetro "filePath" de tipo string'
      return await executeReadFile({ filePath: p.filePath })
    }

    case 'search_code': {
      const p = params as { pattern: unknown; path?: unknown; fileExtension?: unknown }
      if (typeof p.pattern !== 'string') return 'Se requiere un parámetro "pattern" de tipo string'
      return await executeSearchCode({
        pattern: p.pattern,
        path: typeof p.path === 'string' ? p.path : undefined,
        fileExtension: typeof p.fileExtension === 'string' ? p.fileExtension : undefined
      })
    }

    default:
      return `Error: tool "${name}" desconocida`
  }
}
