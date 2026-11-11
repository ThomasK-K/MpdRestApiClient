# REST-API-Referenz

Die API steuert einen verbundenen Mopidy-Server. Alle Endpunkte verwenden `GET` und beginnen mit `/player`. Als Basisadresse gilt `http://<HOST>:<PORT>`; `HOST` und `PORT` werden über die Serverkonfiguration festgelegt. Bei aktiviertem HTTPS ist entsprechend `https://<HOST>:<HTTPS_PORT>` zu verwenden.

Query-Parameter müssen URL-kodiert werden. Beispiel:

```bash
curl "http://localhost:3001/player/search?artist=David%20Bowie&title=Heroes"
```

## Antwortformat

Erfolgreiche Antworten verwenden standardmäßig dieses JSON-Format:

```json
{
  "success": true,
  "data": {}
}
```

Fehlerantworten haben dieses Format:

```json
{
  "success": false,
  "error": "Fehlerbeschreibung"
}
```

Fehlende oder ungültige Parameter ergeben bei den entsprechend validierten Endpunkten HTTP `400`; Fehler bei der Ausführung ergeben üblicherweise HTTP `500`. Der Server kann Anfragen abhängig von seiner Netzwerkkonfiguration außerdem mit HTTP `403` ablehnen.

## Player und Wiedergabe

| Methode und Pfad | Query-Parameter | Beschreibung |
|---|---|---|
| `GET /player` | keine | Liefert den aktuellen Playerstatus. |
| `GET /player/steuerung` | `command` (erforderlich) | Führt einen Wiedergabebefehl aus: `play`, `pause`, `stop`, `next` oder `previous`. |
| `GET /player/setvol` | `vol` (0 bis 100) | Setzt die Lautstärke. |
| `GET /player/currentsong` | keine | Liefert Informationen zum aktuellen Titel. |
| `GET /player/playlist` | keine | Liefert die Titel in der aktuellen Wiedergabeliste. |
| `GET /player/playUri` | `uri` | Ersetzt die aktuelle Wiedergabeliste durch die angegebene URI und startet die Wiedergabe. |
| `GET /player/playPlaylist` | `name` | Lädt die benannte Mopidy-Wiedergabeliste und startet die Wiedergabe. |

### Beispiele

```bash
curl "http://localhost:3001/player"
curl "http://localhost:3001/player/steuerung?command=next"
curl "http://localhost:3001/player/setvol?vol=35"
curl "http://localhost:3001/player/currentsong"
curl "http://localhost:3001/player/playlist"
curl "http://localhost:3001/player/playPlaylist?name=Favoriten"
```

`/player/playUri` akzeptiert eine Mopidy-URI, zum Beispiel:

```bash
curl --get "http://localhost:3001/player/playUri" \
  --data-urlencode "uri=https://example.org/radio/stream"
```

## Wiedergabelisten und Radiosender

| Methode und Pfad | Query-Parameter | Beschreibung |
|---|---|---|
| `GET /player/listplaylists` | keine | Liefert die Namen der verfügbaren Mopidy-Wiedergabelisten. |
| `GET /player/playlistcontent` | `name` | Liefert den Inhalt der benannten Wiedergabeliste. |
| `GET /player/getStation` | `playlistname` (erforderlich), `stationname` (optional) | Ohne `stationname` wird der Inhalt der benannten Playlist geliefert. Mit `stationname` wird der passende Sender aus der M3U-Playlist gestartet. |

Beispiele:

```bash
curl "http://localhost:3001/player/listplaylists"
curl --get "http://localhost:3001/player/playlistcontent" \
  --data-urlencode "name=Favoriten"
curl --get "http://localhost:3001/player/getStation" \
  --data-urlencode "playlistname=Radio" \
  --data-urlencode "stationname=Example FM"
```

Wenn `stationname` angegeben ist, bezeichnet `playlistname` den Dateinamen der M3U-Playlist ohne `.m3u`. Der Server liest M3U-Dateien aus dem konfigurierten Playlist-Verzeichnis (`PLAYLISTPATH`). Ohne `stationname` wird `playlistname` als Name einer Mopidy-Playlist verwendet.

## Suche

| Methode und Pfad | Query-Parameter | Beschreibung |
|---|---|---|
| `GET /player/searchByArtist` | `name` (erforderlich) | Sucht Titel nach Künstler. |
| `GET /player/searchByAlbum` | `album` (erforderlich) | Sucht Titel nach Album. |
| `GET /player/searchByTitle` | `title` (erforderlich) | Sucht Titel nach Titelname. |
| `GET /player/search` | `artist` und `title` (beide erforderlich) | Sucht Titel nach Künstler und Titelname. |

Beispiele:

```bash
curl --get "http://localhost:3001/player/searchByArtist" \
  --data-urlencode "name=David Bowie"
curl --get "http://localhost:3001/player/searchByAlbum" \
  --data-urlencode "album=Heroes"
curl --get "http://localhost:3001/player/searchByTitle" \
  --data-urlencode "title=Life on Mars?"
curl --get "http://localhost:3001/player/search" \
  --data-urlencode "artist=David Bowie" \
  --data-urlencode "title=Heroes"
```

## Datentypen der Antworten

- Playerstatus (`GET /player`): `volume`, `repeat`, `random`, `single`, `consume`, `state` sowie positions- und audioabhängige Felder. `state` ist `play`, `pause` oder `stop`.
- Aktueller Titel (`GET /player/currentsong`): `file`, `artist`, `title`, `album` und `albumName`; Metadaten können je nach Quelle fehlen.
- Suchergebnisse und aktuelle Wiedergabeliste: Arrays von Titeln, typischerweise mit `file`, `title`, `artist`, `album`, `time` und/oder `duration`.
- Wiedergabelistennamen: Array aus Zeichenketten.
- Steuerungs-, Lautstärke- und Senderaufrufe geben ihren Status beziehungsweise den gesetzten Wert im `data`-Objekt zurück.

## Hinweise

Die Wiedergabesteuerung und die Suche verwenden Query-Parameter. Da Wiedergabe- und Lautstärkeaufrufe den Player verändern, sollte die API nur in vertrauenswürdigen Netzwerken beziehungsweise hinter einer geeigneten Zugriffskontrolle erreichbar sein.
