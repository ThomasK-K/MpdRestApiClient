# Deployment-Anleitung für MpdRestApiClient

Diese Anleitung beschreibt, wie du den MpdRestApiClient auf einem Server mit Nginx als Reverse Proxy deployen kannst, mit Unterstützung für HTTPS.

## 1. Projekt auf den Server kopieren

Übertrage den Projektordner auf deinen Server:

```bash
# Mit SCP
scp -r MpdRestApiClient/ benutzername@deinserver:/pfad/zur/installation/

# Oder mit Git
git clone https://github.com/ThomasK-K/MpdRestApiClient.git
```

## 2. Abhängigkeiten installieren

Wechsle in das Projektverzeichnis und installiere die Abhängigkeiten:

```bash
cd MpdRestApiClient
npm install --production  # --production Flag für nur Produktionsabhängigkeiten
```

## 3. Konfiguration anpassen

Erstelle eine `.env`-Datei mit der korrekten Konfiguration:

```bash
cp .env.example .env  # Falls eine Beispieldatei existiert
nano .env             # Bearbeite die Konfiguration
```

Wichtige Einstellungen in der `.env`-Datei:

```properties
HOST=0.0.0.0          # Um auf allen Netzwerkschnittstellen zu hören
PORT=3000             # HTTP-Port
SOCKETPORT=3001       # WebSocket-Port
MPDHOST=localhost     # MPD-Server-Host
MPDPORTHOST=6600      # MPD-Server-Port
LASTFM_APIKEY=        # Last.fm API-Key für Albumcover

# HTTPS-Konfiguration (optional, wenn du direktes HTTPS ohne Nginx möchtest)
HTTPS_ENABLED=true
HTTPS_PORT=3443
SSL_KEY_PATH=/etc/letsencrypt/live/deine-domain.de/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/deine-domain.de/fullchain.pem
```

## 4. Anwendung bauen

Kompiliere die TypeScript-Dateien:

```bash
npm run build
# Oder für eine saubere Neuinstallation
npm run rebuild
```

Prüfe, ob die Dateien korrekt erstellt wurden:
```bash
ls -la dist/server/
```

## 5. SSL-Zertifikate vorbereiten

### Option A: Mit Let's Encrypt (für öffentliche Server)

```bash
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d deine-domain.de
```

### Option B: Selbstsignierte Zertifikate (für Entwicklung/interne Nutzung)

```bash
mkdir -p ssl
openssl genrsa -out ssl/key.pem 2048
openssl req -new -x509 -key ssl/key.pem -out ssl/cert.pem -days 365
```

Aktualisiere die Pfade in der `.env`-Datei oder in `config.json` entsprechend.

## 6. Node.js-Anwendung starten

### Mit PM2 (empfohlen für Produktion)

```bash
# PM2 installieren, falls nicht vorhanden
npm install -g pm2

# App starten
pm2 start dist/server/server.js --name mpd-rest-api

# App beim Systemstart automatisch starten
pm2 startup
pm2 save
```

### Mit SystemD (alternative Option)

Erstelle eine SystemD-Service-Datei unter `/etc/systemd/system/mpd-rest-api.service`:

```ini
[Unit]
Description=MPD REST API Client
After=network.target

[Service]
Type=simple
User=deinbenutzer
WorkingDirectory=/pfad/zu/MpdRestApiClient
ExecStart=/usr/bin/node dist/server/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Starte den Service:

```bash
sudo systemctl enable mpd-rest-api
sudo systemctl start mpd-rest-api
```

## 7. Nginx als Reverse Proxy einrichten

### Für HTTP und HTTPS

```nginx
server {
    listen 80;
    server_name deine-domain.de;
    
    # Weiterleitung auf HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name deine-domain.de;
    
    # SSL-Konfiguration
    ssl_certificate /etc/letsencrypt/live/deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.de/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    # HTTP-API-Endpunkte
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket-Endpunkte
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Überprüfe die Konfiguration und lade Nginx neu:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Firewall konfigurieren

Erlaube nur notwendige Ports:

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

## 9. Überwachung und Logs

### PM2-Logs überprüfen

```bash
pm2 logs mpd-rest-api   # Live-Logs
pm2 monit               # Monitoring-Dashboard
```

### Nginx-Logs überprüfen

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 10. CORS-Konfiguration

Die CORS-Einstellungen werden in der `config.json` konfiguriert. Stelle sicher, dass die Origins deiner Client-Anwendungen hinzugefügt sind:

```json
{
  "whitelist": [
    "https://deine-client-domain.de",
    "https://192.168.10.113:8443",
    "http://localhost:8080"
  ],
  "whitelistIPRanges": ["::1", "192.168.10.0/24", "127.0.0.1"]
}
```

## 11. Problembehebung

Falls Probleme auftreten, überprüfe die folgenden Punkte:

- **Zugriffsprobleme:** Überprüfe die IP-Whitelist und CORS-Konfiguration
- **HTTPS-Fehler:** Überprüfe die SSL-Zertifikate und Berechtigungen
- **Verbindungsfehler zu MPD:** Stelle sicher, dass der MPD-Server läuft und erreichbar ist
- **WebSocket-Fehler:** Überprüfe die Nginx-Konfiguration für WebSockets

### Diagnose-Befehle

```bash
# HTTP-Verbindung testen
curl -v http://localhost:3000/player/currentsong

# HTTPS-Verbindung mit selbstsignierten Zertifikaten testen
curl -v -k https://localhost:3443/player/currentsong

# CORS-Anfrage simulieren
curl -v -k -H "Origin: https://deine-client-domain.de" https://localhost:3443/player/currentsong

# MPD-Verbindung prüfen
telnet localhost 6600
```

Weitere Informationen zur Browser-Client-Entwicklung und zum Umgang mit CORS-Problemen findest du in der Datei [browser-client-hints.md](browser-client-hints.md).
