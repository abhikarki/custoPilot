import asyncio
import sys
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv()

async def test():
    from app.services.knowledge_service import KnowledgeService
    import sqlite3
    
    conn = sqlite3.connect('data/custopilot.db')
    cur = conn.cursor()
    cur.execute("SELECT id FROM knowledge_documents WHERE processing_status = 'PENDING' LIMIT 1")
    row = cur.fetchone()
    
    if row:
        doc_id = row[0]
        print(f'Processing document: {doc_id}')
        try:
            await KnowledgeService.process_document(doc_id)
            print('Done!')
        except Exception as e:
            print(f'Error: {e}')
            import traceback
            traceback.print_exc()
    else:
        print('No pending documents')

if __name__ == "__main__":
    asyncio.run(test())
