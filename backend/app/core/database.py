from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.core.config import settings

def create_db_engine():
    db_url = settings.sync_database_url
    try:
        if "sqlite" in db_url:
            eng = create_engine(db_url, connect_args={"check_same_thread": False})
        else:
            eng = create_engine(db_url, pool_pre_ping=True, pool_size=10, max_overflow=20, echo=False)
        # Test connection immediately
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception as e:
        print(f"Warning: Primary DB connection failed ({e}). Falling back to SQLite database.")
        return create_engine("sqlite:///./agentpay.db", connect_args={"check_same_thread": False})

engine = create_db_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
