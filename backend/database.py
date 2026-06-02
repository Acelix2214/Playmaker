"""
Database configuration and connection management
"""
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Get the database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.warning("⚠️  DATABASE_URL environment variable is not set. Database operations will be disabled.")

# Create database engine lazily
engine = None
SessionLocal = None

# Base class for models
Base = declarative_base()

def get_engine():
    """Get or create database engine lazily"""
    global engine
    if engine is None and DATABASE_URL:
        try:
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Test connection before using
                echo=False  # Set to True for SQL debugging
            )
            # Test the connection
            with engine.connect() as conn:
                logger.info("✅ Database connection established")
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            engine = None
    return engine

def get_session_local():
    """Get or create SessionLocal lazily"""
    global SessionLocal
    if SessionLocal is None:
        eng = get_engine()
        if eng:
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return SessionLocal

def get_db():
    """Dependency to get database session"""
    session_factory = get_session_local()
    if session_factory is None:
        logger.error("Database session factory not available")
        return None
    
    db = session_factory()
    try:
        yield db
    finally:
        db.close()