import loadImage from '../../utils/getAlbumart';

// Mock the fetch function
global.fetch = jest.fn();

describe('Album Art Loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LASTFM_APIKEY = 'test-api-key';
  });

  it('should fetch album art and metadata successfully', async () => {
    const mockResponse = {
      track: {
        album: {
          title: 'Test Album',
          image: [
            { '#text': 'small.jpg' },
            { '#text': 'medium.jpg' },
            { '#text': 'large.jpg' }
          ]
        },
        artist: 'Test Artist',
        wiki: 'Test wiki content'
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await loadImage('Test Artist', 'Test Song');

    expect(result).toEqual({
      images: ['small.jpg', 'medium.jpg', 'large.jpg'],
      albumname: 'Test Album',
      wiki: 'Test wiki content'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('method=track.getinfo') &&
      expect.stringContaining('artist=Test Artist') &&
      expect.stringContaining('track=Test Song')
    );
  });

  it('should handle Last.fm API errors', async () => {
    const mockErrorResponse = {
      error: 6,
      message: 'Track not found'
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockErrorResponse)
    });

    const result = await loadImage('Invalid Artist', 'Invalid Song');
    expect(result).toBeNull();
  });

  it('should handle missing album information', async () => {
    const mockResponse = {
      track: {
        name: 'Test Song',
        artist: 'Test Artist'
        // No album information
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const result = await loadImage('Test Artist', 'Test Song');
    expect(result).toBeNull();
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(loadImage('Test Artist', 'Test Song')).rejects.toThrow('Network error');
  });

  it('should use custom API URL if provided', async () => {
    process.env.AUDIOSCROBBLER = 'http://custom-api.example.com';
    
    const mockResponse = {
      track: {
        album: {
          title: 'Test Album',
          image: [{ '#text': 'test.jpg' }]
        },
        artist: 'Test Artist'
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    await loadImage('Test Artist', 'Test Song');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://custom-api.example.com')
    );
  });
});
