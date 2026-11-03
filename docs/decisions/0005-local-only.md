# 0005. Local-only: no accounts, no backend, nothing leaves the device

Date: 2026-10 (v0) · Status: accepted · Area: storage, architecture

## Context
The owner chose this over Supabase for v0.

## Decision
Local-only. No accounts, no backend, nothing leaves the device. Don't add a server without asking.

## Consequences
- Storage is expo-sqlite (`db/index.native.ts`, one write queue) and IndexedDB (`db/index.web.ts`); media under `Paths.document`, resolved by `resolveMedia()`.
- Routes are computed on the device (0017); Share GPS log sends nothing anywhere (0027); notifications are local only, no push subscription, no server (0033).
- Open data (OpenStreetMap via OpenFreeMap) with signal assumed; offline maps and routing are out of scope (0020).
