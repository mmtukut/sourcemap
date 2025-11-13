# SourceMap MVP Backend Implementation Plan (v1.5)
**Focus:** Backend only (FastAPI, PostgreSQL/PGVector, LangChain w/ Gemini-centric stack). Leverages Gemini 2.5 Pro directly for entire document processing (PDFs/images/unstructured → text extraction via native multimodal API, no external OCR). No authentication (endpoints public; users table retained for basic usage tracking w/o login). Data provenance via enhanced audit logs (tracking data origins, transformations, and lineage). Simplified to run without external servers. Served via Uvicorn. Structured outputs enabled in LangChain for all Gemini calls (using Pydantic models + `.with_structured_output()` for reliable JSON parsing).  
**Timeline:** 6 weeks (phased for 4-person team: e.g., 2 devs on core, 1 on DB/RAG, 1 on testing). Further streamlined processing (direct Gemini calls reduce custom code).  
**Assumptions:** Local dev env (Docker Compose for Postgres only); Hetzner deploy in Week 6. Use Google Gemini API (funded key; supports direct PDF/image uploads up to 20MB inline or File API for larger). Embeddings truncated to 1536 dims. No auth—endpoints open (add rate limiting for prod). DB via connection string (e.g., `postgresql://user:pass@localhost/sourcemap`).  
**Tech Stack (Backend):**  
- Framework: FastAPI (w/ Uvicorn for serving, Pydantic)  
- DB: PostgreSQL 15+ w/ PGVector (psycopg2, SQLAlchemy, Alembic); connect via DATABASE_URL string  
- RAG/Vision/OCR/Embeddings/Processing: LangChain (Google Generative AI integrations via `langchain-google-genai`), gemini-embedding-001 (3072 dims, truncated to 1536); direct Gemini 2.5 Pro for multimodal extraction (PDF/image bytes → text). For Gemini 2.5 Pro integration with LangChain, install `langchain-google-genai`. Structured outputs: Use Pydantic schemas (e.g., `BaseModel` for response formats) + `llm.with_structured_output(schema)` for all invocations.  
- Processing: Solely Gemini for text/OCR (native vision); PyMuPDF/ExifTool retained for non-vision metadata (e.g., PDF properties/EXIF, not OCR-dependent)  
- Async: FastAPI BackgroundTasks (no external queue)  
- Security: Encryption (cryptography)  
- Utils: httpx, tenacity, python-dotenv  
- Deps: `pip install langchain langchain-google-genai google-generativeai pillow pdf2image pymupdf pyexiftool httpx tenacity python-multipart psycopg2-binary sqlalchemy alembic pgvector fastapi uvicorn pydantic`  

## Phase 1: Setup & Database (Week 1)
**Goals:** Scaffold project, DB schema w/ provenance enhancements, basic endpoints.  
**Tasks:**  
1. **Project Init (Day 1-2):**  
   - Create repo structure: `/app` (core), `/api` (endpoints), `/services` (processing), `/db` (models/migrations), `/core` (config).  
   - Install deps as above (ensure `langchain-google-genai` for Gemini 2.5 Pro w/ LangChain).  
   - Config: `.env` for GEMINI_API_KEY, DATABASE_URL (e.g., `postgresql://postgres:password@localhost:5432/sourcemap`); FastAPI app w/ CORS, middleware (no auth deps). Init GoogleGenerativeAI client via LangChain.  
   - Local env: Docker Compose (Postgres w/ PGVector ext only). Run server: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.  
   - DB connect: SQLAlchemy engine from `create_engine(os.getenv('DATABASE_URL'))`.  

2. **DB Schema (Day 3-5):**  
   - Enable PGVector: `CREATE EXTENSION vector;`.  
   - Define models (SQLAlchemy): Simplified (no hashed_pw/role; users for usage only). Enhance `audit_logs` for provenance: Add `data_lineage` (JSONB: {source: orig_file, transformations: [step1: timestamp/model, ...], output_hash}).  
     | Table | Key Fields | Relations | Indexes |
     |-------|------------|-----------|---------|
     | `users` | id (UUID PK), email (unique), full_name, org, timestamps, usage_count | - | email |
     | `documents` | id (UUID PK), user_id (FK, optional), filename, storage_path, status, extracted_text, provenance_hash (SHA256), timestamps | users (M:1) | status, upload_date |
     | `document_metadata` | id (UUID PK), doc_id (FK unique), creation_date, author, exif_json (JSONB), timestamps | documents (1:1) | doc_id |
     | `analysis_results` | id (UUID PK), doc_id (FK), confidence_score (decimal), sub_scores (JSONB), findings (JSONB), provenance_chain (JSONB: model calls/lineage), timestamps | documents (M:1) | doc_id, score |
     | `anomaly_detections` | id (UUID PK), analysis_id (FK), type, severity, location (JSONB), confidence, timestamps | analysis_results (M:1) | analysis_id, type |
     | `knowledge_documents` | id (UUID PK), type, source, embedding (vector(1536)), metadata (JSONB), provenance (JSONB: orig_source/timestamp), timestamps | - | type, verification_flag |
     | `similar_documents` | id (UUID PK), analysis_id (FK), ref_id, similarity_score, explanation, timestamps | analysis_results (M:1) | analysis_id |
     | `audit_logs` | id (UUID PK), user_id (FK, optional), action, ip, data (JSONB), data_lineage (JSONB: {input_hash, steps: [{op, model, ts, output_hash}]}), status, timestamps | users (M:1) | action, creation_date |
   - Run Alembic migrations: `alembic init`, autogenerate, upgrade (using DATABASE_URL).  
   - Seed: Insert sample knowledge docs (process via Gemini, chunk/embed via Gemini, store vectors w/ cosine HNSW index; log provenance).  

3. **Basic Endpoints (Day 6-7):**  
   - No auth: All endpoints public (add optional `user_id` query param for tracking).  
   - GET `/health`: Simple ping.  
   - GET `/users/me/usage`: Optional user_id param; returns analyses count (for demo).  

**Milestone:** Local server runs on Uvicorn; DB connected via string; basic tests pass (pytest).  

## Phase 2: Document Processing & Upload (Weeks 2-3)
**Goals:** Direct Gemini 2.5 Pro for unified processing (PDFs/images/unstructured → text extraction via native multimodal API). Provenance: Log Gemini call steps/hashes in audit. Use BackgroundTasks for async processing. Structured outputs for extraction (Pydantic schema: e.g., `ExtractionResponse(BaseModel)` with fields like `text: str`, `page_count: int`).  
**Tasks:**  
1. **Upload Endpoint (Week 2, Day 1-2):**  
   - POST `/documents/upload`: Multipart form (file, optional user_id), validate (size <50MB, types: PDF/JPG/PNG; use File API for >20MB), encrypt/store to local path (e.g., `/storage/{doc_id}.enc`), generate UUID, insert doc record (status: 'pending'), return ID/ETA. Log upload to audit (lineage: {source: filename, hash}).  
   - Async: Use `BackgroundTasks.add_task(process_document_bg, file_path, user_id)` where `process_document_bg` runs the processor.  

2. **Processing Service (Week 2, Day 3-5):**  
   - `DocumentProcessor` class in `/services/processor.py` (Gemini-centric via `langchain-google-genai`):  
     - Define Pydantic schema: `ExtractionResponse = create_structured_output_class("ExtractionResponse", extracted_text: str, page_count: int, structure_notes: str)`.  
     - `process_document(file_path, user_id=None)`:  
       - Extract metadata: `_extract_metadata()` (PyMuPDF for PDF properties, ExifTool for image EXIF → JSONB; hash for provenance; non-OCR).  
       - Process via Gemini 2.5 Pro: Read file bytes; invoke multimodal chain (`llm = ChatGoogleGenerativeAI(model='gemini-2.5-pro')`; `structured_llm = llm.with_structured_output(ExtractionResponse)`); content: `Part.from_bytes(data=file_bytes, mime_type='application/pdf' or 'image/jpeg')`; prompt: "Extract all text from this document/image, handling handwriting, scans, and unstructured content accurately. Preserve structure (e.g., sections, tables). Output as clean, joined text with page count estimate." (temp=0.1 for consistency). Handles up to 1000 pages natively.  
       - For large files (>20MB): Use Gemini File API upload first, reference URI in content.  
       - Parse structured response: `result = structured_llm.invoke(prompt)` → `extracted_text = result.extracted_text`; `page_count = result.page_count`.  
       - Provenance: Compute input/output hashes; log steps (e.g., {extract: "gemini-2.5-pro-multimodal", hash_out, tokens_used}). Update DB: Insert metadata, text, page_count; status='processed'; audit log.  
     - Fallback: If extraction fails (e.g., size limit), chunk file into pages via PyMuPDF (non-OCR) and process sequentially with structured outputs.  

3. **Status Polling (Week 2, Day 6-7):**  
   - GET `/documents/{id}/status`: Return status, progress % (polled via DB status field; update in background task).  

**Milestone:** Upload & process diverse samples (scanned PDF, mobile photo, handwritten form); verify >95% accuracy on unstructured Nigerian docs via Gemini structured extraction.  

## Phase 3: Analysis Engines (Weeks 3-4)
**Goals:** Gemini 2.5 Pro for vision + Gemini embeddings/RAG; provenance chains model calls. Use BackgroundTasks for analysis. Structured outputs for all analysis responses (Pydantic schemas for scores/findings).  
**Tasks:**  
1. **Vision LLM Engine (Week 3, Day 1-4):**  
   - `VisionAnalyzer` in `/services/vision.py` (LangChain GoogleGenAI via `langchain-google-genai`):  
     - Define Pydantic schema: `VisionAnalysis = create_structured_output_class("VisionAnalysis", assessment: str, sub_scores: dict, findings: list, evidence: list)`.  
     - `analyze_document(doc_id)`: Fetch from DB (text/images/metadata); use loaded bytes; build multimodal prompt (JSON schema in prompt for anomalies/layout/tampering); `structured_llm = llm.with_structured_output(VisionAnalysis)`; invoke (temp=0.1, max_tokens=4096).  
     - Parse: `result = structured_llm.invoke(prompt)` → insert to `analysis_results` & `anomaly_detections` (e.g., findings → anomalies); provenance: {model: "gemini-2.5-pro", input_hash, output_hash, tokens}.  
     - Prompt: Forensic checks on unstructured elements (e.g., "Analyze for tampering in scanned/handwritten doc").  

2. **RAG Layer (Week 3, Day 5-7 & Week 4, Day 1-2):**  
   - `RAGService` in `/services/rag.py` (LangChain GoogleGenAI via `langchain-google-genai`):  
     - Embed & store: `add_to_knowledge_base(docs, type)` → Use `RecursiveCharacterTextSplitter` for chunking (500 words); embed (Gemini embedding-001, truncate=1536); insert vectors w/ provenance (orig_doc_id, chunk_ts).  
     - Define Pydantic schema: `RAGAnalysis = create_structured_output_class("RAGAnalysis", match_score: float, deviations: list, assessment: str, reasoning: str)`.  
     - `find_similar_documents(query_docs, type, k=5)`: Embed query via Gemini; PGVector cosine search; filter >0.6.  
     - `analyze_with_context(extracted_docs)`: RetrievalQA (Gemini 2.5 Pro gen: temp=0.2; retriever=PGVectorStore; wrap generator with `.with_structured_output(RAGAnalysis)`); prompt for deviations; parse structured JSON; provenance chain.  
     - Insert to `similar_documents`; audit full lineage.  

3. **Analysis Endpoint (Week 4, Day 3-4):**  
   - POST `/documents/{id}/analyze` (optional user_id): Use `BackgroundTasks.add_task(analyze_bg, doc_id, user_id)`; return analysis_id immediately (poll for results).  
   - GET `/analysis/{id}`: Fetch results (score, findings, markers, provenance_chain).  

**Milestone:** End-to-end on unstructured doc; RAG retrieves similars; full provenance traceable via audit; structured outputs ensure parseable JSON.  

## Phase 4: Scoring, KB Mgmt, & Polish (Weeks 4-5)
**Goals:** Aggregate scores, KB ops; ensure provenance in all outputs. Structured outputs integrated across services.  
**Tasks:**  
1. **Scoring Aggregator (Week 4, Day 5-6):**  
   - `ScoreCalculator` in `/services/scorer.py`: Weighted avg; deduct anomalies; generate summary/evidence w/ provenance tags (e.g., "Visual score from Gemini call at TS"). Update `analysis_results` in background tasks (leverage structured sub-scores).  

2. **KB Endpoints (Week 4, Day 7 & Week 5, Day 1):**  
   - POST `/knowledge/add` (optional user_id): Load/process/embed verified doc via LangChain/Gemini (structured extraction); store w/ provenance (background task).  
   - GET `/knowledge/search`: Query → embed (Gemini) → PGVector; return previews/scores/lineage.  

3. **Extras (Week 5, Day 2-5):**  
   - Audit/Provenance: Middleware logs all actions (auto-populate lineage JSONB: chain input→load→analyze→output hashes).  
   - Usage: GET `/users/me/usage` (user_id param; query counts).  
   - Retry/Async: Tenacity for Gemini calls; BackgroundTasks for heavy ops.  
   - Tests: Unit/integration; validate loaders/structured outputs on samples (e.g., assert JSON schemas), provenance integrity (hash chains match).  

**Milestone:** Full pipeline w/ provenance: Upload → Load/Analyze (structured) → Score; KB search traceable.  

## Phase 5: Deploy & Test (Week 6)
**Goals:** Production-ready backend.  
**Tasks:**  
1. **Infra (Day 1-2):** Dockerize (app only; Postgres separate on Hetzner); Hetzner VPS (RAID, encrypt; use DATABASE_URL for prod connect). Serve: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.  
2. **CI/CD (Day 3):** GitHub Actions: Lint/test/build/deploy (SSH to Hetzner).  
3. **Monitoring/Security (Day 4-5):** Sentry; rate limits (no auth); HTTPS (nginx reverse proxy). Track Gemini costs/provenance queries.  
4. **E2E Tests (Day 6-7):** 10+ unstructured docs; validate accuracy, <10% false positives, end-to-end provenance (e.g., trace from upload to score); test structured output parsing (no fallback errors).  

