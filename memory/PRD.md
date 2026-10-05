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

## Fixes (2026-06)
- **Get Noticed Faster (₹499)** — seafarer premium upgrade replacing the old ₹100 everywhere (chat done-panel, Matches gate, Dashboard button). Unlock via ₹499 MOCK pay (Stripe claimable sandbox NOT available for India → mock now; wire Razorpay/Indian Stripe later) OR share to 2 WhatsApp groups / 20 contacts (prominent pulsing CTA, auto-unlocks at target). When unlocked: profile marked promoted (boosted) + shows "companies your profile was shared with" (matching companies). New confirmation on submit: "Your details are now live...". Endpoints: POST /get-noticed/pay, GET /promoted-companies, POST /referral/claim (2 groups OR 20 contacts). Component: `GetNoticedFaster.jsx`. Verified 100% (iteration_12).
- Removed ₹100 from all seafarer-facing UI incl. homepage HOW-IT-WORKS copy. cfg-race guard on chat role buttons.
- **Merged visibility offer** (prior), brighter ship background, WhatsApp country-code fix, first-10-free-then-₹49 company unlocks, WhatsApp contact template.

## Fixes (2026-06) — Referral Sign-up Rewards + Progress Ring
- **Real referral tracking**: `?ref=<code>` is now captured on app load (`lib/referral.js` → `localStorage.mc_ref`) and sent with `verify-otp` (LoginDialog + ChatFlow). On a NEW user's first OTP verification, the sign-up is attributed to the referrer (`attribute_referral` matches seeker by `referral_code`). Referrer's `ref_signups` increments; at `SIGNUP_TARGET = 2` real sign-ups the ₹499 boost **auto-unlocks** (`ref_completed=True`, seekers `boosted=True`). Self-referral guarded. Click-based counting removed from the seafarer flow — only genuine sign-ups unlock.
- **Share Progress Ring** (`ShareProgressRing.jsx`): circular SVG ring in the "Get noticed faster" card showing `ref_signups / target` with nudges — "You're 1 sign-up away 🎉" at N-1, glow + "Target reached — boost unlocked! 🎉" at target. Card polls `/eligibility` every 8s + on window focus, so progress/unlock update live as referred users join.
- `/eligibility` now returns `ref_signups` + `signup_target`. Verified via curl (0→1→2 auto-unlock) and screenshots (ring at 1/2, desktop + mobile).

## Fixes (2026-06) — Twilio WhatsApp company alerts + Edit/correct submitted details
- **Real WhatsApp alerts (Twilio, DEMO mode)**: recipient = the COMPANY, message "A new matching {rank} is available on Smart Crewing." Only PAYING/ENGAGED companies get alerts (`company_is_paying`: unlocked ≥1 CV, a paid `cv_unlock`, or `subscribed`). Triggers: (A) a seafarer boosts (`/get-noticed/pay` or 2 referral signups) → alert matching paying companies; (B) a company unlocks a CV / posts/edits a requirement → alert it about matching boosted crew. Deduped per (company, seeker) in `wa_alerts`. Runs in DEMO (no send, no charge, rows stored `status='simulated'`) until `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + (`TWILIO_WHATSAPP_FROM` or `TWILIO_MESSAGING_SERVICE_SID`) [+ `TWILIO_CONTENT_SID` for prod template] are set — then sends via Twilio automatically (`twilio==9.11.0`). WhatsApp number uses `to_e164()`; `mobile_key()` remains internal identity only. Company sees a "WhatsApp alerts sent to you" panel (DEMO badge) on the Matches tab. Endpoint: `GET /api/wa-alerts`.
- **Edit / correct submitted details**: `PUT /api/seeker/profile/{id}` and `PUT /api/provider/requirement/{id}` (ownership-enforced, 404 otherwise). Seeker edit preserves `boosted`. UI: "Edit" button on each My Posts card → `EditPostDialog` (pre-filled, role-aware, mobile locked). Verified 10/10 backend + frontend (iteration_14).

## Fixes (2026-06) — In-flow answer correction
- **"Correct last answer" in chat** (`ChatFlow.jsx`): a subtle link above the input lets users step back one question and re-answer if they picked a wrong value while filling. Removes the mistaken answer bubble + re-shows that question. Guarded so OTP/mobile verification is never undone (after OTP it won't re-enter auth steps). Complements the Review-step summary edit and the post-submit My Posts → Edit. Verified via screenshot (seeker rank → mobile → back → rank re-asked, answer cleared).

## Fixes (2026-06) — DPDP (India Digital Personal Data Protection Act) essentials
- **Privacy Policy + Grievance Officer**: `/privacy` page (`PrivacyPolicy.jsx`) with notice, purpose limitation, data-principal rights, retention, 18+ and grievance contact (from `GET /api/grievance` → gyanindramishra@gmail.com). Navbar "Privacy" link.
- **Consent notice**: chat consent step reworded to an itemised DPDP notice (purpose + withdrawal + privacy link); consent stamped on the user (`consent_given/at/version`) at profile/requirement submit.
- **Age 18+**: DOB captured right after OTP in the chat (`/me/dob`, server-side 18+ gate → 403 if under-18).
- **Right to access**: `GET /api/me/export` → downloadable JSON (Dashboard → Support → Privacy & Data → "Download my data").
- **Right to erasure**: `POST /api/me/request-deletion` flags user+seekers+providers+documents `deletion_requested=true`; `ACTIVE_FILTER` excludes them from ALL public listings (matches, browse, saved-search, promoted-companies, WA-alert scans). Records are NOT hard-deleted — visible only to admin under `GET /api/admin/deletion-requests` ("Requested for deletion under DPDP" folder; admin console has a Deletion Requests view + stat).
- Verified via curl (18+ gate, export, deletion hides from browse, admin folder) + screenshots (privacy page desktop/mobile, DataRights, in-chat DOB step). No changes cost data; WhatsApp still demo mode.

## Fixes (2026-06) — Company (job-giver) flow overhaul + Razorpay
- **Unlock pricing:** first **5 matched CVs free**, then **₹29** per profile (removed the old 10-free/₹49 tier). Subscribed companies unlock free. `/unlock-cv` returns `needs_payment` when a ₹29 charge is due; client runs payment then `/pay/verify` completes it.
- **Razorpay/UPI payments** (`lib/pay.js` + `/pay/create-order`, `/pay/verify`) with **mock fallback** when `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` absent (order ids `order_mock_*`, auto-verify). HMAC signature verified in real mode.
- **Annual plan ₹1,99,000/yr** (`CompanyPlan.jsx` + `/company/status`, `/pay/verify subscription`): unlimited free unlocks + 20 Standard-CV PDF downloads/day (`/cv/{id}/download`, `build_seeker_cv_pdf`, reportlab) + home-page banner (`/company/banner`, `/banners`, `HomeBanners.jsx`). `is_subscribed()` checks 365-day expiry.
- **Company requirement fields:** `vessel_name`, `port`, `audits[]` (ISPS/Internal/External/SIRE/RightShip) added to `ProviderRequirement`, captured/edited in `EditPostDialog`, and shown to seekers via `provider_card`.
- Contact (name/mobile/email) stays locked until unlocked. Verified: testing_agent iteration_15 (backend 8/8 after provider_card fix, frontend flows green) + curl.

## Fixes (2026-06) — Audit reminders, GST invoice, visibility, in-flow correction
- **Audit reminders** (`.emergent/crons.yml` daily → `POST /api/cron/audit-reminders`, Bearer `WEBHOOK_CRON_SECRET`): nudges a company **3/2/1 weeks** before each scheduled vessel audit (ISPS/SIRE/RightShip/Internal/External/etc.), deduped in `audit_reminders`, WhatsApp+email **mocked**. Audits are added/edited at **Dashboard → My Posts → Edit → "Upcoming audits"** and now shown on the post card + to matching seekers (provider_card).
- **GST invoice**: on ₹1,99,000 subscription verify, a GST invoice (18% split, base+gst) is generated, stored (`invoices`), mock-emailed, and returned; `GET /api/invoices` lists them.
- **Visibility (#3/#4)**: home "New here?/Already registered?" pills are solid orange + white text; chat quick-option buttons (Yes/No/Must have/Preferred/Mandatory/Immediate/Custom date) are solid blue + white; Skip button is a visible outline.
- **In-flow correction (#5)**: the Review step shows tappable chips for every answer — tap to jump back and fix any field, then return to the summary. Mobile & Email stay locked after OTP. (Plus the existing "↩ Correct last answer" and post-submit My Posts → Edit.)
- Verified: cron auth 401/200 + fires at 21d + dedup; GST invoice split; solid pills screenshot.

## Change (2026-09) — Audits REMOVED, Crew Planner ADDED
- **Audits removed entirely** per user: dropped `audits` from `ProviderRequirement` + `provider_card`, deleted `/api/cron/audit-reminders` + `_days_until`, emptied `.emergent/crons.yml` (`crons: []`), removed audit UI from `EditPostDialog.jsx` and the audit chips in Dashboard `MyPosts`. No audit alerts/reminders anywhere.
- **Crew Planner** (new company-only dashboard tab): plan crew changes. Stored in `crew_needs` collection.
  - API: `POST /api/crew-needs`, `GET /api/crew-needs`, `DELETE /api/crew-needs/{id}` (auth-scoped per company).
  - Fields: vessel_name, ranks[] (multi-select from config ranks), by_date (dd/mm/yyyy), port, note.
  - UI (`CrewPlanner.jsx`): pulsing "Add Crew Requirement" CTA, crew-change **calendar** (due dates highlighted), **vessel-wise timeline**, **color-coded reminder log** — >30d green (steady), 15–30d yellow (slow pulse), 7–14d orange (medium pulse), <7d red (fast pulse). Pulse CSS in `index.css`.
  - Verified: curl CRUD (create×3/list/delete) + screenshots at 1920 (tab, calendar+timeline, no overflow).

## Change (2026-09) — RPSL number field (company posting)
- Company requirement ChatFlow now captures a **mandatory RPSL number** step placed after the mobile step and before OTP; OTP request moved so it fires only after RPSL is entered (`requestOtp` helper). Added `rpsl_number` to `ProviderRequirement` model (persisted). Added to review-recap chips. No verification yet (deferred per user). Verified via playwright: RPSL prompt shows after mobile, OTP only after RPSL.

## Change (2026-09) — Crew Planner gating + billing emphasis
- Crew Planner is now part of the Annual Plan but **free for 30 days from first login** (`user.created_at` + 30d) for every company tier (per-CV ₹29 or annual). Backend: `crew_planner_access(user_id)` helper (`CREW_PLANNER_TRIAL_DAYS=30`), exposed in `GET /api/company/status` as `crew_planner` `{access, via, trial_days_left, trial_ends}`; `POST /api/crew-needs` returns 403 when trial ended & not subscribed.
- Frontend: Crew Planner dashboard tab is orange + pulsing (highlighted). CrewPlanner shows a trial banner (days left), a subscribed banner, or a locked gate with a Subscribe CTA; Add button disabled when locked. Verified: 403 expired / 200 fresh via curl + screenshots.
- CompanyPlan card re-emphasised: bold hero "Just ₹29 per CV / contact" + "first 5 free"; annual plan downplayed to a small orange button "Annual plan · ₹1,99,000/yr"; removed "Unlimited contact unlocks" line.

## Change (2026-10) — RPSL verification + auto-fill (company posting)
- Parsed the 5 DG Shipping PDFs (approved/valid list) into `/app/backend/data/rpsl_registry.json` (**437 entries**: license → company). Parser: pymupdf text + regex on license tokens, name cleanup.
- Backend: loads registry at startup into `RPSL_LOOKUP` (primary + alt keys so users can type with/without the `RPSL` prefix and any `-`/`/` spacing). Endpoint `GET /api/rpsl/verify?number=...` → `{found, company_name, license}`. Normalisation strips non-alphanumerics, uppercases.
- ChatFlow (company): the mandatory RPSL step now **verifies** on entry. Not found → blocked with an error (cannot proceed). Found → auto-fills & locks `company_name`, shows "✅ RPSL verified — <Company>", removes the later company-name question, then requests OTP. `company_name`/`rpsl_number` removed from editable review chips (registry-authoritative).
- NOTE: dataset is the 437-row approved list the user supplied (DataTables showed 538 valid total) — numbers outside this file are rejected. Refresh by re-parsing an updated export into `rpsl_registry.json`.
- Verified: curl (exact/alt/slash/invalid) + full playwright flow (invalid rejected, valid verified + auto-fill, company-name step skipped).

## Change (2026-10) — RPSL-valid gate (Yes/No) + Non-RPSL label
- Company posting flow asks **"Are you an RPSL-valid company?"** (dropdown Yes/No) right after mobile, before the RPSL number step. **Yes** → existing RPSL verify + auto-fill. **No** → RPSL number step removed, proceeds to OTP, company name asked normally; record flagged `is_rpsl=false`.
- Backend: `is_rpsl` (default True) on `ProviderRequirement`; exposed in `provider_card` → seeker matches/near/browse all carry it.
- Frontend: seafarer-facing vacancy cards (Matches + NearMatches) show an amber **"Non-RPSL Company"** badge when `is_rpsl === false`. `requestOtp(curFlow, curIdx, mobile)` refactored to support the inserted gate step.
- Verified: curl (is_rpsl=false stored, no rpsl_number) + playwright (No path note/skip/OTP/company-name; seeker badge visible).

## Change (2026-10) — Hero image refresh + RPSL correction on edit
- Home hero: swapped `SEA_BG` to a crisp high-res aerial container-ship photo (Unsplash, w=2400, q=90) and lightened the overlay gradient (bottom 0.72→0.50, mid 0.26→0.12, top 0.06→0.02) so the ship is much more visible. Verified desktop + mobile (390px, no overflow).
- RPSL correction: `EditPostDialog` now shows an editable **RPSL number** field for RPSL companies (company name shown read-only, verified-from-RPSL); Non-RPSL companies keep an editable company-name field. `PUT /api/provider/requirement/{id}` re-verifies the RPSL on save — valid → refreshes `company_name` + canonical `rpsl_number`; invalid → 400. Verified via curl (valid correction updates company, invalid rejected) .

## Known / Backlog
- Real UPI/QR + card payments for ₹499 need an India gateway (Razorpay recommended, or user's own Indian Stripe key) — currently MOCK.
- Real automated WhatsApp/email outbound to companies needs WhatsApp Business API + Resend — currently SIMULATED (shows matching companies).
- Dead `EligibilityGate` code remains in Matches.jsx (not rendered) — safe to delete later.

## Backlog / Remaining
- P1: Real SMS OTP (Twilio) and real payments (Stripe/Razorpay) for production
- P1: Real WhatsApp Business API integration (Meta/Twilio)
- P2: Company branding/advertising paid placements (mentioned in monetization #4)
- P2: Email/push notifications on new match
- P2: Filter out seed data in production; admin console
