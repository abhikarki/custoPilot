"""
Knowledge Processing Service using LangGraph Agent Pipeline
"""
import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
)
from langchain_core.documents import Document

from app.core.config import settings
from app.db.session import async_session_maker
from app.db.models import KnowledgeDocument, KnowledgeChunk, ProcessingStatus, KnowledgeType

logger = structlog.get_logger()


class KnowledgeService:
    """Service for processing and searching knowledge documents"""
    
    # Document loaders by file type
    LOADERS = {
        "pdf": PyPDFLoader,
        "docx": Docx2txtLoader,
        "txt": TextLoader,
        "csv": CSVLoader,
    }
    
    @classmethod
    async def process_document(cls, document_id: str):
        """
        Process a knowledge document through the agent pipeline.
        This is run as a background task.
        """
        from app.agents.knowledge_pipeline import KnowledgeIngestionPipeline
        from app.db.models import AgentPipeline, AgentRun
        from datetime import datetime
        
        logger.info("Starting document processing", document_id=document_id)
        
        async with async_session_maker() as db:
            agent_run = None
            start_time = datetime.utcnow()
            
            try:
                # Get document
                from sqlalchemy import select
                result = await db.execute(
                    select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
                )
                doc = result.scalar_one_or_none()
                
                if not doc:
                    logger.error("Document not found", document_id=document_id)
                    return
                
                # Find the knowledge ingestion pipeline for this org
                pipeline_result = await db.execute(
                    select(AgentPipeline).where(
                        AgentPipeline.organization_id == doc.organization_id,
                        AgentPipeline.pipeline_type == "knowledge_ingestion"
                    )
                )
                db_pipeline = pipeline_result.scalar_one_or_none()
                
                # Create AgentRun record if pipeline exists
                if db_pipeline:
                    agent_run = AgentRun(
                        pipeline_id=db_pipeline.id,
                        status="running",
                        started_at=start_time,
                        input_data={"document_id": document_id, "file_type": doc.file_type},
                    )
                    db.add(agent_run)
                    await db.commit()
                    await db.refresh(agent_run)
                
                # Update status
                doc.processing_status = ProcessingStatus.PROCESSING
                await db.commit()
                
                # Run the knowledge ingestion pipeline
                pipeline = KnowledgeIngestionPipeline()
                result = await pipeline.run(
                    file_path=doc.file_path,
                    file_type=doc.file_type,
                    organization_id=str(doc.organization_id),
                    department_id=str(doc.department_id) if doc.department_id else None,
                    document_id=document_id,
                )
                
                # Update document with results
                doc.knowledge_type = KnowledgeType(result.get("knowledge_type", "general"))
                doc.structured_content = result.get("structured_content", {})
                doc.metadata = result.get("metadata", {})
                doc.processing_status = ProcessingStatus.COMPLETED
                
                # Store chunks
                for i, chunk_data in enumerate(result.get("chunks", [])):
                    chunk = KnowledgeChunk(
                        document_id=doc.id,
                        content=chunk_data["content"],
                        chunk_index=i,
                        knowledge_type=KnowledgeType(chunk_data.get("type", "general")),
                        vector_id=chunk_data.get("vector_id"),
                        metadata=chunk_data.get("metadata", {}),
                    )
                    db.add(chunk)
                
                # Update agent run on success
                if agent_run:
                    agent_run.status = "completed"
                    agent_run.completed_at = datetime.utcnow()
                    agent_run.duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                    agent_run.output_data = {
                        "chunks_created": len(result.get("chunks", [])),
                        "knowledge_type": result.get("knowledge_type", "general"),
                    }
                
                await db.commit()
                logger.info("Document processing completed", document_id=document_id)
                
            except Exception as e:
                logger.error("Document processing failed", document_id=document_id, error=str(e))
                doc.processing_status = ProcessingStatus.FAILED
                doc.processing_error = str(e)
                
                # Update agent run on failure
                if agent_run:
                    agent_run.status = "failed"
                    agent_run.completed_at = datetime.utcnow()
                    agent_run.duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                    agent_run.output_data = {"error": str(e)}
                
                await db.commit()
    
    @classmethod
    async def search(
        cls,
        organization_id: str,
        query: str,
        department_id: Optional[str] = None,
        knowledge_type: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search knowledge base using vector similarity"""
        from app.agents.vector_store import VectorStoreManager
        
        vector_store = VectorStoreManager()
        
        # Build filter
        filter_dict = {"organization_id": organization_id}
        if department_id:
            filter_dict["department_id"] = department_id
        if knowledge_type:
            filter_dict["knowledge_type"] = knowledge_type
        
        # Search
        results = await vector_store.similarity_search(
            query=query,
            k=limit,
            filter=filter_dict
        )
        
        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": score,
            }
            for doc, score in results
        ]
    
    @classmethod
    def get_loader(cls, file_path: str, file_type: str):
        """Get appropriate document loader"""
        loader_class = cls.LOADERS.get(file_type)
        if not loader_class:
            raise ValueError(f"Unsupported file type: {file_type}")
        return loader_class(file_path)
