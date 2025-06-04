// Mock MPD client setup
const mockSendCommand = jest.fn();
const mockOn = jest.fn();
const mockConnect = jest.fn();
const mockParseObject = jest.fn();

const mockMpdClient = {
  sendCommand: mockSendCommand,
  on: mockOn,
  connect: mockConnect,
};

jest.mock('mpd2', () => {
  return {
    __esModule: true,
    default: {
      Client: jest.fn().mockImplementation(() => mockMpdClient),
      connect: jest.fn().mockResolvedValue(mockMpdClient),
      parseObject: mockParseObject,
    },
  };
});

// Import after mocks are set up
import { MpdConnection } from '../../application/mpdClient';

describe('MpdConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance and mock functions
    (MpdConnection as any).instance = null;
    (MpdConnection as any).mpdClient = mockMpdClient;
  });

  describe('getConnection', () => {
    it('should create and return a singleton instance', () => {
      const instance1 = MpdConnection.getConnection();
      const instance2 = MpdConnection.getConnection();
      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should initialize the MPD client and attach event listeners', async () => {
      // Get the mpd2 mock after jest.mock
      const mpd2 = require('mpd2').default;
      await MpdConnection.connect();
      expect(mpd2.connect).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith('system', expect.any(Function));
      // Note: Only 'system' is attached in connect(), not 'ready'.
    });
  });

  describe('getPlayerStatus', () => {
    beforeEach(() => {
      MpdConnection.getConnection();
    });

    it('should return the player state', async () => {
      mockSendCommand.mockResolvedValueOnce('raw status');
      mockParseObject.mockReturnValueOnce({ state: 'play' });

      const status = await MpdConnection.getPlayerStatus();
      expect(status).toBe('play');
      expect(mockSendCommand).toHaveBeenCalledWith('status');
    });

    it('should handle errors', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('MPD error'));
      await expect(MpdConnection.getPlayerStatus()).rejects.toThrow('MPD error');
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      MpdConnection.getConnection();
    });

    it('should return parsed MPD status', async () => {
      const mockStatus = {
        volume: 100,
        repeat: false,
        random: false,
        state: 'play'
      };

      mockSendCommand.mockResolvedValueOnce('raw status');
      mockParseObject.mockReturnValueOnce(mockStatus);

      const status = await MpdConnection.getStatus();
      expect(status).toEqual(mockStatus);
      expect(mockSendCommand).toHaveBeenCalledWith('status');
    });
  });
});
