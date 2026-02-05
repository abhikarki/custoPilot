import os
from typing import List, Dict, Any, Optional
import structlog

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from app.core.config import settings

logger = structlog.get_logger()


class VectorStoreManager:
    
    _instance = None
    _collection = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                model="text-embedding-3-small"
            )
            self.persist_directory = settings.CHROMA_PERSIST_DIRECTORY
            os.makedirs(self.persist_directory, exist_ok=True)
            self.initialized = True
    
    def _get_collection(self, collection_name: str = "knowledge") -> Chroma:
        return Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )
    
    async def add_documents(
        self,
        documents: List[Document],
        collection_name: str = "knowledge"
    ) -> List[str]:
        try:
            collection = self._get_collection(collection_name)
            ids = collection.add_documents(documents)
            logger.info(
                count=len(documents),
                collection=collection_name
            )
            return ids
        except Exception as e:
            logger.error("Failed to add documents", error=str(e))
            raise
    
    async def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
        collection_name: str = "knowledge"
    ) -> List[tuple]:
        try:
            collection = self._get_collection(collection_name)
            results = collection.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter
            )
            logger.info(
                "Similarity search completed",
                query_length=len(query),
                results_count=len(results)
            )
            return results
        except Exception as e:
            logger.error("Similarity search failed", error=str(e))
            return []
    
    async def delete_documents(
        self,
        ids: List[str],
        collection_name: str = "knowledge"
    ):
        try:
            collection = self._get_collection(collection_name)
            collection.delete(ids=ids)
            logger.info("Deleted documents", count=len(ids))
        except Exception as e:
            logger.error("Failed to delete documents", error=str(e))
            raise
    
    async def get_retriever(
        self,
        collection_name: str = "knowledge",
        search_kwargs: Optional[Dict] = None
    ):
        collection = self._get_collection(collection_name)
        return collection.as_retriever(
            search_kwargs=search_kwargs or {"k": 5}
        )
