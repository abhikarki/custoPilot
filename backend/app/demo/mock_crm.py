from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


NOW = datetime(2026, 3, 14, 10, 30, 0)

# Single realistic mock customer profile for product showcase.
DEMO_CUSTOMER: Dict[str, Any] = {
    "customer_id": "cust_demo_001",
    "full_name": "Aarav Mehta",
    "email": "aarav.mehta@example.com",
    "phone": "+1-415-555-0192",
    "segment": "Loyal Plus",
    "lifetime_value": 1894.72,
    "default_address": {
        "line1": "245 Market Street",
        "line2": "Unit 18B",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105",
        "country": "US",
    },
    "preferences": {
        "contact_channel": "email",
        "sms_updates": True,
        "gift_wrap_default": False,
        "language": "en-US",
    },
    "risk_flags": {
        "chargeback_history": False,
        "high_refund_ratio": False,
        "fraud_watch": False,
    },
}

DEMO_ORDERS: List[Dict[str, Any]] = [
    {
        "order_id": "ORD-2026-10071",
        "placed_at": (NOW - timedelta(days=3, hours=5)).isoformat(),
        "status": "in_transit",
        "currency": "USD",
        "subtotal": 168.00,
        "shipping_fee": 8.99,
        "tax": 15.37,
        "total": 192.36,
        "payment_status": "captured",
        "payment_method": "visa_4242",
        "can_cancel": False,
        "can_refund": True,
        "estimated_delivery": (NOW + timedelta(days=1)).date().isoformat(),
        "tracking": {
            "carrier": "FedEx",
            "tracking_number": "784920174551",
            "last_scan": "Oakland, CA",
            "last_scan_at": (NOW - timedelta(hours=7)).isoformat(),
            "timeline": [
                {
                    "timestamp": (NOW - timedelta(days=3)).isoformat(),
                    "event": "Label created",
                    "location": "San Francisco, CA",
                },
                {
                    "timestamp": (NOW - timedelta(days=2, hours=18)).isoformat(),
                    "event": "Picked up by carrier",
                    "location": "San Francisco, CA",
                },
                {
                    "timestamp": (NOW - timedelta(days=1, hours=12)).isoformat(),
                    "event": "Departed sort facility",
                    "location": "Sacramento, CA",
                },
                {
                    "timestamp": (NOW - timedelta(hours=7)).isoformat(),
                    "event": "In transit",
                    "location": "Oakland, CA",
                },
            ],
        },
        "items": [
            {
                "sku": "NB-900-WHT-10",
                "name": "AeroRun Pro Sneakers",
                "qty": 1,
                "unit_price": 119.00,
            },
            {
                "sku": "SOCK-TRAIL-3PK",
                "name": "Trail Comfort Socks (3-Pack)",
                "qty": 1,
                "unit_price": 49.00,
            },
        ],
    },
    {
        "order_id": "ORD-2026-09994",
        "placed_at": (NOW - timedelta(days=21)).isoformat(),
        "status": "delivered",
        "currency": "USD",
        "subtotal": 89.00,
        "shipping_fee": 0.00,
        "tax": 8.14,
        "total": 97.14,
        "payment_status": "captured",
        "payment_method": "visa_4242",
        "can_cancel": False,
        "can_refund": True,
        "estimated_delivery": (NOW - timedelta(days=17)).date().isoformat(),
        "tracking": {
            "carrier": "UPS",
            "tracking_number": "1Z9X63E90384223312",
            "last_scan": "Delivered to front desk",
            "last_scan_at": (NOW - timedelta(days=17, hours=2)).isoformat(),
            "timeline": [
                {
                    "timestamp": (NOW - timedelta(days=21)).isoformat(),
                    "event": "Label created",
                    "location": "San Jose, CA",
                },
                {
                    "timestamp": (NOW - timedelta(days=20, hours=4)).isoformat(),
                    "event": "Origin scan",
                    "location": "San Jose, CA",
                },
                {
                    "timestamp": (NOW - timedelta(days=18, hours=12)).isoformat(),
                    "event": "Out for delivery",
                    "location": "San Francisco, CA",
                },
                {
                    "timestamp": (NOW - timedelta(days=17, hours=2)).isoformat(),
                    "event": "Delivered",
                    "location": "San Francisco, CA",
                },
            ],
        },
        "items": [
            {
                "sku": "JKT-WIND-XL",
                "name": "StormLite Windbreaker",
                "qty": 1,
                "unit_price": 89.00,
            }
        ],
    },
]

DEMO_REFUNDS: List[Dict[str, Any]] = [
    {
        "refund_id": "RFD-2026-0311-001",
        "order_id": "ORD-2026-09911",
        "amount": 24.99,
        "currency": "USD",
        "reason": "size_issue",
        "status": "processed",
        "created_at": (NOW - timedelta(days=9)).isoformat(),
        "resolved_at": (NOW - timedelta(days=7, hours=3)).isoformat(),
    }
]

DEMO_TICKETS: List[Dict[str, Any]] = [
    {
        "ticket_id": "TCK-9021",
        "topic": "Late shipment concern",
        "status": "resolved",
        "priority": "normal",
        "opened_at": (NOW - timedelta(days=44)).isoformat(),
        "closed_at": (NOW - timedelta(days=42)).isoformat(),
        "channel": "chat",
    },
    {
        "ticket_id": "TCK-9155",
        "topic": "Refund follow-up",
        "status": "open",
        "priority": "normal",
        "opened_at": (NOW - timedelta(days=1, hours=8)).isoformat(),
        "closed_at": None,
        "channel": "email",
    },
]

DEMO_POLICIES: Dict[str, Any] = {
    "cancellation": {
        "title": "Cancellation Policy",
        "summary": "Orders can be canceled only before carrier pickup.",
        "rules": [
            "If order status is 'processing', instant cancellation is allowed.",
            "If status is 'in_transit' or 'delivered', cancellation is not possible.",
            "For shipped orders, customer can request return/refund instead.",
        ],
    },
    "refund": {
        "title": "Refund Policy",
        "summary": "Returns are eligible within 30 days of delivery.",
        "rules": [
            "Refund request requires valid order ID and item condition check.",
            "Standard refunds are processed in 3-5 business days.",
            "Shipping fees are refundable only for damaged or incorrect items.",
        ],
    },
}

DEMO_TOOL_CATALOG: List[Dict[str, Any]] = [
    {
        "name": "get_customer_profile",
        "category": "crm.read",
        "description": "Fetches customer contact, segment and preference details.",
        "auth_required": "demo-session",
    },
    {
        "name": "list_customer_orders",
        "category": "orders.read",
        "description": "Lists recent order records and high-level statuses.",
        "auth_required": "demo-session",
    },
    {
        "name": "track_order",
        "category": "shipping.read",
        "description": "Returns latest shipping status and timeline scan events.",
        "auth_required": "demo-session",
    },
    {
        "name": "cancel_order",
        "category": "orders.write",
        "description": "Attempts cancellation when the order is still cancelable.",
        "auth_required": "demo-session",
    },
    {
        "name": "create_refund_request",
        "category": "refunds.write",
        "description": "Creates a refund case and returns payout ETA.",
        "auth_required": "demo-session",
    },
    {
        "name": "list_refunds",
        "category": "refunds.read",
        "description": "Shows historical and newly created refund cases.",
        "auth_required": "demo-session",
    },
]

# Future-facing connector contract users can map to real tools later.
DEMO_CONNECTOR_SCHEMA: Dict[str, Any] = {
    "version": "0.1",
    "title": "External Tool Connector Contract",
    "description": "Shape for plugging real CRM/ecommerce tools into chatbot flows.",
    "required_fields": ["connector_name", "provider", "auth_type", "capabilities"],
    "auth_types": ["api_key", "oauth2", "basic", "none"],
    "capability_examples": [
        "orders.read",
        "orders.write.cancel",
        "shipping.read.tracking",
        "refunds.write.create",
        "customers.read.profile",
    ],
    "runtime_fields": {
        "base_url": "https://api.vendor.com",
        "headers": {"Authorization": "Bearer {{token}}"},
        "timeouts_ms": 12000,
        "retry_policy": {"max_retries": 2, "backoff_ms": 500},
    },
}


def get_seed_snapshot() -> Dict[str, Any]:
    return {
        "chatbot": {
            "name": "Mercury Concierge",
            "description": "Demo support copilot for shipping, cancellation and refunds.",
            "persona": "Friendly ecommerce support specialist with tool access.",
        },
        "customer": deepcopy(DEMO_CUSTOMER),
        "orders": deepcopy(DEMO_ORDERS),
        "refunds": deepcopy(DEMO_REFUNDS),
        "tickets": deepcopy(DEMO_TICKETS),
        "policies": deepcopy(DEMO_POLICIES),
        "tool_catalog": deepcopy(DEMO_TOOL_CATALOG),
        "connector_schema": deepcopy(DEMO_CONNECTOR_SCHEMA),
        "suggested_prompts": [
            "Where is my order ORD-2026-10071 right now?",
            "Please cancel order ORD-2026-10071",
            "I want a refund for ORD-2026-09994 because the jacket size is wrong",
            "Show all my recent orders and refund status",
        ],
    }


def find_order(orders: List[Dict[str, Any]], order_id: str) -> Optional[Dict[str, Any]]:
    normalized = order_id.strip().upper()
    for order in orders:
        if order["order_id"].upper() == normalized:
            return order
    return None
