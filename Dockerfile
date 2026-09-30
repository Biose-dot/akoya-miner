FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx python3 python3-pip python3-venv sqlite3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir flask gunicorn

COPY html/ /data/allium/html/
COPY api/ /data/allium/api/
COPY conf/allium.conf /etc/nginx/sites-available/allium
RUN ln -sf /etc/nginx/sites-available/allium /etc/nginx/sites-enabled/allium \
    && rm -f /etc/nginx/sites-enabled/default

WORKDIR /data/allium/api
COPY start.sh /data/allium/start.sh
RUN chmod +x /data/allium/start.sh

# Railway injects $PORT; nginx listens on it via start.sh
EXPOSE 8080
CMD ["/data/allium/start.sh"]
