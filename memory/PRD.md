# Maritime Connect — PRD

## Original Problem Statement
WhatsApp + web platform connecting seafarer job seekers with shipping companies (job providers). Two conversational flows (seeker & provider) collecting maritime details, OTP verification, AI-generated brief profile for review/edit/submit, referral-based free visibility, monetization (Rs20 CV unlock, Rs100 profile boost, company branding), ongoing support/feedback, and private per-user dashboards with full search/match history.

## User Choices
- Interface: WhatsApp-style conversational chat (web-based simulation)
- OTP: Simulated (always `123456`, shown in toast/bot message)
- Payments: Mocked (Rs20 unlock, Rs100 boost)
- AI summary: Real, via Emergent LLM key
- Auth: Mobile + OTP login

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT auth (mobile+OTP). Emergent object storage for documents. Emergent LLM (gpt-5.4) for AI summaries. All routes under `/api`.
- **Frontend**: React (CRA + craco), Tailwind, shadcn/ui, lucide-react, sonner. Dark "Tactical Oceanic" theme (Cabinet Grotesk / IBM Plex Sans / JetBrains Mono).

## User Personas
1. Seafarer job seeker — wants matches, wants to boost visibility, stores CV/COC/certificates, tracks availability.
2. Shipping company / crewing manager — posts requirements, browses matched candidates, unlocks full CVs.

## Core Requirements (static)
- Two-flow conversational onboarding with all mandatory fields + validation
- OTP verification, consent, AI brief profile review/edit/submit
- Referral link (share with 2 groups / 10 contacts) for free visibility
- Matching engine (rank, vessel, sea time, COC, US visa)
- Locked candidate contacts until Rs20 unlock; Rs100 profile boost
- Private dashboard per user: matches, documents, availability/movement, history, support

## Implemented (2026-06)
- Backend: /config, auth (request-otp, verify-otp, me), ai/summary, seeker/profile, provider/requirement, matches (with contact redaction), unlock-cv, boost-profile, documents (upload/list/download/delete), movement (log/history), feedback, dashboard. Auto-seeds 6 seeker CVs + 3 company requirements.
- Frontend: WhatsApp-style ChatFlow (both flows), Home landing, Login dialog, Dashboard with tabs (Matches, Documents, Availability, History, Support), boost, referral/WhatsApp share.
- Object storage document vault; movement timeline; feedback/support.
- Tested: 15/15 backend pass, 100% frontend E2E pass.

## Fixes (2026-06)
- **Smart phone input**: International phone field (react-phone-number-input) in chat flow + login dialog. Auto-detects the user's country/dial-code from IP (ipapi.co, 2s abort → fallback India +91), auto-prefixes it, user can change country manually. Renders immediately (never blocks sign-in on a slow geolocation lookup); emits E.164. Files: `components/PhoneField.jsx`, `lib/detectCountry.js`.
- **"Why matched" tags**: `GET /api/matches` returns `match_reasons` per matched card (Rank/Vessel/Sea time/COC ✓ shown as green tags in `Matches.jsx`).
- **Empty-match nudge**: `GET /api/matches` returns de-duplicated `near_matches` (same-rank, failing other criteria). UI shows a yellow tip banner + near-miss cards with red ✗ gap tags when there are no exact matches.
- **Mobile normalization** (`mobile_key` = last 10 digits) in request-otp/verify-otp + startup backfill of legacy users. Root cause of "posted requirement/profile not showing in dashboard/My Posts + no matches": mobile was matched as an exact string, so the same phone with vs without `+91` created two separate accounts. Verified: bare / `+91` / spaced formats all resolve to one uid with identical posts & matches.
- `/api/browse` role isolation confirmed working (Company sees only Crew, Crew sees only Vacancies).

## Backlog / Remaining
- P1: Real SMS OTP (Twilio) and real payments (Stripe/Razorpay) for production
- P1: Real WhatsApp Business API integration (Meta/Twilio)
- P2: Company branding/advertising paid placements (mentioned in monetization #4)
- P2: Email/push notifications on new match
- P2: Filter out seed data in production; admin console
