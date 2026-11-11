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
- Mopidy server with its HTTP/WebSocket frontend enabled
- Last.fm API key (for album artwork)

## Environment Configuration
Create a `.env` file in the root directory with the following variables:

```properties
HOST=localhost          # Server host
PORT=8000              # HTTP server port
SOCKETPORT=3001        # WebSocket port
MOPIDYHOST=localhost  # Mopidy server host
MOPIDYPORT=6680       # Mopidy HTTP/WebSocket port
LASTFM_APIKEY=        # Your Last.fm API key
PLAYLISTPATH=         # Path to local M3U playlists
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

The REST API endpoints and their query parameters are documented in the [API reference](docs/API.md).

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