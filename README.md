# Allium — Website & Dashboard

Landing page modern + dashboard dengan autentikasi user (daftar/masuk/keluar).

**Stack:** nginx (reverse proxy + static) · Flask (API auth) · SQLite (persisten) · Gunicorn

## Struktur

```
├── Dockerfile      # image produksi (Debian slim + nginx + venv)
├── start.sh        # entrypoint: nginx di $PORT Railway + gunicorn di :5000
├── html/           # landing page, login, dashboard (HTML/CSS/JS vanilla)
├── api/app.py      # Flask API: /api/daftar, /api/masuk, /api/me, /api/keluar
└── conf/           # config nginx (rate limit, cache, security headers)
```

## Keamanan

- Password: PBKDF2-SHA256, 310.000 iterasi + salt unik per user
- Session: cookie HttpOnly, SameSite=Lax, token acak 256-bit, TTL 7 hari
- Rate limit: 10 req/menit per IP untuk endpoint login/daftar
- Security headers: nosniff, SAMEORIGIN, referrer-policy

## Deploy

Railway otomatis pakai `Dockerfile` + `$PORT`. SQLite tersimpan di container —
untuk persistensi antar-deploy, pasang volume Railway di mount `/data/allium/api`.
