declare module 'mpd2' {
  namespace MPD {
    interface Client {
      sendCommand(command: string): Promise<string>;
      sendCommands(commands: string[]): Promise<string>;
      on(event: string, listener: (name: string) => void): void;
      idling?: boolean;
    }
  }

  interface MPD {
    connect(options: { host: string, port: number }): Promise<MPD.Client>;
    cmd(command: string, args?: string[]): string;
    parseObject<T>(data: string): T;
    parseNestedList<T>(data: string): T[];
  }

  const mpd: {
    connect(options: { host: string, port: number }): Promise<MPD.Client>;
    cmd(command: string, args?: string[]): string;
    parseObject<T>(data: string): T;
    parseNestedList<T>(data: string): T[];
  };

  export default mpd;
  export { MPD };
}
