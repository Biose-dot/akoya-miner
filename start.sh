#!/bin/bash
set -e

# Run nginx on the port Railway expects (default 8080), API stays on 5000
PORT="${PORT:-8080}"
export ALLIUM_DB="${ALLIUM_DB:-/tmp/allium.db}"

# ganti placeholder listen di config nginx
sed "s/listen 80 default_server;/listen ${PORT} default_server;/" \
    /etc/nginx/sites-available/allium > /etc/nginx/sites-enabled/allium
rm -f /etc/nginx/sites-enabled/default

nginx -t
nginx

# inisialisasi DB bila belum ada
/opt/venv/bin/python -c "from app import init_db; init_db()"

# gunicorn di foreground
exec /opt/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 app:app
