from typing import List, Optional
from uuid import UUID
import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db, KnowledgeDocument, KnowledgeChunk, Organization, Department, ProcessingStatus
from app.schemas import KnowledgeUploadResponse, KnowledgeDocumentResponse, KnowledgeChunkResponse, KnowledgeType
from app.core.security import get_current_user, require_admin
from app.core.config import settings
from app.core.rate_limiter import upload_rate_limit
from app.services.knowledge_service import KnowledgeService

router = APIRouter(redirect_slashes=False)

# Max file size: 5MB for demo
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/upload", response_model=KnowledgeUploadResponse)
async def upload_knowledge(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    organization_id: UUID = Form(...),
    department_id: Optional[UUID] = Form(None),
    title: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    _rate_limit: None = Depends(upload_rate_limit)
):
    # Check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    result = await db.execute(select(Organization).where(Organization.id == organization_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if department_id:
        result = await db.execute(select(Department).where(Department.id == department_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Department not found")
    
    allowed_types = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/plain": "txt",
        "text/csv": "csv",
        "application/json": "json",
    }
    
    content_type = file.content_type
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}"
        )
    
    upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, str(organization_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    import uuid
    file_id = str(uuid.uuid4())
    file_ext = allowed_types[content_type]
    file_path = os.path.join(upload_dir, f"{file_id}.{file_ext}")
    
    # content already read above for size check
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    doc = KnowledgeDocument(
        organization_id=organization_id,
        department_id=department_id,
        title=title or file.filename,
        original_filename=file.filename,
        file_path=file_path,
        file_type=file_ext,
        file_size=len(content),
        processing_status=ProcessingStatus.PENDING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    background_tasks.add_task(
        KnowledgeService.process_document,
        str(doc.id)
    )
    
    return KnowledgeUploadResponse.model_validate(doc)


@router.get("", response_model=List[KnowledgeDocumentResponse])
@router.get("/", response_model=List[KnowledgeDocumentResponse], include_in_schema=False)
async def list_knowledge_documents(
    organization_id: UUID,
    department_id: Optional[UUID] = None,
    status: Optional[ProcessingStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(KnowledgeDocument).where(
        KnowledgeDocument.organization_id == organization_id
    )
    
    if department_id:
        query = query.where(KnowledgeDocument.department_id == department_id)
    
    if status:
        query = query.where(KnowledgeDocument.processing_status == status)
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    return [KnowledgeDocumentResponse.model_validate(doc) for doc in documents]


@router.get("/{doc_id}", response_model=KnowledgeDocumentResponse)
async def get_knowledge_document(
    doc_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return KnowledgeDocumentResponse.model_validate(doc)


@router.get("/{doc_id}/chunks", response_model=List[KnowledgeChunkResponse])
async def get_document_chunks(
    doc_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(KnowledgeChunk).where(KnowledgeChunk.document_id == doc_id)
        .order_by(KnowledgeChunk.chunk_index)
    )
    chunks = result.scalars().all()
    
    return [KnowledgeChunkResponse.model_validate(chunk) for chunk in chunks]


@router.post("/{doc_id}/reprocess")
async def reprocess_document(
    doc_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.processing_status = ProcessingStatus.PENDING
    doc.processing_error = None
    await db.commit()
    
    background_tasks.add_task(
        KnowledgeService.process_document,
        str(doc_id)
    )
    
    return {"message": "Document reprocessing started"}


@router.delete("/{doc_id}")
async def delete_knowledge_document(
    doc_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    
    await db.delete(doc)
    await db.commit()
    
    return {"message": "Document deleted successfully"}


@router.post("/search")
async def search_knowledge(
    organization_id: UUID,
    query: str,
    department_id: Optional[UUID] = None,
    knowledge_type: Optional[KnowledgeType] = None,
    limit: int = 5,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    results = await KnowledgeService.search(
        organization_id=str(organization_id),
        query=query,
        department_id=str(department_id) if department_id else None,
        knowledge_type=knowledge_type.value if knowledge_type else None,
        limit=limit
    )
    
    return {"results": results}
