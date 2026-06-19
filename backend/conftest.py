"""
pytest configuration for the PathPilot AI backend.

This file ensures that when pytest is invoked from either:
  - the project root:  python -m pytest backend/
  - the backend dir:   python -m pytest app/ml/test_recommender.py

...the `app` package is importable without needing to install the project
as an editable package.
"""
import sys
from pathlib import Path

# Add the backend/ directory to sys.path so `from app.xxx import yyy` works.
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
