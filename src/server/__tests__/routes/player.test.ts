import express from 'express';
import request from 'supertest';
import { MpdConnection } from '../../application';

// Mock middleware and router

// Mock the MpdConnection methods
const mockGetStatus = jest.fn();
const mockSteuerung = jest.fn();
const mockSetVol = jest.fn();
jest.mock('../../application', () => ({
  MpdConnection: {
    getConnection: jest.fn(),
    getPlayerStatus: jest.fn(),
    getStatus: mockGetStatus,
    getCurrentSong: jest.fn(),
    steuerung: mockSteuerung,
    setVol: mockSetVol,
  },
}));

import playerRoutes from '../../routes/player';

describe('Player Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    
    // Configure middleware
    app.use(express.json());
    app.use('/player', playerRoutes);
    
    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500)
         .set('Content-Type', 'application/json')
         .json({
           success: false,
           error: err.message || 'Internal server error'
         });
    });
  });

  describe('GET /player/status', () => {
    it('should return player status', async () => {
      const mockStatus = {
        volume: 50,
        state: 'play',
        song: 1,
        elapsed: 30,
      };

      mockGetStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/player')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining(mockStatus),
      });
    });

    it('should handle errors', async () => {
      mockGetStatus.mockRejectedValue(new Error('MPD error'));

      const response = await request(app)
        .get('/player')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'MPD error',
      });
    });
  });

  describe('POST /player/control', () => {
    it('should handle valid player commands', async () => {
      const command = 'play';
      mockSteuerung.mockResolvedValue('playing');

      const response = await request(app)
        .get('/player/steuerung')
        .query({ command })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { status: 'playing' },
      });
    });

    it('should reject invalid commands', async () => {
      const response = await request(app)
        .get('/player/steuerung')
        .query({ command: 'invalid' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('Invalid command'),
      });
    });
  });

  describe('POST /player/volume', () => {
    it('should set volume when valid value provided', async () => {
      const volume = 50;
      mockSetVol.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/player/setvol')
        .query({ vol: volume })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { volume },
      });
    });

    it('should reject invalid volume values', async () => {
      const response = await request(app)
        .get('/player/setvol')
        .query({ vol: 101 })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('Volume must be between 0 and 100'),
      });
    });
  });
});
