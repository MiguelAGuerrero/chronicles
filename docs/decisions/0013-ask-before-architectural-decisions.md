# 0013. Ask the owner before architectural decisions

Date: 2026-10 (v0) · Status: accepted · Area: process

## Context
"Working with the owner": the owner decides libraries, the data model, the platform strategy and the navigation flow.

## Decision
Ask before architectural decisions: libraries, data model, platform strategy, navigation flow. Use AskUserQuestion with a recommended option. Local fixes don't need asking.

## Consequences
- Local-only over Supabase (0005), Animated over Reanimated (0039), a sheet built on Animated and responders with no library (0019) were each the owner's call.
- A new owner's call during a slice gets a record in this folder in the same commit (`README.md`).
