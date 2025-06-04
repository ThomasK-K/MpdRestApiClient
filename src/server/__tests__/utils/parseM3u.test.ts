import fs from 'fs';
import { Readable } from 'stream';
import { parseM3UFile } from '../../utils/parseM3u';

// Mock fs module
jest.mock('fs', () => ({
  createReadStream: jest.fn(),
}));

describe('M3U Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse a valid M3U file with stations', async () => {
    const mockFileContent = '#EXTM3U\n#EXTINF:-1,Radio Station 1\nhttp://example.com/stream1\n#EXTINF:-1,Radio Station 2\nhttp://example.com/stream2';
    
    // Create a readable stream from the mock content
    const mockStream = Readable.from([mockFileContent]);
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    const result = await parseM3UFile('test.m3u');

    expect(result).toEqual([
      {
        name: 'Radio Station 1',
        url: 'http://example.com/stream1',
        icon: '',
      },
      {
        name: 'Radio Station 2',
        url: 'http://example.com/stream2',
        icon: '',
      },
    ]);
  });

  it('should handle M3U files with metadata', async () => {
    const mockFileContent = '#EXTM3U\n#EXTINF:-1 radio="true" tvg-logo="http://example.com/logo.png",Radio Station\nhttp://example.com/stream';
    
    const mockStream = Readable.from([mockFileContent]);
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    const result = await parseM3UFile('test.m3u');

    expect(result).toEqual([
      {
        name: 'Radio Station',
        url: 'http://example.com/stream',
        icon: '',
      },
    ]);
  });

  it('should throw error for invalid M3U files', async () => {
    const mockFileContent = 'Invalid content\nNot an M3U file';
    
    const mockStream = Readable.from([mockFileContent]);
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    await expect(parseM3UFile('invalid.m3u')).rejects.toThrow('no m3u file');
  });

  it('should handle empty M3U files correctly', async () => {
    const mockFileContent = '#EXTM3U\n';
    
    const mockStream = Readable.from([mockFileContent]);
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    const result = await parseM3UFile('empty.m3u');
    expect(result).toEqual([]);
  });

  it('should handle file read errors', async () => {
    (fs.createReadStream as jest.Mock).mockImplementation(() => {
      throw new Error('File read error');
    });

    await expect(parseM3UFile('error.m3u')).rejects.toThrow('File read error');
  });

  it('should handle malformed entries gracefully', async () => {
    const mockFileContent = '#EXTM3U\n#EXTINF:-1\nhttp://example.com/stream1\n#EXTINF:invalid,Radio Station\nhttp://example.com/stream2';
    
    const mockStream = Readable.from([mockFileContent]);
    (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);

    const result = await parseM3UFile('malformed.m3u');

    expect(result).toEqual([
      {
        name: undefined,
        url: 'http://example.com/stream1',
        icon: '',
      },
      {
        name: 'Radio Station',
        url: 'http://example.com/stream2',
        icon: '',
      },
    ]);
  });
});
