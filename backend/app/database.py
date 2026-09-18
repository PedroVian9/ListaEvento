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


def migrate_schema(database_engine=engine):
    # Existing SQLite databases need new columns before ORM queries run.
    with database_engine.begin() as connection:
        connection.exec_driver_sql("BEGIN IMMEDIATE")
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if "presentes" in tables:
            columns = {column["name"] for column in inspector.get_columns("presentes")}
            if "valor" not in columns:
                connection.exec_driver_sql("ALTER TABLE presentes ADD COLUMN valor NUMERIC(10, 2)")
            if "tipo" not in columns:
                connection.exec_driver_sql("ALTER TABLE presentes ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'PRODUTO'")
            if "chave_pix" not in columns:
                connection.exec_driver_sql("ALTER TABLE presentes ADD COLUMN chave_pix VARCHAR(150) NOT NULL DEFAULT ''")
            if "banco_pix" not in columns:
                connection.exec_driver_sql("ALTER TABLE presentes ADD COLUMN banco_pix VARCHAR(30) NOT NULL DEFAULT ''")
        if "convidados" in tables:
            columns = {column["name"] for column in inspector.get_columns("convidados")}
            if "convidado_por" not in columns:
                connection.exec_driver_sql("ALTER TABLE convidados ADD COLUMN convidado_por VARCHAR(20) NOT NULL DEFAULT 'AMBOS'")


def migrate_gift_value(database_engine=engine):
    # Backwards-compatible entry point used by older deployments and tests.
    migrate_schema(database_engine)


def get_db():
    with SessionLocal() as db:
        yield db
