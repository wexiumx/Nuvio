from __future__ import annotations

from flask import Flask

from api.routes import register_routes


def create_app() -> Flask:
    # Build and configure one Flask app object.
    app = Flask(__name__)

    @app.after_request
    def add_cors_headers(response):
        # Allow local frontend files to call this API during development.
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    # Register all API endpoints from the routes module.
    register_routes(app)
    return app
