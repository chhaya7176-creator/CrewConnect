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
- **Free unlocks + paid tier**: A company's first **10 crew-contact unlocks are FREE**, then **₹49** each (mocked). `POST /api/unlock-cv` returns `{amount, free, free_unlocks_left}`; `/api/matches`, `/api/browse`, `/api/saved-searches/{id}/results` return `free_unlocks_left`. UI button reads "Unlock free · N left" then "Unlock full CV · ₹49". Verified boundary via curl (10×0 then 49).
- **WhatsApp contact template**: Company→crew WhatsApp opens prefilled: "Hi <Crew>, we found your profile on Smart Crewing for a <rank> position. / Can you share your CV on my email ID (<company email>) or here on WhatsApp? / Regards / <company name>". Company email+name pulled from the logged-in company's own requirement (`res.requirement`). Shared helper `lib/waMessage.js`.
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
