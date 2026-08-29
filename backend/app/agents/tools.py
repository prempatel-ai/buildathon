"""
Agent Tools Schema Definitions for Groq LLM.
"""

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_and_compare",
            "description": "Cross-merchant product discovery and comparison tool. Queries catalog items across onboarded merchants, filters by query criteria (category, price, brand), and returns ranked comparison options to the customer. READ-ONLY: Does NOT trigger payment or order creation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query or product keywords (e.g., 'headphones', 'wireless earbuds')"},
                    "category": {"type": "string", "description": "Product category filter (e.g., 'Headphones', 'Electronics')"},
                    "max_price": {"type": "number", "description": "Maximum price cap in INR"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "propose_order",
            "description": "Propose a purchase order for a specific product and merchant for policy evaluation and authorization before payment execution.",
            "parameters": {
                "type": "object",
                "properties": {
                    "merchant_id": {"type": "string", "description": "UUID of target merchant"},
                    "amount": {"type": "number", "description": "Total amount in INR"},
                    "category": {"type": "string", "description": "Category of product being bought"},
                    "item_name": {"type": "string", "description": "Name of product being bought"}
                },
                "required": ["amount", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_catalog",
            "description": "Query single merchant catalog for available products, prices, and stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional product category filter"}
                },
                "required": []
            }
        }
    }
]
