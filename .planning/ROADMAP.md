# Roadmap: GospelSmarts

## Overview

GospelSmarts delivers a focused v1 that lets leaders authenticate, establish their stake/ward structure with supported languages, and lets members find and join their org so content can be reliably read in their language. The phases below follow this user journey from access, to org setup, to membership enrollment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Authentication Access** - Users can securely access accounts via WorkOS email/password.
- [ ] **Phase 2: Org Structure & Languages** - Leaders define stake/ward structure and supported languages.
- [ ] **Phase 3: Member Enrollment** - Members can find and join their stake and ward.

## Phase Details

### Phase 1: Authentication Access
**Goal**: Users can securely access accounts via WorkOS email/password
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password via WorkOS.
  2. User receives email verification after signup.
  3. User can reset password via email link.
**Plans**: 5 plans
**Status**: ✅ Complete

Plans:
- [x] 01-01-PLAN.md — Initialize pnpm workspace root
- [x] 01-02-PLAN.md — Scaffold apps/web Next.js App Router app
- [x] 01-03-PLAN.md — Integrate AuthKit provider and auth-aware home
- [x] 01-04-PLAN.md — Add AuthKit callback and protected dashboard
- [x] 01-05-PLAN.md — Verify WorkOS email verification and password reset

*Additional infrastructure plan 01-06 completed: Turbo Repo integration*

### Phase 2: Org Structure & Languages
**Goal**: Leaders can define stake/ward structure and supported languages
**Depends on**: Phase 1
**Requirements**: ORG-01, ORG-02, ORG-03
**Success Criteria** (what must be TRUE):
  1. Stake leader can create a stake.
  2. Ward leader can create a ward under a stake.
  3. Stake or ward can set supported languages to English and/or Spanish.
**Plans**: TBD
**Status**: Not started

Plans:
- [ ] 02-01: TBD during planning

### Phase 3: Member Enrollment
**Goal**: Members can find and join their stake and ward
**Depends on**: Phase 2
**Requirements**: MEMB-01, MEMB-02, MEMB-03
**Success Criteria** (what must be TRUE):
  1. Member can search for a stake.
  2. Member can search for a ward.
  3. Member can join a ward and stake and see membership confirmed.
**Plans**: TBD
**Status**: Not started

Plans:
- [ ] 03-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Authentication Access | 5/5 | ✅ Complete | 2026-02-04 |
| 2. Org Structure & Languages | 0/TBD | Not started | - |
| 3. Member Enrollment | 0/TBD | Not started | - |
