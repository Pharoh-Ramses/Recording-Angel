# Missionary Support - Design

## Overview

Add a missionary domain to the existing ward app so missionaries can have their own login-based access, post missionary-specific announcements, and manage dinner calendars by companionship. Missionaries are managed by a new `ward_mission_leader` role, keep a persistent profile across transfers, and use URL-driven shareable calendars that can be opened from QR codes.

## Confirmed Product Decisions

- Missionaries have their own ourStake logins.
- Missionary access is separate from the existing `members` model.
- A missionary keeps one profile across ward transfers.
- Missionary announcements appear in the normal ward feed as a new post type/filter.
- Dinner calendars are separate per companionship by default, with optional selective consolidation.
- Meal signup is a one-slot claim flow.
- Anyone with the shared QR/link can open the calendar and claim a slot.
- Public volunteers provide `name` and `phone` when claiming a meal.

## Recommended Approach

Build this as a separate missionary domain inside the current app, not as an extension of the normal ward membership model.

Why this approach:

- It preserves the current `members` and ward admin workflows.
- It supports missionary transfers without losing identity or history.
- It handles companionship-based calendars and selective consolidation cleanly.
- It leaves room for reminders, richer scheduling, and future missionary workflows.

## Architecture

Keep the current `users`, `members`, `roles`, and `posts` foundations, but add a missionary layer beside them.

- A missionary has a persistent profile linked to a real app login.
- Ward assignment is time-based so a missionary can move wards without creating a new identity.
- Companionships are operational units that group missionaries for scheduling and communication.
- Calendar groups represent the actual bookable calendar that a QR code or public share link opens.
- Ward mission leaders manage missionaries, companionships, grouping rules, and sharing.
- Missionary announcements remain part of the ward experience instead of becoming a detached subsystem.

## Core Data Model

### Missionaries

Persistent missionary profile linked to `users`.

Suggested fields:

- `userId`
- `name`
- `email`
- `phoneNumber`
- `status`
- future reminder preferences

### Missionary Assignments

Time-bound assignment records that connect a missionary to a ward over time.

Suggested fields:

- `missionaryId`
- `wardId`
- `stakeId`
- `startedAt`
- `endedAt`
- `status`

Exactly one assignment should be active at a time.

### Companionships

Operational unit for calendars and phone contact.

Suggested fields:

- `wardId`
- `name` or generated label
- `phoneNumber`
- `status`

Use a join table for companionship membership so companionship composition can change without deleting history.

### Missionary Calendar Groups

Bookable calendar containers used for selective consolidation.

Suggested fields:

- `wardId`
- `name`
- `slug` or internal key
- `shareToken`
- `status`

A calendar group can map to one companionship or multiple companionships.

### Missionary Dinner Slots

Date-based meal opportunities owned by a calendar group.

Suggested fields:

- `calendarGroupId`
- `date`
- `mealType` or schedule label
- `notes`
- `status`

### Missionary Dinner Reservations

Public volunteer reservation for a single slot.

Suggested fields:

- `slotId`
- `volunteerName`
- `volunteerPhone`
- `claimedAt`
- optional notes

### Missionary Share Links

Opaque public tokens for QR code access.

Suggested fields:

- `calendarGroupId`
- `token`
- `status`
- `expiresAt` if needed later

## Roles and Permissions

### New system roles

- `ward_mission_leader`
- `missionary`

### Permission model

Add missionary-specific permissions rather than reusing unrelated member/admin permissions.

Suggested additions:

- `missionary:view`
- `missionary:manage`
- `missionary_assignment:manage`
- `companionship:manage`
- `missionary_calendar:manage`
- `missionary_calendar_group:manage`
- `missionary_post:create`
- `missionary_post:approve`
- `missionary_post:publish_directly` (optional, not enabled by default)

### Role intent

- `ward_mission_leader` manages missionary profiles, transfers, companionships, grouping rules, and approvals.
- `missionary` can access their own missionary workflows and manage their assigned companionship calendar operations.
- Missionaries do not become normal ward members in the existing membership system.

## Posts and Feed Integration

Extend `posts.type` with a dedicated missionary announcement type.

Recommended type value:

- `missionary_announcement`

Behavior:

- Appears in the normal ward feed.
- Gets its own left-sidebar filter.
- Uses the existing post/feed infrastructure where possible.
- Defaults to ward scope.
- Enters a ward mission leader review flow by default.

## Calendar and URL State

Dinner calendar state must live in the URL so shared links reliably reopen the same view.

The URL should encode at least:

- calendar token or calendar group identifier
- current month/week view anchor
- selected companionship/group filter when relevant

This allows QR codes to point directly to a precise calendar context instead of just a generic page.

## User Flows

### Ward mission leader

1. Creates missionary profiles or links missionary users.
2. Creates active assignments for the ward.
3. Builds companionships and assigns missionaries to them.
4. Chooses whether calendars stay separate or become selectively consolidated.
5. Generates QR/share links for the chosen calendar groups.
6. Reviews missionary announcements.

### Missionary

1. Signs in with their own account.
2. Sees their current assignment and companionship.
3. Posts missionary announcements.
4. Manages companionship dinner slots and schedule visibility.

### Public volunteer

1. Scans QR code or opens shared link.
2. Lands on a read-optimized public calendar route.
3. Navigates the URL-driven calendar state.
4. Claims one open meal slot.
5. Provides `name` and `phone`.
6. Sees the slot become reserved.

## Public Sharing Model

Use a public share route backed by opaque tokens rather than exposing internal IDs directly.

Requirements:

- Anyone with the link can view and claim a slot.
- Public visitors must not see ward admin controls or private management UI.
- Invalid or disabled tokens should land on a simple unavailable state.

## Moderation and Validation

- Missionary announcements should require approval from a ward mission leader by default.
- Only the first successful reservation can claim an open slot.
- Transfers should close the prior active assignment and remove old ward-scoped missionary access.
- Missing or malformed URL state should fall back to a sensible default calendar view.

## Testing Focus

- Permission tests for `ward_mission_leader` and `missionary`
- Transfer tests for persistent profile plus changing active assignment
- Companionship and calendar-group tests for separate and selectively consolidated calendars
- Reservation tests for public claim flow, duplicate claim protection, and token validation
- Feed tests for `missionary_announcement` visibility and filtering
- Moderation tests for ward mission leader approval flow
- URL-state tests to verify shared links reopen the same calendar context

## What We Are Not Building Yet

- Automated reminders or texting
- Advanced recurrence rules
- Multi-stake missionary coordination
- Public editing of calendar data
- Complex household profiles for volunteers
- A separate missionary app
