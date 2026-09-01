/**
 * @aura/fhe-client — TypeScript client for the Aura FHE service.
 *
 * A zero-dependency, isomorphic client that communicates with the Aura
 * encryption service over HTTPS. Covers every endpoint:
 *
 *   GET  /health
 *   GET  /functions
 *   POST /init
 *   POST /keygen
 *   POST /load
 *   POST /encrypt/{int|float|string|binary}
 *   POST /decrypt/{int|float|string|binary}
 *   POST /call
 *   POST /verify
 *
 * Works in any environment with a WHATWG `fetch` implementation: modern
 * browsers, Node.js 18+, Deno, Bun, Cloudflare Workers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Plaintext domain for an encrypt/decrypt operation. */
export type Domain = "int" | "float" | "string" | "binary";

/**
 * Opaque ciphertext string returned by the server.
 * Branded so you cannot accidentally pass a plaintext string where a
 * ciphertext is expected.
 */
export type Ciphertext = string & { readonly __brand: unique symbol };

/** Options accepted by the {@link AfheClient} constructor. */
export interface AfheClientOptions {
  /** Base URL of the running server, e.g. `https://api.afhe.io:8443`. */
  baseUrl: string;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Abort signal used for every request unless overridden. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds (default: no timeout). */
  timeoutMs?: number;
  /**
   * Number of retries for transient failures (5xx, network errors).
   * Defaults to 0 (no retries). Uses exponential backoff starting at 1s.
   */
  retries?: number;
}

/** Body accepted by {@link AfheClient.keygen}. All fields are optional. */
export interface KeygenOptions {
  m?: number;
  n?: number;
  q?: number;
  p?: number;
  delta?: number;
  skb_file?: string;
  pkb_file?: string;
  dictb_file?: string;
  /** Regenerate even if the files already exist. */
  force?: boolean;
}

export interface KeygenResult {
  skipped: boolean;
  skb_file: string;
  pkb_file: string;
  dictb_file: string;
}

/**
 * Body accepted by {@link AfheClient.load}.
 * Load only what the role needs. Values are **file paths** on the server,
 * e.g. `"file/skb"`, not the file contents.
 */
export interface LoadOptions {
  /** Path to the Secret Key Block file on the server. */
  skb?: string;
  /** Path to the Public Key Block file on the server. */
  pkb?: string;
  /** Path to the Dictionary Block file on the server. */
  dictb?: string;
}

export interface LoadResult {
  loaded: Array<"skb" | "pkb" | "dictb">;
}

export interface FunctionsList {
  arity1: string[];
  arity2: string[];
  arity3: string[];
}

/** Thrown on non-2xx responses, malformed bodies, and network errors. */
export class AfheApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AfheApiError";
    Object.setPrototypeOf(this, AfheApiError.prototype);
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class AfheClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultSignal?: AbortSignal;
  private readonly timeoutMs?: number;
  private readonly retries: number;

  constructor(opts: AfheClientOptions) {
    if (!opts.baseUrl) throw new Error("AfheClient: baseUrl is required");
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = opts.headers ?? {};
    this.defaultSignal = opts.signal;
    this.timeoutMs = opts.timeoutMs;
    this.retries = opts.retries ?? 0;
  }

  // ---- low-level request plumbing ----------------------------------------

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 10_000));
      }

      try {
        return await this.doRequest<T>(method, path, body, signal);
      } catch (err) {
        lastError = err;
        // Only retry on network errors (status 0) or 5xx server errors
        if (err instanceof AfheApiError && err.status > 0 && err.status < 500) {
          throw err; // 4xx are not retryable
        }
        if (attempt === this.retries) break;
      }
    }

    throw lastError;
  }

  private async doRequest<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = this.timeoutMs != null ? new AbortController() : undefined;
    const timer = controller
      ? setTimeout(() => controller.abort(new Error(`timeout after ${this.timeoutMs}ms`)), this.timeoutMs!)
      : undefined;

    // Combine all signals: user per-call > default > timeout
    const combinedSignal = combineSignals(signal, this.defaultSignal, controller?.signal);

    // Only set Content-Type on requests with a body
    const headers: Record<string, string> = { ...this.defaultHeaders };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const res = await this.fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: combinedSignal,
      });

      const text = await res.text();
      let parsed: unknown = undefined;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new AfheApiError(`non-JSON response from ${path}`, res.status, text);
        }
      }

      if (!res.ok) {
        const msg =
          parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
            ? String((parsed as Record<string, unknown>).error)
            : `HTTP ${res.status} from ${path}`;
        throw new AfheApiError(msg, res.status, parsed);
      }

      if (parsed === undefined) {
        throw new AfheApiError(`empty response body from ${path}`, res.status, text);
      }

      return parsed as T;
    } catch (err) {
      if (err instanceof AfheApiError) throw err;
      // Wrap network errors (DNS failure, TLS error, abort, etc.)
      const message = err instanceof Error ? err.message : String(err);
      throw new AfheApiError(`network error: ${message}`, 0, err);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // ---- health / discovery ------------------------------------------------

  /** `GET /health` — liveness probe. */
  health(signal?: AbortSignal): Promise<{ status: string }> {
    return this.request("GET", "/health", undefined, signal);
  }

  /** `GET /functions` — list every function the generic `/call` router accepts. */
  functions(signal?: AbortSignal): Promise<FunctionsList> {
    return this.request("GET", "/functions", undefined, signal);
  }

  // ---- init / keys -------------------------------------------------------

  /** `POST /init` — call `Init()` (usually unnecessary; server auto-inits). */
  init(signal?: AbortSignal): Promise<{ ok: boolean }> {
    return this.request("POST", "/init", {}, signal);
  }

  /**
   * `POST /keygen` — generate SKB + PKB + DictB. Slow on first run;
   * subsequent runs skip regeneration unless `force: true`.
   */
  keygen(opts: KeygenOptions = {}, signal?: AbortSignal): Promise<KeygenResult> {
    return this.request("POST", "/keygen", opts, signal);
  }

  /**
   * `POST /load` — load key blocks into the runtime.
   * Values are **file paths on the server**, e.g. `"file/skb"`.
   */
  load(opts: LoadOptions, signal?: AbortSignal): Promise<LoadResult> {
    return this.request("POST", "/load", opts, signal);
  }

  // ---- encrypt / decrypt -------------------------------------------------

  /**
   * `POST /encrypt/{domain}` — encrypt a plaintext value.
   * Pass `public: true` to use the public-key encryptor (requires loaded PKB);
   * the default uses the private-key encryptor (requires loaded SKB).
   */
  async encrypt(
    domain: Domain,
    value: string | number,
    opts: { public?: boolean; signal?: AbortSignal } = {},
  ): Promise<Ciphertext> {
    validateNumericValue(value);
    const res = await this.request<{ ciphertext: string }>(
      "POST",
      `/encrypt/${domain}`,
      { value: String(value), public: opts.public ?? false },
      opts.signal,
    );
    return res.ciphertext as Ciphertext;
  }

  /** `POST /decrypt/{domain}` — decrypt a ciphertext. Requires loaded SKB. */
  async decrypt(
    domain: Domain,
    ciphertext: Ciphertext,
    signal?: AbortSignal,
  ): Promise<string> {
    const res = await this.request<{ plaintext: string }>(
      "POST",
      `/decrypt/${domain}`,
      { ciphertext },
      signal,
    );
    return res.plaintext;
  }

  // ---- generic /call dispatch -------------------------------------------

  /**
   * `POST /call` — canonical generic dispatcher. Every operation is
   * reachable here. Prefer the typed helpers below so argument arity
   * is checked at compile time.
   */
  async call(fn: string, args: string[], signal?: AbortSignal): Promise<Ciphertext> {
    const res = await this.request<{ result: string }>(
      "POST",
      "/call",
      { fn, args },
      signal,
    );
    return res.result as Ciphertext;
  }

  /** `POST /verify` — verify a signature. Requires loaded DictB. */
  async verify(input: string, sign: string, signal?: AbortSignal): Promise<boolean> {
    const res = await this.request<{ valid: boolean }>(
      "POST",
      "/verify",
      { input, sign },
      signal,
    );
    return res.valid;
  }

  // ========================================================================
  // Typed helpers
  // ========================================================================

  // ---- encryption (private key) -----------------------------------------

  encryptInt(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("int", value, { signal });
  }
  encryptFloat(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("float", value, { signal });
  }
  encryptString(value: string, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("string", value, { signal });
  }
  encryptBinary(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("binary", value, { signal });
  }

  // ---- encryption (public key) ------------------------------------------

  encryptPublicInt(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("int", value, { public: true, signal });
  }
  encryptPublicFloat(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("float", value, { public: true, signal });
  }
  encryptPublicString(value: string, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("string", value, { public: true, signal });
  }
  encryptPublicBinary(value: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.encrypt("binary", value, { public: true, signal });
  }

  // ---- decryption --------------------------------------------------------

  decryptInt(c: Ciphertext, signal?: AbortSignal): Promise<string> {
    return this.decrypt("int", c, signal);
  }
  decryptFloat(c: Ciphertext, signal?: AbortSignal): Promise<string> {
    return this.decrypt("float", c, signal);
  }
  decryptString(c: Ciphertext, signal?: AbortSignal): Promise<string> {
    return this.decrypt("string", c, signal);
  }
  decryptBinary(c: Ciphertext, signal?: AbortSignal): Promise<string> {
    return this.decrypt("binary", c, signal);
  }

  // ---- Int / Float arithmetic (need DictB) -------------------------------

  addInt(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AddCipherInt", [a, b], signal);
  }
  addFloat(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AddCipherFloat", [a, b], signal);
  }
  subInt(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("SubstractCipherInt", [a, b], signal);
  }
  subFloat(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("SubstractCipherFloat", [a, b], signal);
  }
  mulInt(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("MultiplyCipherInt", [a, b], signal);
  }
  mulFloat(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("MultiplyCipherFloat", [a, b], signal);
  }
  divInt(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("DivideCipherInt", [a, b], signal);
  }
  divFloat(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("DivideCipherFloat", [a, b], signal);
  }

  // ---- Bitwise / shift / rotate / CMux (Binary only, need DictB) ---------

  xor(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("XORCipher", [a, b], signal);
  }
  and(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ANDCipher", [a, b], signal);
  }
  or(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ORCipher", [a, b], signal);
  }
  not(a: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("NOTCipher", [a], signal);
  }
  shiftLeft(c: Ciphertext, bias: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ShiftLeft", [c, String(bias)], signal);
  }
  shiftRight(c: Ciphertext, bias: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ShiftRight", [c, String(bias)], signal);
  }
  rotateLeft(c: Ciphertext, bias: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("RotateLeft", [c, String(bias)], signal);
  }
  rotateRight(c: Ciphertext, bias: string | number, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("RotateRight", [c, String(bias)], signal);
  }
  cmux(s: Ciphertext, a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("CMux", [s, a, b], signal);
  }

  // ---- Cross-type ops ----------------------------------------------------

  compare(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("Compare", [a, b], signal);
  }
  abs(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ABSCipher", [c], signal);
  }

  // ---- String ops --------------------------------------------------------

  concatString(a: Ciphertext, b: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ConcatString", [a, b], signal);
  }
  substring(
    input: Ciphertext,
    start: string | number,
    end: string | number,
    signal?: AbortSignal,
  ): Promise<Ciphertext> {
    return this.call("Substring", [input, String(start), String(end)], signal);
  }

  // ---- Scientific (Float only; need BOTH PKB and DictB) ------------------

  power(
    c: Ciphertext,
    n: string | number,
    m: string | number,
    signal?: AbortSignal,
  ): Promise<Ciphertext> {
    return this.call("PowerCipher", [c, String(n), String(m)], signal);
  }
  sqrt(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("SqrtCipher", [c], signal);
  }
  log(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("LogCipher", [c], signal);
  }
  exp(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("ExpCipher", [c], signal);
  }
  sin(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("SinCipher", [c], signal);
  }
  cos(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("CosCipher", [c], signal);
  }
  tan(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("TanCipher", [c], signal);
  }
  asin(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AsinCipher", [c], signal);
  }
  acos(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AcosCipher", [c], signal);
  }
  atan(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AtanCipher", [c], signal);
  }
  sinh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("SinhCipher", [c], signal);
  }
  cosh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("CoshCipher", [c], signal);
  }
  tanh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("TanhCipher", [c], signal);
  }
  asinh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AsinhCipher", [c], signal);
  }
  acosh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AcoshCipher", [c], signal);
  }
  atanh(c: Ciphertext, signal?: AbortSignal): Promise<Ciphertext> {
    return this.call("AtanhCipher", [c], signal);
  }

  // ---- Signing -----------------------------------------------------------

  /** `GenSign` — sign a plaintext input. Requires loaded SKB. Returns a signature string. */
  async genSign(input: string, signal?: AbortSignal): Promise<string> {
    const res = await this.request<{ result: string }>(
      "POST",
      "/call",
      { fn: "GenSign", args: [input] },
      signal,
    );
    return res.result;
  }
  /** Alias for {@link verify}. */
  verifySign(input: string, sign: string, signal?: AbortSignal): Promise<boolean> {
    return this.verify(input, sign, signal);
  }
}

export default AfheClient;

// One-liner connect helper. See ./connect.ts.
export { connect, type ConnectOptions } from "./connect";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Combine multiple optional AbortSignals into one. All signals are respected. */
function combineSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const defined = signals.filter((s): s is AbortSignal => s != null);
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];

  // AbortSignal.any is available in Node 20+, modern browsers
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
    return (AbortSignal as { any(signals: AbortSignal[]): AbortSignal }).any(defined);
  }

  // Fallback: manual linking for older runtimes
  const controller = new AbortController();
  for (const sig of defined) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

/** Validate that a numeric value is not NaN or Infinity before sending to the server. */
function validateNumericValue(value: string | number): void {
  if (typeof value === "number" && (!Number.isFinite(value))) {
    throw new AfheApiError(
      `invalid value: ${value} (must be a finite number or string)`,
      0,
      undefined,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
