import { ConnectorNotConfiguredError, type SourceSystem } from '../ports'

/**
 * Shared HTTP helper for live connectors.
 *
 * Only GET is exposed. There is no post/put/patch/delete here and there must
 * not be — a connector that cannot express a write cannot perform one by
 * accident. (NetSuite's SuiteQL is the one documented exception; see its own
 * connector, where a POST is used purely to carry a read query.)
 */

const DEFAULT_TIMEOUT_MS = 15_000

export interface HttpOptions {
  headers?: Record<string, string>
  timeoutMs?: number
  /** Query string parameters, appended to the path. */
  search?: Record<string, string | number | undefined>
}

export class ConnectorRequestError extends Error {
  constructor(
    public readonly system: SourceSystem,
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`${system} returned ${status} for ${url}: ${body.slice(0, 300)}`)
    this.name = 'ConnectorRequestError'
  }
}

export async function getJson<T>(
  system: SourceSystem,
  baseUrl: string,
  path: string,
  options: HttpOptions = {},
): Promise<T> {
  const url = new URL(path, baseUrl)

  for (const [key, value] of Object.entries(options.search ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...options.headers },
      signal: controller.signal,
      // Never serve a cached GMP value as if it were a fresh read.
      cache: 'no-store',
    })

    const text = await response.text()
    if (!response.ok) {
      throw new ConnectorRequestError(system, response.status, url.toString(), text)
    }

    return JSON.parse(text) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Fail loudly and specifically when a required setting is absent. */
export function requireConfig<T extends Record<string, unknown>>(
  system: SourceSystem,
  config: T,
  keys: Array<keyof T & string>,
  hint?: string,
): void {
  const missing = keys.filter((key) => {
    const value = config[key]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    throw new ConnectorNotConfiguredError(system, missing, hint)
  }
}

/**
 * Guard a payload before it becomes a GMP-adjacent value on screen.
 *
 * A connector that silently maps a missing field to undefined produces an
 * answer that looks sourced but is not. Better to fail with the field name.
 */
export function requireFields<T extends object>(
  system: SourceSystem,
  payload: unknown,
  fields: Array<keyof T & string>,
  context: string,
): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error(`${system}: expected an object for ${context}, got ${typeof payload}`)
  }

  const record = payload as Record<string, unknown>
  const missing = fields.filter((field) => !(field in record))

  if (missing.length > 0) {
    throw new Error(
      `${system}: ${context} is missing expected field(s) ${missing.join(', ')}. ` +
        'The response mapping needs updating for this tenant.',
    )
  }

  return payload as T
}
