import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  HttpServerConfig,
  ResolvedConfig,
  ServerConfig,
  ServersFile,
  StdioServerConfig,
} from "./types.js";

interface ConfigPaths {
  configPath: string;
  envPath: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function validateTimeout(
  value: Record<string, unknown>,
  context: string,
): number | undefined {
  if (value.timeout === undefined) {
    return undefined;
  }

  if (
    typeof value.timeout !== "number" ||
    !Number.isFinite(value.timeout) ||
    value.timeout <= 0
  ) {
    throw new Error(`${context}.timeout must be a positive finite number`);
  }

  return value.timeout;
}

function validateServerConfig(name: string, value: unknown): ServerConfig {
  const context = `servers.${name}`;
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object`);
  }

  const timeout = validateTimeout(value, context);
  if (value.type === "http" || value.type === "sse") {
    if (typeof value.url !== "string" || value.url.trim() === "") {
      throw new Error(`${context}.url must be a non-empty string`);
    }
    if (value.headers !== undefined && !isStringRecord(value.headers)) {
      throw new Error(`${context}.headers must be an object of string values`);
    }

    const config: HttpServerConfig = {
      type: value.type,
      url: value.url,
      ...(value.headers === undefined ? {} : { headers: value.headers }),
      ...(timeout === undefined ? {} : { timeout }),
    };
    return config;
  }

  if (value.type === "stdio") {
    if (typeof value.command !== "string" || value.command.trim() === "") {
      throw new Error(`${context}.command must be a non-empty string`);
    }
    if (
      value.args !== undefined &&
      (!Array.isArray(value.args) ||
        !value.args.every((argument) => typeof argument === "string"))
    ) {
      throw new Error(`${context}.args must be an array of strings`);
    }
    if (value.env !== undefined && !isStringRecord(value.env)) {
      throw new Error(`${context}.env must be an object of string values`);
    }

    const config: StdioServerConfig = {
      type: "stdio",
      command: value.command,
      ...(value.args === undefined ? {} : { args: value.args as string[] }),
      ...(value.env === undefined ? {} : { env: value.env }),
      ...(timeout === undefined ? {} : { timeout }),
    };
    return config;
  }

  throw new Error(`${context}.type must be "http", "sse", or "stdio"`);
}

function parseServersFile(text: string, configPath: string): ServersFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON in configuration file: ${configPath}`);
  }

  if (!isRecord(parsed) || !isRecord(parsed.servers)) {
    throw new Error(
      `Invalid configuration in ${configPath}: expected a "servers" object`,
    );
  }

  const servers = Object.fromEntries(
    Object.entries(parsed.servers).map(([name, value]) => {
      if (name.trim() === "") {
        throw new Error("Server names must not be empty");
      }
      return [name, validateServerConfig(name, value)];
    }),
  ) as Record<string, ServerConfig>;

  return { servers };
}

function readServersFile(configPath: string): ServersFile {
  let text: string;
  try {
    text = readFileSync(configPath, "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    throw error;
  }

  return parseServersFile(text, configPath);
}

function writeServersFile(configPath: string, serversFile: ServersFile): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    `${JSON.stringify(serversFile, null, 2)}\n`,
    "utf8",
  );
}

export function resolveConfigPaths(customConfigPath?: string): ConfigPaths {
  let configPath: string;

  if (customConfigPath !== undefined) {
    configPath = resolve(process.cwd(), customConfigPath);
  } else {
    const scriptDirectory = dirname(fileURLToPath(import.meta.url));
    const scriptConfigPath = join(scriptDirectory, "servers.json");
    const workingDirectoryConfigPath = resolve(
      process.cwd(),
      ".vib-mcp",
      "servers.json",
    );
    configPath = existsSync(scriptConfigPath)
      ? scriptConfigPath
      : workingDirectoryConfigPath;
  }

  return {
    configPath,
    envPath: join(dirname(configPath), ".env"),
  };
}

export function loadServerDefinitions(customConfigPath?: string): {
  configPath: string;
  servers: Record<string, ServerConfig>;
} {
  const { configPath } = resolveConfigPaths(customConfigPath);
  return { configPath, ...readServersFile(configPath) };
}

export function parseEnvFile(envPath: string): Record<string, string> {
  if (!existsSync(envPath)) {
    return {};
  }

  const values: Record<string, string> = {};
  const content = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    if (key === "") {
      continue;
    }

    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if (quote === '"' || quote === "'") {
      let closingIndex = -1;
      let escaped = false;
      for (let index = 1; index < value.length; index += 1) {
        if (value[index] === "\\" && !escaped) {
          escaped = true;
        } else if (value[index] === quote && !escaped) {
          closingIndex = index;
          break;
        } else {
          escaped = false;
        }
      }
      if (closingIndex >= 0) {
        value = value.slice(1, closingIndex).replace(/\\([\\"'])/g, "$1");
      }
    } else {
      const commentIndex = value.search(/\s+#/);
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trimEnd();
      }
    }
    values[key] = value;
  }

  return values;
}

export function interpolateEnv(
  value: string,
  envMap: Record<string, string>,
  collectedSecrets: Set<string>,
): string {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_match, variable: string) => {
      const resolvedValue = envMap[variable] ?? process.env[variable];
      if (resolvedValue === undefined || resolvedValue === "") {
        throw new Error(
          `Missing required environment variable: ${variable}. Add it to .vib-mcp/.env or set it in the process environment.`,
        );
      }

      collectedSecrets.add(resolvedValue);
      return resolvedValue;
    },
  );
}

export function loadConfig(
  customConfigPath?: string,
  serverName?: string,
): ResolvedConfig {
  const { configPath, envPath } = resolveConfigPaths(customConfigPath);
  const file = readServersFile(configPath);
  const envMap = parseEnvFile(envPath);
  const collectedSecrets = new Set<string>();

  if (serverName !== undefined && !Object.hasOwn(file.servers, serverName)) {
    throw new Error(`Server "${serverName}" not found.`);
  }

  const entries =
    serverName === undefined
      ? Object.entries(file.servers)
      : Object.entries(file.servers).filter(([name]) => name === serverName);

  const servers = Object.fromEntries(
    entries.map(([name, server]) => {
      if (server.type === "stdio") {
        const env = server.env
          ? Object.fromEntries(
              Object.entries(server.env).map(([key, value]) => [
                key,
                interpolateEnv(value, envMap, collectedSecrets),
              ]),
            )
          : undefined;
        return [name, { ...server, ...(env === undefined ? {} : { env }) }];
      }

      const headers = server.headers
        ? Object.fromEntries(
            Object.entries(server.headers).map(([key, value]) => [
              key,
              interpolateEnv(value, envMap, collectedSecrets),
            ]),
          )
        : undefined;
      return [
        name,
        { ...server, ...(headers === undefined ? {} : { headers }) },
      ];
    }),
  ) as Record<string, ServerConfig>;

  return {
    configPath,
    envPath,
    servers,
    secrets: [...collectedSecrets],
  };
}

export function saveServer(
  name: string,
  serverConfig: ServerConfig,
  customConfigPath?: string,
): string {
  if (name.trim() === "") {
    throw new Error("Server name must not be empty");
  }

  const { configPath } = resolveConfigPaths(customConfigPath);
  const current = existsSync(configPath)
    ? readServersFile(configPath)
    : { servers: {} };
  const validatedConfig = validateServerConfig(name, serverConfig);
  const servers = { ...current.servers, [name]: validatedConfig };
  writeServersFile(configPath, { servers });
  return configPath;
}

export function removeServer(name: string, customConfigPath?: string): boolean {
  const { configPath } = resolveConfigPaths(customConfigPath);
  if (!existsSync(configPath)) {
    return false;
  }

  const current = readServersFile(configPath);
  if (!Object.hasOwn(current.servers, name)) {
    return false;
  }

  const servers = Object.fromEntries(
    Object.entries(current.servers).filter(
      ([serverName]) => serverName !== name,
    ),
  ) as Record<string, ServerConfig>;
  writeServersFile(configPath, { servers });
  return true;
}

export function maskSecrets(text: string, secrets: string[]): string {
  const maskableSecrets = [
    ...new Set(secrets.filter((secret) => secret.length >= 4)),
  ].sort((left, right) => right.length - left.length);

  return maskableSecrets.reduce(
    (masked, secret) => masked.split(secret).join("***REDACTED***"),
    text,
  );
}
