#!/usr/bin/env python3
"""Allium — auth API (Flask + SQLite)."""
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

from flask import Flask, g, jsonify, make_response, request

DB_PATH = os.environ.get("ALLIUM_DB", str(Path(__file__).parent / "allium.db"))
TOKEN_TTL = 60 * 60 * 24 * 7  # 7 days

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            pw_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """
    )
    conn.commit()
    conn.close()


def hash_pw(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000).hex()


def clean_expired():
    db().execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
    db().commit()


def current_user():
    token = request.cookies.get("allium_session", "")
    if not token:
        return None
    row = db().execute(
        """SELECT u.id, u.name, u.email, u.created_at FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token = ? AND s.expires_at > ?""",
        (token, int(time.time())),
    ).fetchone()
    return row


def bad(msg, code=400):
    return make_response(jsonify(error=msg), code)


# ---------------- endpoints ----------------
@app.post("/api/daftar")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not (1 <= len(name) <= 80):
        return bad("Nama wajib diisi (maks 80 karakter).")
    if not EMAIL_RE.match(email) or len(email) > 254:
        return bad("Format email tidak valid.")
    if len(password) < 8 or len(password) > 128:
        return bad("Kata sandi minimal 8 karakter.")

    salt = secrets.token_bytes(16)
    pw_hash = hash_pw(password, salt)
    now = int(time.time())

    try:
        cur = db().execute(
            "INSERT INTO users (name, email, pw_hash, salt, created_at) VALUES (?,?,?,?,?)",
            (name, email, pw_hash, salt.hex(), now),
        )
        db().commit()
    except sqlite3.IntegrityError:
        return bad("Email sudah terdaftar. Silakan masuk.", 409)

    user_id = cur.lastrowid
    return _issue_session(user_id, 201)


@app.post("/api/masuk")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    row = db().execute(
        "SELECT id, pw_hash, salt FROM users WHERE email = ?", (email,)
    ).fetchone()

    # constant-time-ish: always compute a hash
    salt = bytes.fromhex(row["salt"]) if row else b"\x00" * 16
    candidate = hash_pw(password, salt)
    if not row or not hmac.compare_digest(candidate, row["pw_hash"]):
        return bad("Email atau kata sandi salah.", 401)

    return _issue_session(row["id"], 200)


def _issue_session(user_id: int, code: int):
    clean_expired()
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + TOKEN_TTL
    db().execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)",
        (token, user_id, expires),
    )
    db().commit()
    resp = make_response(jsonify(ok=True), code)
    resp.set_cookie(
        "allium_session", token,
        max_age=TOKEN_TTL, httponly=True, samesite="Lax",
        secure=request.is_secure, path="/",
    )
    return resp


@app.get("/api/me")
def me():
    user = current_user()
    if not user:
        return bad("Tidak terautentikasi.", 401)
    return jsonify(
        id=user["id"], name=user["name"], email=user["email"],
        created_at=user["created_at"],
    )


@app.post("/api/keluar")
def logout():
    token = request.cookies.get("allium_session", "")
    if token:
        db().execute("DELETE FROM sessions WHERE token = ?", (token,))
        db().commit()
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie("allium_session", path="/")
    return resp


@app.errorhandler(404)
def not_found(_e):
    return bad("Endpoint tidak ditemukan.", 404)


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=False)
