import WebSocket, { WebSocketServer } from 'ws';
import { WS } from '../../application/ws';
import { MpdConnection } from '../../application/mpdClient';

// Mock WebSocket server
const mockOn = jest.fn();
const mockClose = jest.fn();
const mockClients = new Set();
const mockBroadcast = jest.fn();

jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: mockOn,
    clients: mockClients,
    close: mockClose,
  })),
}));

jest.mock('../../application/mpdClient');

describe('WebSocket Server', () => {
  let wss: WS;

  beforeEach(() => {
    jest.clearAllMocks();
    WS._wss = new WebSocketServer({ port: 8080 }) as any;
    wss = new WS();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('construction', () => {
    it('should initialize the WebSocket server', () => {
      expect(WebSocketServer).toHaveBeenCalled();
      expect(wss.getWs()).toBeDefined();
    });
  });

  describe('broadcastMessage', () => {
    it('should broadcast message to all clients', () => {
      const mockSend = jest.fn();
      const mockClient = {
        send: mockSend,
        readyState: WebSocket.OPEN,
      };
      mockClients.add(mockClient);

      const testData = {
        UpperCase: 'value',
        status: 'playing',
      };

      WS.broadcastMessage(wss.getWs(), 'status', testData);

      // Verify that send was called with a JSON string
      expect(mockSend).toHaveBeenCalledTimes(1);

      const sentMessage = JSON.parse(mockSend.mock.calls[0][0]);
      expect(sentMessage).toEqual({
        type: 'status',
        data: {
          uppercase: 'value',
          status: 'playing',
        },
      });
    });
  });

  describe('objectToLowerCase', () => {
    it('should handle null input', () => {
      expect(WS.objectToLowerCase(null)).toBeNull();
    });

    it('should convert object keys to lowercase', () => {
      const input = {
        UpperCase: 'value',
        ALLCAPS: 'value',
        mixedCase: 'value',
      };

      const expected = {
        uppercase: 'value',
        allcaps: 'value',
        mixedcase: 'value',
      };

      expect(WS.objectToLowerCase(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
      const input = [
        { UpperCase: 'value' },
        { ALLCAPS: 'value' },
      ];

      const expected = [
        { uppercase: 'value' },
        { allcaps: 'value' },
      ];

      expect(WS.objectToLowerCase(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        UpperCase: {
          NestedUpper: 'value',
        },
      };

      const expected = {
        uppercase: {
          nestedupper: 'value',
        },
      };

      expect(WS.objectToLowerCase(input)).toEqual(expected);
    });
  });
});
