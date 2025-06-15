import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { ServerConfigInterface } from "../interfaces/serverConfigInterfaces";
import cors from "cors";
import bodyParser from "body-parser";
import configData from "../config.json";
import { ErrorHandler } from "../error/custom.error";
import { playerroutes } from "../routes";
import { WebSocketServer } from "ws";
import { WS } from ".";
import { MpdConnection } from "./mpdClient";

var ipRangeCheck = require("ip-range-check");

var debug = require("debug")("application");

export class Application {
  public _app: Express;
  public _server: Server;
  public _wss: WS;

  constructor() {
    // Initialisiere das Express-App
    this._app = express();
    // Erstelle einen HTTP-Server
    const server = createServer(this._app);
    this._server = server;
    // Initialisiere den WebSocket-Server
    const ws = new WebSocketServer({ server });
    this._wss = new WS();
    this._wss.init(ws);
  }
  initMpdConnection = async () => {
    try {
      await MpdConnection.connect();
      const song = await MpdConnection.getCurrentSong();
      // Do something with the song if needed
    } catch (error) {
      console.error("Failed to initialize MPD connection:", error);
      // Handle the error appropriately
    }
  };
  // Middleware zur Prüfung der IP gegen die Whitelist
  private ipWhitelist(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    debug("Client IP:", clientIP);
    if (ipRangeCheck(clientIP, configData.whitelistIPRanges)) {
      next();
    } else {
      res.status(403).send("Access denied: Your IP is not whitelisted.");
    }
  }
  init(sc: ServerConfigInterface) {
    this._app.set("host", sc.host || "localhost");
    this._app.set("port", sc.port || 3000);
    this._app.use((req, res, next) => {
      res.setHeader(
        "Access-Control-Allow-Headers",
        "accept, authorization,content-type,x-requested-with"
      );
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
      // res.setHeader("Access-Control-Allow-Origin", req.header("origin")!);
      next();
    });
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({ extended: true }));
    this._app.use(express.json());

    const whitelist: string[] = configData.whitelist;
    // CORS-Optionen mit Whitelist
    const corsOptions = {
      origin: (origin, callback) => {
        debug("CORS host = ", origin);
        if (whitelist.indexOf(origin as string) !== -1 || !origin) {
          callback(null, true);
        } else {
          callback(new ErrorHandler(403, "Not allowed by CORS"));
        }
      },
      optionsSuccessStatus: 200,
      credentials: true,
    };

    // Add a list of allowed origins.
    // If you have more origins you would like to add, you can add them to the array below.
    // const allowedOrigins = ["http://localhost:3000, http://localhost:8000"];
    this._app.set("trust proxy", true); // wichtig, falls hinter Proxy
    this._app.use(this.ipWhitelist.bind(this)); // Middleware zur IP-Whitelist
    this._app.use(cors(corsOptions));

    // Log the routes
    this._app.use((req: Request, res: Response, next: NextFunction) => {
      debug(`${new Date().toString()} => ${req.originalUrl}`);
      next();
    });
    // Load the  routes

    this._app.use("/player", playerroutes);
  }
  public start(): void {
    const host: string = this._app.get("host");
    const port: number = this._app.get("port");
    this._server
      .listen(port, host, () => {
        return debug(`Server running @ 'http://${host}:${port}'`);
      })
      .on("error", (error) => {
        return console.debug("Error: ", error.message);
      });
  }
}
