# SwasthyaVaani — AI Agent Instructions

You are working on SwasthyaVaani, an AI-assisted pre-consultation
clinical intake platform for SIH Problem Statement 26047.

Before modifying code, read these documents in this order:

1. docs/PRD.md
2. docs/TRD.md
3. docs/architecture.md
4. docs/backend_schema.md
5. docs/rules.md
6. docs/appflow.md
7. docs/UI_UX_Design_Brief.md
8. docs/implementation_plan.md

These documents are the project specifications.

## Source of Truth

Use the documents above as the primary source of truth.

Do not invent requirements.

Do not silently change architectural decisions.

If two documents appear to conflict:
1. identify the conflict;
2. explain it;
3. choose the safer/minimal implementation;
4. do not silently rewrite the specification.

## Before Coding

First inspect the existing repository.

Do not delete or regenerate the existing frontend just because
a cleaner implementation is possible.

Reuse existing components and working functionality.

Before implementing a feature, determine:

- which PRD requirement it satisfies;
- which app-flow state it belongs to;
- which backend schema it affects;
- which API is required;
- which UI states are required;
- which failure/fallback paths exist;
- how it will be tested.

## Clinical Safety

SwasthyaVaani is NOT an autonomous doctor.

Never implement:

- autonomous diagnosis;
- autonomous prescription;
- treatment recommendations presented as clinical decisions.

AI output is untrusted.

Validate structured AI output before using it.

The physician remains the final clinical decision-maker.

## Adaptive Interview

Questions must be dynamic.

Ask one question at a time.

The LLM must never independently control the application state.

The application controls:

- duplicate prevention;
- information gaps;
- stopping;
- maximum question safety limit;
- fallback;
- escalation.

Use the deterministic fallback described in docs/rules.md.

## Existing Prototype

A frontend prototype already exists.

Inspect it first.

Preserve useful existing components and interactions.

Do not rebuild everything from scratch unless explicitly requested.

## Technology

Use the approved stack:

Frontend:
Next.js + React + TypeScript
- shadcn/ui
- Radix UI
- Lucide React
- Framer Motion


Backend:
FastAPI + Python

Database:
PostgreSQL / Supabase

Storage:
Supabase Storage

AI:
Provider abstraction

Speech:
BHASHINI / Sarvam / Whisper through provider interfaces

OCR:
PaddleOCR

FHIR:
FHIR R4

Redis:
Optional only when actually needed.

## Provider Abstraction

Never hard-code the application around a single AI provider.

Use interfaces such as:

- LLMService
- SpeechService
- OCRService
- TranslationService
- IntegrationService

Providers must be replaceable.

Mock providers must remain available for development/demo reliability.

## Privacy

Use synthetic patient data during development and demonstrations.

Never commit:

- API keys;
- passwords;
- real patient data;
- real medical documents.

Never expose provider secrets to the frontend.

## Development Style

Prefer:

- small changes;
- typed code;
- reusable components;
- clear domain boundaries;
- tests;
- explicit error handling.

Avoid:

- unnecessary dependencies;
- unnecessary microservices;
- giant components;
- unrelated refactoring;
- speculative features.

## Verification

After significant changes:

1. run type checking;
2. run lint;
3. run relevant tests;
4. test the affected user flow;
5. report what was actually verified.

Never claim something works if it was not tested.

## Implementation Priority

Follow docs/implementation_plan.md.

The most important vertical slice is:

Patient
→ adaptive intake
→ AYUSH where relevant
→ basic document OCR
→ patient review
→ doctor queue
→ doctor summary
→ safety/contradiction
→ physician confirmation
→ FHIR-compatible output.

Build a coherent working product rather than disconnected demos.