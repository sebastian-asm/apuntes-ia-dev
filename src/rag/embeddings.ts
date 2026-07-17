import OpenAI from 'openai'

import config from '../config.js'

const openiaClient = new OpenAI({ apiKey: config.openaiApiKey })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openiaClient.embeddings.create({
    model: config.openaiEmbeddingModel,
    input: text
  })
  const embedding = response.data[0]?.embedding ?? []
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openiaClient.embeddings.create({
    model: config.openaiEmbeddingModel,
    input: texts
  })
  return response.data.map((item) => item.embedding)
}
