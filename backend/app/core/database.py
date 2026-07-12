from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.project import Project
from app.models.report import Report
import logging

async def init_db():
    try:
        logging.info(f"Connecting to MongoDB at {settings.MONGO_URI}...")
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verify connection to trigger selection timeout if MongoDB is offline
        await client.admin.command('ping')
        await init_beanie(database=client[settings.DATABASE_NAME], document_models=[User, Project, Report])
        logging.info("Connected to MongoDB and initialized Beanie")
    except Exception as e:
        logging.warning(f"Error connecting to MongoDB: {e}. Falling back to in-memory database using mongomock_motor.")
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            await init_beanie(database=client[settings.DATABASE_NAME], document_models=[User, Project, Report])
            logging.info("Initialized Beanie with in-memory database")
        except Exception as fallback_err:
            logging.error(f"Error initializing database fallback: {fallback_err}")
            raise fallback_err
