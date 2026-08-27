import { createHmac, randomBytes } from 'node:crypto'
import type { ConnectorConfig } from '../config'
import type { Allocation, Order, OrderStatus } from '../domain'
import { ConnectorRequestError, requireConfig } from './http'
import { DiscoveryPendingError, type NetSuitePort, type Sourced } from '../ports'

/**
 * Live NetSuite connector over SuiteTalk REST + SuiteQL.
 *
 * Token-based auth (OAuth 1.0a TBA) is implemented in full below — that part
 * is standard across every NetSuite account and does not depend on Galaxy's
 * configuration, so it will work the moment real tokens arrive.
 *
 * What still needs discovery is the SuiteQL itself: which record types and
 * custom fields carry the batch link and the finished-lot link in Galaxy's
 * account. Those queries are marked and throw a named error rather than
 * guessing at table names.
 *
 * NOTE ON POST: SuiteQL is issued as POST because that is how NetSuite carries
 * a query body. It is a read — it selects, it never inserts or updates — and
 * this is the only place in the codebase where a non-GET verb is used.
 */

interface SuiteQlResponse<T> {
  items: T[]
  hasMore: boolean
  totalResults: number
}

/** RFC 3986 percent-encoding, which OAuth 1.0a requires (not encodeURIComponent's subset). */
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** NetSuite's REST host derives from the account id: lowercase, underscores to dashes. */
function restHost(accountId: string): string {
  return `https://${accountId.toLowerCase().replace(/_/g, '-')}.suitetalk.api.netsuite.com`
}

function authorizationHeader(
  config: ConnectorConfig['netSuite'],
  method: string,
  url: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey!,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.tokenId!,
    oauth_version: '1.0',
  }

  const parameterString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(parameterString),
  ].join('&')

  const signingKey = `${percentEncode(config.consumerSecret!)}&${percentEncode(config.tokenSecret!)}`
  const signature = createHmac('sha256', signingKey).update(baseString).digest('base64')

  const header = Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')

  // The realm is the account id, uppercase, underscores preserved.
  return `OAuth realm="${config.accountId!.toUpperCase()}", ${header}`
}

export class LiveNetSuiteConnector implements NetSuitePort {
  readonly system = 'NetSuite' as const

  constructor(private readonly config: ConnectorConfig['netSuite']) {}

  /**
   * Validated on first read, never in the constructor — the registry builds
   * every connector up front, outside per-read error handling, so a throwing
   * constructor would take down the answer from the systems that ARE working.
   */
  private ensureConfigured(): void {
    requireConfig(
      'NetSuite',
      this.config,
      ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'],
      'Create an integration record and an access token in NetSuite (Setup → Users/Roles → Access Tokens) for a role with READ-ONLY permissions on Sales Orders and Item Fulfilments.',
    )
  }

  /** Issue a SuiteQL read. Exposed for the queries below only. */
  private async suiteQl<T>(query: string): Promise<T[]> {
    this.ensureConfigured()
    const url = `${restHost(this.config.accountId!)}/services/rest/query/v1/suiteql`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authorizationHeader(this.config, 'POST', url),
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // NetSuite requires this header on every SuiteQL call.
        Prefer: 'transient',
      },
      body: JSON.stringify({ q: query }),
      cache: 'no-store',
    })

    const text = await response.text()
    if (!response.ok) {
      throw new ConnectorRequestError('NetSuite', response.status, url, text)
    }

    return (JSON.parse(text) as SuiteQlResponse<T>).items
  }

  async getOrdersForBatches(_batchIds: string[]): Promise<Sourced<Order[]>> {
    this.ensureConfigured()
    // The SuiteQL below is deliberately not written. Sales orders in NetSuite
    // do not carry a batch id natively — the link runs through the item
    // fulfilment's inventory detail, or through a custom field Galaxy added.
    // Guessing the field name would produce an answer that looks sourced and
    // is not, which is the one failure mode this design exists to prevent.
    throw new DiscoveryPendingError(
      'NetSuite',
      'which record and field carry the batch / finished-lot link — item fulfilment inventory detail, or a custom body/column field? Needed to write the SuiteQL join.',
    )
  }

  async getAllocation(_productCode: string): Promise<Sourced<Allocation>> {
    this.ensureConfigured()
    throw new DiscoveryPendingError(
      'NetSuite',
      'whether released stock is read from NetSuite item availability or from the NSAW lake copy in Azure, and how "released" is distinguished from on-hand.',
    )
  }

  /**
   * Kept as the worked example of a query that IS knowable: plain sales order
   * headers, no custom fields. Use it to prove credentials and connectivity
   * before the discovery questions above are answered.
   */
  async smokeTest(): Promise<Array<{ id: string; tranid: string; status: string }>> {
    return this.suiteQl<{ id: string; tranid: string; status: string }>(
      'SELECT id, tranid, status FROM transaction WHERE type = ' +
        "'SalesOrd' ORDER BY trandate DESC FETCH FIRST 5 ROWS ONLY",
    )
  }
}

/** Map NetSuite's transaction status codes to our vocabulary. */
export function mapOrderStatus(netSuiteStatus: string): OrderStatus {
  switch (netSuiteStatus) {
    case 'SalesOrd:F': // Billed
    case 'SalesOrd:E': // Partially fulfilled
    case 'SalesOrd:D': // Pending billing / partially fulfilled
      return 'Shipped'
    case 'SalesOrd:B': // Pending fulfilment
    case 'SalesOrd:A': // Pending approval
      return 'Allocated'
    default:
      return 'Held'
  }
}
