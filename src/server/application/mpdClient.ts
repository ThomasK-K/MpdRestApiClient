import Mopidy from "mopidy";
import dotenv from "dotenv";
import * as path from "path";
import { loadfile as loadImageandAlbum, parseM3UFile } from "../utils";
import { WS } from "./ws";
import type { PlaylistItem } from "../interfaces/responses";

dotenv.config();

const debug = require("debug")("mpdclient");

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
  title: string;
  name: string;
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
};

type ConnectedMopidy = Mopidy &
  Required<
    Pick<Mopidy, "playback" | "tracklist" | "library" | "playlists" | "mixer">
  >;

const MpcStatus = Object.freeze({
  disconnected: 1,
  connecting: 2,
  reconnecting: 3,
  ready: 4,
});

const config = {
  playlistPath: process.env.PLAYLISTPATH || "/home/tkk/config/mpd/playlists",
  mopidyPort: parseInt(process.env.MOPIDYPORT || "6680", 10),
  mopidyHost: process.env.MOPIDYHOST || process.env.MPDHOST || "localhost",
  coverArchive:
    process.env.COVERARCHIVE || "https://coverartarchive.org/release-group",
};

export class MpdConnection {
  private static connection: MpdConnection;
  private static mopidyClient: Mopidy | null = null;
  private static mpdStatus: number = MpcStatus.disconnected;
  private static previousSong: DispSong | null = null;

  private constructor() {}

  static getConnection(): MpdConnection {
    if (!MpdConnection.connection) {
      MpdConnection.connection = new MpdConnection();
    }
    return MpdConnection.connection;
  }

  private static getClient(): ConnectedMopidy {
    const client = MpdConnection.mopidyClient as ConnectedMopidy | null;
    if (
      !client?.playback ||
      !client.tracklist ||
      !client.library ||
      !client.playlists ||
      !client.mixer
    ) {
      throw new Error("Mopidy client is not connected");
    }
    return client;
  }

  static async getPlayerStatus(): Promise<string> {
    return (await MpdConnection.getStatus()).state;
  }

  static async getStatus(): Promise<Status> {
    const client = MpdConnection.getClient();
    const [
      state,
      volume,
      repeat,
      random,
      single,
      consume,
      playlistlength,
      currentTlTrack,
      tracks,
      timePosition,
      nextTlid,
      playlistVersion,
    ] = await Promise.all([
      client.playback.getState(),
      client.mixer.getVolume(),
      client.tracklist.getRepeat(),
      client.tracklist.getRandom(),
      client.tracklist.getSingle(),
      client.tracklist.getConsume(),
      client.tracklist.getLength(),
      client.playback.getCurrentTlTrack(),
      client.tracklist.getTlTracks(),
      client.playback.getTimePosition(),
      client.tracklist.getNextTlid(),
      client.tracklist.getVersion(),
    ]);
    const song = currentTlTrack
      ? await client.tracklist.index({ tl_track: currentTlTrack })
      : null;
    const currentTrack = currentTlTrack?.track;

    return {
      volume: volume ?? 0,
      repeat,
      random,
      single,
      consume,
      playlist: playlistVersion,
      state:
        state === "playing" ? "play" : state === "paused" ? "pause" : "stop",
      playlistlength,
      song: song ?? -1,
      songid: currentTlTrack?.tlid ?? -1,
      bitrate: Number(currentTrack?.bitrate) || 0,
      elapsed: timePosition == null ? undefined : timePosition / 1000,
      duration:
        currentTrack?.length == null ? undefined : currentTrack.length / 1000,
      nextsongid: nextTlid ?? undefined,
      nextsong:
        nextTlid == null
          ? undefined
          : tracks.findIndex((track) => track.tlid === nextTlid),
    };
  }

  static async getCurrentSong(): Promise<DispSong> {
    try {
      const client = MpdConnection.getClient();
      const [track, tlTrack, streamTitle, timePosition] = await Promise.all([
        client.playback.getCurrentTrack(),
        client.playback.getCurrentTlTrack(),
        client.playback.getStreamTitle(),
        client.playback.getTimePosition(),
      ]);
      if (!track) {
        return { artist: "", title: "" };
      }

      let artist = "";
      let title = "";
      if (!track.artists || track.artists.length === 0) {
        ({ title, artist } = await getTitleandArtist({
          file: track.uri,
          title: streamTitle || track.name || "",
          name: track.name,
          Id: 0,
          artist: "",
          album: track.album?.name,
          time: timePosition == null ? undefined : String(timePosition / 1000),
          duration:
            track.length == null ? undefined : String(track.length / 1000),
        }));
      }

      const dispsong: DispSong = {
        artist:
          artist || track.artists?.map((item) => item.name).join(", ") || "",
        title: title || streamTitle || track.name || "",
        file: track.uri,
        albumname: track.album?.name,
        time: timePosition == null ? undefined : String(timePosition / 1000),
        duration:
          track.length == null ? undefined : String(track.length / 1000),
      };
      if (track.uri?.startsWith("http")) {
        dispsong.station = track.name;
      }

      if (
        !MpdConnection.previousSong ||
        MpdConnection.previousSong.artist !== dispsong.artist ||
        MpdConnection.previousSong.title !== dispsong.title
      ) {
        try {
          const data = await loadImageandAlbum(dispsong.artist, dispsong.title);
          if (data) {
            if (data.images && data.images.length > 0) {
              dispsong.album = data.images[2];
            }
            if (data.albumname) {
              dispsong.albumname = data.albumname;
            }
            if (data.wiki) {
              dispsong.wiki = data.wiki;
            }
          }
          MpdConnection.previousSong = { ...dispsong };
        } catch (albumError) {
          debug("Error loading album info:", albumError);
        }
      } else {
        dispsong.album = MpdConnection.previousSong.album;
        dispsong.albumname = MpdConnection.previousSong.albumname;
        dispsong.wiki = MpdConnection.previousSong.wiki;
      }

      return dispsong;
    } catch (error: unknown) {
      if (error instanceof Error) {
        debug("Error getting current song:", error.message);
        throw error;
      }
      throw new Error("Failed to get current song");
    }
  }

  static async listall(): Promise<Song[]> {
    const results = await MpdConnection.getClient().library.search({
      query: { any: [""] },
    });
    return results.flatMap((result) =>
      result.tracks.map((track) => ({
        file: track.uri,
        title: track.name,
        name: track.name,
        Id: 0,
        artist: track.artists?.map((artist) => artist.name).join(", "),
        album: track.album?.name,
        time: track.length == null ? undefined : String(track.length / 1000),
        duration:
          track.length == null ? undefined : String(track.length / 1000),
      })),
    );
  }

  private static async playUri(uri: string): Promise<void> {
    const client = MpdConnection.getClient();
    await client.tracklist.clear();
    await client.tracklist.add({ uris: [uri] });
    await client.playback.play({});
  }

  static async playStation(url: string): Promise<void> {
    await MpdConnection.playUri(url);
  }

  static async playSong(song: string): Promise<void> {
    await MpdConnection.playUri(decodeURI(song));
  }

  static async playstation(
    playlistName: string,
    stationName: string,
  ): Promise<m3ustation[]> {
    try {
      const filePath = path.join(config.playlistPath, `${playlistName}.m3u`);
      const playlist = await parseM3UFile(filePath);
      const url = playlist.find((item) => item.name === stationName)?.url;
      if (!url) {
        throw new Error(
          `Station ${stationName} not found in playlist ${playlistName}`,
        );
      }
      await MpdConnection.playUri(url);
      debug("###    ####", filePath, playlist, stationName);
      return playlist;
    } catch (error: unknown) {
      if (error instanceof Error) {
        debug("Error getting playlist station:", error.message);
        throw error;
      }
      throw new Error("Failed to play station");
    }
  }

  static async getAllPlaylists(): Promise<playlist[]> {
    const playlists = await MpdConnection.getClient().playlists.asList();
    return playlists.map((item) => ({ playlist: item.name }));
  }

  static async listPlaylist(playlist: string): Promise<m3ustation[]> {
    try {
      const filePath = path.join(config.playlistPath, `${playlist}.m3u`);
      return await parseM3UFile(filePath);
    } catch (error) {
      debug("Error listing playlist:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list playlist ${playlist}: ${message}`);
    }
  }

  static async playlist(): Promise<string> {
    const tracks = await MpdConnection.getClient().tracklist.getTracks();
    return tracks.map((track) => track.uri).join("\n");
  }

  static steuerung = async (mode: string): Promise<string> => {
    try {
      const playback = MpdConnection.getClient().playback;
      switch (mode) {
        case "play":
          await playback.play({});
          break;
        case "pause":
          await playback.pause();
          break;
        case "stop":
          await playback.stop();
          break;
        case "next":
          await playback.next();
          break;
        case "previous":
          await playback.previous();
          break;
        default:
          throw new Error(`Unsupported playback command: ${mode}`);
      }
      return MpdConnection.getPlayerStatus();
    } catch (error) {
      debug("Error executing command:", mode, error);
      throw new Error(
        error instanceof Error ? error.message : "Command execution failed",
      );
    }
  };

  private static searchTracks = async (query: {
    artist?: string[];
    track_name?: string[];
    album?: string[];
  }): Promise<PlaylistItem[]> => {
    const results = await MpdConnection.getClient().library.search({
      query,
      ...(query.track_name ? { exact: true } : {}),
      ...(query.album ? { exact: true } : {}),

    });
    return results.flatMap((result) =>
      result.tracks.map((track) => ({
        file: track.uri,
        title: track.name,
        artist: track.artists?.map((item) => item.name).join(", "),
        album: track.album?.name,
        time: track.length == null ? undefined : String(track.length / 1000),
        duration: track.length == null ? undefined : track.length / 1000,
      })),
    );
  };

  static searchByArtist = async (artist: string): Promise<PlaylistItem[]> =>
    MpdConnection.searchTracks({ artist: [artist] });

  static searchByTitle = async (title: string): Promise<PlaylistItem[]> => {
    return MpdConnection.searchTracks({ track_name: [title] });
  };

    static searchByAlbum = async (album: string): Promise<PlaylistItem[]> => {
    return MpdConnection.searchTracks({ album: [album] });

  };

  static searchByArtistAndTitle = async (
    artist: string,
    title: string,
  ): Promise<PlaylistItem[]> =>
    MpdConnection.searchTracks({ artist: [artist], track_name: [title] });

  static setVol = async (vol: string): Promise<void> => {
    try {
      await MpdConnection.getClient().mixer.setVolume({ volume: Number(vol) });
    } catch (error) {
      debug("Error setting volume:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to set volume",
      );
    }
  };

  static connect = async (): Promise<void> => {
    MpdConnection.mpdStatus = MpcStatus.connecting;
    MpdConnection.connection = new MpdConnection();
    const webSocketUrl = `ws://${config.mopidyHost}:${config.mopidyPort}/mopidy/ws`;
    const client = new Mopidy({ webSocketUrl, autoConnect: false });
    MpdConnection.mopidyClient = client;

    client.on("event:tracklistChanged", async () => {
      await MpdConnection.broadcastCurrentSong();
    });
    client.on("event:trackPlaybackStarted", async () => {
      await MpdConnection.broadcastPlayerUpdate();
    });
    client.on("event:playbackStateChanged", async () => {
      await MpdConnection.broadcastPlayerUpdate();
    });

    await new Promise<void>((resolve, reject) => {
      const onOnline = () => {
        client.off("state:online", onOnline);
        client.off("websocket:error", onError);
        MpdConnection.mpdStatus = MpcStatus.ready;
        resolve();
      };
      const onError = (error: Error) => {
        client.off("state:online", onOnline);
        client.off("websocket:error", onError);
        MpdConnection.mpdStatus = MpcStatus.disconnected;
        reject(error);
      };
      client.on("state:online", onOnline);
      client.on("websocket:error", onError);
      client.on("reconnecting", () => {
        MpdConnection.mpdStatus = MpcStatus.reconnecting;
      });
      client.connect();
    });
    debug("Connected to Mopidy WebSocket %s", webSocketUrl);
  };

  private static async broadcastCurrentSong(): Promise<void> {
    const wsServer = WS._wss;
    if (wsServer) {
      WS.broadcastMessage(
        wsServer,
        "REQUEST_CURRENTSONG",
        await MpdConnection.getCurrentSong(),
      );
    }
  }

  private static async broadcastPlayerUpdate(): Promise<void> {
    const wsServer = WS._wss;
    if (!wsServer) {
      return;
    }
    WS.broadcastMessage(
      wsServer,
      "REQUEST_STATUS",
      await MpdConnection.getStatus(),
    );
    await MpdConnection.broadcastCurrentSong();
  }
}

export async function getImage({ id }) {
  const response = await fetch(`${config.coverArchive}/${id}`);
  if (response.status === 404) return;
  if (response.status === 503) throw new Error("Rate limit exceeded!");
  const {
    images: [image],
  } = await response.json();
  return image.image;
}

const getTitleandArtist = async (song: Song): Promise<DispSong> => {
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
      dispsong.title = arr.at(-1) ?? "";
      dispsong.title.indexOf(".")
        ? (dispsong.title = dispsong.title.split(".")[0])
        : dispsong.title;
    }
    if (song.file.startsWith("http")) dispsong.station = song.name;
  }

  return dispsong;
};
