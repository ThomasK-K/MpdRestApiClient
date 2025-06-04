export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlayerStatus {
  volume: number;
  repeat: boolean;
  random: boolean;
  single: boolean;
  consume: boolean;
  state: string;
  song?: number;
  songid?: number;
  elapsed?: number;
  duration?: number;
  bitrate?: number;
  audio?: string;
}

export interface CurrentSong {
  file: string;
  time?: string;
  duration?: number;
  artist?: string;
  albumartist?: string;
  albumName?: string;
  title?: string;
  album?: string;
  track?: string;
  date?: string;
  genre?: string;
  composer?: string;
  pos?: number;
  id?: number;
}

export interface PlaylistItem {
  file: string;
  title?: string;
  artist?: string;
  album?: string;
  time?: string;
  duration?: number;
}

export interface MpdResponse {
  changed: string[];
  subsystem: string;
}
