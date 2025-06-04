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
    // this._wss = new WebSocketServer({ server });
    // const ws = new WS();
    // ws.init(this._wss);

    const ws = new WebSocketServer({ server });
    this._wss = new WS();
    this._wss.init(ws);
  }
  initMpdConnection = async () => {
    await MpdConnection.connect();
    const song = await MpdConnection.getCurrentSong();
  };

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

    const whitelist = configData.whitelist;

    // Add a list of allowed origins.
    // If you have more origins you would like to add, you can add them to the array below.
    // const allowedOrigins = ["http://localhost:3000, http://localhost:8000"];

    this._app.use(
      cors({
        
        origin: (origin, callback) => {
            console.log("CORS enabled",origin)
        if (whitelist.indexOf(origin as string) !== -1 || !origin) {
              callback(null, true);
            } else {
              callback(new ErrorHandler(403, "Not allowed by CORS"));
            }
          },
        optionsSuccessStatus: 200,
        credentials: true,
      })
    );
    // Log the routes
    this._app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toString()} => ${req.originalUrl}`);
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
        return console.log("Error: ", error.message);
      });
  }
}
