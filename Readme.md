# MPD RestApi Client

A modern Music Player Daemon (MPD) client with REST API and WebSocket support.

## Features
- REST API for MPD control
- WebSocket support for real-time updates
- Last.fm integration for album artwork and metadata
- Cross-platform compatibility
- TypeScript implementation

## Prerequisites
- Node.js >= 14.0.0
- MPD server running
- Last.fm API key (for album artwork)

## Environment Configuration
Create a `.env` file in the root directory with the following variables:

```properties
HOST=localhost          # Server host
PORT=8000              # HTTP server port
SOCKETPORT=3001        # WebSocket port
MPDPORTHOST=6600      # MPD server port
LASTFM_APIKEY=        # Your Last.fm API key
PLAYLISTPATH=         # Path to MPD playlists
MUSICPATH=            # Path to music library
AUDIOSCROBBLER=http://ws.audioscrobbler.com/2.0

# HTTPS Configuration (optional)
HTTPS_ENABLED=false      # Set to true to enable HTTPS
HTTPS_PORT=8443          # HTTPS server port
SSL_KEY_PATH=            # Path to SSL private key file
SSL_CERT_PATH=           # Path to SSL certificate file
```

For detailed instructions on HTTPS setup, see [ssl_setup.md](ssl_setup.md).

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## API Documentation

### REST Endpoints

| Endpoint | Method | Description | Query Parameters |
|----------|--------|-------------|------------------|
| `/player/status` | GET | Get current player status | None |
| `/player/currentsong` | GET | Get current song info | None |
| `/player/steuerung` | GET | Control playback | `command=play\|pause\|stop\|next\|previous` |
| `/player/setvol` | GET | Set volume | `vol=0-100` |
| `/player/listplaylists` | GET | Get playlists | None |
| `/player/listallsongs` | GET | Get all songs | None |
| `/player/searchByArtist` | GET | Search by artist | `artist=name` |
| `/player/searchByTitle` | GET | Search by title | `title=name` |
| `/player/playsong` | GET | Play song | `name=path` |
| `/player/playstation` | GET | Play radio station | `playlistname=name&stationname=station` |

### WebSocket Events
- `onInit`: Connection established
- `onError`: Connection error
- `onMessage`: New message received
- `onClose`: Connection closed

## Error Handling
Standard HTTP status codes are used:
- 200: Success
- 400: Bad Request
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## License
MIT License