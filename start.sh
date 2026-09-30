#!/bin/bash
set -e

# Run nginx on the port Railway expects (default 8080), API stays on 5000
PORT="${PORT:-8080}"
export ALLIUM_DB="${ALLIUM_DB:-/data/allium/api/allium.db}"

# substitusi port di config nginx lalu jalankan
mkdir -p /etc/nginx/sites-enabled
sed "s/listen 80 default_server;/listen ${PORT} default_server;/" \
    /etc/nginx/sites-available/allium > /etc/nginx/sites-available/allium-port
ln -sf /etc/nginx/sites-available/allium-port /etc/nginx/sites-enabled/allium

nginx -t
nginx

# inisialisasi DB bila belum ada
/opt/venv/bin/python -c "from app import init_db; init_db()"

# gunicorn di foreground (PID 1 child utama)
exec /opt/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 app:app
