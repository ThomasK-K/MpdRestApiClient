import fs from "fs";
import path from "path";
import { MpdConnection } from "./mpdClient";
var debug = require("debug")("wss");
import { WebSocketServer, Server as WSServer } from "ws";
import { send } from "process";

interface WSMessage {
  type: string;
  data: any;
}

const readInput = (inputFilename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      path.resolve(__dirname, inputFilename),
      { encoding: "utf8" },
      (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

var stationFile =
  process.env.STATION_FILE || path.join(__dirname, "../data/stations.json");

export class WS {
  static _wss: WebSocketServer;
  static _wssSecure: WebSocketServer | null = null;

  constructor() {
    // super(null);
  }
  getWs() {
    return WS._wss;
  }

  getSecureWs() {
    return WS._wssSecure;
  }

  init(ws: WSServer) {
    WS._wss = ws;
    this.setupWSListeners(WS._wss);
  }

  initSecure(ws: WSServer) {
    WS._wssSecure = ws;
    this.setupWSListeners(WS._wssSecure);
  }

  setupWSListeners(ws: WSServer) {
    ws.on("connection", (wsClient) => {
      debug("Client connected");

      wsClient.on("message", async (message: string) => {
        try {
          var msg: WSMessage = JSON.parse(message);

          switch (msg.type) {
            case "REQUEST_STATION_LIST":
              debug("Received %s with %o", msg.type, msg.data);
              var stationList = await readInput(stationFile);
              this.sendWSSMessage(wsClient, "STATION_LIST", stationList);
              break;
            case "REQUEST_CURRENTSONG":
              try {
                const status = await MpdConnection.getCurrentSong();
                this.sendWSSMessage(wsClient, "CURRENTSONG", status);
              } catch (error) {
                this.sendWSSMessage(wsClient, "MPD_OFFLINE", "");
              }
              break;
            // ... other cases ...
            default:
              debug(
                "Received unknown message type: %s with %o",
                msg.type,
                msg.data
              );
              break;
          }
        } catch (error) {
          debug("Error parsing message: %o", error);
          this.sendWSSMessage(wsClient, "ERROR", "Invalid message format");
        }
      });

      wsClient.on("close", () => {
        console.log("Client disconnected");
      });

      wsClient.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  static objectToLowerCase(data: any) {
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
      debug("Broadcast: " + type + " with %o", data);
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
}
