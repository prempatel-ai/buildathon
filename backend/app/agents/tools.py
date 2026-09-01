"""
Agent Tools Schema Definitions for Groq & OpenAI-Compatible Function Calling.

Designed by Expert AI Systems Architecture:
- Strict JSON Schema constraints with rich semantic docstrings
- Clear separation between deterministic Read-Only queries vs State-Mutating proposals
- Precise parameter typing, boundary guidelines, and field-level descriptions
"""

from typing import List, Dict, Any

AGENT_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_and_compare",
            "description": (
                "Cross-merchant product discovery, ranking, and price comparison engine. "
                "Queries active catalog items across all verified onboarded merchants in the platform registry. "
                "Performs semantic keyword matching, category filtering, and budget clamping against user limits. "
                "READ-ONLY OPERATION: Does NOT trigger payment, lock inventory, or mutate database state."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Core search terms, product title keywords, or brand names to look up "
                            "(e.g., 'wireless noise cancelling headphones', 'smartwatch with heart rate monitor', 'whey protein isolate')."
                        )
                    },
                    "category": {
                        "type": "string",
                        "description": (
                            "Optional domain category filter to narrow discovery "
                            "(e.g., 'Electronics', 'Health & Fitness', 'Fashion', 'Home & Kitchen', 'General')."
                        )
                    },
                    "max_price": {
                        "type": "number",
                        "description": (
                            "Maximum budget ceiling in INR (₹). If the user mentions a price constraint like "
                            "'under 2000', 'budget of 1500', 'less than 500 INR', extract that numeric value here."
                        )
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "propose_order",
            "description": (
                "Constructs a structured purchase proposal for an item from a merchant catalog. "
                "Directs the proposed transaction into the multi-tier Bounded Policy Engine and Customer "
                "Spend Authorization gate for real-time risk evaluation before any payment execution occurs."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "Exact product name or SKU title being purchased (e.g., 'boAt Rockerz 450', 'FitGear Whey Protein 1kg')."
                    },
                    "merchant_id": {
                        "type": "string",
                        "description": "Optional UUID string of target merchant if already known from prior search results."
                    },
                    "amount": {
                        "type": "number",
                        "description": "Total order amount in INR (₹) corresponding to product unit price multiplied by quantity."
                    },
                    "category": {
                        "type": "string",
                        "description": "Primary classification category for the product (e.g., 'Electronics', 'Wearables', 'Health & Fitness')."
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of units to purchase (defaults to 1 if unspecified).",
                        "minimum": 1,
                        "default": 1
                    }
                },
                "required": ["item_name", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_catalog",
            "description": (
                "Retrieves the live product inventory, pricing, and stock levels from a specific merchant store. "
                "Use when the customer asks what is currently in stock, requests a store price list, or explores inventory. "
                "READ-ONLY OPERATION: Zero side effects."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category filter to subset merchant catalog items (e.g., 'Electronics', 'Accessories')."
                    }
                },
                "required": []
            }
        }
    }
]
