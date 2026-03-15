from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import Flask, jsonify, request

from core.db import get_db


def utc_now_iso() -> str:
    # Keep timestamps in UTC for consistent tracking.
    return datetime.now(timezone.utc).isoformat()


def register_routes(app: Flask) -> None:
    # Save one page visit event.
    @app.route("/api/track", methods=["POST", "OPTIONS"])
    def track_view():
        if request.method == "OPTIONS":
            return ("", 204)

        payload: dict[str, Any] = request.get_json(silent=True) or {}
        page = str(payload.get("page") or "unknown")
        session_id = str(payload.get("session_id") or "")

        with get_db() as conn:
            conn.execute(
                "INSERT INTO page_views (page, session_id, created_at) VALUES (?, ?, ?)",
                (page, session_id, utc_now_iso()),
            )

        return jsonify({"ok": True})

    # Save one feedback/support message.
    @app.route("/api/feedback", methods=["POST", "OPTIONS"])
    def feedback():
        if request.method == "OPTIONS":
            return ("", 204)

        payload: dict[str, Any] = request.get_json(silent=True) or {}
        message = str(payload.get("message") or "").strip()
        page = str(payload.get("page") or "")

        if not message:
            return jsonify({"ok": False, "error": "Message is required."}), 400

        with get_db() as conn:
            conn.execute(
                "INSERT INTO feedback (message, page, created_at) VALUES (?, ?, ?)",
                (message, page, utc_now_iso()),
            )

        return jsonify({"ok": True})

    # Return simple dashboard stats for learning/testing.
    @app.route("/api/stats", methods=["GET"])
    def stats():
        with get_db() as conn:
            total_views = conn.execute("SELECT COUNT(*) AS c FROM page_views").fetchone()["c"]
            total_feedback = conn.execute("SELECT COUNT(*) AS c FROM feedback").fetchone()["c"]
            top_pages = conn.execute(
                """
                SELECT page, COUNT(*) AS views
                FROM page_views
                GROUP BY page
                ORDER BY views DESC
                LIMIT 10
                """
            ).fetchall()

        return jsonify(
            {
                "total_views": total_views,
                "total_feedback": total_feedback,
                "top_pages": [dict(row) for row in top_pages],
            }
        )

    # Health endpoint to confirm API is alive.
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"ok": True, "service": "nuvio-backend"})
