#!/usr/bin/env python3
"""Database setup script"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.core.database.schema import setup_database
from app.core.database.sample_data import load_sample_data

if __name__ == "__main__":
    print("Setting up database...")
    setup_database()
    load_sample_data()
    print("Database setup complete!")
