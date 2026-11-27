import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { maskSecrets } from "./config.js";
import type { ServerConfig } from "./types.js";

export function createTransport(serverConfig: ServerConfig) {
  if (serverConfig.type === "stdio") {
    // SDK also merges its own default environment. Start from that exact
    // platform allowlist and overlay only explicitly configured values.
    const env = getDefaultEnvironment();
    for (const [key, value] of Object.entries(serverConfig.env ?? {})) {
      if (process.platform === "win32") {
        for (const inherited of Object.keys(env)) {
          if (inherited.toUpperCase() === key.toUpperCase()) delete env[inherited];
        }
        env[key.toUpperCase()] = value;
      } else {
        env[key] = value;
      }
    }

    return new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args ?? [],
      env,
      // Untrusted child diagnostics must never bypass CLI redaction or JSON output.
      stderr: "ignore",
    });
  }

  if (serverConfig.type === "http") {
    return new StreamableHTTPClientTransport(new URL(serverConfig.url), {
      requestInit: serverConfig.headers
        ? { headers: serverConfig.headers }
        : undefined,
    });
  }

  if (serverConfig.type === "sse") {
    return new SSEClientTransport(new URL(serverConfig.url), {
      requestInit: serverConfig.headers
        ? { headers: serverConfig.headers }
        : undefined,
    });
  }

  return new SSEClientTransport(new URL(serverConfig.url), {
    requestInit: serverConfig.headers
      ? { headers: serverConfig.headers }
      : undefined,
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`MCP operation timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMethodNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === -32601
  );
}

export async function withMcpClient<T>(
  serverConfig: ServerConfig,
  timeoutMs: number,
  secrets: string[],
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ name: "vib-mcp-client", version: "1.0.0" });
  let transport: ReturnType<typeof createTransport> | undefined;
  const effectiveTimeoutMs = serverConfig.timeout ?? timeoutMs;

  try {
    transport = createTransport(serverConfig);
    await withTimeout(
      Promise.resolve().then(() => client.connect(transport!)),
      effectiveTimeoutMs,
    );
    return await withTimeout(
      Promise.resolve().then(() => fn(client)),
      effectiveTimeoutMs,
    );
  } catch (error) {
    throw new Error(maskSecrets(errorMessage(error), secrets));
  } finally {
    try {
      await client.close();
    } catch {
      if (transport) {
        try {
          await transport.close();
        } catch {
          // Preserve the primary operation result or error.
        }
      }
    }
  }
}

export async function pingServer(
  serverConfig: ServerConfig,
  timeoutMs: number,
  secrets: string[],
) {
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client) => {
    const startedAt = Date.now();
    try {
      if (typeof client.ping === "function") {
        await client.ping({ timeout: timeoutMs });
      } else {
        await client.listTools(undefined, { timeout: timeoutMs });
      }
    } catch (error) {
      if (!isMethodNotFound(error)) {
        throw error;
      }
      await client.listTools(undefined, { timeout: timeoutMs });
    }

    return {
      ok: true as const,
      latencyMs: Date.now() - startedAt,
      serverInfo: client.getServerVersion(),
    };
  });
}

export async function listServerTools(
  serverConfig: ServerConfig,
  timeoutMs: number,
  secrets: string[],
) {
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client) => {
    const result = await client.listTools(undefined, { timeout: timeoutMs });
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
    }));
  });
}

export async function describeServerTool(
  serverConfig: ServerConfig,
  toolName: string,
  timeoutMs: number,
  secrets: string[],
) {
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client) => {
    const result = await client.listTools(undefined, { timeout: timeoutMs });
    const tool = result.tools.find((candidate) => candidate.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found on server.`);
    }
    return tool;
  });
}

export async function callServerTool(
  serverConfig: ServerConfig,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number,
  secrets: string[],
) {
  return withMcpClient(serverConfig, timeoutMs, secrets, (client) =>
    client.callTool({ name: toolName, arguments: args }, undefined, {
      timeout: timeoutMs,
    }),
  );
}

export function truncateText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean; originalLength: number } {
  if (maxChars > 0 && text.length > maxChars) {
    return {
      text: `${text.slice(0, maxChars)}\n... [truncated: showing ${maxChars} of ${text.length} chars. Use --max-chars <n> to adjust]`,
      truncated: true,
      originalLength: text.length,
    };
  }

  return { text, truncated: false, originalLength: text.length };
}
