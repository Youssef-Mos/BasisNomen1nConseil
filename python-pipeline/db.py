"""
db.py — Gestion de la connexion PostgreSQL.

Fournit :
- get_connection()  : connexion brute (pour les lectures sans transaction)
- transaction()     : context manager avec commit / rollback automatique
- file_hash_exists(): vérification anti-doublon
"""

import logging
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PgConnection

from config import DATABASE_URL

logger = logging.getLogger(__name__)


def get_connection() -> PgConnection:
    """
    Ouvre et retourne une connexion psycopg2.

    La connexion doit être fermée manuellement par l'appelant.
    Préférer transaction() pour les opérations d'écriture.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        # Retourner les lignes sous forme de dict
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn
    except psycopg2.OperationalError as e:
        logger.error(f"Impossible de se connecter à PostgreSQL : {e}")
        raise


@contextmanager
def transaction() -> Generator[PgConnection, None, None]:
    """
    Context manager pour une transaction PostgreSQL.

    Usage :
        with transaction() as conn:
            # toutes les écritures ici
            # commit automatique à la sortie du bloc
            # rollback automatique en cas d'exception

    La connexion est fermée dans tous les cas.
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
        logger.debug("Transaction commitée.")
    except Exception:
        conn.rollback()
        logger.warning("Transaction annulée (rollback).")
        raise
    finally:
        conn.close()


def file_hash_exists(conn: PgConnection, file_hash: str) -> bool:
    """
    Retourne True si un Document avec ce hash SHA-256 existe déjà.

    Utilisé par scan_folder pour ignorer les PDF déjà ingérés.
    """
    with conn.cursor() as cur:
        cur.execute(
            'SELECT 1 FROM documents WHERE "fileHash" = %s LIMIT 1',
            (file_hash,),
        )
        return cur.fetchone() is not None
