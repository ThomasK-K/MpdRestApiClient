Um dein Node.js-Projekt (wie dieses) auf einem Nginx-Server zu deployen, gehst du typischerweise wie folgt vor:

### 1. Projekt auf den Server kopieren
- Übertrage den Projektordner per SCP, rsync oder Git auf deinen Server.

### 2. Abhängigkeiten installieren
Auf dem Server im Projektordner:
```bash
npm install
```

### 3. Anwendung bauen (falls nötig)
Falls du TypeScript verwendest:
```bash
npm run build
```
oder
```bash
tsc
```

### 4. Node.js-Anwendung starten
Nutze einen Prozessmanager wie `pm2`:
```bash
npm install -g pm2
pm2 start dist/server/server.js --name mpd-rest-api
pm2 save
```
Passe den Pfad ggf. an.

### 5. Nginx als Reverse Proxy einrichten
Bearbeite die Nginx-Konfiguration (z.B. `/etc/nginx/sites-available/default`):

```nginx
server {
    listen 80;
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000; # Port deiner Node.js-App
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Passe `server_name` und Port an.

Danach:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. (Optional) HTTPS mit Let’s Encrypt
Nutze z.B. Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx
```

---

Möchtest du eine Schritt-für-Schritt-Anleitung für einen bestimmten Server (z.B. Ubuntu) oder Hilfe bei der Konfiguration?