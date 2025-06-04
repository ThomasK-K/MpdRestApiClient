////////////////////////////////////////////////////////////////////////////////////////

import * as fs from "fs";
import * as readline from "readline";

var debug = require("debug")("m3u");

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

export async function parseM3UFile(filePath: string): Promise<m3ustation[]> {
  const m3uData: m3ustation[] = [];
  let fileStream: fs.ReadStream = null;

  try {
    fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let linecount = 0;
    let data: m3ustation = null;

    for await (const line of rl) {
      linecount++;
      const trimmedLine = line.trim();

      // Ignore comments and headers
      if (linecount === 1 && !trimmedLine.startsWith("#EXTM3U")) {
        throw new Error("no m3u file");
      }

      if (trimmedLine.startsWith("#EXTINF")) {
        const arr = trimmedLine.split(",");
        if (arr[1] !== "") {
          data = { ...data, name: arr[1] };
          debug(arr);
        }
        continue;
      }

      // If we have a valid URL, it's the stream URL
      if (trimmedLine.startsWith("http")) {
        data = { ...data, url: trimmedLine };
        m3uData.push({ ...data, icon: "" });
        data = null;
      }
    }

    await rl.close();
    return m3uData;
  } catch (error) {
    debug(error);
    throw error;
  } finally {
    if (fileStream) {
      fileStream.destroy();
    }
  }
}
