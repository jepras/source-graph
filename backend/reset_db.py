#!/usr/bin/env python3
"""Database reset script"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.core.database.schema import reset_database

if __name__ == "__main__":
    print("⚠️  WARNING: This will delete ALL data from your database!")
    print("Are you sure you want to continue? (y/N): ", end="")

    response = input().strip().lower()
    if response in ["y", "yes"]:
        print("Resetting database...")
        reset_database()
        print("✅ Database reset complete!")
    else:
        print("❌ Database reset cancelled.")
