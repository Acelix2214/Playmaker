"""
Initialize database tables
"""
from database import Base, get_engine
from models import User

def init_db():
    """Create all database tables"""
    engine = get_engine()
    if engine is None:
        print("❌ Failed to initialize database - engine not available")
        return False
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully!")
    return True

if __name__ == "__main__":
    init_db()