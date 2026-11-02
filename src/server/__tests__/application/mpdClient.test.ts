const mockOn = jest.fn();
const mockOff = jest.fn();
const mockConnect = jest.fn();
const mockClient = {
  on: mockOn,
  off: mockOff,
  connect: mockConnect,
  playback: {
    getState: jest.fn(),
    getCurrentTrack: jest.fn(),
    getCurrentTlTrack: jest.fn(),
    getStreamTitle: jest.fn(),
    getTimePosition: jest.fn(),
  },
  mixer: {
    getVolume: jest.fn(),
  },
  tracklist: {
    getRepeat: jest.fn(),
    getRandom: jest.fn(),
    getSingle: jest.fn(),
    getConsume: jest.fn(),
    getLength: jest.fn(),
    getTlTracks: jest.fn(),
    getNextTlid: jest.fn(),
    getVersion: jest.fn(),
    index: jest.fn(),
  },
  library: {},
  playlists: {},
};

jest.mock("mopidy", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockClient),
}));

import { MpdConnection } from "../../application/mpdClient";

describe("MpdConnection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MpdConnection as any).connection = null;
    (MpdConnection as any).mopidyClient = mockClient;
    mockClient.playback.getState.mockResolvedValue("playing");
    mockClient.playback.getCurrentTrack.mockResolvedValue(null);
    mockClient.playback.getCurrentTlTrack.mockResolvedValue(null);
    mockClient.playback.getStreamTitle.mockResolvedValue(null);
    mockClient.playback.getTimePosition.mockResolvedValue(null);
    mockClient.mixer.getVolume.mockResolvedValue(80);
    mockClient.tracklist.getRepeat.mockResolvedValue(false);
    mockClient.tracklist.getRandom.mockResolvedValue(false);
    mockClient.tracklist.getSingle.mockResolvedValue(false);
    mockClient.tracklist.getConsume.mockResolvedValue(false);
    mockClient.tracklist.getLength.mockResolvedValue(0);
    mockClient.tracklist.getTlTracks.mockResolvedValue([]);
    mockClient.tracklist.getNextTlid.mockResolvedValue(null);
    mockClient.tracklist.getVersion.mockResolvedValue(1);
    mockClient.tracklist.index.mockResolvedValue(null);
  });

  it("returns a singleton instance", () => {
    expect(MpdConnection.getConnection()).toBe(MpdConnection.getConnection());
  });

  it("connects to Mopidy and subscribes to relevant events", async () => {
    mockConnect.mockImplementation(() => {
      const onlineListener = mockOn.mock.calls.find(([event]) => event === "state:online")[1];
      onlineListener();
    });

    await MpdConnection.connect();

    expect(mockOn).toHaveBeenCalledWith("event:tracklistChanged", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("event:playbackStateChanged", expect.any(Function));
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it("maps Mopidy state and settings to the existing status shape", async () => {
    const status = await MpdConnection.getStatus();

    expect(status).toEqual(expect.objectContaining({
      state: "play",
      volume: 80,
      repeat: false,
      random: false,
      single: false,
      consume: false,
      playlistlength: 0,
    }));
  });

  it("returns an empty song when the Mopidy queue has no current track", async () => {
    await expect(MpdConnection.getCurrentSong()).resolves.toEqual({
      artist: "",
      title: "",
    });
  });
});
