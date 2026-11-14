# Fleet Dashboard: Architecture Decision Record

**Task 1 (Ezitech): Component Architecture Decision Record and Design Trade-offs**

This repository documents the architecture for a live dispatch table that handles **400 concurrent vehicles** receiving mock WebSocket updates.

## What is in this repo

| File | Purpose |
|---|---|
| [`ADR.md`](./ADR.md) | The ADR, placed in the repository root. |
| [`docs/adr/0001-state-management-and-virtualisation-for-400-vehicles.md`](./docs/adr/0001-state-management-and-virtualisation-for-400-vehicles.md) | The same ADR in the standard `docs/adr` folder. |

## Decision in one paragraph

Instead of a heavy UI library (AG Grid, MUI DataGrid) or rendering all 400 rows, we use a **custom virtualised list** (only ~20-25 visible rows mounted), a **normalised `Map` store**, and **requestAnimationFrame-batched updates** so 400 messages per second become at most 60 DOM flushes per second.

## Rejected alternatives (with trade-offs)

1. **Render all 400 rows:** about 5,000+ DOM nodes versus about 300 with virtualisation.
2. **AG Grid Community:** about 250-300 KB gzipped, versus about 2 KB of custom code.
3. **MUI X DataGrid:** about 100-150 KB gzipped plus a React and MUI runtime.
4. **Virtual-list library (TanStack Virtual / react-window):** about 3-6 KB, a viable fallback kept in reserve.

## Data flow

Mock WebSocket → Parser → Pending queue → (once per frame) Store → Dirty IDs → Virtual window → Row renderer → DOM.

A full diagram is in the ADR.

## Note on figures

Bundle sizes and node counts are marked **(est.)** in the ADR. The ADR's Validation Plan lists how to replace them with measured values.

## Author

Hashim Anwar, BSc Computer Science, Lahore Leads University.
