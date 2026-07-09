# Architecture Refactor Plan

## Objective
Refactor the current Next.js app into a clearer feature-based monolith so the app is easier to read, maintain, and extend.

## Phase 1 — Foundation (implemented)
- Introduce feature modules for properties and rooms.
- Separate client-side and server-side service layers.
- Reduce app route pages to thin entrypoints that simply render feature components.
- Keep existing business behavior intact while moving UI logic into feature modules.

## Phase 2 — Expand modules
- Add dedicated finance and staff modules.
- Move more complex dialogs and forms out of route pages.
- Standardize shared UI and utilities.

## Phase 3 — Harden infrastructure
- Centralize Supabase client/server/admin usage.
- Add route handlers for sensitive operations such as import/export and background automation.
- Add permission guards and shared error handling.
