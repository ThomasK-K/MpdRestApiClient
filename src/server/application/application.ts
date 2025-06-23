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
import * as https from "https";
import * as fs from "fs";

var ipRangeCheck = require("ip-range-check");

var debug = require("debug")("application");

export class Application {
  public _app: Express;
  public _server: Server;
  public _httpsServer: https.Server | null = null;
  public _wss: WS;
  private _serverConfig: ServerConfigInterface | null = null;

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
    const whitelist: string[] = configData.whitelist;
    this._serverConfig = sc;
    this._app.set("host", sc.host || "localhost");
    this._app.set("port", sc.port || 3000);
    
    // Body Parser konfigurieren
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({ extended: true }));
    this._app.use(express.json());

    // CORS-Optionen mit Whitelist
    const corsOptions = {
      origin: (origin, callback) => {
        debug("CORS host = ", origin);
        if (whitelist.indexOf(origin as string) !== -1 || !origin) {
          callback(null, true);
        } else {
          debug("Origin not allowed by CORS:", origin);
          callback(new ErrorHandler(403, "Not allowed by CORS"));
        }
      },
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "accept",
        "authorization",
        "content-type",
        "x-requested-with",
      ],
      exposedHeaders: [
        "Content-Length",
        "Content-Type"
      ],
      maxAge: 86400,               // 24 Stunden (in Sekunden)
      optionsSuccessStatus: 200,   // Status-Code für OPTIONS-Requests
      credentials: true,           // Erlaubt Cookies in CORS-Requests
      preflightContinue: false,
    };
    
    // Füge Middleware für Cache-Control hinzu
    this._app.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });

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

    // Create HTTPS server if enabled
    if (sc.https_enabled && sc.ssl_key_path && sc.ssl_cert_path) {
      try {
        const options = {
          key: fs.readFileSync(sc.ssl_key_path),
          cert: fs.readFileSync(sc.ssl_cert_path),
        };
        this._httpsServer = https.createServer(options, this._app);
      } catch (error) {
        console.error("Failed to create HTTPS server:", error);
        throw error;
      }
    }
  }
  public start(): void {
    const host: string = this._app.get("host");
    const port: number = this._app.get("port");

    // Start HTTP server
    this._server
      .listen(port, host, () => {
        return debug(`HTTP Server running @ 'http://${host}:${port}'`);
      })
      .on("error", (error) => {
        return console.debug("HTTP Error: ", error.message);
      });

    // Start HTTPS server if enabled
    if (
      this._httpsServer &&
      this._serverConfig?.https_enabled &&
      this._serverConfig?.https_port
    ) {
      const httpsPort = this._serverConfig.https_port;

      // Initialize WSS for HTTPS
      const wsSecure = new WebSocketServer({ server: this._httpsServer });
      this._wss.initSecure(wsSecure);

      this._httpsServer
        .listen(httpsPort, host, () => {
          return debug(`HTTPS Server running @ 'https://${host}:${httpsPort}'`);
        })
        .on("error", (error) => {
          return console.debug("HTTPS Error: ", error.message);
        });
    }
  }
}
