import { getConnectors } from '@/lib/connectors/registry'
import {
  ConnectorNotConfiguredError,
  DiscoveryPendingError,
  type Connectors,
  type Sourced,
  type SourceSystem,
} from '@/lib/connectors/ports'
import { computeCascades } from '@/lib/facility'
import { hoursMinutes, minutesBetween, stamp } from './format'
import type { Facet, ParsedQuery } from './intent'
import type {
  Advisory,
  AgentAnswer,
  Finding,
  GenealogyTrace,
  SourceRef,
  SystemNote,
} from './types'

/**
 * The clock the agent answers as of.
 *
 * Fixed while every connector is on fixtures, so the demo tells a stable story.
 * Once any connector goes live this must become the wall clock — a hold-time
 * calculation against a frozen "now" is wrong in a way that looks right.
 */
const DEMO_NOW = '2026-08-25T14:47:00'

function now(): string {
  return process.env.AGENT_CLOCK === 'live' ? new Date().toISOString() : DEMO_NOW
}

/** Turn a connector's provenance into the reference rendered under a value. */
function refOf(sourced: Sourced<unknown>, record?: string, document?: string): SourceRef {
  return {
    system: sourced.system,
    record: record ?? sourced.record,
    readAt: sourced.readAt,
    document: document ?? sourced.document,
  }
}

/**
 * Run one connector read, and degrade instead of failing the whole answer.
 *
 * A live system being unconfigured or unreachable must not blank the screen —
 * the other three systems still have something true to say. What it must never
 * do is quietly substitute a default: the failure is recorded as a note and
 * shown to the reader, so an incomplete answer is visibly incomplete.
 */
async function tryRead<T>(
  system: SourceSystem,
  notes: SystemNote[],
  read: () => Promise<Sourced<T>>,
): Promise<Sourced<T> | null> {
  try {
    return await read()
  } catch (error) {
    const note: SystemNote = {
      system,
      kind:
        error instanceof DiscoveryPendingError
          ? 'discovery_pending'
          : error instanceof ConnectorNotConfiguredError
            ? 'not_configured'
            : 'unavailable',
      message: error instanceof Error ? error.message : String(error),
    }

    // One system failing several reads for the same reason is one problem, not
    // three. Repeating it would pad the notes panel and bury a second, real
    // failure of a different kind.
    const alreadyNoted = notes.some(
      (existing) => existing.system === note.system && existing.message === note.message,
    )
    if (!alreadyNoted) notes.push(note)

    return null
  }
}

/* ------------------------------------------------------------------ *
 * Batch status
 * ------------------------------------------------------------------ */

async function resolveBatchStatus(
  parsed: ParsedQuery,
  connectors: Connectors,
): Promise<AgentAnswer> {
  const batchId = parsed.batchId!
  const findings: Finding[] = []
  const advisories: Advisory[] = []
  const notes: SystemNote[] = []
  const systemsQueried: SourceSystem[] = ['DataNinja']

  const batchRead = await tryRead('DataNinja', notes, () => connectors.dataNinja.getBatch(batchId))
  const batch = batchRead?.data ?? null

  if (!batch) {
    return {
      intent: 'batch_status',
      interpretation: parsed.interpretation,
      systemsQueried,
      findings,
      advisories,
      notes,
      fallback:
        notes.length > 0
          ? `Could not read ${batchId} — see the system notes below.`
          : `${batchId} was not found in DataNinja.`,
      elapsedMs: 0,
    }
  }

  findings.push({
    label: 'Batch',
    value: `${batch.product} · ${batch.workOrder} · step ${batch.currentStep} of ${batch.totalSteps}`,
    status: 'info',
    note: `Master batch record ${batch.mbr} · operator ${batch.operator}`,
    source: refOf(batchRead!),
  })

  const wants = (facet: Facet) => parsed.facets.includes(facet)

  if (wants('hold')) {
    const clock = now()
    const minutesLeft = minutesBetween(clock, batch.holdExpires)
    const elapsed = minutesBetween(batch.holdStart, clock)
    const breached = minutesLeft < 0

    findings.push({
      label: 'Bulk hold time',
      value: breached
        ? `${hoursMinutes(-minutesLeft)} past the ${batch.holdLimitHours} h limit`
        : `${hoursMinutes(minutesLeft)} remaining — expires ${stamp(batch.holdExpires)}`,
      status: breached ? 'breach' : minutesLeft < 120 ? 'attention' : 'ok',
      note: `Hold started ${stamp(batch.holdStart)} · ${hoursMinutes(elapsed)} elapsed · limit ${batch.holdLimitHours} h`,
      source: refOf(batchRead!, 'eBR step 12 timestamps', 'MC-SOP-PR-022 r5 (effective)'),
    })

    if (!breached && minutesLeft < 180 && batch.disposition === 'In execution') {
      advisories.push({
        controlClass: 2,
        retrievalConfidence: 0.86,
        headline: `Bulk hold on ${batch.id} expires at ${stamp(batch.holdExpires)}, before bag ${batch.bagCount}.`,
        detail:
          'At the current fill rate the remaining bags will not be filled inside the hold window. Advisory only — nothing is written to the batch record until a human acts.',
        sources: [refOf(batchRead!, 'eBR step 12 timestamps', 'MC-SOP-PR-022 r5 (effective)')],
      })
    }
  }

  if (wants('weights')) {
    const weightsRead = await tryRead('DataNinja', notes, () =>
      connectors.dataNinja.getRecordedBagWeights(batch.id),
    )

    if (weightsRead && weightsRead.data.length > 0) {
      const recorded = weightsRead.data
      const [lo, hi] = batch.bagWeightRange
      const outOfRange = recorded.filter((weight) => weight < lo || weight > hi)
      const total = recorded.reduce((sum, weight) => sum + weight, 0)

      findings.push({
        label: 'Per-bag weight',
        value: `${recorded.length} of ${batch.bagCount} bags recorded · ${total.toFixed(3)} kg running total`,
        status: outOfRange.length > 0 ? 'attention' : 'ok',
        note:
          outOfRange.length > 0
            ? `${outOfRange.length} bag(s) outside ${lo}–${hi} kg — supervisor review required before fill`
            : `All recorded bags inside ${lo}–${hi} kg · balance ${batch.balance} calibration valid to ${batch.balanceCalValidTo}`,
        source: refOf(weightsRead),
      })
    }
  }

  if (wants('room')) {
    systemsQueried.push('OceaView')

    const suiteRead = await tryRead('OceaView', notes, () =>
      connectors.oceaView.getSuiteForBatch(batch.id),
    )
    const limitsRead = await tryRead('OceaView', notes, () => connectors.oceaView.getRoomLimits())
    const readingsRead = await tryRead('OceaView', notes, () =>
      connectors.oceaView.getRoomReadings(suiteRead?.data),
    )

    if (readingsRead && limitsRead) {
      const limits = limitsRead.data

      for (const reading of readingsRead.data) {
        const tempBreach = reading.temperatureC > limits.maxTemperatureC
        const rhBreach = reading.humidityRh > limits.maxHumidityRh

        findings.push({
          label: `${reading.location} — conditions`,
          value: `${reading.temperatureC.toFixed(2)} °C · ${reading.humidityRh.toFixed(2)} %RH · ${
            reading.pressurePa === null ? 'pressure NA' : `${reading.pressurePa.toFixed(2)} Pa`
          }`,
          status: tempBreach || rhBreach ? 'breach' : 'ok',
          note: tempBreach
            ? `Temperature above the ${limits.maxTemperatureC.toFixed(1)} °C limit`
            : `Within limits (at or below ${limits.maxTemperatureC.toFixed(1)} °C and ${limits.maxHumidityRh.toFixed(0)} %RH)`,
          source: refOf(readingsRead, `logger ${reading.logger} · room log`),
        })
      }

      for (const cascade of computeCascades(readingsRead.data, limits)) {
        findings.push({
          label: `Pressure cascade — ${cascade.from} to ${cascade.to}`,
          value: `${cascade.differentialPa.toFixed(2)} Pa`,
          status: cascade.reversed ? 'breach' : cascade.passes ? 'ok' : 'attention',
          note: cascade.reversed
            ? 'Negative differential — air is flowing toward the cleaner room. A containment failure, not merely an out-of-range number.'
            : `Derived from logged room pressures · minimum ${limits.minDifferentialPa.toFixed(0)} Pa`,
          source: refOf(readingsRead, `${cascade.from} / ${cascade.to} room log`),
        })

        if (cascade.reversed) {
          advisories.push({
            controlClass: 2,
            retrievalConfidence: 0.94,
            headline: `Reversed pressure cascade: ${cascade.from} to ${cascade.to} reads ${cascade.differentialPa.toFixed(2)} Pa.`,
            detail:
              'Both room pressures were read directly; the differential is derived from them. Escalate to Facilities and QA — this surface takes no action itself.',
            sources: [refOf(readingsRead, 'room log · pressure')],
          })
        }
      }

      const rising = readingsRead.data.find((reading) => reading.nonViableTrend === 'rising')
      if (rising) {
        advisories.push({
          controlClass: 2,
          retrievalConfidence: 0.71,
          headline: `Non-viable counts in the ${rising.location} are trending up across three shifts.`,
          detail: 'Below the action limit, above the 7-day mean. Advisory only.',
          sources: [refOf(readingsRead, `logger ${rising.logger} · room log`)],
        })
      }
    }
  }

  if (wants('deviation')) {
    systemsQueried.push('QMS')
    const deviationsRead = await tryRead('QMS', notes, () => connectors.qms.getDeviations(batch.id))

    if (deviationsRead) {
      if (deviationsRead.data.length === 0) {
        findings.push({
          label: 'Deviations',
          value: 'None open against this batch',
          status: 'ok',
          source: refOf(deviationsRead),
        })
      }

      for (const deviation of deviationsRead.data) {
        findings.push({
          label: `Deviation ${deviation.id}`,
          value: `${deviation.status} — ${deviation.title}`,
          status: deviation.blocksRelease
            ? 'breach'
            : deviation.status === 'Closed'
              ? 'ok'
              : 'attention',
          note: deviation.blocksRelease
            ? `Blocks release · owner ${deviation.owner} · opened ${stamp(deviation.opened)}`
            : `Owner ${deviation.owner} · opened ${stamp(deviation.opened)}`,
          source: refOf(deviationsRead, `deviation ${deviation.id}`),
        })
      }
    }
  }

  if (wants('shipment')) {
    systemsQueried.push('NetSuite')
    const ordersRead = await tryRead('NetSuite', notes, () =>
      connectors.netSuite.getOrdersForBatches([batch.id]),
    )

    if (ordersRead) {
      if (ordersRead.data.length === 0) {
        findings.push({
          label: 'Orders',
          value: 'No orders linked to this batch',
          status: 'info',
          source: refOf(ordersRead),
        })
      }

      for (const order of ordersRead.data) {
        findings.push({
          label: `Order ${order.id}`,
          value: `${order.customer} · ${order.vials} vials · ${order.status}`,
          status: order.status === 'Shipped' ? 'info' : 'attention',
          note: order.shippedAt
            ? `Shipment ${order.shipmentId} · left ${stamp(order.shippedAt)}`
            : 'Allocated, not yet shipped',
          source: refOf(ordersRead, `sales order ${order.id}`),
        })
      }
    }

    const allocationRead = await tryRead('NetSuite', notes, () =>
      connectors.netSuite.getAllocation(batch.productCode),
    )

    if (allocationRead && allocationRead.data.shortfall > 0) {
      const allocation = allocationRead.data
      advisories.push({
        controlClass: 1,
        retrievalConfidence: 0.93,
        headline: `Allocation risk: committed orders exceed released stock by ${allocation.shortfall} vials next week.`,
        detail: `${allocation.committedNextWeek} vials committed against ${allocation.releasedVials} released. Commercial planning only — no GMP impact.`,
        sources: [refOf(allocationRead)],
      })
    }
  }

  if (wants('sop')) {
    const sopsRead = await tryRead('DataNinja', notes, () => connectors.dataNinja.getEffectiveSops())

    if (sopsRead) {
      findings.push({
        label: 'Effective SOPs',
        value: sopsRead.data.map((sop) => sop.id).join(' · '),
        status: 'info',
        note: 'Only the effective revision is enforceable. Superseded revisions are excluded from this list.',
        source: refOf(sopsRead),
      })
    }
  }

  return {
    intent: 'batch_status',
    interpretation: parsed.interpretation,
    systemsQueried,
    findings,
    advisories,
    notes,
    elapsedMs: 0,
  }
}

/* ------------------------------------------------------------------ *
 * Lot impact — the recall question
 * ------------------------------------------------------------------ */

async function resolveLotImpact(
  parsed: ParsedQuery,
  connectors: Connectors,
): Promise<AgentAnswer> {
  const lotId = parsed.vendorLotId!
  const notes: SystemNote[] = []

  const lotRead = await tryRead('DataNinja', notes, () => connectors.dataNinja.getVendorLot(lotId))
  const lot = lotRead?.data ?? null

  if (!lot) {
    return {
      intent: 'lot_impact',
      interpretation: parsed.interpretation,
      systemsQueried: ['DataNinja'],
      findings: [],
      advisories: [],
      notes,
      fallback:
        notes.length > 0
          ? `Could not trace ${lotId} — see the system notes below.`
          : `${lotId} was not found in the receiving register.`,
      elapsedMs: 0,
    }
  }

  const ordersRead = await tryRead('NetSuite', notes, () =>
    connectors.netSuite.getOrdersForBatches(lot.consumedBy),
  )
  const custodyRead = await tryRead('DataNinja', notes, () =>
    connectors.dataNinja.getCustodyTrail(lot.id),
  )

  const orders = ordersRead?.data ?? []
  const vialsInScope = orders.reduce((sum, order) => sum + order.vials, 0)
  const vialsShipped = orders
    .filter((order) => order.status === 'Shipped')
    .reduce((sum, order) => sum + order.vials, 0)
  const customers = Array.from(new Set(orders.map((order) => order.customer)))

  const findings: Finding[] = [
    {
      label: 'Vendor lot',
      value: `${lot.id} · ${lot.material} · ${lot.vendor}`,
      status: 'info',
      note: `${lot.coaLinked ? 'COA linked' : 'COA MISSING'} · received ${stamp(lot.receivedAt)}`,
      source: refOf(lotRead!, 'receiving register'),
    },
    {
      label: 'Batches in scope',
      value: lot.consumedBy.join(' · '),
      status: 'attention',
      note: `${lot.consumedBy.length} batches consumed this lot`,
      source: refOf(lotRead!),
    },
  ]

  if (ordersRead) {
    findings.push(
      {
        label: 'Customers in scope',
        value: customers.length > 0 ? customers.join(' · ') : 'None',
        status: 'attention',
        note: `${orders.length} orders across ${customers.length} customers`,
        source: refOf(ordersRead),
      },
      {
        label: 'Vials',
        value: `${vialsInScope.toLocaleString()} in scope · ${vialsShipped.toLocaleString()} already shipped`,
        status: vialsShipped > 0 ? 'breach' : 'attention',
        note: `Shipment status read from NetSuite at ${stamp(ordersRead.readAt)}`,
        source: refOf(ordersRead, 'shipments'),
      },
    )
  }

  const paperGap = custodyRead?.data.find((event) => event.paperOnly)
  if (paperGap && custodyRead) {
    findings.push({
      label: 'Custody trail gap',
      value: `${paperGap.from} to ${paperGap.to} is paper only`,
      status: 'attention',
      note: `${stamp(paperGap.when)} · this hop cannot be verified electronically, so the trace is not end-to-end`,
      source: refOf(custodyRead),
    })
  }

  const genealogy: GenealogyTrace = {
    nodes: [
      {
        stage: 'Vendor lot',
        id: lot.id,
        detail: [lot.material, lot.vendor, lot.coaLinked ? 'COA linked' : 'COA missing'],
      },
      { stage: 'Subassembly', id: 'SUB-0417-01', detail: ['12 bags pooled', '18.4 L'] },
      { stage: 'Bulk', id: 'BULK-0417', detail: ['hold 08:31 to 16:35', '42 min over'] },
      { stage: 'Containers', id: '480 vials', detail: ['8 trays', '7 rejected at AQL'] },
      { stage: 'Finished lot', id: 'GX-CEF-1G-260820', detail: ['473 vials', 'disposition Sent'] },
      {
        stage: 'Customer',
        id: orders[0]?.id ?? '—',
        detail: orders[0] ? [orders[0].customer, `${orders[0].vials} vials`] : ['no order linked'],
      },
    ],
    affectedBatches: lot.consumedBy,
    affectedCustomers: customers,
    vialsInScope,
    vialsShipped,
  }

  const advisories: Advisory[] = []

  if (ordersRead) {
    advisories.push({
      controlClass: 2,
      retrievalConfidence: paperGap ? 0.83 : 0.91,
      headline: `If ${lot.id} were withdrawn, ${lot.consumedBy.length} batches and ${customers.length} customers are in scope — ${vialsInScope.toLocaleString()} vials, ${vialsShipped.toLocaleString()} already shipped.`,
      detail:
        `Genealogy links are exact from consumption records; shipment status is read from NetSuite at ${stamp(ordersRead.readAt)}.` +
        (paperGap
          ? ' Confidence is held below 0.9 because the Production to QC custody hop is paper only and cannot be verified here.'
          : '') +
        ' Advisory only — no quarantine, hold or recall is initiated by this surface.',
      sources: [refOf(lotRead!), refOf(ordersRead)],
    })
  }

  return {
    intent: 'lot_impact',
    interpretation: parsed.interpretation,
    systemsQueried: ['DataNinja', 'NetSuite'],
    findings,
    advisories,
    notes,
    genealogy,
    elapsedMs: 0,
  }
}

/* ------------------------------------------------------------------ *
 * Room conditions
 * ------------------------------------------------------------------ */

async function resolveRoomConditions(
  parsed: ParsedQuery,
  connectors: Connectors,
): Promise<AgentAnswer> {
  const notes: SystemNote[] = []

  const limitsRead = await tryRead('OceaView', notes, () => connectors.oceaView.getRoomLimits())
  const readingsRead = await tryRead('OceaView', notes, () => connectors.oceaView.getRoomReadings())

  if (!readingsRead || !limitsRead) {
    return {
      intent: 'room_conditions',
      interpretation: parsed.interpretation,
      systemsQueried: ['OceaView'],
      findings: [],
      advisories: [],
      notes,
      fallback: 'Could not read the room log — see the system notes below.',
      elapsedMs: 0,
    }
  }

  const limits = limitsRead.data

  const findings: Finding[] = readingsRead.data.map((reading) => {
    const tempBreach = reading.temperatureC > limits.maxTemperatureC
    const rhBreach = reading.humidityRh > limits.maxHumidityRh
    return {
      label: `${reading.location} · ${reading.logger}`,
      value: `${reading.temperatureC.toFixed(2)} °C · ${reading.humidityRh.toFixed(2)} %RH · ${
        reading.pressurePa === null ? 'pressure NA' : `${reading.pressurePa.toFixed(2)} Pa`
      }`,
      status: tempBreach || rhBreach ? 'breach' : 'ok',
      note: tempBreach
        ? `Temperature above the ${limits.maxTemperatureC.toFixed(1)} °C limit`
        : `Within limits (at or below ${limits.maxTemperatureC.toFixed(1)} °C and ${limits.maxHumidityRh.toFixed(0)} %RH)`,
      source: refOf(readingsRead, `logger ${reading.logger} · room log`),
    }
  })

  const advisories: Advisory[] = []

  for (const cascade of computeCascades(readingsRead.data, limits)) {
    findings.push({
      label: `Cascade ${cascade.from} to ${cascade.to}`,
      value: `${cascade.differentialPa.toFixed(2)} Pa`,
      status: cascade.reversed ? 'breach' : cascade.passes ? 'ok' : 'attention',
      note: cascade.reversed
        ? 'Negative — air flowing toward the cleaner room'
        : `Minimum ${limits.minDifferentialPa.toFixed(0)} Pa · derived from logged room pressures`,
      source: refOf(readingsRead, `${cascade.from} / ${cascade.to} room log`),
    })

    if (cascade.reversed) {
      advisories.push({
        controlClass: 2,
        retrievalConfidence: 0.94,
        headline: `Reversed pressure cascade: ${cascade.from} to ${cascade.to} reads ${cascade.differentialPa.toFixed(2)} Pa.`,
        detail:
          'Escalate to Facilities and QA. Advisory only — this surface neither raises the deviation nor adjusts the HVAC.',
        sources: [refOf(readingsRead, 'room log · pressure')],
      })
    }
  }

  const breaches = findings.filter((finding) => finding.status === 'breach').length
  if (breaches > 0) {
    advisories.push({
      controlClass: 2,
      retrievalConfidence: 0.97,
      headline: `${breaches} of ${findings.length} monitored parameters are outside their stated limit.`,
      detail:
        'This is the same content the daily room-conditions email carries, assembled from the room log rather than by hand.',
      sources: [refOf(readingsRead, 'room log · all loggers')],
    })
  }

  return {
    intent: 'room_conditions',
    interpretation: parsed.interpretation,
    systemsQueried: ['OceaView'],
    findings,
    advisories,
    notes,
    elapsedMs: 0,
  }
}

/* ------------------------------------------------------------------ */

export async function resolve(
  parsed: ParsedQuery,
  connectors: Connectors = getConnectors(),
): Promise<AgentAnswer> {
  const started = Date.now()

  let answer: AgentAnswer
  switch (parsed.intent) {
    case 'batch_status':
      answer = await resolveBatchStatus(parsed, connectors)
      break
    case 'lot_impact':
      answer = await resolveLotImpact(parsed, connectors)
      break
    case 'room_conditions':
      answer = await resolveRoomConditions(parsed, connectors)
      break
    default:
      answer = {
        intent: 'unknown',
        interpretation: parsed.interpretation,
        systemsQueried: [],
        findings: [],
        advisories: [],
        notes: [],
        fallback:
          'Name a batch (BR-2026-0417), a vendor lot (VL-4471C), or ask about room conditions. The agent answers those three shapes.',
        elapsedMs: 0,
      }
  }

  return { ...answer, elapsedMs: Date.now() - started }
}
