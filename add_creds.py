#!/usr/bin/env python3
"""Add all 17 CDL credentials to Skyvern."""
import subprocess
import os
import json

os.environ["SKYVERN_API_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ5MzE2OTUwNDgsInN1YiI6Im9fNTYyODYzMzk0NjAyMTAyNTEwIn0.I-LSCVSlq-ByriMh7OWw6S5yqeaoONCPqdHQG3sQQW4"
os.environ["SKYVERN_BASE_URL"] = "https://api.skyvern.com"

credentials = [
    ("CDL - Company Owner", "owner@canaan.co.ke", "owner123"),
    ("CDL - CEO", "ceo@canaan.co.ke", "ceo123"),
    ("CDL - Office Manager", "om@canaan.co.ke", "om123"),
    ("CDL - Asset Manager", "am@canaan.co.ke", "am123"),
    ("CDL - Finance", "finance@canaan.co.ke", "finance123"),
    ("CDL - PM1", "pm1@canaan.co.ke", "pm123"),
    ("CDL - PM2", "pm2@canaan.co.ke", "pm123"),
    ("CDL - Engineer", "eng@canaan.co.ke", "eng123"),
    ("CDL - Store Manager", "sm@canaan.co.ke", "sm123"),
    ("CDL - SK Local", "sk.local@canaan.co.ke", "sk123"),
    ("CDL - SK Import", "sk.import@canaan.co.ke", "sk123"),
    ("CDL - SK Scaffolding", "sk.scaff@canaan.co.ke", "sk123"),
    ("CDL - Procurement Officer", "po@canaan.co.ke", "po123"),
    ("CDL - Transfer Officer", "to@canaan.co.ke", "to123"),
    ("CDL - Data Holder", "dh@canaan.co.ke", "dh123"),
    ("CDL - Site Overseer", "so@canaan.co.ke", "so123"),
    ("CDL - Admin", "admin@canaan.co.ke", "admin123"),
]

for name, username, password in credentials:
    print(f"Adding: {name} ({username})")
    result = subprocess.run(
        ["skyvern", "credentials", "add", "--name", name, "--type", "password",
         "--username", username, "--password", password],
        capture_output=True, text=True, timeout=30,
        env=os.environ
    )
    # The command might prompt for TOTP - we just send empty string
    if result.returncode != 0 and "TOTP" in result.stderr:
        result = subprocess.run(
            ["skyvern", "credentials", "add", "--name", name, "--type", "password",
             "--username", username, "--password", password],
            input="\n", capture_output=True, text=True, timeout=30,
            env=os.environ
        )
    print(f"  stdout: {result.stdout[:200]}")
    if result.stderr:
        print(f"  stderr: {result.stderr[:200]}")
    print(f"  exit: {result.returncode}")

# List credentials
print("\n--- All credentials ---")
result = subprocess.run(["skyvern", "credentials", "list"], capture_output=True, text=True, timeout=30, env=os.environ)
print(result.stdout)
if result.stderr:
    print(result.stderr)