"""
Agent Pipeline API Routes
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db, AgentPipeline, AgentRun, Organization
from app.schemas import (
    AgentPipelineCreate, AgentPipelineResponse, AgentRunResponse
)
from app.core.security import get_current_user, require_admin

router = APIRouter()


# Default pipeline configurations
DEFAULT_KNOWLEDGE_PIPELINE = {
    "name": "Knowledge Ingestion Pipeline",
    "pipeline_type": "knowledge_ingestion",
    "description": "Processes uploaded documents into structured knowledge",
    "agents": [
        {
            "name": "loader_agent",
            "type": "loader",
            "description": "Reads files and emits raw text chunks",
            "retry_policy": {"max_retries": 3, "backoff": 2},
        },
        {
            "name": "parser_agent",
            "type": "parser",
            "description": "Cleans text, detects sections",
            "retry_policy": {"max_retries": 2, "backoff": 1},
        },
        {
            "name": "classifier_agent",
            "type": "classifier",
            "description": "Classifies content type (FAQ, Policy, etc.)",
            "confidence_threshold": 0.7,
        },
        {
            "name": "structuring_agent",
            "type": "structurer",
            "description": "Structures content into Q&A, sections",
            "confidence_threshold": 0.8,
        },
        {
            "name": "validation_agent",
            "type": "validator",
            "description": "Validates structured output quality",
            "confidence_threshold": 0.7,
        },
        {
            "name": "storage_agent",
            "type": "storage",
            "description": "Stores in vector DB and PostgreSQL",
        },
    ],
    "config": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "embedding_model": "text-embedding-3-small",
    }
}

DEFAULT_SUPPORT_PIPELINE = {
    "name": "Customer Support Pipeline",
    "pipeline_type": "customer_support",
    "description": "Handles customer queries with AI assistance",
    "agents": [
        {
            "name": "intent_agent",
            "type": "intent_detection",
            "description": "Classifies intent, extracts entities",
            "confidence_threshold": 0.7,
        },
        {
            "name": "router_agent",
            "type": "department_router",
            "description": "Routes to appropriate department",
        },
        {
            "name": "retriever_agent",
            "type": "knowledge_retriever",
            "description": "Vector search for relevant knowledge",
            "config": {"top_k": 5, "score_threshold": 0.7},
        },
        {
            "name": "reasoning_agent",
            "type": "reasoning",
            "description": "Applies rules, resolves policies",
            "confidence_threshold": 0.8,
        },
        {
            "name": "response_agent",
            "type": "response_generator",
            "description": "Generates final customer-friendly response",
        },
        {
            "name": "confidence_agent",
            "type": "confidence_scorer",
            "description": "Scores response confidence for escalation",
            "confidence_threshold": 0.7,
        },
    ],
    "config": {
        "model": "gpt-4-turbo-preview",
        "temperature": 0.3,
        "escalation_threshold": 0.7,
    }
}


@router.get("/pipelines", response_model=List[AgentPipelineResponse])
async def list_pipelines(
    organization_id: UUID,
    pipeline_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List agent pipelines for an organization"""
    query = select(AgentPipeline).where(
        AgentPipeline.organization_id == organization_id
    )
    
    if pipeline_type:
        query = query.where(AgentPipeline.pipeline_type == pipeline_type)
    
    result = await db.execute(query)
    pipelines = result.scalars().all()
    
    return [AgentPipelineResponse.model_validate(p) for p in pipelines]


@router.post("/pipelines", response_model=AgentPipelineResponse)
async def create_pipeline(
    organization_id: UUID,
    pipeline_data: AgentPipelineCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new agent pipeline"""
    # Verify organization
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")
    
    pipeline = AgentPipeline(
        organization_id=organization_id,
        name=pipeline_data.name,
        pipeline_type=pipeline_data.pipeline_type,
        description=pipeline_data.description,
        config=pipeline_data.config or {},
        agents=[a.model_dump() for a in pipeline_data.agents] if pipeline_data.agents else [],
    )
    
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    
    return AgentPipelineResponse.model_validate(pipeline)


@router.post("/pipelines/initialize-defaults")
async def initialize_default_pipelines(
    organization_id: UUID,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Initialize default pipelines for an organization"""
    # Verify organization
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if pipelines already exist
    existing = await db.execute(
        select(AgentPipeline).where(AgentPipeline.organization_id == organization_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Pipelines already exist")
    
    # Create default pipelines
    knowledge_pipeline = AgentPipeline(
        organization_id=organization_id,
        **DEFAULT_KNOWLEDGE_PIPELINE
    )
    support_pipeline = AgentPipeline(
        organization_id=organization_id,
        **DEFAULT_SUPPORT_PIPELINE
    )
    
    db.add(knowledge_pipeline)
    db.add(support_pipeline)
    await db.commit()
    
    return {"message": "Default pipelines created successfully"}


@router.get("/pipelines/{pipeline_id}", response_model=AgentPipelineResponse)
async def get_pipeline(
    pipeline_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get pipeline details"""
    result = await db.execute(
        select(AgentPipeline).where(AgentPipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return AgentPipelineResponse.model_validate(pipeline)


@router.put("/pipelines/{pipeline_id}", response_model=AgentPipelineResponse)
async def update_pipeline(
    pipeline_id: UUID,
    pipeline_data: AgentPipelineCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update pipeline configuration"""
    result = await db.execute(
        select(AgentPipeline).where(AgentPipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline.name = pipeline_data.name
    pipeline.description = pipeline_data.description
    pipeline.config = pipeline_data.config or {}
    pipeline.agents = [a.model_dump() for a in pipeline_data.agents] if pipeline_data.agents else []
    
    await db.commit()
    await db.refresh(pipeline)
    
    return AgentPipelineResponse.model_validate(pipeline)


@router.get("/pipelines/{pipeline_id}/runs", response_model=List[AgentRunResponse])
async def list_pipeline_runs(
    pipeline_id: UUID,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List recent runs for a pipeline"""
    result = await db.execute(
        select(AgentRun).where(AgentRun.pipeline_id == pipeline_id)
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
    )
    runs = result.scalars().all()
    
    return [AgentRunResponse.model_validate(run) for run in runs]


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_run(
    run_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get run details with LangSmith trace URL"""
    result = await db.execute(
        select(AgentRun).where(AgentRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return AgentRunResponse.model_validate(run)


@router.get("/graph/{pipeline_type}")
async def get_pipeline_graph(
    pipeline_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Get pipeline graph structure for visualization"""
    if pipeline_type == "knowledge_ingestion":
        agents = DEFAULT_KNOWLEDGE_PIPELINE["agents"]
    elif pipeline_type == "customer_support":
        agents = DEFAULT_SUPPORT_PIPELINE["agents"]
    else:
        raise HTTPException(status_code=400, detail="Invalid pipeline type")
    
    # Build nodes and edges for React Flow
    nodes = []
    edges = []
    
    for i, agent in enumerate(agents):
        nodes.append({
            "id": agent["name"],
            "type": "agentNode",
            "position": {"x": 250, "y": i * 120},
            "data": {
                "label": agent["name"].replace("_", " ").title(),
                "type": agent["type"],
                "description": agent.get("description", ""),
                "confidence_threshold": agent.get("confidence_threshold"),
            }
        })
        
        if i > 0:
            edges.append({
                "id": f"e{i-1}-{i}",
                "source": agents[i-1]["name"],
                "target": agent["name"],
                "animated": True,
            })
    
    # Add escalation edge for support pipeline
    if pipeline_type == "customer_support":
        nodes.append({
            "id": "escalation",
            "type": "escalationNode",
            "position": {"x": 450, "y": 5 * 120},
            "data": {
                "label": "Human Escalation",
                "description": "Route to support team",
            }
        })
        edges.append({
            "id": "e-escalation",
            "source": "confidence_agent",
            "target": "escalation",
            "label": "Low Confidence",
            "animated": False,
            "style": {"stroke": "#f59e0b"},
            "type": "default",
        })
    
    return {"nodes": nodes, "edges": edges}
