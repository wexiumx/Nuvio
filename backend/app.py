from __future__ import annotations

from core.app_factory import create_app
from core.db import init_db


# Create the Flask app instance using our factory setup.
app = create_app()


if __name__ == "__main__":
    # Ensure database tables exist before starting the server.
    init_db()
    # Run local development server.
    app.run(host="127.0.0.1", port=5000, debug=True)
