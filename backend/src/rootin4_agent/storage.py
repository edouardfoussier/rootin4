"""Durable state for real results + probability history.

Cloud Run instances are ephemeral and can scale horizontally, so the
recorded results and the probability timeline live in a GCS bucket
(`ROOTIN4_STATE_BUCKET`). Local development falls back to JSON files
under `backend/.state/`. Reads are TTL-cached (30s) so a busy page
doesn't hammer GCS and a multi-instance deployment converges quickly
after a write.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path

from .settings import get_settings

logger = logging.getLogger(__name__)

_LOCAL_STATE_DIR = Path(__file__).resolve().parents[2] / ".state"
_READ_TTL_SECONDS = 30.0

_RESULTS_KEY = "results.json"
_HISTORY_KEY = "history.json"


class StateStore:
    """results.json + history.json on GCS (prod) or disk (dev)."""

    def __init__(self) -> None:
        self._bucket_name = get_settings().rootin4_state_bucket
        self._lock = threading.Lock()
        self._cache: dict[str, tuple[float, list[dict]]] = {}

    # -- backends ----------------------------------------------------------

    def _bucket(self):
        from google.cloud import storage  # lazy — only needed when configured

        return storage.Client().bucket(self._bucket_name)

    def _read(self, key: str) -> list[dict]:
        if self._bucket_name:
            blob = self._bucket().blob(key)
            if not blob.exists():
                return []
            return json.loads(blob.download_as_text())
        path = _LOCAL_STATE_DIR / key
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def _write(self, key: str, items: list[dict]) -> None:
        payload = json.dumps(items, ensure_ascii=False)
        if self._bucket_name:
            self._bucket().blob(key).upload_from_string(
                payload, content_type="application/json"
            )
        else:
            _LOCAL_STATE_DIR.mkdir(parents=True, exist_ok=True)
            (_LOCAL_STATE_DIR / key).write_text(payload, encoding="utf-8")

    # -- cached reads / invalidating writes --------------------------------

    def _cached(self, key: str) -> list[dict]:
        now = time.monotonic()
        with self._lock:
            hit = self._cache.get(key)
            if hit and now - hit[0] < _READ_TTL_SECONDS:
                return hit[1]
        try:
            items = self._read(key)
        except Exception:  # storage down ≠ service down
            logger.exception("state read failed for %s", key)
            items = self._cache.get(key, (0.0, []))[1]
        with self._lock:
            self._cache[key] = (now, items)
        return items

    def _store(self, key: str, items: list[dict]) -> None:
        self._write(key, items)
        with self._lock:
            self._cache[key] = (time.monotonic(), items)

    # -- public API ---------------------------------------------------------

    def load_results(self) -> list[dict]:
        return self._cached(_RESULTS_KEY)

    def save_results(self, items: list[dict]) -> None:
        self._store(_RESULTS_KEY, items)

    def load_history(self) -> list[dict]:
        return self._cached(_HISTORY_KEY)

    def append_history(self, snapshot: dict) -> None:
        # Writes are rare (one per real-world event) and operator-serial;
        # a read-modify-write straight from the backend is fine here.
        try:
            items = self._read(_HISTORY_KEY)
        except Exception:
            logger.exception("history read before append failed")
            items = list(self._cache.get(_HISTORY_KEY, (0.0, []))[1])
        items.append(snapshot)
        self._store(_HISTORY_KEY, items)


_store: StateStore | None = None
_store_lock = threading.Lock()


def get_store() -> StateStore:
    global _store
    with _store_lock:
        if _store is None:
            _store = StateStore()
        return _store
