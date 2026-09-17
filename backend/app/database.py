from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url, connect_args={"check_same_thread": False, "timeout": 15})


@event.listens_for(engine, "connect")
def sqlite_setup(connection, _):
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def migrate_gift_value(database_engine=engine):
    # Existing SQLite databases need the optional column before ORM queries run.
    with database_engine.begin() as connection:
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        columns = {column["name"] for column in inspect(connection).get_columns("presentes")}
        if "valor" not in columns:
            connection.exec_driver_sql("ALTER TABLE presentes ADD COLUMN valor NUMERIC(10, 2)")


def get_db():
    with SessionLocal() as db:
        yield db
