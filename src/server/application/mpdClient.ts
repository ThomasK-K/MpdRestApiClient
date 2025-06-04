import mpd, { MPD } from "mpd2";
import * as path from "path";
// import loadImageandAlbum from "../utils/getAlbumart";
import { loadfile as loadImageandAlbum, parseM3UFile } from "../utils";

import { WS } from "./ws";

var debug = require("debug")("mpdclient");

type MpdStatus = "disconnected" | "connecting" | "reconnecting" | "ready";

type m3udata = {
  song: string;
  file: string;
  icon?: string;
};

type m3ustation = {
  name: string;
  url: string;
  icon: string;
};

type Status = {
  volume: number;
  repeat: boolean;
  random: boolean;
  single: boolean;
  consume: boolean;
  playlist: number;
  state: "play" | "stop" | "pause";
  playlistlength: number;
  song: number;
  songid: number;
  bitrate: number;
  elapsed?: number;
  duration?: number;
  audio?: string;
  nextsong?: number;
  nextsongid?: number;
};
type Song = {
  file: string;
  title: string; // artist - title
  name: string; // station
  Id: number;
  artist?: string;
  album?: string;
  time?: string;
  duration?: string;
};
type DispSong = {
  artist: string;
  title: string;
  station?: string;
  album?: string;
  albumname?: string;
  wiki?: string;
  file?: string;
  time?: string;
  duration?: string;
};
type playlist = {
  playlist: string;
  // "last modified":string
};
const MpcStatus = Object.freeze({
  disconnected: 1,
  connecting: 2,
  reconnecting: 3,
  ready: 4,
});

export class MpdConnection {
  // Statische Eigenschaft, um die einzige Instanz der Klasse zu speichern
  private static connection: MpdConnection;
  private static mpdClient: MPD.Client;
  private static mpdStatus = MpcStatus.disconnected;
  private static previousSong: DispSong = null;

  // Privater Konstruktor verhindert die Instanziierung von außerhalb der Klasse
  private constructor() {
    // console.log("Eine neue MpdConnection wurde erstellt.");
  }
  // Statische Methode, um die einzige Instanz der Klasse zurückzugeben
  static getConnection(): MpdConnection {
    if (!MpdConnection.connection) {
      MpdConnection.connection = new MpdConnection();
    }
    return MpdConnection.connection;
  }
  ////  Getter   #############################################
  static async getPlayerStatus(): Promise<string> {
    const stat = await MpdConnection.getStatus();
    // const status = mpd.parseObject(stat);
    return stat.state;
  }
  static async getStatus(): Promise<Status> {
    const stat = await MpdConnection.mpdClient.sendCommand("status");
    const status = mpd.parseObject<Status>(stat);
    return status;
  }

  static async getCurrentSong(): Promise<DispSong> {
    try {
      const res = await MpdConnection.mpdClient.sendCommands([
        mpd.cmd("currentsong", []),
      ]);

      const song = mpd.parseObject<Song>(res);
      let dispsong = getTitleandArtist(song);

      // Only load album info if the song has changed
      if (!MpdConnection.previousSong || 
          MpdConnection.previousSong.artist !== dispsong.artist || 
          MpdConnection.previousSong.title !== dispsong.title) {
        try {
        
          const data = await loadImageandAlbum(dispsong.artist, dispsong.title);
          if (data) {
            if (data.images && data.images.length > 0) {
              dispsong = { ...dispsong, album: data.images[2] };
            }
            if (data.albumname) {
              dispsong.albumname = data.albumname;
            }
            if (data.wiki) {
              dispsong.wiki = data.wiki;
            }
          }
          // Update previous song after successful load
          MpdConnection.previousSong = { ...dispsong };
        } catch (albumError) {
          debug("Error loading album info:", albumError);
          // Continue without album info
        }
      } else {
        // Use cached album info from previous song
        dispsong = { 
          ...dispsong, 
          album: MpdConnection.previousSong.album,
          albumname: MpdConnection.previousSong.albumname,
          wiki: MpdConnection.previousSong.wiki
        };
      }

      debug("####  album   ###", dispsong.album);
      return dispsong;
    } catch (error) {
      debug("Error getting current song:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to get current song"
      );
    }
  }
  static async listall(): Promise<Song[]> {
    const res = await MpdConnection.mpdClient.sendCommands([
      mpd.cmd("listall", []),
    ]);
    const songs = await mpd.parseNestedList<Song>(res);
    return songs;
  }
  static async playStation(url: string): Promise<void> {
    const res = await MpdConnection.mpdClient.sendCommands([
      "clear",
      `add "${url}"`,
      "play",
    ]);
  }
  static async playSong(song: string): Promise<void> {
    // Decode URL
    const url = decodeURI(song);
    const res = await MpdConnection.mpdClient.sendCommands([
      "clear",
      `add "${url}"`,
      "play",
    ]);
  }
  static async playstation(playlistName, stationName): Promise<m3ustation[]> {
    try {
      const filePath = path.join(
        `${process.env.PLAYLISTPATH}`,
        `${playlistName}.m3u`
      );
      const playlist = await parseM3UFile(filePath);
      // get url from playlist
      const url = playlist.find((item) => item.name === stationName)?.url;
      if (!url) {
        throw new Error(`Station ${stationName} not found in playlist ${playlistName}`);
      }
      // Clear current playlist and add the selected station
      await MpdConnection.mpdClient.sendCommands([
        "clear",
        `add "${url}"`,
        "play",
      ]);
      // Optionally, you can also set the volume or other settings here
      debug("###    ####", filePath, playlist, stationName);

      return playlist;
    } catch (error) {
      console.log("Error", error);
    }
  }
  static async getAllPlaylists(): Promise<playlist[]> {
    const res = await MpdConnection.mpdClient.sendCommand("listplaylists");
    const playlists = await mpd.parseNestedList<playlist>(res);
    // console.log('#####', playlists)
    return playlists;
  }
  static async listPlaylist(playlist: string): Promise<m3ustation[]> {
    const res = await MpdConnection.mpdClient.sendCommands([
      mpd.cmd("listplaylist", [playlist]),
    ]);
    const filePath = path.join(
      `${process.env.PLAYLISTPATH}`,
      `${playlist}.m3u`
    );
    const res1 = await parseM3UFile(filePath);
    debug("###    ####", filePath, res1);

    return res1;
  }
  static async playlist(): Promise<string> {
    // await MpdConnection.mpdClient.sendCommand("load swr");
    const res = await MpdConnection.mpdClient.sendCommand("playlist");
    return res;
  }
  static steuerung = async (mode: string): Promise<string> => {
    try {
      await MpdConnection.mpdClient.sendCommand(mode);

      const playerStatus = await MpdConnection.getPlayerStatus();
      return playerStatus;
    } catch (error) {
      debug("Error executing command:", mode, error);
      throw new Error(
        error instanceof Error ? error.message : "Command execution failed"
      );
    }
  };

  static searchByArtist = async (artist: string): Promise<string[]> => {
    try {
      const response = await MpdConnection.mpdClient.sendCommand(
        `search artist "${artist}"`
      );
      const results = response
        .split("\n")
        .filter((line) => line.startsWith("file:"));
      return results.map((line) => line.replace("file: ", ""));
    } catch (error) {
      debug("Error searching by artist:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to search by artist"
      );
    }
  };

  static searchByTitle = async (title: string): Promise<string[]> => {
    try {
      const response = await MpdConnection.mpdClient.sendCommand(
        `search title "${title}"`
      );
      const results = response
        .split("\n")
        .filter((line) => line.startsWith("file:"));
      return results.map((line) => line.replace("file: ", ""));
    } catch (error) {
      debug("Error searching by title:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to search by title"
      );
    }
  };

  static setVol = async (vol: string): Promise<void> => {
    try {
      await MpdConnection.mpdClient.sendCommand(`setvol ${vol}`);
    } catch (error) {
      debug("Error setting volume:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to set volume"
      );
    }
  };
  static connect = async () => {
    try {
      MpdConnection.connection = new MpdConnection();
      const mpdconfig = {
        host: process.env.HOST || "localhost",
        port: parseInt(process.env.MPDPORTHOST) || 6600,
      };
      const mpc = await mpd.connect(mpdconfig);
      MpdConnection.mpdClient = mpc;
      debug("connecting to mpd port %o", mpdconfig.port);

      // Set up event handling for MPD updates
      MpdConnection.mpdClient.on("system", async (name) => {
        debug("System update received: " + name);
        const wsServer = WS._wss;
        switch (name) {
          case "playlist":
            debug("#### listeners", wsServer.listenerCount);
            WS.broadcastMessage(
              wsServer,
              "REQUEST_CURRENTSONG",
              await MpdConnection.getCurrentSong()
            );
            break;
          case "player":
            const status = await MpdConnection.getStatus();
            debug("#### player event ####:", status);
            WS.broadcastMessage(wsServer, "REQUEST_STATUS", status);
            WS.broadcastMessage(
              wsServer,
              "REQUEST_CURRENTSONG",
              await MpdConnection.getCurrentSong()
            );
            break;
          default:
            break;
        }
      });
    } catch (error) {
      console.log(error);
    }
  };
}

const getTitleandArtist = (song: Song): DispSong => {
  let zeichen = "-";

  var arr: string[];
  var dispsong: DispSong = { artist: "", title: "" };
  const regexp = / - /g;
  if (song && song.title) {
    const count = (song.title.match(new RegExp(regexp, "g")) || []).length;
    if (count) {
      arr = song.title.split(" - ");
    } else {
      // if no title available
      const count = (song.file.match(new RegExp(regexp, "g")) || []).length;
      arr = song.file.split(" - ");
    }
    if (arr.length) {
      dispsong.artist = arr[0];
      dispsong.title = arr.at(-1);
      dispsong.title.indexOf(".")
        ? (dispsong.title = dispsong.title.split(".")[0])
        : dispsong.title;
    }
    if (song.file.startsWith("http")) dispsong.station = song.name;
  }

  return dispsong;
};

export async function getImage({ id }) {
  const response = await fetch(
    `${
      process.env.COVERARCHIVE || "https://coverartarchive.org/release-group"
    }/${id}`
  );
  // No image found for this release, try next
  if (response.status === 404) return;
  // Rate limit exceeded
  if (response.status === 503) throw new Error("Rate limit exceeded!");
  const {
    images: [image],
  } = await response.json();
  return image.image;
}
