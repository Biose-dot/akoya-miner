#!/bin/bash
set -e

PORT="${PORT:-8080}"
export ALLIUM_DB="${ALLIUM_DB:-/tmp/allium.db}"

# ganti listen port dari config
sed "s/listen 80 default_server;/listen ${PORT} default_server;/" \
    /etc/nginx/sites-available/allium > /etc/nginx/sites-enabled/allium
rm -f /etc/nginx/sites-enabled/default

nginx -t
nginx

# init DB
cd /data/allium/api
/opt/venv/bin/python -c "from app import init_db; init_db()"

# gunicorn: module 'app' (app.py) ada di cwd ini
exec /opt/venv/bin/gunicorn -w 2 -b 127.0.0.1:5000 app:app
