#!/usr/bin/env node

import {
  callServerTool,
  describeServerTool,
  listServerTools,
  pingServer,
  truncateText,
} from "./client.js";
import {
  addSecret,
  collectConfigSecrets,
  collectUrlSecrets,
  loadConfig,
  loadServerDefinitions,
  maskSecrets,
  removeServer,
  saveServer,
} from "./config.js";
import type { GlobalOptions, ResolvedConfig, ServerConfig } from "./types.js";

const VERSION = "1.0.0";
const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_TIMEOUT_MS = 30000;

const HELP_TEXT = [
  `vib-mcp-client ${VERSION}`,
  "",
  "Usage:",
  "  vib-mcp-client [global options] <command> [arguments]",
  "",
  "Commands:",
  "  servers                                      List configured servers",
  "  list <server>                                List a server's tools",
  "  describe <server> <tool>                     Show a tool's input schema",
  "  call <server> <tool> [json_args]             Call a tool",
  "  ping <server>                                Check a server connection",
  "  add <name> <url> [--type http|sse] [--token-env VAR_NAME]",
  "    Add or update a remote server",
  "  remove <name>                                Remove a server",
  "",
  "Global options:",
  "  --json                  Emit machine-readable JSON",
  "  --max-chars <number>    Output cap (default: 8000; 0 disables)",
  "  --timeout <ms>          Request timeout (default: 30000)",
  "  --config <path>         Custom servers.json path",
  "  -h, --help              Show this help",
  "  -v, --version           Show the version",
].join("\n");

class UsageError extends Error {}

interface ParsedArguments {
  options: GlobalOptions;
  positionals: string[];
}

interface AddArguments {
  name: string;
  url: string;
  type: "http" | "sse";
  tokenEnv?: string;
}

interface RuntimeContext {
  options: GlobalOptions;
  secrets: string[];
  securityReady: boolean;
}

function parsePositiveInteger(
  value: string | undefined,
  flag: string,
  allowZero = false,
): number {
  if (value === undefined || value.trim() === "") {
    throw new UsageError(`Missing value for ${flag}.`);
  }

  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0 ||
    (!allowZero && parsed === 0)
  ) {
    throw new UsageError(
      `${flag} must be ${allowZero ? "a non-negative" : "a positive"} integer.`,
    );
  }
  return parsed;
}

function requireFlagValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new UsageError(`Missing value for ${flag}.`);
  }
  return value;
}

function parseGlobalArguments(args: string[]): ParsedArguments {
  const options: GlobalOptions = {
    json: args.includes("--json"),
    maxChars: DEFAULT_MAX_CHARS,
    timeout: DEFAULT_TIMEOUT_MS,
  };
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--max-chars") {
      options.maxChars = parsePositiveInteger(
        requireFlagValue(args, index, argument),
        argument,
        true,
      );
      index += 1;
    } else if (argument.startsWith("--max-chars=")) {
      options.maxChars = parsePositiveInteger(
        argument.slice("--max-chars=".length),
        "--max-chars",
        true,
      );
    } else if (argument === "--timeout") {
      options.timeout = parsePositiveInteger(
        requireFlagValue(args, index, argument),
        argument,
      );
      index += 1;
    } else if (argument.startsWith("--timeout=")) {
      options.timeout = parsePositiveInteger(
        argument.slice("--timeout=".length),
        "--timeout",
      );
    } else if (argument === "--config") {
      options.configPath = requireFlagValue(args, index, argument);
      index += 1;
    } else if (argument.startsWith("--config=")) {
      const configPath = argument.slice("--config=".length);
      if (configPath === "") {
        throw new UsageError("Missing value for --config.");
      }
      options.configPath = configPath;
    } else {
      positionals.push(argument);
    }
  }

  return { options, positionals };
}

function parseAddArguments(args: string[]): AddArguments {
  const positionals: string[] = [];
  let type: "http" | "sse" = "http";
  let tokenEnv: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--type") {
      const value = requireFlagValue(args, index, argument);
      if (value !== "http" && value !== "sse") {
        throw new UsageError('--type must be "http" or "sse".');
      }
      type = value;
      index += 1;
    } else if (argument === "--token-env") {
      const value = requireFlagValue(args, index, argument);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new UsageError(
          "--token-env must be a valid environment variable name.",
        );
      }
      tokenEnv = value;
      index += 1;
    } else if (argument.startsWith("-")) {
      throw new UsageError(`Unknown add option: ${argument}`);
    } else {
      positionals.push(argument);
    }
  }

  if (positionals.length !== 2) {
    throw new UsageError(
      "Usage: add <name> <url> [--type http|sse] [--token-env VAR_NAME]",
    );
  }

  return {
    name: positionals[0],
    url: positionals[1],
    type,
    ...(tokenEnv === undefined ? {} : { tokenEnv }),
  };
}

function configuredSecrets(config: ResolvedConfig, existing: string[]): string[] {
  const secrets = new Set([...existing, ...config.secrets]);
  for (const server of Object.values(config.servers)) {
    const values = server.type === "stdio" ? server.env : server.headers;
    for (const value of Object.values(values ?? {})) {
      addSecret(secrets, value);
    }
  }
  return [...secrets];
}

function safeTarget(server: ServerConfig): string {
  if (server.type === "stdio") {
    return server.command;
  }

  try {
    const target = new URL(server.url);
    target.username = "";
    target.password = "";
    target.hash = "";
    for (const key of [...target.searchParams.keys()]) {
      if (/token|secret|key|auth|password|credential|signature|session/i.test(key)) {
        target.searchParams.set(key, "***REDACTED***");
      }
    }
    return target.toString();
  } catch {
    return "<invalid URL>";
  }
}

// The CLI envelope and JSON Schema vocabulary are structural, not user data.
// Dynamic keys, including keys in schema property maps, are sanitized.
const fixedKeys = new Set([
  "ok", "error", "output", "truncated", "originalLength", "name", "description",
  "type", "target", "auth", "configPath", "tokenEnv", "reminder", "removed",
  "server", "latencyMs", "serverInfo", "version", "inputSchema", "outputSchema",
  "title", "annotations", "icons", "_meta", "execution", "content", "isError",
  "structuredContent", "$schema", "$id", "$ref", "$defs", "$comment",
  "properties", "patternProperties", "definitions", "dependentSchemas",
  "dependentRequired", "required", "additionalProperties", "items", "prefixItems",
  "enum", "const", "default", "examples", "allOf", "anyOf", "oneOf", "not",
  "if", "then", "else", "format", "pattern", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength",
  "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties",
  "readOnly", "writeOnly", "deprecated", "contains", "propertyNames",
  "additionalItems", "unevaluatedProperties", "unevaluatedItems",
  "minContains", "maxContains", "text", "data", "mimeType", "uri", "resource",
]);
const dynamicMaps = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas", "dependentRequired"]);

function sanitizeJson(value: unknown, secrets: string[], mode: "contract" | "data" | "map" = "contract"): unknown {
  if (typeof value === "string") return maskSecrets(value, secrets);
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item, secrets, mode));
  if (value === null || typeof value !== "object") return value;
  const entries: [string, unknown][] = [];
  const seen = new Set<string>();
  for (const [key, item] of Object.entries(value)) {
    const fixed = mode === "contract" && fixedKeys.has(key);
    const safeKey = fixed ? key : maskSecrets(key, secrets);
    if (seen.has(safeKey)) throw new Error("Cannot safely redact JSON keys without a collision.");
    seen.add(safeKey);
    const next = mode === "data" || key === "structuredContent" || key === "_meta" || key === "default" || key === "examples" || key === "enum" || key === "const"
      ? "data"
      : mode === "map" ? "contract" : dynamicMaps.has(key) ? "map" : "contract";
    entries.push([safeKey, sanitizeJson(item, secrets, next)]);
  }
  return Object.fromEntries(entries);
}

function writeJson(
  value: unknown,
  secrets: string[],
  stream: NodeJS.WriteStream = process.stdout,
  pretty = false,
): void {
  const serialized = JSON.stringify(sanitizeJson(value, secrets), null, pretty ? 2 : undefined);
  stream.write(serialized + "\n");
}

function writeError(message: string, json: boolean, secrets: string[]): void {
  const safeMessage = maskSecrets(message, secrets);
  if (json) {
    writeJson({ error: safeMessage }, [], process.stderr);
  } else {
    process.stderr.write(`${safeMessage}\n`);
  }
}

function loadConfigured(
  context: RuntimeContext,
  serverName?: string,
): ResolvedConfig {
  const config = loadConfig(context.options.configPath, serverName);
  context.secrets = configuredSecrets(config, context.secrets);
  return config;
}

function getServer(
  config: { servers: Record<string, ServerConfig> },
  name: string,
): ServerConfig {
  const server = config.servers[name];
  if (!server) {
    const available = Object.keys(config.servers);
    throw new Error(
      `Server "${name}" not found. Available servers: ${available.length > 0 ? available.join(", ") : "none"}.`,
    );
  }
  return server;
}

function requireNoOptions(args: string[]): void {
  const option = args.find((argument) => argument.startsWith("-"));
  if (option) {
    throw new UsageError(`Unknown option: ${option}`);
  }
}

function extractToolText(
  result: Awaited<ReturnType<typeof callServerTool>>,
  secrets: string[],
): string {
  const toolResult = result as unknown as {
    content?: unknown;
    structuredContent?: unknown;
  };
  const contentBlocks: unknown[] = Array.isArray(toolResult.content)
    ? toolResult.content
    : [];
  const textBlocks: string[] = [];
  for (const block of contentBlocks) {
    if (typeof block !== "object" || block === null) {
      continue;
    }
    const candidate = block as { type?: unknown; text?: unknown };
    if (candidate.type === "text" && typeof candidate.text === "string") {
      textBlocks.push(candidate.text);
    }
  }
  if (textBlocks.length > 0) {
    return maskSecrets(textBlocks.join("\n"), secrets);
  }
  if (toolResult.structuredContent !== undefined) {
    return JSON.stringify(sanitizeJson(toolResult.structuredContent, secrets, "data"), null, 2) ?? "";
  }
  return JSON.stringify(sanitizeJson(toolResult.content ?? result, secrets), null, 2) ?? "";
}

async function runCommand(
  command: string,
  args: string[],
  context: RuntimeContext,
): Promise<void> {
  const { options, secrets } = context;

  if (command === "servers") {
    requireNoOptions(args);
    if (args.length !== 0) {
      throw new UsageError("Usage: servers");
    }
    const config = loadServerDefinitions(options.configPath);
    const servers = Object.entries(config.servers).map(([name, server]) => ({
      name,
      type: server.type,
      target: safeTarget(server),
      auth:
        server.type !== "stdio" && Object.keys(server.headers ?? {}).length > 0,
    }));

    if (options.json) {
      writeJson(servers, context.secrets);
    } else if (servers.length === 0) {
      process.stdout.write("No servers configured.\n");
    } else {
      for (const server of servers) {
        const line = `${server.name} [${server.type}] ${server.target} (auth: ${server.auth})`;
        process.stdout.write(`${maskSecrets(line, context.secrets)}\n`);
      }
    }
    return;
  }

  if (command === "add") {
    const add = parseAddArguments(args);
    let url: URL;
    try {
      url = new URL(add.url);
    } catch {
      throw new UsageError("URL must be a valid absolute HTTP or HTTPS URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new UsageError("URL must use the HTTP or HTTPS protocol.");
    }

    const addSecrets = new Set(context.secrets);
    collectUrlSecrets(add.url, addSecrets);
    if (add.tokenEnv && process.env[add.tokenEnv]) addSecret(addSecrets, process.env[add.tokenEnv]!);
    context.secrets = [...addSecrets];
    const serverConfig: ServerConfig = {
      type: add.type,
      url: add.url,
      ...(add.tokenEnv === undefined
        ? {}
        : { headers: { Authorization: `Bearer \u0024{${add.tokenEnv}}` } }),
    };
    const configPath = saveServer(add.name, serverConfig, options.configPath);
    const reminder = add.tokenEnv
      ? ` Add ${add.tokenEnv} to .vib-mcp/.env.`
      : "";
    const message = `Server "${add.name}" saved to ${configPath}.${reminder}`;
    if (options.json) {
      writeJson(
        {
          ok: true,
          name: add.name,
          type: add.type,
          configPath,
          ...(add.tokenEnv === undefined ? {} : { tokenEnv: add.tokenEnv }),
          ...(add.tokenEnv === undefined
            ? {}
            : { reminder: `Add ${add.tokenEnv} to .vib-mcp/.env.` }),
        },
        context.secrets,
      );
    } else {
      process.stdout.write(`${maskSecrets(message, context.secrets)}\n`);
    }
    return;
  }

  if (command === "remove") {
    requireNoOptions(args);
    if (args.length !== 1) {
      throw new UsageError("Usage: remove <name>");
    }
    const [name] = args;
    if (!removeServer(name, options.configPath)) {
      throw new Error(`Server "${name}" not found; nothing was removed.`);
    }
    if (options.json) {
      writeJson({ ok: true, removed: name }, secrets);
    } else {
      process.stdout.write(maskSecrets(`Server "${name}" removed.`, context.secrets) + "\n");
    }
    return;
  }

  if (command === "list") {
    requireNoOptions(args);
    if (args.length !== 1) {
      throw new UsageError("Usage: list <server>");
    }
    const definitions = loadServerDefinitions(context.options.configPath);
    getServer(definitions, args[0]);
    const config = loadConfigured(context, args[0]);
    const server = getServer(config, args[0]);
    const tools = await listServerTools(
      server,
      options.timeout,
      context.secrets,
    );
    if (options.json) {
      writeJson(tools, context.secrets);
    } else if (tools.length === 0) {
      process.stdout.write("No tools available.\n");
    } else {
      for (const tool of tools) {
        const description = tool.description ? ` - ${tool.description}` : "";
        process.stdout.write(
          `${maskSecrets(tool.name + description, context.secrets)}\n`,
        );
      }
    }
    return;
  }

  if (command === "describe") {
    requireNoOptions(args);
    if (args.length !== 2) {
      throw new UsageError("Usage: describe <server> <tool>");
    }
    const definitions = loadServerDefinitions(context.options.configPath);
    getServer(definitions, args[0]);
    const config = loadConfigured(context, args[0]);
    const server = getServer(config, args[0]);
    const tool = await describeServerTool(
      server,
      args[1],
      options.timeout,
      context.secrets,
    );
    writeJson(tool, context.secrets, process.stdout, true);
    return;
  }

  if (command === "call") {
    if (args.length < 2 || args.length > 3) {
      throw new UsageError("Usage: call <server> <tool> [json_args]");
    }
    let toolArgs: Record<string, unknown> = {};
    if (args[2] !== undefined) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(args[2]) as unknown;
      } catch {
        throw new UsageError("json_args must be a valid JSON object.");
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new UsageError("json_args must be a JSON object.");
      }
      toolArgs = parsed as Record<string, unknown>;
    }

    const definitions = loadServerDefinitions(context.options.configPath);
    getServer(definitions, args[0]);
    const config = loadConfigured(context, args[0]);
    const server = getServer(config, args[0]);
    const result = await callServerTool(
      server,
      args[1],
      toolArgs,
      options.timeout,
      context.secrets,
    );
    const output = extractToolText(result, context.secrets);
    const truncated = truncateText(output, options.maxChars);

    if (result.isError) {
      if (options.json) {
        writeJson(
          {
            error: truncated.text,
            truncated: truncated.truncated,
            originalLength: truncated.originalLength,
          },
          [], // Tool output already sanitized before truncation.

          process.stderr,
        );
      } else {
        process.stderr.write(`${truncated.text}\n`);
      }
      process.exitCode = 1;
      return;
    }

    if (options.json) {
      writeJson(
        {
          output: truncated.text,
          truncated: truncated.truncated,
          originalLength: truncated.originalLength,
        },
        [], // Tool output already sanitized before truncation.

      );
    } else {
      process.stdout.write(`${truncated.text}\n`);
    }
    return;
  }

  if (command === "ping") {
    requireNoOptions(args);
    if (args.length !== 1) {
      throw new UsageError("Usage: ping <server>");
    }
    const definitions = loadServerDefinitions(context.options.configPath);
    getServer(definitions, args[0]);
    const config = loadConfigured(context, args[0]);
    const server = getServer(config, args[0]);
    const result = await pingServer(server, options.timeout, context.secrets);
    if (options.json) {
      writeJson({ server: args[0], ...result }, context.secrets);
    } else {
      const version = result.serverInfo
        ? ` - ${result.serverInfo.name} ${result.serverInfo.version}`
        : "";
      process.stdout.write(
        `${maskSecrets(`OK ${args[0]} (${result.latencyMs} ms)${version}`, context.secrets)}\n`,
      );
    }
    return;
  }

  throw new UsageError(`Unknown command: ${command}\n\n${HELP_TEXT}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return;
  }
  if (args.includes("-v") || args.includes("--version")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const context: RuntimeContext = {
    options: {
      json: args.includes("--json"),
      maxChars: DEFAULT_MAX_CHARS,
      timeout: DEFAULT_TIMEOUT_MS,
    },
    secrets: [],
    securityReady: false,
  };

  try {
    const parsed = parseGlobalArguments(args);
    context.options = parsed.options;
    context.secrets = collectConfigSecrets(context.options.configPath);
    context.securityReady = true;
    const [command, ...commandArgs] = parsed.positionals;
    if (!command) {
      throw new UsageError(`Missing command.\n\n${HELP_TEXT}`);
    }
    await runCommand(command, commandArgs, context);
  } catch (error) {
    writeError(
      context.securityReady || error instanceof UsageError
        ? (error instanceof Error ? error.message : String(error))
        : "Unable to initialize configuration security context.",
      context.options.json,
      context.secrets,
    );
    process.exitCode = error instanceof UsageError ? 2 : 1;
  }
}

await main();
