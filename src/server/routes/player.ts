/**
 * Define all your Web routes
 *
 * @author TKK
 */

import { Router, Request, Response } from "express";
import * as express from "express";
import type { Query } from "express-serve-static-core";
import { MpdConnection } from "../application";
import {
  ApiResponse,
  PlayerStatus,
  PlaylistItem,
  CurrentSong,
} from "../interfaces/responses";

const player = Router();

// Middleware for parsing JSON bodies
player.use(express.json());

// Constants
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;

// Error messages
const ERROR_MESSAGES = {
  NO_VOLUME: "Volume parameter is required",
  NO_COMMAND: "Command parameter is required",
  NO_SONG: "Song name parameter is required",
  INVALID_URL: "Invalid URL format. Must start with http://",
  NO_PLAYLIST: "Playlist name is required",
  NO_ARTIST: "Artist name is required",
  NO_TITLE: "Title parameter is required",
  INVALID_VOLUME: "Volume must be between 0 and 100",
};

// Valid commands for player control
const VALID_COMMANDS = ["play", "pause", "stop", "next", "previous"] as const;
type PlayerCommand = (typeof VALID_COMMANDS)[number];

// Helper functions
const sendResponse = <T>(
  res: Response,
  data: T,
  success = true,
  statusCode = HTTP_OK
) => {
  res
    .status(statusCode)
    .set("Content-Type", "application/json")
    .json({
      success,
      data,
    });
};

const handleError = (
  res: Response,
  message: string,
  statusCode = HTTP_SERVER_ERROR
) => {
  res
    .status(statusCode)
    .set("Content-Type", "application/json")
    .json({
      success: false,
      error: message,
    });
};

// Helper function to convert MPD status to PlayerStatus
const convertToPlayerStatus = (mpdStatus: any): PlayerStatus => ({
  volume: mpdStatus.volume,
  repeat: mpdStatus.repeat,
  random: mpdStatus.random || false,
  single: mpdStatus.single || false,
  consume: mpdStatus.consume || false,
  state: mpdStatus.state,
  song: mpdStatus.song,
  songid: mpdStatus.songid,
  bitrate: mpdStatus.bitrate,
  elapsed: mpdStatus.elapsed,
  duration: mpdStatus.duration,
  audio: mpdStatus.audio,
});

// Route handlers
player.get("/", async (_req: Request, res: Response) => {
  try {
    const mpdStatus = await MpdConnection.getStatus();
    const playerStatus = convertToPlayerStatus(mpdStatus);
    sendResponse<PlayerStatus>(res, playerStatus);
  } catch (error) {
    handleError(res, error.message);
  }
});
player.get("/currentsong", async (_req: Request, res: Response) => {
  try {
    const song = await MpdConnection.getCurrentSong();
    const currentSong: CurrentSong = {
      file: song.file || "",
      artist: song.artist,
      title: song.title,
      album: song.album,
      albumName: song.albumname,
    };
    sendResponse<CurrentSong>(res, currentSong);
  } catch (error) {
    handleError(res, error.message);
  }
});
player.get("/listplaylists", async (_req: Request, res: Response) => {
  try {
    const list = await MpdConnection.getAllPlaylists();
    const playlists = list.map((item) => item.playlist);
    sendResponse<string[]>(res, playlists);
  } catch (error) {
    handleError(res, error.message);
  }
});

player.get(
  "/steuerung",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { command } = req.query;

      if (!command) {
        return handleError(res, ERROR_MESSAGES.NO_COMMAND, HTTP_BAD_REQUEST);
      }

      if (!VALID_COMMANDS.includes(command as PlayerCommand)) {
        return handleError(
          res,
          `Invalid command. Must be one of: ${VALID_COMMANDS.join(", ")}`,
          HTTP_BAD_REQUEST
        );
      }

      const playerStatus = await MpdConnection.steuerung(command as string);
      sendResponse(res, { status: playerStatus });
    } catch (error) {
      handleError(res, error.message);
    }
  }
);
player.get(
  "/setvol",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { vol } = req.query;

      if (!vol) {
        return handleError(res, ERROR_MESSAGES.NO_VOLUME, HTTP_BAD_REQUEST);
      }

      const volume = parseInt(vol as string);
      if (isNaN(volume) || volume < 0 || volume > 100) {
        return handleError(res, ERROR_MESSAGES.INVALID_VOLUME, HTTP_BAD_REQUEST);
      }

      await MpdConnection.setVol(volume.toString());
      sendResponse(res, { volume });
    } catch (error) {
      handleError(res, error.message);
    }
  }
);
player.get(
  "/playstation",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { playlistname, stationname } = req.query;

      // ###############   read playlist, getUrlbyName and play station
      const playerStatus = await MpdConnection.playstation(
        playlistname as string,
        stationname as string
      );
      sendResponse(res, { status: playerStatus });
    } catch (error) {
      handleError(res, error.message);
    }
  }
);

player.get(
  "/playlistcontent",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { name } = req.query;
      const content = await MpdConnection.listPlaylist(
        (name as string) || null
      );

      sendResponse<any>(res, content);
    } catch (error) {
      handleError(res, error.message);
    }
  }
);
/////////////////////////////////////////////////////////////////////////////
player.get("/playlist", async (_req: Request, res: Response) => {
  try {
    const playlist = await MpdConnection.playlist();
    // const playerStatus = convertToPlayerStatus(mpdStatus);
    sendResponse(res, playlist);
  } catch (error) {
    handleError(res, error.message);
  }
});

player.get("/listallsongs", async (_req: Request, res: Response) => {
  try {
    const songs = await MpdConnection.listall();
    const playlistItems: PlaylistItem[] = songs.map((song) => ({
      file: song.file,
      title: song.title,
      artist: song.artist,
      album: song.album,
      time: song.time,
      duration: song.duration ? parseFloat(song.duration) : undefined,
    }));
    sendResponse<PlaylistItem[]>(res, playlistItems);
  } catch (error) {
    handleError(res, error.message);
  }
});

player.get(
  "/playsong",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { name } = req.query;

      if (!name) {
        return handleError(res, ERROR_MESSAGES.NO_SONG, HTTP_BAD_REQUEST);
      }

      await MpdConnection.playStation(name as string);
      sendResponse(res, { name });
    } catch (error) {
      handleError(res, error.message);
    }
  }
);

// player.get("/playlistcontent", async (req: Request<{}, {}, {}, Query>, res: Response) => {
//   try {
//     const { name } = req.query;

//     if (!name) {
//       return sendError(res, ERROR_MESSAGES.NO_PLAYLIST);
//     }

//     const m3uItems = await MpdConnection.listPlaylist(name as string||null);
//     const playlistItems: PlaylistItem[] = m3uItems.map(item => ({
//       file: item.file,
//       title: item.song
//     }));
//     sendResponse<PlaylistItem[]>(res, playlistItems);
//   } catch (error) {
//     handleError(res, error);
//   }
// });

player.get(
  "/searchByArtist",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { artist } = req.query;

      if (!artist) {
        return handleError(res, ERROR_MESSAGES.NO_ARTIST, HTTP_BAD_REQUEST);
      }

      const files = await MpdConnection.searchByArtist(artist as string);
      const playlistItems: PlaylistItem[] = files.map((file) => ({
        file: file,
      }));
      sendResponse<PlaylistItem[]>(res, playlistItems);
    } catch (error) {
      handleError(res, error.message);
    }
  }
);

player.get(
  "/searchByTitle",
  async (req: Request<{}, {}, {}, Query>, res: Response) => {
    try {
      const { title } = req.query;

      if (!title) {
        return handleError(res, ERROR_MESSAGES.NO_TITLE, HTTP_BAD_REQUEST);
      }

      const files = await MpdConnection.searchByTitle(title as string);
      const playlistItems: PlaylistItem[] = files.map((file) => ({
        file: file,
      }));
      sendResponse<PlaylistItem[]>(res, playlistItems);
    } catch (error) {
      handleError(res, error.message);
    }
  }
);

export default player;
