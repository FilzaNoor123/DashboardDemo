import { loadConfig, modeSummary, type ConnectorConfig, type ConnectorMode } from './config'
import {
  MockDataNinjaConnector,
  MockNetSuiteConnector,
  MockOceaViewConnector,
  MockQmsConnector,
} from './mock'
import { LiveNetSuiteConnector } from './live/netsuite'
import {
  LiveDataNinjaConnector,
  LiveOceaViewConnector,
  LiveQmsConnector,
} from './live/rest'
import type { Connectors, SourceSystem } from './ports'

/**
 * The single place that decides mock or live, per system.
 *
 * This is the swap Sumesh's "then we will make it operational" step turns on:
 * set DATANINJA_MODE=live and supply its credentials, and every answer that
 * touches DataNinja starts coming from the real eBR — with no change to the
 * agent, the UI, or any other connector.
 */
export function getConnectors(config: ConnectorConfig = loadConfig()): Connectors {
  return {
    dataNinja:
      config.dataNinja.mode === 'live'
        ? new LiveDataNinjaConnector(config.dataNinja)
        : new MockDataNinjaConnector(),

    netSuite:
      config.netSuite.mode === 'live'
        ? new LiveNetSuiteConnector(config.netSuite)
        : new MockNetSuiteConnector(),

    qms: config.qms.mode === 'live' ? new LiveQmsConnector(config.qms) : new MockQmsConnector(),

    oceaView:
      config.oceaView.mode === 'live'
        ? new LiveOceaViewConnector(config.oceaView)
        : new MockOceaViewConnector(),
  }
}

/** Which systems are live right now — surfaced in the UI so it is never ambiguous. */
export function getModes(): Record<SourceSystem, ConnectorMode> {
  return modeSummary(loadConfig())
}
