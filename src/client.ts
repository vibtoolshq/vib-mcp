import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
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

class LifecycleTimeout extends Error {}

type LifecycleOptions = RequestOptions & { timeout: number; signal: AbortSignal };

// One timer per phase; SDK requests share its cancellation signal.
// The race also bounds transport start/notification, which do not accept
// RequestOptions. Transport shutdown handles their remaining I/O.
export async function withTimeout<T>(
  fn: (options: LifecycleOptions) => Promise<T>,
  timeoutMs: number,
  label = "MCP operation",
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const error = new LifecycleTimeout(`${label} timed out after ${timeoutMs} ms`);
        reject(error);
        controller.abort(error);
      }, timeoutMs);
    });
    const work = Promise.resolve().then(() => fn({ timeout: timeoutMs, signal: controller.signal }));
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// SDK Client.connect() can start close itself after initialization failure.
// Join that same public close promise instead of racing two closes of a child.
class LifecycleClient extends Client {
  private closing?: Promise<void>;

  override close(): Promise<void> {
    if (!this.closing) {
      this.closing = Promise.resolve().then(() => super.close());
      // SDK may call close() without awaiting it; retain rejection for caller.
      void this.closing.catch(() => {});
    }
    return this.closing;
  }
}

// The SDK stdio close may take up to ~4 seconds. Reserve the final 10%
// of the cleanup budget for direct transport fallback. No forced process exit.
export async function closeBounded(
  closeClient: () => Promise<void>,
  closeTransport: () => Promise<void>,
  budgetMs = 5000,
): Promise<void> {
  const started = performance.now();
  try {
    await withTimeout(closeClient, Math.max(1, Math.floor(budgetMs * 0.9)), "MCP client close");
    return;
  } catch (error) {
    const remaining = Math.floor(budgetMs - (performance.now() - started));
    if (remaining <= 0) throw new Error("MCP cleanup deadline exceeded.");
    try {
      await withTimeout(closeTransport, remaining, "MCP transport close");
    } catch {
      throw new Error("MCP transport cleanup failed or timed out.");
    }
    // A second close can be a no-op while the first is still pending.
    // Do not report success unless completion of the first is established.
    if (error instanceof LifecycleTimeout) {
      throw new Error("MCP client close timed out; cleanup completion unconfirmed.");
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
  fn: (client: Client, options: LifecycleOptions) => Promise<T>,
): Promise<T> {
  const client = new LifecycleClient({ name: "vib-mcp-client", version: "1.0.0" });
  let transport: ReturnType<typeof createTransport> | undefined;
  const effectiveTimeoutMs = serverConfig.timeout ?? timeoutMs;
  let primaryError: Error | undefined;

  try {
    transport = createTransport(serverConfig);
    const owned = transport;
    await withTimeout((options) => client.connect(owned, options), effectiveTimeoutMs, "MCP connect");
    return await withTimeout((options) => fn(client, options), effectiveTimeoutMs);
  } catch (error) {
    primaryError = new Error(maskSecrets(errorMessage(error), secrets));
    throw primaryError;
  } finally {
    if (transport) {
      const owned = transport;
      try {
        await closeBounded(() => client.close(), () => owned.close());
      } catch (error) {
        // Keep the primary operation error. A cleanup failure after success
        // must not be represented as a successful operation.
        const cleanupMessage = maskSecrets(errorMessage(error), secrets);
        if (!primaryError) throw new Error(cleanupMessage);
        primaryError.message += "; " + cleanupMessage;
      }
    }
  }
}

export async function pingServer(
  serverConfig: ServerConfig,
  timeoutMs: number,
  secrets: string[],
) {
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client, options) => {
    const startedAt = Date.now();
    try {
      if (typeof client.ping === "function") {
        await client.ping(options);
      } else {
        await client.listTools(undefined, options);
      }
    } catch (error) {
      if (!isMethodNotFound(error)) {
        throw error;
      }
      await client.listTools(undefined, options);
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
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client, options) => {
    const result = await client.listTools(undefined, options);
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
  return withMcpClient(serverConfig, timeoutMs, secrets, async (client, options) => {
    const result = await client.listTools(undefined, options);
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
  return withMcpClient(serverConfig, timeoutMs, secrets, (client, options) =>
    client.callTool({ name: toolName, arguments: args }, undefined, options),
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
