# Agent Dashboard — Prototype

A query-driven, **advisory-only** dashboard. Someone asks a question in their own words; an agent
fans out across several systems of record, composes an answer, and attaches to every value a control
class, a confidence, and the record it was drawn from.

**It never writes.** Not to a batch record, not to a quality system, not to anything.

This is a prototype for a GMP-regulated (503B sterile compounding) context, where no software may
create or alter a record on its own — a human has to accept it. Every design decision below follows
from that.

## Status

Runs entirely on **mock data**. No system is connected. The connector layer is built so that real
systems drop in through configuration rather than by editing the agent.

## Run it

```bash
npm ci               # exact versions from package-lock.json
npm run dev          # http://localhost:3000
```

```bash
npm run build
npm run typecheck
```

Node 22.5+ (`.nvmrc` pins 22). With no `.env.local`, everything runs on fixtures — no database, no
credentials, no API keys.

## What it answers

| Shape | Example | Systems read |
|---|---|---|
| **Batch status** | *"For BR-2026-0417 — room temperature, approved SOPs, deviation status and shipment status"* | eBR, environmental monitoring, QMS, ERP |
| **Lot impact** | *"If VL-4471C were withdrawn, which batches and customers are in scope?"* | eBR, ERP |
| **Room conditions** | *"Room conditions right now against the limits"* | Environmental monitoring |

Anything else returns a plain "I could not read that" rather than a guess. Ask about a batch that
does not exist and it says so — it never invents an answer.

## Architecture

```
question
   ↓
parseQuery()      src/lib/agent/intent.ts       question → intent + facets
   ↓
resolve()         src/lib/agent/resolve.ts      fan out, join, judge against limits
   ↓                    │
   │                    ├─ dataNinja ─┐
   │                    ├─ netSuite ──┤  PORTS      src/lib/connectors/ports.ts
   │                    ├─ qms ───────┤  (read-only interfaces)
   │                    └─ oceaView ──┘
   │                          ↓
   │                    registry.ts  ── picks mock or live PER SYSTEM
   │                          ├─ mock/index.ts    fixtures
   │                          └─ live/*.ts        real HTTP
   ↓
AgentAnswer       findings + advisories + system notes, each with a SourceRef
   ↓
QueryConsole      src/components/                provenance line under every value
```

### Going live

Each system flips independently, so the first credentials to arrive can go live on their own:

```bash
cp .env.example .env.local
# fill in one system's values, then:
NETSUITE_MODE=live
AGENT_CLOCK=live          # required once ANY system is live
```

Nothing else changes. The agent, the UI and the other connectors are untouched, and a banner at the
top of the page shows which systems are live, so it is never ambiguous whether a number came from a
real system or from a fixture.

### Three decisions worth knowing about

**Read-only by construction.** No port declares a create, update, sign or delete method, so a write
cannot be expressed, let alone performed. The shared HTTP helper exposes GET only. The single
non-GET verb in the codebase is a SuiteQL POST that carries a read query, commented as such at the
call site. Read-only credentials are meant to be the second layer, not the only one.

**Failures are shown, not swallowed.** If a system cannot be read, the answer still renders from the
others and names what is missing and why. An answer built from three systems when four were asked is
incomplete, and on a recall question the difference between "no shipments" and "shipments unknown"
is the whole answer.

**Confidence is labelled `retrieval conf`.** Retrieval confidence, model confidence and data
freshness are three different things. Only retrieval confidence is modelled, because it is the only
one this code can honestly claim.

## Layout

| Path | What it is |
|---|---|
| `src/lib/connectors/domain.ts` | Our types — what the agent reasons over |
| `src/lib/connectors/ports.ts` | Read-only port interfaces, `Sourced<T>`, error types |
| `src/lib/connectors/config.ts` | Env → per-system mode and credentials |
| `src/lib/connectors/registry.ts` | The one place that picks mock or live |
| `src/lib/connectors/mock/` | Fixture-backed connectors |
| `src/lib/connectors/live/` | Real HTTP connectors |
| `src/lib/mock/` | The fixture data itself |
| `src/lib/facility.ts` | Pressure cascade order — facility configuration |
| `src/lib/agent/` | Intent parsing, resolution, formatting |
| `src/app/actions.ts` | The one server action the UI calls |
| `src/app/api/ask/route.ts` | GET-only JSON over the same agent, for testing from a terminal |

**Intent parsing is rule-based on purpose.** `parseQuery()` is deterministic keyword matching, and it
is the seam where an LLM goes later — return the same `ParsedQuery` shape and nothing downstream
changes. Keeping it rule-based means the demo is reproducible and needs no API key.

## Known gaps

1. **No authentication or role scoping.** An agent answering across systems must inherit the asker's
   training, procedure effectivity and role authority, never bypass them. This is the largest gap
   between the prototype and anything operational.
2. The control-class definitions in `src/lib/agent/types.ts` are a working assumption and need
   confirming with Quality.
3. Advisories are not persisted. If an advisory influences a regulated decision, whether it is
   retained as evidence is an open question.
4. The fixed demo clock must become the wall clock before any connector goes live.
