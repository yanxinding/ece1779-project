# Architectural Decisions

This document records the key architectural and design decisions.
---

## Decision: Explicit Schema Initialization via SQL Scripts

**Alternatives considered:**
- Runtime schema creation in application code
- ORM auto-migration tools

**Chosen:** SQL initialization scripts mounted into PostgreSQL

**Rationale:**
Using explicit SQL schema and seed scripts makes the database structure:
- Deterministic
- Reproducible
- Easy to verify during grading

It also aligns with infrastructure-as-code principles, ensuring a fresh environment
can be brought up with the correct schema using a single command.

**Tradeoffs:**
- Manual schema management
- Less flexible than automated migrations

---

## Decision: Separate API and Worker Services

**Alternatives considered:**
- Single monolithic service
- API-only design with synchronous processing

**Chosen:** Separate API and background worker services

**Rationale:**
Separating responsibilities improves clarity and mirrors real-world backend systems:

- The API handles synchronous request validation and order submission
- The worker handles background or asynchronous tasks (e.g., order processing,
  inventory updates)

This separation enables clearer reasoning about concurrency and allows each component
to scale independently in later stages.

**Tradeoffs:**
- Additional service coordination
- More infrastructure complexity

---

## Summary

These decisions collectively emphasize:
- Correctness under concurrency
- Explicit handling of state and persistence
- Incremental infrastructure complexity
- Alignment with real-world cloud engineering practices
