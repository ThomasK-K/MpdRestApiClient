import { Application } from "./application";
import express from 'express';
import dotenv from 'dotenv';
import { ServerConfigInterface } from "./interfaces/serverConfigInterfaces";

dotenv.config();

var debug = require("debug")("server.ts");

const app = express();

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500)
     .set('Content-Type', 'application/json')
     .json({
       success: false,
       error: err.message || 'Internal server error'
     });
});

///////////////////////////////////////////////
const serverConfig: ServerConfigInterface = {
  host: process.env.HOST || 'localhost',
  socketport: parseInt(process.env.SOCKETPORT || '3000'),
  port: parseInt(process.env.PORT || '3001')
};

const application: Application = new Application();
const server = async () => {
  application.initMpdConnection();
  application.init(serverConfig);
  application.start();
};

server().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});