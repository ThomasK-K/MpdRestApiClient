export interface ServerConfigInterface {
    host: string;
    port: number;
    socketport: number;
    https_enabled?: boolean;
    https_port?: number;
    ssl_key_path?: string;
    ssl_cert_path?: string;
  }
