import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.agents.tools import AGENT_TOOLS
import groq

client = groq.Groq(api_key=settings.GROQ_API_KEY)

system_msg = (
    "You are an AI Consumer Shopping Assistant assisting a customer across stores.\n"
    "You have access to tools: `search_and_compare`, `propose_order`, `get_catalog`.\n\n"
    "RULES:\n"
    "1. If the user is chatting, greeting ('hi', 'hello', 'hi buddy'), asking general questions, or saying thank you, DO NOT call any tool. Simply respond conversationally to assist the user.\n"
    "2. If the user wants to search, compare, find, or get recommendations for products or prices ('find cheap headphones'), call `search_and_compare`.\n"
    "3. If the user explicitly asks to buy or order a product ('buy option 1', 'buy boAt headphones'), call `propose_order`."
)

models_to_try = ["groq/compound", "groq/compound-mini", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]

test_prompts = [
    "hi buddy",
    "find cheap headphones",
    "buy option 1"
]

for p in test_prompts:
    print(f"\n--- Testing Prompt: '{p}' ---")
    for m in models_to_try:
        try:
            res = client.chat.completions.create(
                model=m,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": p}
                ],
                tools=AGENT_TOOLS,
                tool_choice="auto",
                temperature=0.0
            )
            msg = res.choices[0].message
            tool_calls = msg.tool_calls
            if tool_calls:
                tc = tool_calls[0]
                print(f"Model [{m}] -> PROPOSED TOOL CALL: '{tc.function.name}' | Args: {tc.function.arguments}")
            else:
                print(f"Model [{m}] -> CONVERSATIONAL REPLY (No Tool Call): '{msg.content}'")
            break
        except Exception as e:
            print(f"Model [{m}] failed: {e}")
