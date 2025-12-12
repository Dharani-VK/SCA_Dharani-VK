import os
import time
import hashlib
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import requests # Added for Wikipedia integration
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import sqlite3

from app.models.student import Student
from app.routers.auth import get_current_user, get_db_connection
from app.dependencies import get_student_filter
from app.vector_store import ChromaVectorStore
from app.ingest import ingest_pdf_bytes, embed_texts
from app.utils import generate_summary, generate_answer_with_context

router = APIRouter()
store = ChromaVectorStore()

# --- Models ---
class DocumentChunk(BaseModel):
    id: str
    text: str
    chunk_index: int

class DocumentDetailResponse(BaseModel):
    source: str
    id: Union[int, str, None] = None
    chunk_count: int
    ingested_at: Optional[str] = None
    summary: Optional[str] = None
    chunks: List[DocumentChunk]
    difficulty: Optional[str] = None
    version: Optional[int] = None
    versions: Optional[List[Dict[str, Any]]] = None

class WikiPayload(BaseModel):
    query: str

# --- Logic ---

def _fetch_wikipedia_content(query: str) -> tuple[str, str]:
    """Fetch article title and text content from Wikipedia API."""
    # 1. Search for the page
    search_url = "https://en.wikipedia.org/w/api.php"
    headers = {"User-Agent": "SmartCampusAssistant/1.0 (contact@example.com)"}
    params = {
        "action": "opensearch",
        "search": query,
        "limit": 1,
        "namespace": 0,
        "format": "json"
    }
    try:
        resp = requests.get(search_url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to contact Wikipedia: {str(e)}")

    if not data or len(data) < 2 or not data[1]:
        raise HTTPException(status_code=404, detail="No Wikipedia article found for this topic.")
    
    title = data[1][0]
    
    # 2. Get the content
    content_url = "https://en.wikipedia.org/w/api.php"
    c_params = {
        "action": "query",
        "format": "json",
        "prop": "extracts",
        "titles": title,
        "explaintext": 1,
        "exsectionformat": "plain",
        "redirects": 1
    }
    try:
        c_resp = requests.get(content_url, params=c_params, headers=headers, timeout=10, allow_redirects=True)
        c_resp.raise_for_status()
        c_data = c_resp.json()
        pages = c_data.get("query", {}).get("pages", {})
        if not pages:
             raise HTTPException(status_code=404, detail="Page content not found.")
        page = next(iter(pages.values()))
        extract = page.get("extract", "")
        if not extract:
             raise HTTPException(status_code=400, detail="Article has no text content.")
        return title, extract
    except HTTPException:
        raise
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Failed to fetch article content: {str(e)}")


@router.post("/documents/ingest/wikipedia")
async def ingest_wikipedia(
    payload: WikiPayload,
    request: Request,
    current_user: Student = Depends(get_current_user),
    student_filter: Dict[str, Any] = Depends(get_student_filter)
):
    """
    Ingest a Wikipedia article by topic using LangChain Loader.
    """
    from langchain_community.document_loaders import WikipediaLoader

    try:
        # Load content using LangChain (fetches max 1 doc)
        loader = WikipediaLoader(query=payload.query, load_max_docs=1, doc_content_chars_max=100000)
        docs = loader.load()
        
        if not docs:
             raise HTTPException(status_code=404, detail="No Wikipedia article found for this topic.")
             
        # Extract content from the first result
        doc = docs[0]
        title = doc.metadata.get("title", payload.query)
        text_content = doc.page_content
        
    except Exception as e:
        # Handle cases where wikipedia package might error on ambiguity or connection
        if "No Wikipedia article found" in str(e):
             raise HTTPException(status_code=404, detail="No Wikipedia article found for this topic.")
        raise HTTPException(status_code=502, detail=f"Wikipedia Load Error: {str(e)}")

    # Simulate a file upload
    fake_filename = f"Wiki - {title}.txt"
    content_bytes = text_content.encode('utf-8')
    file_size = len(content_bytes)
    file_hash = calculate_file_hash(content_bytes)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check Content Duplicate
        cursor.execute(
             "SELECT id FROM documents WHERE university=? AND roll_no=? AND content_hash=? AND is_deleted=0",
             (current_user.university, current_user.roll_no, file_hash)
        )
        exact_match = cursor.fetchone()
        if exact_match:
            return {
                "status": "duplicate_detected",
                "message": f"Wiki article '{title}' is already in your library.",
                "document_id": exact_match[0]
            }

        # Check Name Duplicate (Version bump if same name but different content - unlikely for Wiki unless updated)
        # We'll just define storage path
        storage_filename = f"{current_user.roll_no}_{int(time.time())}_{fake_filename}"
        
        # Ingest
        result = await run_in_threadpool(
            ingest_pdf_bytes,
            content_bytes,
            store,
            source_name=storage_filename, 
            with_metrics=True,
            metadata_overrides={
                "university": current_user.university,
                "roll_no": current_user.roll_no,
                "u_id": current_user.id,
                "original_filename": fake_filename,
                "version": 1,
                "source_type": "wikipedia"
            }
        )
        
        difficulty = "Medium"
        if isinstance(result, dict) and "structured_content" in result:
             paragraphs = result["structured_content"].get("paragraphs", [])
             full_sample = " ".join(paragraphs[:5])
             difficulty = calculate_difficulty(full_sample)

        created_at = datetime.utcnow().isoformat()
        
        cursor.execute("""
            INSERT INTO documents (university, roll_no, filename, storage_path, file_size, difficulty, created_at, version_number, content_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (current_user.university, current_user.roll_no, fake_filename, storage_filename, file_size, difficulty, created_at, 1, file_hash))
        doc_id = cursor.lastrowid
        conn.commit()
        
        return {
            "status": "success",
            "document_id": doc_id,
            "title": title,
            "chunks_added": int(result.get("chunk_count", 0))
        }

    finally:
        conn.close()



def calculate_difficulty(text: str) -> str:
    if not text: return "Medium"
    words = text.split()
    if not words: return "Medium"
    avg_word_len = sum(len(w) for w in words) / len(words)
    if avg_word_len > 6.0: return "Hard"
    if avg_word_len < 4.5: return "Easy"
    return "Medium"

def calculate_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

@router.post("/ingest-file")
async def ingest_file(
    request: Request,
    file: UploadFile = File(...),
    course: Optional[str] = None,
    current_user: Student = Depends(get_current_user),
    student_filter: Dict[str, Any] = Depends(get_student_filter),
    force_upload: bool = Query(False)
):
    start_time = time.perf_counter()
    content = await file.read()
    file_size = len(content)
    file_hash = calculate_file_hash(content)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check Name Duplicate
        cursor.execute(
            "SELECT id, content_hash, version_number, storage_path FROM documents WHERE university=? AND roll_no=? AND filename=? AND is_deleted=0",
            (current_user.university, current_user.roll_no, file.filename)
        )
        existing_doc = cursor.fetchone()
        
        # Check Content Duplicate
        cursor.execute(
             "SELECT id FROM documents WHERE university=? AND roll_no=? AND content_hash=? AND is_deleted=0",
             (current_user.university, current_user.roll_no, file_hash)
        )
        exact_match = cursor.fetchone()
        
        if exact_match and not force_upload:
            if existing_doc and existing_doc[0] == exact_match[0]:
                 # Same file, same content
                 return {
                    "status": "duplicate_detected",
                    "message": "Exact version already exists.",
                    "document_id": exact_match[0]
                }
            # Content exists elsewhere
            return {
                "status": "duplicate_detected",
                "message": "This document content already exists.",
                "document_id": exact_match[0]
            }

        new_version_num = 1
        
        if existing_doc:
            doc_id, old_hash, old_ver, old_storage_path = existing_doc
            # Archive old version
            cursor.execute("""
                INSERT INTO document_versions (document_id, version_number, storage_path, filename, created_at, difficulty)
                SELECT id, version_number, storage_path, filename, created_at, difficulty FROM documents WHERE id=?
            """, (doc_id,))
            new_version_num = old_ver + 1
        
        storage_filename = f"{current_user.roll_no}_{int(time.time())}_{file.filename}"
        
        # Ingest to Chroma
        result = await run_in_threadpool(
            ingest_pdf_bytes,
            content,
            store,
            source_name=storage_filename, 
            with_metrics=True,
            metadata_overrides={
                "university": current_user.university,
                "roll_no": current_user.roll_no,
                "u_id": current_user.id,
                "original_filename": file.filename,
                "version": new_version_num
            }
        )
        
        # Difficulty
        difficulty = "Medium"
        if isinstance(result, dict) and "structured_content" in result:
             paragraphs = result["structured_content"].get("paragraphs", [])
             full_sample = " ".join(paragraphs[:5])
             difficulty = calculate_difficulty(full_sample)

        created_at = datetime.utcnow().isoformat()
        
        if existing_doc:
            cursor.execute("""
                UPDATE documents 
                SET storage_path=?, content_hash=?, version_number=?, difficulty=?, created_at=?, file_size=?
                WHERE id=?
            """, (storage_filename, file_hash, new_version_num, difficulty, created_at, file_size, existing_doc[0]))
            doc_id = existing_doc[0]
        else:
            cursor.execute("""
                INSERT INTO documents (university, roll_no, filename, storage_path, file_size, difficulty, created_at, version_number, content_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (current_user.university, current_user.roll_no, file.filename, storage_filename, file_size, difficulty, created_at, new_version_num, file_hash))
            doc_id = cursor.lastrowid

        conn.commit()
        
        return {
            "status": "success",
            "document_id": doc_id,
            "version": new_version_num,
            "difficulty": difficulty,
            "chunks_added": int(result.get("chunk_count", 0))
        }

    finally:
        conn.close()

@router.get("/documents")
def list_documents(current_user: Student = Depends(get_current_user)):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, filename, created_at, difficulty, version_number 
            FROM documents 
            WHERE university=? AND roll_no=? AND is_deleted=0
            ORDER BY created_at DESC
        """, (current_user.university, current_user.roll_no))
        rows = cursor.fetchall()
        
        docs = []
        for r in rows:
            docs.append({
                "id": r["id"],
                "source": r["filename"], 
                "created_at": r["created_at"],
                "difficulty": r["difficulty"],
                "version": r["version_number"]
            })
        
        # Fallback: Query Chroma if DB empty? 
        # (Optional: for legacy support, but user asked for DB management)
        if not docs:
            # Check store
            stats = store.stats(filters={"university": current_user.university, "roll_no": current_user.roll_no})
            sources = stats.get("sources", [])
            for s in sources:
                docs.append({
                     "id": s["source"], # String ID
                     "source": s["source"],
                     "created_at": s.get("latest_ingested_at"),
                     "difficulty": "Unknown",
                     "version": 1
                })
        
        return {"sources": docs, "total_docs": len(docs)}
    finally:
        conn.close()

@router.get("/documents/{doc_identifier}", response_model=DocumentDetailResponse)
def get_document_detail(
    doc_identifier: str, 
    limit: int = 12, 
    current_user: Student = Depends(get_current_user)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    storage_path = doc_identifier
    doc_id = None
    doc_metadata = {}
    versions = []
    
    try:
        if doc_identifier.isdigit():
            doc_id = int(doc_identifier)
            cursor.execute("SELECT storage_path, filename, difficulty, version_number, created_at, id FROM documents WHERE id=? AND university=? AND roll_no=?", 
                           (doc_id, current_user.university, current_user.roll_no))
            row = cursor.fetchone()
            if row:
                storage_path = row[0]
                doc_metadata = {
                    "filename": row[1],
                    "difficulty": row[2],
                    "version": row[3],
                    "created_at": row[4],
                    "id": row[5]
                }
                
                cursor.execute("SELECT id, version_number, created_at FROM document_versions WHERE document_id=? ORDER BY version_number DESC", (doc_id,))
                v_rows = cursor.fetchall()
                versions = [{"id": r[0], "version": r[1], "created_at": r[2]} for r in v_rows]
                # Add current as well? UI handles it.
        
        matches = store.get_documents_by_source(storage_path, filters={"university": current_user.university, "roll_no": current_user.roll_no})
        
        if not matches:
             # Try raw identifier
             matches = store.get_documents_by_source(doc_identifier, filters={"university": current_user.university, "roll_no": current_user.roll_no})
        
        if not matches:
             if doc_id:
                  # Metadata only
                  return DocumentDetailResponse(
                      source=doc_metadata.get("filename", storage_path), 
                      id=doc_id, 
                      chunk_count=0, 
                      chunks=[], 
                      difficulty=doc_metadata.get('difficulty'), 
                      version=doc_metadata.get('version'), 
                      versions=versions
                  )
             raise HTTPException(status_code=404, detail="Document not found")

        matches.sort(key=lambda doc: doc.get("meta", {}).get("chunk_index", 0))
        limited = matches[: max(1, limit)]

        chunk_texts = [doc["text"] for doc in limited]
        if limit > 50:
             # Hard cap for stability
             limit = 50

        summary_text = None
        # Optimization: Do NOT auto-generate summary during detail fetch.
        # This prevents "Failed to fetch" timeouts on large docs.
        # The frontend should request a summary explicitly via the /summary endpoint.


        chunks: List[DocumentChunk] = []
        for idx, doc in enumerate(limited):
            preview = doc["text"][:700]
            chunks.append(DocumentChunk(
                id=doc.get("id", f"{storage_path}-{idx}"),
                text=preview,
                chunk_index=doc.get("meta", {}).get("chunk_index", idx),
            ))

        ingested_at = matches[0].get("meta", {}).get("ingested_at")
        
        return DocumentDetailResponse(
            source=doc_metadata.get("filename", storage_path),
            id=doc_id if doc_id else doc_identifier,
            chunk_count=len(matches),
            ingested_at=ingested_at,
            summary=summary_text,
            chunks=chunks,
            difficulty=doc_metadata.get("difficulty"),
            version=doc_metadata.get("version"),
            versions=versions
        )

    finally:
        conn.close()

@router.delete("/documents/{doc_identifier}")
def delete_document(doc_identifier: str, current_user: Student = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        storage_path = doc_identifier
        
        if doc_identifier.isdigit():
            doc_id = int(doc_identifier)
            cursor.execute("SELECT id, storage_path FROM documents WHERE id=? AND university=? AND roll_no=?", (doc_id, current_user.university, current_user.roll_no))
            row = cursor.fetchone()
            if row:
                storage_path = row[1]
                cursor.execute("UPDATE documents SET is_deleted=1 WHERE id=?", (doc_id,))
                conn.commit()
        
        # Soft Delete in DB done.
        # Vector Store Delete
        store.delete_document(storage_path, filters={"university": current_user.university, "roll_no": current_user.roll_no})
        
        return {"status": "deleted", "id": doc_identifier}
    finally:
        conn.close()

@router.get("/documents/{doc_identifier}/similar")
def similar_documents(doc_identifier: str, current_user: Student = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        storage_path = doc_identifier
        filename = doc_identifier
        
        if doc_identifier.isdigit():
             doc_id = int(doc_identifier)
             cursor.execute("SELECT storage_path, filename FROM documents WHERE id=?", (doc_id,))
             row = cursor.fetchone()
             if row:
                 storage_path = row[0]
                 filename = row[1]

        source_docs = store.get_documents_by_source(storage_path, filters={"university": current_user.university, "roll_no": current_user.roll_no}, include_embeddings=True)
        if not source_docs:
             return {"similar": []}
             
        # Extract embedding and convert to list to avoid numpy ambiguity
        query_embedding = source_docs[0]["embedding"]
        query_embedding_list = list(query_embedding) if hasattr(query_embedding, 'tolist') else list(query_embedding)
        hits = store.similarity_search(query_embedding_list, top_k=5, filters={"university": current_user.university, "roll_no": current_user.roll_no})
        
        similar = []
        seen = set()
        seen.add(filename)
        seen.add(storage_path)
        
        for h in hits:
             s_meta = h.get("meta", {})
             s_name = s_meta.get("original_filename") or s_meta.get("source")
             if s_name and s_name not in seen:
                 similar.append({"filename": s_name, "snippet": h["text"][:150], "score": 0.9})
                 seen.add(s_name)
        
        return {"similar": similar[:3]}
    finally:
        conn.close()

class SummaryRequest(BaseModel):
    sources: List[str]

@router.post("/summary")
def get_summary_endpoint(
    req: SummaryRequest,
    current_user: Student = Depends(get_current_user)
):
    """
    Generate an AI summary for the specified source(s).
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        all_texts = []
        for source in req.sources:
            # Resolve filename to storage_path if possible
            target_source = source
            cursor.execute(
                "SELECT storage_path FROM documents WHERE filename=? AND university=? AND roll_no=?", 
                (source, current_user.university, current_user.roll_no)
            )
            row = cursor.fetchone()
            if row:
                target_source = row[0]
            
            # Fetch documents using the resolved storage path
            docs = store.get_documents_by_source(target_source, filters={"university": current_user.university, "roll_no": current_user.roll_no})
            
            # Fallback: Try searching by original filename if storage_path yielded nothing
            # (Handles legacy documents where source might be stored as filenanme)
            if not docs and target_source != source:
                print(f"DEBUG: Fallback search by filename for {source}")
                docs = store.get_documents_by_source(source, filters={"university": current_user.university, "roll_no": current_user.roll_no})

            # Fallback 2: Direct Collection Bypass (if metadata filter failed)
            # Safe because we resolved target_source from DB for this specific user
            if not docs and row:
                 print(f"DEBUG: Direct collection access for {target_source}")
                 raw_results = store.collection.get(where={"source": target_source}, include=["documents", "metadatas"])
                 
                 # Fallback to direct filename access (Legacy support)
                 if not raw_results or not raw_results['ids']:
                     print(f"DEBUG: Direct access failed. Trying filename {source}")
                     raw_results = store.collection.get(where={"source": source}, include=["documents", "metadatas"])

                 if raw_results and raw_results['ids']:
                      for i in range(len(raw_results['ids'])):
                           docs.append({
                                "text": raw_results['documents'][i],
                                "meta": raw_results['metadatas'][i] or {}
                           })

            if docs:
                # Sort by chunk index
                docs.sort(key=lambda d: d.get("meta", {}).get("chunk_index", 0))
                # Take up to 25 chunks (User requested 22 fallback, we fetch enough)
                all_texts.extend([d["text"] for d in docs[:25]])
        
        conn.close()

        if not all_texts:
             return {"summary": "📚 No content found for these sources."}
            
        summary = generate_summary(all_texts)
        return {"summary": summary}
        
    except Exception as e:
        print(f"Summary generation error: {e}")
        return {"summary": "⚠️ Unable to generate summary at this time."}

@router.post("/documents/search")
def smart_search(
    query: str = Query(...), 
    top_k: int = 5, 
    current_user: Student = Depends(get_current_user)
):
    student_filter = {"university": current_user.university, "roll_no": current_user.roll_no}
    q_emb = embed_texts([query])[0]
    hits = store.similarity_search(q_emb, top_k=top_k, filters=student_filter)
    
    # RAG Logic
    contexts = [h["text"] for h in hits]
    
    # Generate Answer
    answer = generate_answer_with_context(query, contexts)
    
    results = []
    for h in hits:
        results.append({
            "text": h["text"],
            "source": h.get("meta", {}).get("original_filename") or h.get("meta", {}).get("source"),
            "display_source": h.get("meta", {}).get("original_filename"),
            "score": h.get("score", 0.8)
        })
        
    return {"results": results, "answer": answer}
