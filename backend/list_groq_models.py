import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import groq

client = groq.Groq(api_key=settings.GROQ_API_KEY)
models = client.models.list()
for m in models.data:
    print(f"Model ID: {m.id}")
