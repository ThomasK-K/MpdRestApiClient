# MPDRestApi

A Node.js based Music Player Daemon (MPD) client with REST API and WebSocket support. This application provides a modern interface to control your MPD server through HTTP and WebSocket protocols.

## Prerequisites

- Node.js >= 14
- MPD server running and accessible
- Environment variables configured

## Installation

```bash
git clone <repository-url>
cd myMpdClient
npm install
```

This README now includes:
1. Complete API documentation for all endpoints in your `player.ts`
2. Proper project structure documentation
3. Detailed configuration options
4. WebSocket event documentation
5. Error handling information
6. Development setup instructions

The documentation is based on your actual implementation in the project files and includes all available endpoints and features. Users of your API will have a clear understanding of how to interact with your MPD client through both REST API and WebSocket connections.

## Configuration

Environment variables are used for configuration. Create a `.env` file in the root of the project and add the following variables:

```dotenv
HOST=localhost           # Server host
PORT=3000               # HTTP server port
SOCKETPORT=3001         # WebSocket port
MPDPORTHOST=6600        # MPD server port
LASTFM_APIKEY=          # Your Last.fm API key for album artwork
PLAYLISTPATH=           # Path to MPD playlists
MUSICPATH=              # Path to music library
AUDIOSCROBBLER=         # Last.fm API endpoint
```

## Project Structure

The project is structured as follows:

```
myMpdClient/
├── src/
│   └── server/
│       ├── application/
│       │   ├── application.ts    # Main application setup
│       │   ├── mpdClient.ts      # MPD client implementation
│       │   └── ws.ts            # WebSocket handler
│       ├── data/
│       │   └── stations.json    # Radio stations configuration
│       ├── routes/
│       │   └── player.ts        # REST API routes
│       └── utils/
│           ├── getAlbumart.ts   # Album artwork fetcher
│           └── parseM3u.ts      # M3U playlist parser
```

### Features
Complete MPD server control via REST API
Real-time updates via WebSocket
Internet radio station support
Playlist management and M3U parsing
Album artwork retrieval via Last.fm API
Volume control and playback management
Artist and title search functionality
Current song and player status monitoring


## API Documentation

### REST API

#### Player Routes

- `GET /player`: Response: MPD status object (state, volume, song position, etc.)
- `GET /player/currentsong`: Response: Current song metadata
- `GET /player/listplaylists`: Response: Array of available playlists
- `GET /player/steuerung?command=<command>`: Control the player with the specified command.
  - Commands: play, pause, stop, next, previous
  - Response: Updated player status

- `GET /player/setvol?vol=<0-100>`: Set the volume to a specific level.
  - Response: `{ "vol": "<set_volume>" }`

- `GET /player/playstation?name=<station_url>`: Play a specific radio station.
  - Requirements: URL must start with "http:"
  - Response: `{ "name": "<station_url>" }`
  - Error (400): `"query param: url: http://xxx.com"`
  
- `GET /player/playlistcontent?name=<playlist_name>`: Get the content of a specific playlist.
  - Response: Array of songs in the playlist
  /////////////////////////////////////////////////////
- `GET /player/listallsongs`: Response: Array of all songs in the music library
- `GET /player/searchByArtist?artist=<artist_name>`: Response: Array of matching songs
- `GET /player/searchByTitle?title=<song_title>`: Response: Array of matching songs
- `GET /player/playsong?name=<song_path>`: Play a specific song by path.
  - Response: `{ "name": "<song_path>" }`
  - Error (400): `"query param: song: xxx.flac"`

### WebSocket API

- `onInit`: Fired when the WebSocket connection is established.
- `onError`: Fired when there is an error with the WebSocket connection.
- `onMessage`: Fired when a message is received from the server.
- `onClose`: Fired when the WebSocket connection is closed.

## Error Handling

Errors are handled using standard HTTP status codes. The client should check the status code of the response to determine if the request was successful or if an error occurred. Common status codes include:

- `200 OK`: The request was successful.
- `400 Bad Request`: The request was invalid or cannot be served.
- `401 Unauthorized`: Authentication is required and has failed or has not yet been provided.
- `403 Forbidden`: The request was valid, but the server is refusing action.
- `404 Not Found`: The requested resource could not be found.
- `500 Internal Server Error`: An error occurred on the server side.

## Development Setup

To set up the development environment, follow these steps:

1. Clone the repository.
2. Install the dependencies using `npm install`.The development server supports hot reloading, so changes to the source code will be automatically applied without needing to restart the server.
3. Create a `.env` file in the root of the project and configure the environment variables.4. Start the development server using `npm run dev`.The development server supports hot reloading, so changes to the source code will be automatically applied without needing to restart the server.ct is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.









