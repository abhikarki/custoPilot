import uuid
from typing import TypedDict, Optional, List, Dict, Any, Annotated
import operator
import structlog

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, CSVLoader
)

from app.core.config import settings
from app.agents.vector_store import VectorStoreManager

logger = structlog.get_logger()


class KnowledgeState(TypedDict):
    file_path: str
    file_type: str
    organization_id: str
    department_id: Optional[str]
    document_id: str
    
    raw_text: str
    raw_documents: List[Document]
    parsed_sections: List[Dict[str, Any]]
    knowledge_type: str
    structured_content: Dict[str, Any]
    chunks: List[Dict[str, Any]]
    
    validation_passed: bool
    errors: List[str]
    metadata: Dict[str, Any]


class KnowledgeIngestionPipeline:    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0,
            openai_api_key=settings.OPENAI_API_KEY,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        self.vector_store = VectorStoreManager()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(KnowledgeState)
        
        workflow.add_node("loader_agent", self.loader_agent)
        workflow.add_node("parser_agent", self.parser_agent)
        workflow.add_node("classifier_agent", self.classifier_agent)
        workflow.add_node("structuring_agent", self.structuring_agent)
        workflow.add_node("validation_agent", self.validation_agent)
        workflow.add_node("storage_agent", self.storage_agent)
        
        workflow.set_entry_point("loader_agent")
        workflow.add_edge("loader_agent", "parser_agent")
        workflow.add_edge("parser_agent", "classifier_agent")
        workflow.add_edge("classifier_agent", "structuring_agent")
        workflow.add_edge("structuring_agent", "validation_agent")
        workflow.add_conditional_edges(
            "validation_agent",
            self._should_store,
            {
                "store": "storage_agent",
                "end": END
            }
        )
        workflow.add_edge("storage_agent", END)
        
        return workflow.compile()
    
    def _should_store(self, state: KnowledgeState) -> str:
        if state.get("validation_passed", False):
            return "store"
        return "end"
    
    async def loader_agent(self, state: KnowledgeState) -> KnowledgeState:

        logger.info("Loader agent processing", file_path=state["file_path"])
        
        file_path = state["file_path"]
        file_type = state["file_type"]
        
        loaders = {
            "pdf": PyPDFLoader,
            "docx": Docx2txtLoader,
            "txt": TextLoader,
            "csv": CSVLoader,
        }
        
        try:
            loader_class = loaders.get(file_type)
            if not loader_class:
                state["errors"] = [f"Unsupported file type: {file_type}"]
                return state
            
            loader = loader_class(file_path)
            documents = loader.load()
            
            raw_text = "\n\n".join([doc.page_content for doc in documents])
            
            state["raw_documents"] = documents
            state["raw_text"] = raw_text
            state["metadata"] = {
                "page_count": len(documents),
                "total_chars": len(raw_text),
            }
            
            logger.info("Loader agent completed", pages=len(documents))
            
        except Exception as e:
            logger.error("Loader agent failed", error=str(e))
            state["errors"] = state.get("errors", []) + [f"Loading failed: {str(e)}"]
        
        return state
    
    async def parser_agent(self, state: KnowledgeState) -> KnowledgeState:
        logger.info("Parser agent processing")
        
        if not state.get("raw_text"):
            state["errors"] = state.get("errors", []) + ["No raw text to parse"]
            return state
        
        try:
            # Use LLM to detect and parse sections
            parser_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a document parser. Analyze the text and identify distinct sections.
                Return a JSON array of sections with this structure:
                [
                    {{"title": "section title", "content": "section content", "type": "header|paragraph|list|table"}}
                ]
                Keep the content faithful to the original. Extract all meaningful sections."""),
                ("human", "Parse this document:\n\n{text}")
            ])
            
            text = state["raw_text"][:15000] if len(state["raw_text"]) > 15000 else state["raw_text"]
            
            chain = parser_prompt | self.llm
            result = await chain.ainvoke({"text": text})
            
            import json
            try:
                content = result.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                sections = json.loads(content)
            except:
                sections = [{"title": "Document Content", "content": state["raw_text"], "type": "paragraph"}]
            
            state["parsed_sections"] = sections
            logger.info("Parser agent completed", sections=len(sections))
            
        except Exception as e:
            logger.error("Parser agent failed", error=str(e))
            state["parsed_sections"] = [
                {"title": "Document Content", "content": state["raw_text"], "type": "paragraph"}
            ]
        
        return state
    
    async def classifier_agent(self, state: KnowledgeState) -> KnowledgeState:

        logger.info("Classifier agent processing")
        
        try:
            classifier_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a content classifier. Analyze the document and classify it into ONE of these categories:
                - faq: Frequently asked questions, Q&A format
                - policy: Company policies, terms, guidelines
                - troubleshooting: Technical support, how-to guides, problem-solving
                - sales: Product information, pricing, features
                - general: Other general information
                
                Respond with ONLY the category name (lowercase)."""),
                ("human", "Classify this content:\n\n{text}")
            ])
            
            sample_text = state["raw_text"][:3000]
            
            chain = classifier_prompt | self.llm
            result = await chain.ainvoke({"text": sample_text})
            
            knowledge_type = result.content.strip().lower()
            
            valid_types = ["faq", "policy", "troubleshooting", "sales", "general"]
            if knowledge_type not in valid_types:
                knowledge_type = "general"
            
            state["knowledge_type"] = knowledge_type
            logger.info("Classifier agent completed", knowledge_type=knowledge_type)
            
        except Exception as e:
            logger.error("Classifier agent failed", error=str(e))
            state["knowledge_type"] = "general"
        
        return state
    
    async def structuring_agent(self, state: KnowledgeState) -> KnowledgeState:

        logger.info("Structuring agent processing", knowledge_type=state.get("knowledge_type"))
        
        try:
            knowledge_type = state.get("knowledge_type", "general")
            
            if knowledge_type == "faq":
                structured = await self._structure_faq(state)
            elif knowledge_type == "policy":
                structured = await self._structure_policy(state)
            elif knowledge_type == "troubleshooting":
                structured = await self._structure_troubleshooting(state)
            else:
                structured = await self._structure_general(state)
            
            state["structured_content"] = structured
            logger.info("Structuring agent completed")
            
        except Exception as e:
            logger.error("Structuring agent failed", error=str(e))
            state["structured_content"] = {
                "type": state.get("knowledge_type", "general"),
                "sections": state.get("parsed_sections", []),
            }
        
        return state
    
    async def _structure_faq(self, state: KnowledgeState) -> Dict:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Extract Q&A pairs from this FAQ content. Return JSON:
            {{"questions": [{{"question": "...", "answer": "...", "category": "..."}}]}}"""),
            ("human", "{text}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"text": state["raw_text"][:10000]})
        
        import json
        try:
            content = result.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            return json.loads(content)
        except:
            return {"questions": [], "raw_sections": state.get("parsed_sections", [])}
    
    async def _structure_policy(self, state: KnowledgeState) -> Dict:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Extract policy information. Return JSON:
            {{"title": "...", "effective_date": "...", "sections": [{{"heading": "...", "content": "...", "key_points": [...]}}]}}"""),
            ("human", "{text}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"text": state["raw_text"][:10000]})
        
        import json
        try:
            content = result.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            return json.loads(content)
        except:
            return {"sections": state.get("parsed_sections", [])}
    
    async def _structure_troubleshooting(self, state: KnowledgeState) -> Dict:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Extract troubleshooting guides. Return JSON:
            {{"guides": [{{"problem": "...", "symptoms": [...], "solution": "...", "steps": [...]}}]}}"""),
            ("human", "{text}")
        ])
        
        chain = prompt | self.llm
        result = await chain.ainvoke({"text": state["raw_text"][:10000]})
        
        import json
        try:
            content = result.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            return json.loads(content)
        except:
            return {"guides": [], "sections": state.get("parsed_sections", [])}
    
    async def _structure_general(self, state: KnowledgeState) -> Dict:
        return {
            "type": "general",
            "sections": state.get("parsed_sections", []),
            "summary": state["raw_text"][:500] + "..." if len(state["raw_text"]) > 500 else state["raw_text"]
        }
    
    async def validation_agent(self, state: KnowledgeState) -> KnowledgeState:

        logger.info("Validation agent processing")
        
        errors = state.get("errors", [])
        
        if not state.get("raw_text"):
            errors.append("No text content extracted")
        
        if not state.get("structured_content"):
            errors.append("No structured content generated")
        
        if len(state.get("raw_text", "")) < 50:
            errors.append("Content too short (less than 50 characters)")
        
        state["errors"] = errors
        state["validation_passed"] = len(errors) == 0
        
        logger.info("Validation agent completed", passed=state["validation_passed"], errors=errors)
        
        return state
    
    async def storage_agent(self, state: KnowledgeState) -> KnowledgeState:

        logger.info("Storage agent processing")
        
        try:
            text_chunks = self.text_splitter.split_text(state["raw_text"])
            
            documents = []
            chunk_info = []
            
            for i, chunk in enumerate(text_chunks):
                doc = Document(
                    page_content=chunk,
                    metadata={
                        "document_id": state["document_id"],
                        "organization_id": state["organization_id"],
                        "department_id": state.get("department_id"),
                        "knowledge_type": state["knowledge_type"],
                        "chunk_index": i,
                    }
                )
                documents.append(doc)
            
            vector_ids = await self.vector_store.add_documents(documents)
            
            for i, (chunk, vector_id) in enumerate(zip(text_chunks, vector_ids)):
                chunk_info.append({
                    "content": chunk,
                    "type": state["knowledge_type"],
                    "vector_id": vector_id,
                    "metadata": {
                        "chunk_index": i,
                        "total_chunks": len(text_chunks),
                    }
                })
            
            state["chunks"] = chunk_info
            logger.info("Storage agent completed", chunks_stored=len(chunk_info))
            
        except Exception as e:
            logger.error("Storage agent failed", error=str(e))
            state["errors"] = state.get("errors", []) + [f"Storage failed: {str(e)}"]
        
        return state
    
    async def run(
        self,
        file_path: str,
        file_type: str,
        organization_id: str,
        department_id: Optional[str],
        document_id: str
    ) -> Dict[str, Any]:
        initial_state: KnowledgeState = {
            "file_path": file_path,
            "file_type": file_type,
            "organization_id": organization_id,
            "department_id": department_id,
            "document_id": document_id,
            "raw_text": "",
            "raw_documents": [],
            "parsed_sections": [],
            "knowledge_type": "general",
            "structured_content": {},
            "chunks": [],
            "validation_passed": False,
            "errors": [],
            "metadata": {},
        }
        
        final_state = await self.graph.ainvoke(initial_state)
        
        return {
            "knowledge_type": final_state.get("knowledge_type", "general"),
            "structured_content": final_state.get("structured_content", {}),
            "chunks": final_state.get("chunks", []),
            "metadata": final_state.get("metadata", {}),
            "errors": final_state.get("errors", []),
        }
