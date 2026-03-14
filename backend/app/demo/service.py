from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
import re
from typing import Any, Dict, List, Optional
import uuid

from app.demo.mock_crm import find_order, get_seed_snapshot


class DemoCRMService:
    """Stateful in-memory demo data and mock MCP-like tool actions."""

    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def ensure_session(self, session_id: Optional[str] = None) -> str:
        sid = (session_id or str(uuid.uuid4())).strip()
        if sid not in self._sessions:
            seed = get_seed_snapshot()
            self._sessions[sid] = {
                "created_at": datetime.utcnow().isoformat(),
                "chatbot": seed["chatbot"],
                "customer": seed["customer"],
                "orders": seed["orders"],
                "refunds": seed["refunds"],
                "tickets": seed["tickets"],
                "policies": seed["policies"],
                "tool_catalog": seed["tool_catalog"],
                "connector_schema": seed["connector_schema"],
                "suggested_prompts": seed["suggested_prompts"],
                "messages": [
                    {
                        "role": "assistant",
                        "content": (
                            "Hi, I am Mercury Concierge. I can track shipping, attempt cancellations, "
                            "and create refund requests using demo CRM tools."
                        ),
                        "tool_calls": [],
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                ],
                "audit": [],
            }
        return sid

    def get_state(self, session_id: str) -> Dict[str, Any]:
        return self._sessions[session_id]

    def get_public_snapshot(self, session_id: str) -> Dict[str, Any]:
        state = self.get_state(session_id)
        return {
            "session_id": session_id,
            "chatbot": deepcopy(state["chatbot"]),
            "customer": deepcopy(state["customer"]),
            "orders": deepcopy(state["orders"]),
            "refunds": deepcopy(state["refunds"]),
            "tickets": deepcopy(state["tickets"]),
            "policies": deepcopy(state["policies"]),
            "tool_catalog": deepcopy(state["tool_catalog"]),
            "suggested_prompts": deepcopy(state["suggested_prompts"]),
            "audit": deepcopy(state["audit"]),
        }

    def get_connector_schema(self, session_id: str) -> Dict[str, Any]:
        return deepcopy(self.get_state(session_id)["connector_schema"])

    def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        return deepcopy(self.get_state(session_id)["messages"])

    def append_user_message(self, session_id: str, content: str) -> None:
        self.get_state(session_id)["messages"].append(
            {
                "role": "user",
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "tool_calls": [],
            }
        )

    def append_assistant_message(self, session_id: str, content: str, tool_calls: List[Dict[str, Any]]) -> None:
        self.get_state(session_id)["messages"].append(
            {
                "role": "assistant",
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "tool_calls": tool_calls,
            }
        )

    def _audit(self, session_id: str, action: str, payload: Dict[str, Any]) -> None:
        self.get_state(session_id)["audit"].append(
            {
                "timestamp": datetime.utcnow().isoformat(),
                "action": action,
                "payload": payload,
            }
        )

    def get_customer_profile(self, session_id: str) -> Dict[str, Any]:
        customer = deepcopy(self.get_state(session_id)["customer"])
        self._audit(session_id, "get_customer_profile", {"customer_id": customer["customer_id"]})
        return customer

    def list_customer_orders(self, session_id: str) -> List[Dict[str, Any]]:
        orders = deepcopy(self.get_state(session_id)["orders"])
        self._audit(session_id, "list_customer_orders", {"count": len(orders)})
        return orders

    def track_order(self, session_id: str, order_id: str) -> Dict[str, Any]:
        state = self.get_state(session_id)
        order = find_order(state["orders"], order_id)
        if not order:
            result = {"ok": False, "error": f"Order {order_id} was not found"}
            self._audit(session_id, "track_order_failed", result)
            return result

        result = {
            "ok": True,
            "order_id": order["order_id"],
            "status": order["status"],
            "estimated_delivery": order.get("estimated_delivery"),
            "tracking": deepcopy(order.get("tracking", {})),
        }
        self._audit(session_id, "track_order", {"order_id": order["order_id"]})
        return result

    def cancel_order(self, session_id: str, order_id: str, reason: str) -> Dict[str, Any]:
        state = self.get_state(session_id)
        order = find_order(state["orders"], order_id)
        if not order:
            result = {"ok": False, "error": f"Order {order_id} does not exist"}
            self._audit(session_id, "cancel_order_failed", result)
            return result

        if not order.get("can_cancel"):
            result = {
                "ok": False,
                "order_id": order["order_id"],
                "status": order["status"],
                "error": "Order is already picked up by carrier and cannot be canceled.",
                "next_best_action": "create_refund_request",
            }
            self._audit(session_id, "cancel_order_blocked", {"order_id": order["order_id"], "reason": reason})
            return result

        order["status"] = "canceled"
        order["can_cancel"] = False
        order["can_refund"] = False
        result = {
            "ok": True,
            "order_id": order["order_id"],
            "status": order["status"],
            "message": "Order canceled before shipment.",
        }
        self._audit(session_id, "cancel_order", {"order_id": order["order_id"], "reason": reason})
        return result

    def create_refund_request(self, session_id: str, order_id: str, reason: str) -> Dict[str, Any]:
        state = self.get_state(session_id)
        order = find_order(state["orders"], order_id)
        if not order:
            result = {"ok": False, "error": f"Order {order_id} does not exist"}
            self._audit(session_id, "create_refund_failed", result)
            return result

        if not order.get("can_refund"):
            result = {
                "ok": False,
                "order_id": order["order_id"],
                "error": "This order is not eligible for refund in demo policy.",
            }
            self._audit(session_id, "create_refund_blocked", result)
            return result

        refund_id = f"RFD-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        amount = round(float(order["total"]), 2)
        eta = (datetime.utcnow() + timedelta(days=4)).date().isoformat()
        refund = {
            "refund_id": refund_id,
            "order_id": order["order_id"],
            "amount": amount,
            "currency": order["currency"],
            "reason": reason,
            "status": "submitted",
            "created_at": datetime.utcnow().isoformat(),
            "resolved_at": None,
            "estimated_payout_date": eta,
        }
        state["refunds"].insert(0, refund)

        result = {
            "ok": True,
            "refund": deepcopy(refund),
            "message": "Refund request created successfully.",
        }
        self._audit(session_id, "create_refund_request", {"order_id": order["order_id"], "refund_id": refund_id})
        return result

    def list_refunds(self, session_id: str) -> List[Dict[str, Any]]:
        refunds = deepcopy(self.get_state(session_id)["refunds"])
        self._audit(session_id, "list_refunds", {"count": len(refunds)})
        return refunds


class DemoChatService:
    def __init__(self, crm: DemoCRMService) -> None:
        self.crm = crm

    def _extract_order_id(self, text: str) -> Optional[str]:
        match = re.search(r"ORD-\d{4}-\d{5}", text.upper())
        return match.group(0) if match else None

    def _extract_reason(self, text: str) -> str:
        lowered = text.lower()
        if "wrong size" in lowered or "size" in lowered:
            return "size_issue"
        if "damaged" in lowered:
            return "damaged_item"
        if "late" in lowered:
            return "late_delivery"
        if "cancel" in lowered:
            return "customer_cancellation"
        return "customer_request"

    def _is_shipping_intent(self, text: str) -> bool:
        lowered = text.lower()
        return any(token in lowered for token in ["where", "track", "shipping", "shipment", "delivery status", "in transit"])

    def _is_cancel_intent(self, text: str) -> bool:
        lowered = text.lower()
        return "cancel" in lowered

    def _is_refund_intent(self, text: str) -> bool:
        lowered = text.lower()
        return any(token in lowered for token in ["refund", "return", "money back"])

    def _is_summary_intent(self, text: str) -> bool:
        lowered = text.lower()
        return any(token in lowered for token in ["recent orders", "all orders", "order list", "profile", "customer data"])

    def process(self, session_id: str, user_message: str) -> Dict[str, Any]:
        self.crm.append_user_message(session_id, user_message)
        order_id = self._extract_order_id(user_message)
        reason = self._extract_reason(user_message)
        tool_calls: List[Dict[str, Any]] = []

        if self._is_summary_intent(user_message):
            customer = self.crm.get_customer_profile(session_id)
            orders = self.crm.list_customer_orders(session_id)
            refunds = self.crm.list_refunds(session_id)
            tool_calls.extend(
                [
                    {"tool": "get_customer_profile", "ok": True},
                    {"tool": "list_customer_orders", "ok": True, "count": len(orders)},
                    {"tool": "list_refunds", "ok": True, "count": len(refunds)},
                ]
            )
            latest_order = orders[0]["order_id"] if orders else "N/A"
            response = (
                f"Customer {customer['full_name']} is in segment {customer['segment']}. "
                f"There are {len(orders)} recent orders and {len(refunds)} refund cases. "
                f"Latest order is {latest_order}."
            )
            self.crm.append_assistant_message(session_id, response, tool_calls)
            return {"content": response, "tool_calls": tool_calls}

        if self._is_shipping_intent(user_message):
            if not order_id:
                orders = self.crm.list_customer_orders(session_id)
                order_id = orders[0]["order_id"] if orders else ""
                tool_calls.append({"tool": "list_customer_orders", "ok": True, "fallback_used": True})
            tracked = self.crm.track_order(session_id, order_id)
            tool_calls.append({"tool": "track_order", **tracked})
            if tracked.get("ok"):
                t = tracked["tracking"]
                response = (
                    f"Order {tracked['order_id']} is currently '{tracked['status']}'. "
                    f"Last scan: {t.get('last_scan')} at {t.get('last_scan_at')}. "
                    f"Estimated delivery: {tracked.get('estimated_delivery')}."
                )
            else:
                response = tracked["error"]
            self.crm.append_assistant_message(session_id, response, tool_calls)
            return {"content": response, "tool_calls": tool_calls}

        if self._is_cancel_intent(user_message):
            if not order_id:
                response = "Please share the order ID in format ORD-YYYY-12345 so I can try canceling it."
                self.crm.append_assistant_message(session_id, response, tool_calls)
                return {"content": response, "tool_calls": tool_calls}
            canceled = self.crm.cancel_order(session_id, order_id, reason)
            tool_calls.append({"tool": "cancel_order", **canceled})
            if canceled.get("ok"):
                response = f"Done. {canceled['order_id']} was canceled successfully."
            else:
                response = (
                    f"I could not cancel {canceled.get('order_id', order_id)} because: {canceled['error']} "
                    "I can create a refund request instead."
                )
            self.crm.append_assistant_message(session_id, response, tool_calls)
            return {"content": response, "tool_calls": tool_calls}

        if self._is_refund_intent(user_message):
            if not order_id:
                response = "Please provide the order ID (example: ORD-2026-09994) so I can create a refund request."
                self.crm.append_assistant_message(session_id, response, tool_calls)
                return {"content": response, "tool_calls": tool_calls}
            created = self.crm.create_refund_request(session_id, order_id, reason)
            tool_calls.append({"tool": "create_refund_request", **created})
            if created.get("ok"):
                refund = created["refund"]
                response = (
                    f"Refund {refund['refund_id']} is submitted for {refund['order_id']} "
                    f"({refund['currency']} {refund['amount']}). Expected payout by {refund['estimated_payout_date']}."
                )
            else:
                response = created["error"]
            self.crm.append_assistant_message(session_id, response, tool_calls)
            return {"content": response, "tool_calls": tool_calls}

        # Default branch: provide guided capabilities and call profile tool to keep tool visibility.
        customer = self.crm.get_customer_profile(session_id)
        tool_calls.append({"tool": "get_customer_profile", "ok": True})
        response = (
            f"I can help {customer['full_name']} with shipping status, cancellation attempts, "
            "and refund creation. Try: 'Track ORD-2026-10071' or 'Refund ORD-2026-09994 for size issue'."
        )
        self.crm.append_assistant_message(session_id, response, tool_calls)
        return {"content": response, "tool_calls": tool_calls}


demo_crm_service = DemoCRMService()
demo_chat_service = DemoChatService(demo_crm_service)
