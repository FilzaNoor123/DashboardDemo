import type { SourceSystem } from './ports'

export type ConnectorMode = 'mock' | 'live'

/**
 * Per-system mode. Each system flips independently, so the first real
 * connection can go live on its own while the rest stay on fixtures —
 * you are never blocked waiting for all four sets of credentials.
 */
export interface ConnectorConfig {
  dataNinja: {
    mode: ConnectorMode
    baseUrl?: string
    apiToken?: string
  }
  netSuite: {
    mode: ConnectorMode
    /** NetSuite account id, e.g. "1234567_SB1". */
    accountId?: string
    /** Token-based auth (OAuth 1.0a TBA) — the usual SuiteTalk path. */
    consumerKey?: string
    consumerSecret?: string
    tokenId?: string
    tokenSecret?: string
    /** Set when reading the Azure NSAW lake copy instead of NetSuite live. */
    lakeConnectionString?: string
  }
  qms: {
    mode: ConnectorMode
    /** Which product this actually is — unknown as of the 25 Aug huddle. */
    vendor?: 'veeva' | 'trackwise' | 'mastercontrol' | 'other'
    baseUrl?: string
    apiToken?: string
  }
  oceaView: {
    mode: ConnectorMode
    baseUrl?: string
    apiToken?: string
    /** Set when readings arrive as a file drop rather than an API. */
    exportPath?: string
  }
}

function mode(name: string): ConnectorMode {
  return process.env[name]?.toLowerCase() === 'live' ? 'live' : 'mock'
}

/**
 * Everything defaults to 'mock'. A missing or misspelled variable therefore
 * degrades to fixtures rather than silently reaching for a system with half a
 * credential — and the UI banner always states which mode each system is in.
 */
export function loadConfig(): ConnectorConfig {
  return {
    dataNinja: {
      mode: mode('DATANINJA_MODE'),
      baseUrl: process.env.DATANINJA_BASE_URL,
      apiToken: process.env.DATANINJA_API_TOKEN,
    },
    netSuite: {
      mode: mode('NETSUITE_MODE'),
      accountId: process.env.NETSUITE_ACCOUNT_ID,
      consumerKey: process.env.NETSUITE_CONSUMER_KEY,
      consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
      tokenId: process.env.NETSUITE_TOKEN_ID,
      tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
      lakeConnectionString: process.env.NSAW_LAKE_CONNECTION_STRING,
    },
    qms: {
      mode: mode('QMS_MODE'),
      vendor: process.env.QMS_VENDOR as ConnectorConfig['qms']['vendor'],
      baseUrl: process.env.QMS_BASE_URL,
      apiToken: process.env.QMS_API_TOKEN,
    },
    oceaView: {
      mode: mode('OCEAVIEW_MODE'),
      baseUrl: process.env.OCEAVIEW_BASE_URL,
      apiToken: process.env.OCEAVIEW_API_TOKEN,
      exportPath: process.env.OCEAVIEW_EXPORT_PATH,
    },
  }
}

/** Report which systems are live, for the banner and for the answer footer. */
export function modeSummary(config: ConnectorConfig): Record<SourceSystem, ConnectorMode> {
  return {
    DataNinja: config.dataNinja.mode,
    NetSuite: config.netSuite.mode,
    QMS: config.qms.mode,
    OceaView: config.oceaView.mode,
  }
}
