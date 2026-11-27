export interface HttpServerConfig {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface StdioServerConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export type ServerConfig = HttpServerConfig | StdioServerConfig;

export interface ServersFile {
  servers: Record<string, ServerConfig>;
}

export interface GlobalOptions {
  json: boolean;
  maxChars: number;
  timeout: number;
  configPath?: string;
}

export interface ResolvedConfig {
  configPath: string;
  envPath: string;
  servers: Record<string, ServerConfig>;
  secrets: string[];
}
