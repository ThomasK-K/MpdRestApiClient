import fs from "fs";
import path from "path";
import { MpdConnection } from "./mpdClient";
var debug = require("debug")("wss");
import { WebSocketServer } from "ws";
import { send } from "process";

const readInput = (inputFilename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.resolve(__dirname, inputFilename),
      { encoding: "utf8" },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

var stationFile =
  process.env.STATION_FILE || path.join(__dirname, "../data/stations.json");

export class WS {
  
  static  _wss: WebSocketServer;
  constructor() {
    // super(null);
  }
  getWs(){
    return WS._wss
  }

  static objectToLowerCase(data) {
    if (!data) {
      return data;
    } else if (Array.isArray(data)) {
      return data.map((value) => this.objectToLowerCase(value));
    } else if (typeof data === "object") {
      var retData = {};
      for (const [key, value] of Object.entries(data)) {
        retData[key.toLowerCase()] = this.objectToLowerCase(value);
      }
      return retData;
    } else {
      return data;
    }
  }

  static broadcastMessage(server, type, data) {
    data = this.objectToLowerCase(data);
    var msg = {
      type: type,
      data: data ? data : {},
    };
    server.clients.forEach(function each(client) {
      // if (client.readyState === WebSocket.OPEN) {
        debug('Broadcast: ' + type + ' with %o', data);
        client.send(JSON.stringify(msg), function (error) {
          if (error) debug("Failed to send data to client %o", error);
        });
        // }
    });
}
  sendWSSMessage(client, type, data, showDebug = true) {
    data = WS.objectToLowerCase(data);
    showDebug && debug("Send: " + type + " with %o", data);
    var msg = {
      type: type,
      data: data ? data : {},
    };
    client.send(JSON.stringify(msg), function (error) {
      if (error) debug("Failed to send data to client %o", error);
    });
  }
  //////////////////////////////////////////
  async init(wss: WebSocketServer) {
  WS._wss=wss
    wss.on("connection", async (ws) => {
     
      ws.on("message", async (message: string) => {
        var msg = JSON.parse(message);

        switch (msg.type) {
          case "REQUEST_STATION_LIST":
            debug("Received %s with %o", msg.type, msg.data);
            var stationList = await readInput(stationFile);
            this.sendWSSMessage(ws, "STATION_LIST", stationList);
            break;
          case "REQUEST_CURRENTSONG":
            try {
              // const status = await MpdConnection.getPlayerStatus();
              const status = await MpdConnection.getCurrentSong();
              this.sendWSSMessage(ws, "CURRENTSONG", status);
            } catch (error) {
              this.sendWSSMessage(ws, "MPD_OFFLINE", "");
            }
            break;
          case "REQUEST_STATUS":
            try {
              // const status = await MpdConnection.getPlayerStatus();
              const status = await MpdConnection.getAllPlaylists();
              this.sendWSSMessage(ws, "STATUS", status);
            } catch (error) {
              this.sendWSSMessage(ws, "MPD_OFFLINE", "");
            }
            break;
          case "REQUEST_STEUERUNG":
            try {
              await MpdConnection.steuerung(msg.data);
              this.sendWSSMessage(ws, "STEUERUNG", msg.data);
            } catch (error) {
              this.sendWSSMessage(ws, "MPD_OFFLINE", "");
            }
            break;

          default:
            debug("Received %s with %o", message);
            break;
        }
        // ws.send(`${message.toString()}`);
        
      });
      ws.on("close", () => {
        console.log("Client disconnected");
      });
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
    // await MpdConnection.onStatusChange((status) => {
    //   this.broadcastMessage(ws, 'STATUS', status);   
    // }
  }

// onStatusChange(function(status) {
//     broadcastMessage(wss, 'STATUS', status);                       
// });
}
