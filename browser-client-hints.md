# Hinweise für Browser-Client-Entwicklung

Bei der Entwicklung eines Browser-Clients für den MpdRestApiClient über HTTPS solltest du folgende Punkte beachten:

## 1. Umgang mit selbstsignierten Zertifikaten

Der Server verwendet ein selbstsigniertes Zertifikat für HTTPS. Dies kann zu Warnungen im Browser führen. Um das Problem "CORS-Anfrage schlug fehl mit Statuscode (null)" zu beheben:

- **Öffne die Server-URL direkt im Browser**: Bevor du API-Aufrufe tätigst, öffne `https://192.168.10.113:8443` direkt im Browser und akzeptiere das Sicherheitsrisiko manuell. Danach sollten die CORS-Requests funktionieren.

- **Verwende fetch mit spezifischen Optionen**:
```javascript
fetch('https://192.168.10.113:8443/player/currentsong', {
  method: 'GET',
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Accept': 'application/json'
  }
}).then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

- **XMLHttpRequest mit CORS**:
```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;
xhr.open('GET', 'https://192.168.10.113:8443/player/currentsong');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.onload = function() {
  if (xhr.status === 200) {
    console.log(JSON.parse(xhr.responseText));
  }
};
xhr.onerror = function() {
  console.error('Fehler bei der Anfrage. Statuscode: ' + xhr.status);
};
xhr.send();
```

## 2. Behandlung des Fehlers "Statuscode (null)"

Wenn du weiterhin den Fehler "Statuscode (null)" siehst:

1. **Stelle sicher, dass du das Zertifikat akzeptiert hast**: Öffne die HTTPS-URL direkt und akzeptiere das Risiko.

2. **Prüfe den Client-Origin**: Stelle sicher, dass der Origin deines Web-Clients in der `whitelist` der `config.json`-Datei des Servers steht.

3. **Erweiterte Browser-Optionen für Entwicklung**:
   - In Chrome: Starte mit `--disable-web-security --user-data-dir="C:/ChromeDev"` (Windows) oder `--disable-web-security --user-data-dir="/tmp/ChromeDev"` (Linux/Mac)
   - In Firefox: Installiere das Add-on "CORS Everywhere"

4. **Proxy verwenden**: Setze einen lokalen Entwicklungs-Proxy ein, der den CORS-Header hinzufügt.

## 3. WebSocket-Verbindung über HTTPS

Für WebSocket über HTTPS:

```javascript
const socket = new WebSocket('wss://192.168.10.113:8443');

socket.onopen = function(e) {
  console.log("WebSocket-Verbindung hergestellt");
};

socket.onmessage = function(event) {
  console.log(`Daten empfangen: ${event.data}`);
};

socket.onclose = function(event) {
  if (event.wasClean) {
    console.log(`Verbindung sauber geschlossen, code=${event.code} reason=${event.reason}`);
  } else {
    console.log('Verbindung unterbrochen');
  }
};

socket.onerror = function(error) {
  console.log(`WebSocket-Fehler: ${error.message}`);
};
```

## 4. Anfordern von CORS-Präflight-Antworten

Bei komplexen Anfragen sendet der Browser automatisch eine Präflight-Anfrage (OPTIONS). Diese wird bereits vom Server korrekt behandelt.
