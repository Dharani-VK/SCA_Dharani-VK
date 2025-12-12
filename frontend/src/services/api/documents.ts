import { FEATURE_FLAGS, API_BASE_URL } from '../../utils/constants'
import type { CampusDocument, DocumentDetail } from '../../types/file'
import { request } from '../httpClient'



export async function ingestWikipedia(topic: string): Promise<any> {
  const resp = await request<{ status: string; title: string }>(`${API_BASE_URL}/documents/ingest/wikipedia`, {
    method: 'POST',
    body: { query: topic }
  })
  return resp
}

const mockDocuments: CampusDocument[] = [
  {
    id: 'mock-1',
    title: 'Sample Knowledge Base',
    owner: 'Demo',
    uploadedAt: new Date().toISOString(),
    tags: ['Mock', 'Docs'],
    difficulty: 'Easy',
    version: 1,
  },
]

export async function fetchDocuments(): Promise<CampusDocument[]> {
  if (FEATURE_FLAGS.useMocks) {
    return mockDocuments
  }

  const result = await request<{
    sources: {
      id: string | number;
      source: string;
      created_at?: string | null;
      latest_ingested_at?: string | null;
      chunks?: number;
      difficulty?: string;
      version?: number;
    }[]
    total_docs: number
  }>(`${API_BASE_URL}/documents`)

  return result.sources.map((entry) => ({
    id: String(entry.id),
    title: entry.source,
    owner: 'Ingested Source',
    uploadedAt: entry.created_at ?? entry.latest_ingested_at ?? new Date().toISOString(),
    tags: [
      entry.chunks ? `${entry.chunks} chunks` : '',
      entry.difficulty,
      entry.version ? `v${entry.version}` : ''
    ].filter(Boolean) as string[],
    difficulty: (entry.difficulty as any) || undefined,
    version: entry.version
  }))
}

const mockDetail: DocumentDetail = {
  source: 'mock-1',
  chunkCount: 1,
  ingestedAt: new Date().toISOString(),
  summary: 'Mock summary for local development.',
  chunks: [
    {
      id: 'mock-1-0',
      text: 'Mock document body placeholder. Upload real documents to enable contextual viewing.',
      chunkIndex: 0,
    },
  ],
}

export async function fetchDocumentDetail(sourceId: string, limit = 12): Promise<DocumentDetail> {
  if (FEATURE_FLAGS.useMocks) {
    return mockDetail
  }

  const response = await request<{
    source: string
    id?: string | number
    chunk_count: number
    ingested_at?: string | null
    summary?: string | null
    chunks: { id: string; text: string; chunk_index: number }[]
    difficulty?: string
    version?: number
    versions?: any[]
  }>(`${API_BASE_URL}/documents/${encodeURIComponent(sourceId)}?limit=${limit}`)

  return {
    source: response.source,
    chunkCount: response.chunk_count,
    ingestedAt: response.ingested_at ?? undefined,
    summary: response.summary ?? null,
    chunks: response.chunks.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      chunkIndex: chunk.chunk_index,
    })),
    difficulty: (response.difficulty as any),
    version: response.version,
    versions: response.versions
  }
}

export async function deleteDocument(docId: string): Promise<void> {
  await request(`${API_BASE_URL}/documents/${docId}`, { method: 'DELETE' })
}

export async function searchDocuments(query: string): Promise<{ answer?: string, results: any[] }> {
  const params = new URLSearchParams({ query, top_k: '5' });
  const resp = await request<{ answer?: string, results: any[] }>(`${API_BASE_URL}/documents/search?${params.toString()}`, {
    method: 'POST'
  })
  return resp
}

export async function getSimilarDocuments(docId: string): Promise<any[]> {
  const resp = await request<{ similar: any[] }>(`${API_BASE_URL}/documents/${docId}/similar`)
  return resp.similar
}

export async function fetchSummary(source: string): Promise<string> {
  const resp = await request<{ summary: string }>(`${API_BASE_URL}/summary`, {
    method: 'POST',
    // headers: { 'Content-Type': 'application/json' }, // handled by httpClient
    body: { sources: [source] }
  })
  return resp.summary
}
