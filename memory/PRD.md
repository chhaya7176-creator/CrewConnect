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
- **Merged visibility offer (BOTH screens)**: The seafarer share-or-pay is now ONE stacked box on the Matches gate AND the chat post-submit panel — "One-time Registration for Visibility" (₹100 struck-through) on top → "OR" → bold bright-green "Simply Share for Free — Share & Visibility" (RECOMMENDED) with WhatsApp share. Nudges sharing over paying. Verified via testing agent (iteration_9 gate, iteration_10 chat panel).
- **Landing background**: brighter sunlit aerial container-ship image (ship on right, open sea on left) + lightened overlay.
- **WhatsApp link country code**: `waLink` prepends `91` when a bare 10-digit number has no country code (fixed "number not on WhatsApp").
- **Free unlocks + paid tier**: first 10 crew unlocks FREE, then ₹49.
- **WhatsApp contact template**: prefilled Hi/CV-request/Regards message using company's own email + name.
- **Match Alerts**: WhatsApp opt-in toggle + new-match banner (simulated wa.me deep-link, no automated send).
- **Save Filters (companies)**: "Saved Searches" tab — save requirement, view matching crew newest-first with NEW tags + "N new" badge.
- **Smart phone input**: auto country/dial-code detection (ipapi.co, 2s abort → +91), renders immediately, E.164.
- **"Why matched" tags** + de-duplicated empty-match nudge.
- **Mobile normalization** (last-10-digit key) — one phone = one account.

## Backlog / Remaining
- P1: Real SMS OTP (Twilio) and real payments (Stripe/Razorpay) for production
- P1: Real WhatsApp Business API integration (Meta/Twilio)
- P2: Company branding/advertising paid placements (mentioned in monetization #4)
- P2: Email/push notifications on new match
- P2: Filter out seed data in production; admin console
