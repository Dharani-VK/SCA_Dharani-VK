import { FEATURE_FLAGS, API_BASE_URL } from '../../utils/constants'
import { mockListFiles, mockUploadFile } from '../mocks/files.mock'
import type { UploadQueueItem } from '../../types/file'
import type { RequestOptions } from '../httpClient'
import { request } from '../httpClient'

type UploadResponse = {
  status: string
  chunks_added?: number
  message?: string
}

export async function uploadFile(file: File, force = false): Promise<UploadResponse> {
  if (FEATURE_FLAGS.useMocks) {
    return mockUploadFile(file)
  }

  const formData = new FormData()
  formData.append('file', file)

  // Get token from localStorage for authentication
  const token = localStorage.getItem('token')
  const headers: HeadersInit = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    // Create an AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout for large files

    const url = `${API_BASE_URL}/ingest-file${force ? '?force_upload=true' : ''}`

    response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
  } catch (error) {
    // Network error - backend not reachable
    console.error('Upload network error:', error)

    // Check if it's a timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upload timed out. The file may be too large or the connection is too slow. Please try again or use a smaller file.')
    }

    // Provide more specific error message
    if (error instanceof TypeError) {
      throw new Error(`Unable to reach the assistant backend at ${API_BASE_URL}. Please verify:\n1. Backend is running (check http://127.0.0.1:8000/health)\n2. CORS is properly configured\n3. No firewall blocking the connection\n4. Backend was restarted with: python backend/start_server.py`)
    }

    throw new Error('Unable to reach the assistant backend. Confirm it is running and reachable.')
  }

  if (!response.ok) {
    const bodyText = await response.text()
    let message = 'Upload failed.'

    // Handle specific error codes
    if (response.status === 413) {
      // File too large
      try {
        const parsed = JSON.parse(bodyText)
        message = parsed?.detail || 'File is too large. Maximum size is 200MB.'
      } catch {
        message = 'File is too large. Maximum size is 200MB.'
      }
    } else if (response.status === 401) {
      message = 'Authentication required. Please login again.'
    } else if (response.status === 400) {
      // Bad request - could be empty file or invalid format
      try {
        const parsed = JSON.parse(bodyText)
        message = parsed?.detail || 'Invalid file. Please check the file format and try again.'
      } catch {
        message = 'Invalid file. Please check the file format and try again.'
      }
    } else if (bodyText) {
      try {
        const parsed = JSON.parse(bodyText)
        message = parsed?.detail || parsed?.message || message
      } catch {
        message = bodyText
      }
    }

    throw new Error(message)
  }

  return response.json()
}

export async function listFiles(): Promise<UploadQueueItem[]> {
  if (FEATURE_FLAGS.useMocks) {
    return mockListFiles()
  }

  const result = await request<UploadQueueItem[]>(`${API_BASE_URL}/files`)
  return result
}
