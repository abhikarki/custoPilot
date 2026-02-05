import asyncio
from app.db.session import async_session_maker
from app.db.models import AgentPipeline
from sqlalchemy import select

async def check():
    async with async_session_maker() as db:
        result = await db.execute(select(AgentPipeline))
        pipelines = result.scalars().all()
        print(f"Found {len(pipelines)} pipelines:")
        for p in pipelines:
            print(f"  - {p.name} ({p.pipeline_type})")

asyncio.run(check())
