from typing import TypedDict, Optional, List, Dict, Any
import structlog

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.core.config import settings
from app.agents.vector_store import VectorStoreManager
from app.mcp.tools import MCPTools

logger = structlog.get_logger()


class SupportState(TypedDict):
    user_message: str
    conversation_history: List[Dict[str, str]]
    organization_id: str
    department: Optional[str]
    document_ids: Optional[List[str]]
    
    intent: str
    entities: Dict[str, Any]
    routed_department: str
    knowledge_context: List[Dict[str, Any]]
    reasoning: str
    response: str
    confidence_score: float
    
    sources: List[Dict[str, Any]]
    should_escalate: bool
    agent_name: str
    langsmith_run_id: Optional[str]
    tool_calls: List[Dict[str, Any]]


class SupportAgentPipeline:
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0.3,
            openai_api_key=settings.OPENAI_API_KEY,
        )
        self.vector_store = VectorStoreManager()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(SupportState)
        
        workflow.add_node("intent_agent", self.intent_agent)
        workflow.add_node("router_agent", self.router_agent)
        workflow.add_node("retriever_agent", self.retriever_agent)
        workflow.add_node("reasoning_agent", self.reasoning_agent)
        workflow.add_node("response_agent", self.response_agent)
        workflow.add_node("confidence_agent", self.confidence_agent)
        workflow.add_node("tool_agent", self.tool_agent)
        
        workflow.set_entry_point("intent_agent")
        workflow.add_edge("intent_agent", "router_agent")
        workflow.add_edge("router_agent", "retriever_agent")
        workflow.add_edge("retriever_agent", "reasoning_agent")
        workflow.add_edge("reasoning_agent", "response_agent")
        workflow.add_edge("response_agent", "confidence_agent")
        workflow.add_edge("confidence_agent", "tool_agent")
        workflow.add_edge("tool_agent", END)
        
        return workflow.compile()
    
    async def intent_agent(self, state: SupportState) -> SupportState:

        logger.info("Intent agent processing")
        
        try:
            intent_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an intent classifier for customer support. Analyze the user message and:
                1. Classify the primary intent
                2. Extract relevant entities (product names, order numbers, etc.)
                
                Return JSON format:
                {{"intent": "greeting|question|complaint|request|feedback|other", "sub_intent": "specific_intent", "entities": {{"entity_type": "value"}}}}
                
                Common intents:
                - greeting: Hello, hi, etc.
                - question: Asking for information
                - complaint: Reporting problems
                - request: Asking for action
                - feedback: Providing feedback
                - billing: Payment or invoice related
                - technical: Technical issues
                - sales: Product inquiries"""),
                ("human", "User message: {message}\n\nConversation context: {context}")
            ])
            
            context = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in state.get("conversation_history", [])[-5:]
            ])
            
            chain = intent_prompt | self.llm
            result = await chain.ainvoke({
                "message": state["user_message"],
                "context": context or "No previous context"
            })
            
            import json
            try:
                content = result.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                parsed = json.loads(content)
                
                state["intent"] = parsed.get("intent", "question")
                state["entities"] = parsed.get("entities", {})
                
            except:
                state["intent"] = "question"
                state["entities"] = {}
            
            logger.info("Intent agent completed", intent=state["intent"])
            
        except Exception as e:
            logger.error("Intent agent failed", error=str(e))
            state["intent"] = "question"
            state["entities"] = {}
        
        return state
    
    async def router_agent(self, state: SupportState) -> SupportState:

        logger.info("Router agent processing", intent=state.get("intent"))
        
        try:
            intent_to_department = {
                "billing": "billing",
                "technical": "technical_support",
                "sales": "sales",
                "complaint": "customer_service",
                "feedback": "customer_service",
            }
            
            if state.get("department"):
                state["routed_department"] = state["department"]
            else:
                state["routed_department"] = intent_to_department.get(
                    state.get("intent", ""),
                    "general_support"
                )
            
            logger.info("Router agent completed", department=state["routed_department"])
            
        except Exception as e:
            logger.error("Router agent failed", error=str(e))
            state["routed_department"] = "general_support"
        
        return state
    
    async def retriever_agent(self, state: SupportState) -> SupportState:

        logger.info("Retriever agent processing", department=state.get("routed_department"))
        
        try:
            query = state["user_message"]
            
            if state.get("entities"):
                entity_text = " ".join(str(v) for v in state["entities"].values())
                query = f"{query} {entity_text}"
            
            # Build filter - use document_ids if available, otherwise organization_id
            if state.get("document_ids"):
                search_filter = {"document_id": {"$in": state["document_ids"]}}
            else:
                search_filter = {"organization_id": state["organization_id"]}
            
            logger.info("Retriever filter", filter=search_filter)
            
            results = await self.vector_store.similarity_search(
                query=query,
                k=5,
                filter=search_filter
            )
            
            knowledge_context = []
            for doc, score in results:
                # Note: Chroma returns distance (lower is better), not similarity
                # Include results with distance < 1.5 (adjust threshold as needed)
                if score < 1.5: 
                    knowledge_context.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "relevance_score": 1 - (score / 2),  # Convert distance to similarity-like score
                    })
            
            state["knowledge_context"] = knowledge_context
            state["sources"] = [
                {
                    "document_id": ctx["metadata"].get("document_id"),
                    "relevance": ctx["relevance_score"],
                }
                for ctx in knowledge_context
            ]
            
            logger.info("Retriever agent completed", results_found=len(knowledge_context))
            
        except Exception as e:
            logger.error("Retriever agent failed", error=str(e))
            state["knowledge_context"] = []
            state["sources"] = []
        
        return state
    
    async def reasoning_agent(self, state: SupportState) -> SupportState:

        logger.info("Reasoning agent processing")
        
        try:
            reasoning_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a reasoning agent for customer support. Given the user's query and knowledge context:
                1. Analyze what the user needs
                2. Determine if the knowledge context can answer the question
                3. Identify any policies or rules that apply
                4. Formulate a logical approach to answering
                
                Be concise. If the knowledge doesn't contain relevant information, state that clearly.
                
                Return your reasoning in 2-3 sentences."""),
                ("human", """User query: {query}
                
Intent: {intent}
Department: {department}

Knowledge context:
{context}

Previous conversation:
{history}

Provide your reasoning:""")
            ])
            
            context_text = "\n\n".join([
                f"[Source {i+1}]: {ctx['content'][:500]}..."
                for i, ctx in enumerate(state.get("knowledge_context", []))
            ]) or "No relevant knowledge found."
            
            history_text = "\n".join([
                f"{msg['role']}: {msg['content']}"
                for msg in state.get("conversation_history", [])[-3:]
            ]) or "No previous conversation."
            
            chain = reasoning_prompt | self.llm
            result = await chain.ainvoke({
                "query": state["user_message"],
                "intent": state.get("intent", "unknown"),
                "department": state.get("routed_department", "general"),
                "context": context_text,
                "history": history_text,
            })
            
            state["reasoning"] = result.content
            logger.info("Reasoning agent completed")
            
        except Exception as e:
            logger.error("Reasoning agent failed", error=str(e))
            state["reasoning"] = "Unable to fully analyze the query. Proceeding with available information."
        
        return state
    
    async def response_agent(self, state: SupportState) -> SupportState:
        logger.info("Response agent processing")
        
        try:
            response_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a helpful AI assistant. Generate a direct, friendly response.

Guidelines:
- Be concise and direct - answer the question without unnecessary filler
- Use the knowledge context to provide accurate information
- If you don't have enough information, acknowledge it briefly
- DO NOT include sign-offs like "Best regards", "[Your Name]", "Customer Support Team"
- DO NOT include phrases like "If you have any further questions, feel free to ask"
- Just answer the question naturally and conversationally
- Don't make up information not in the context

Reasoning from analysis: {reasoning}"""),
                ("human", """User: {query}

Available knowledge:
{context}

Generate a helpful response (be direct, no formal sign-offs):""")
            ])
            
            context_text = "\n\n".join([
                ctx['content'][:800]
                for ctx in state.get("knowledge_context", [])
            ]) or "No specific knowledge available for this query."
            
            chain = response_prompt | self.llm
            result = await chain.ainvoke({
                "query": state["user_message"],
                "context": context_text,
                "reasoning": state.get("reasoning", ""),
                "department": state.get("routed_department", "general"),
            })
            
            state["response"] = result.content
            state["agent_name"] = "response_agent"
            
            logger.info("Response agent completed")
            
        except Exception as e:
            logger.error("Response agent failed", error=str(e))
            state["response"] = "I apologize, but I'm having trouble generating a response. Let me connect you with a support team member who can help."
            state["agent_name"] = "response_agent_fallback"
        
        return state
    
    async def confidence_agent(self, state: SupportState) -> SupportState:

        logger.info("Confidence agent processing")
        
        try:
            confidence_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a quality assessor. Evaluate how well the response answers the user's question.
                
            Consider:
            1. Does the response directly answer what the user asked?
            2. Is the answer found in the provided knowledge/context?
            3. Is the information factual and specific (not vague)?

            Return a JSON with:
            {{"confidence": 0.0-1.0, "reason": "brief explanation", "should_escalate": true/false}}

            Confidence levels:
            - 0.85-1.0: Answer is directly from the knowledge, factually correct and complete
            - 0.7-0.85: Answer is well-supported, minor gaps are acceptable
            - 0.5-0.7: Answer is partially supported, some guessing involved
            - 0.3-0.5: Answer has significant uncertainty or gaps
            - 0.0-0.3: Cannot answer reliably, needs human help

            IMPORTANT: If the response contains a specific factual answer that matches the knowledge context, 
            give HIGH confidence (0.85+). Simple factual questions with clear answers should score high."""),
                            ("human", """User query: {query}

            Generated response: {response}

            Knowledge available: {has_knowledge}

            Reasoning: {reasoning}

            Evaluate:""")
                        ])
            
            chain = confidence_prompt | self.llm
            result = await chain.ainvoke({
                "query": state["user_message"],
                "response": state.get("response", ""),
                "has_knowledge": "Yes" if state.get("knowledge_context") else "No relevant knowledge found",
                "reasoning": state.get("reasoning", ""),
            })
            
            import json
            try:
                content = result.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                parsed = json.loads(content)
                
                state["confidence_score"] = float(parsed.get("confidence", 0.5))
                state["should_escalate"] = parsed.get("should_escalate", False)
                
            except:
                state["confidence_score"] = 0.6
                state["should_escalate"] = False
            
            if state["confidence_score"] < settings.CONFIDENCE_THRESHOLD:
                state["should_escalate"] = True
            
            logger.info(
                "Confidence agent completed",
                confidence=state["confidence_score"],
                escalate=state["should_escalate"]
            )
            
        except Exception as e:
            logger.error("Confidence agent failed", error=str(e))
            state["confidence_score"] = 0.5
            state["should_escalate"] = True
        
        return state
    
    async def tool_agent(self, state: SupportState) -> SupportState:
        """Agent that autonomously decides whether to use tools based on context"""
        
        logger.info("Tool agent processing", 
                   confidence=state.get("confidence_score"),
                   should_escalate=state.get("should_escalate"))
        
        state["tool_calls"] = []
        
        # Only consider tool use if escalation is warranted
        if not state.get("should_escalate"):
            logger.info("Tool agent: No escalation needed, skipping tool calls")
            return state
        
        try:
            tool_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a tool-calling agent for customer support. Based on the conversation context, decide if you should notify a human support agent via SMS.

Available tool: send_escalation_sms
- Use for: Frustrated/angry customers, urgent issues, explicit human help requests, complex problems
- DON'T use for: Simple low-confidence responses, routine questions, greetings

Analyze the conversation and decide:
1. Should you send an SMS notification to alert human support?
2. If yes, what urgency level? (low/medium/high)

Return JSON:
{{"use_sms": true/false, "urgency": "low|medium|high", "reason": "brief reason"}}

Guidelines for urgency:
- high: Customer is angry, threatening, or has urgent time-sensitive issue
- medium: Customer is confused, frustrated, or has important unresolved issue  
- low: Routine escalation, customer is patient"""),
                ("human", """User message: {user_message}

Conversation history:
{history}

Customer intent: {intent}
Confidence score: {confidence}
AI Response given: {response}

Should you send SMS notification to human support?""")
            ])
            
            history_text = "\n".join([
                f"{msg['role']}: {msg['content']}"
                for msg in state.get("conversation_history", [])[-5:]
            ]) or "No previous conversation."
            
            chain = tool_prompt | self.llm
            result = await chain.ainvoke({
                "user_message": state["user_message"],
                "history": history_text,
                "intent": state.get("intent", "unknown"),
                "confidence": state.get("confidence_score", 0.5),
                "response": state.get("response", "")[:200],
            })
            
            import json
            try:
                content = result.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]
                parsed = json.loads(content)
                
                if parsed.get("use_sms"):
                    # Agent decided to send SMS - execute the tool
                    logger.info("Tool agent: Sending SMS notification", 
                               urgency=parsed.get("urgency"),
                               reason=parsed.get("reason"))
                    
                    sms_result = await MCPTools.send_escalation_sms(
                        conversation_id=state.get("organization_id", "unknown"),
                        customer_message=state["user_message"],
                        urgency=parsed.get("urgency", "medium"),
                        reason=parsed.get("reason", "Escalation requested")
                    )
                    
                    state["tool_calls"].append({
                        "tool": "send_escalation_sms",
                        "result": sms_result,
                        "reasoning": parsed.get("reason")
                    })
                    
                    logger.info("Tool agent: SMS sent", result=sms_result)
                else:
                    logger.info("Tool agent: Decided not to send SMS", 
                               reason=parsed.get("reason"))
                    
            except Exception as parse_error:
                logger.warning("Tool agent: Could not parse response", error=str(parse_error))
            
        except Exception as e:
            logger.error("Tool agent failed", error=str(e))
        
        return state
    
    async def run(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        organization_id: str,
        department: Optional[str] = None,
        department_ids: Optional[List[str]] = None,
        document_ids: Optional[List[str]] = None,
        chatbot_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
       
        initial_state: SupportState = {
            "user_message": user_message,
            "conversation_history": conversation_history,
            "organization_id": organization_id,
            "department": department,
            "document_ids": document_ids,
            "intent": "",
            "entities": {},
            "routed_department": "",
            "knowledge_context": [],
            "reasoning": "",
            "response": "",
            "confidence_score": 0.0,
            "sources": [],
            "should_escalate": False,
            "agent_name": "",
            "langsmith_run_id": None,
            "tool_calls": [],
        }
        
        final_state = await self.graph.ainvoke(initial_state)
        
        return {
            "response": final_state.get("response", ""),
            "intent": final_state.get("intent", ""),
            "entities": final_state.get("entities", {}),
            "department": final_state.get("routed_department", ""),
            "confidence_score": final_state.get("confidence_score", 0.0),
            "sources": final_state.get("sources", []),
            "should_escalate": final_state.get("should_escalate", False),
            "agent_name": final_state.get("agent_name", "support_pipeline"),
            "langsmith_run_id": final_state.get("langsmith_run_id"),
            "tool_calls": final_state.get("tool_calls", []),
        }
