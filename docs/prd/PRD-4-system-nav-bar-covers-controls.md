# PRD-4 — Android system navigation bar covers the app's controls

- **PRD:** 4 — refer to this as **PRD-4**.
- **Status:** ⏳ **DELIVERED in v1.0.4, sign-off outstanding.** Published OTA 2026-07-23 (channel
  `preview`, runtime `1.0.0`, update group `ba4e2219-c86a-4ccc-aca3-514492d0b043`). The core mechanism is
  **device-validated on Mom's Poco M3** — the app read a real runtime inset of **47.27px** in her
  3-button mode, confirming BR-3. **Not yet ✅ shipped:** AC-8's remaining per-screen visual rows and
  Mom's own confirmation are still owed (`docs/reports/v1-0-4-visual-audit.md`). The AC checkboxes below
  are left unticked on purpose — the authoritative per-AC verdicts are in `docs/reports/v1-0-4.md`.
- **⚠️ AMENDED 2026-07-25 — the third problem-statement bullet was a misattribution.** Beranda's clipped
  "0 pelanggan" was **never a PRD-4 defect**. Read **§Amendment A-1** before citing that screenshot as
  evidence for anything. **AC-3 itself still stands** — it narrows, it does not weaken.
- **Target release:** **v1.0.4** (`docs/releases/v1-0-4.md`), shipped together with PRD-5. This PRD is the
  authoritative **requirements**; the release plan refers to it, not the other way around.
- **Author:** Product · 2026-07-21. **Amended 2026-07-25** (A-1 — see its provenance table; the
  correction is evidentiary, and no requirement was rewritten).
- **Priority:** **urgent — functional.** Mom's primary action button is physically obstructed.
- **Related:** PRD-5 (same reporting session, same device, **different root cause** — do not merge).
  Both were surfaced by Mom's Poco M3 screenshots in `docs/mom-ss/`.

## Amendment A-1 — Beranda's "0 pelanggan" is a scroll fold, not a clip (2026-07-25)

> **This amendment removes a piece of *evidence*, not a requirement.** The defect PRD-4 describes is
> real, urgent, and was confirmed on two of the three screenshots. The third screenshot never showed it.
> **AC-3 and user flow 3 remain in force.**

| | |
|---|---|
| Found | 2026-07-22, during v1.0.4 execution, by a narrow read-only diagnostic dispatched with one instruction: **look at the pixels first** |
| Decided | the finding was accepted by Lead and Farrel; no fix was owed by anyone |
| Recorded here | 2026-07-25 by **PM**, discharging the "Product owes PRD-4 an amendment" item logged in `docs/reports/v1-0-4.md` |

**What the screenshot actually shows.** `docs/mom-ss/sewa-baru-text-too-big.jpeg` is captured at **scroll
offset ≈ 0** — the entire non-sticky header ("Halo!", the date, both quick-action buttons, the whole
"Harus Kembali Hari Ini" section) is rendered, which is only possible if the ScrollView **has not been
scrolled at all**. The descenders of the two "g"s in "0 pelanggan" are sliced exactly where the card's
white background meets the tab bar's pale gray-blue, with **no card border anywhere near the cut** —
meaning the card's real bottom edge is simply further down, off-screen. Below the cut, the tab bar icons
are fully legible and the system nav icons are unobstructed.

**That is a ScrollView viewport edge. It is a fold, not a clip.**

**The comparison is what makes it conclusive.** The other two screenshots show what an overlay actually
looks like: in `android-nav-blocking-on-sewa-baru-screen.jpeg` the recents and back icons are drawn
*literally on top of* the "Simpan Rental" glyphs; in `…-pilih-kendaraan-screen.jpeg` the nav row sits
flush against the bottom card row with no reserved gap. **Neither pattern appears in the Beranda image.**

**Why Beranda structurally cannot have this defect.** The tab navigator root is
`flexDirection: 'column'`, the screens container is `{flex: 1, overflow: 'hidden'}`, and the tab bar
renders as the **next sibling in normal flex flow** — not absolute, not a portal, not z-stacked.
`MainNavigator.tsx`'s `$tabBar` carries no `position: "absolute"`. **Non-overlap is a flexbox
guarantee.** The tab bar also already folds `insets.bottom` into its own height, which is why
`edgeToEdgeEnabled: true` causes the overlap on *non-tabbed* screens (the two real screenshots) and not
on this one. The scoping note under §Problem statement was right all along.

**Superseded text**, preserved so a future reader can trace the change:

> ~~`docs/mom-ss/sewa-baru-text-too-big.jpeg` — Beranda. The last summary card's line ("0 pelanggan") is
> clipped by the tab bar; the list cannot scroll far enough to reveal it.~~ — superseded 2026-07-25.
> Both halves were wrong: it is not clipped *by the tab bar*, and "cannot scroll far enough" is not
> demonstrated by a frame in which scrolling was never attempted.

**Consequences, stated so nothing is quietly worked around:**

1. **AC-3 narrows but does not weaken.** It still binds on every non-tabbed screen, where the overlap is
   real and photographed. What changes is that **Beranda cannot be used as evidence for or against it**.
2. **No fix was owed.** v1.0.4's Beranda change (extending the trailing spacer *after* `<VersionFooter />`
   so the true last item clears the tab bar) is a real, separate BR-2/AC-3 improvement and was kept — but
   it is **orthogonal** to this symptom. "0 pelanggan" is in the 2nd of 4 stat cards, nowhere near the
   trailing spacer.
3. **One honest residual went onto the visual-audit checklist:** on Mom's device at her font scale,
   scroll Beranda to the very bottom and confirm all four stat cards plus the footer are reachable. The
   code says they are; a static image cannot prove it.

> **The lesson this cost.** Four agents and Lead reasoned about this defect for an entire release from
> **prose descriptions of an image nobody had opened.** The description was Product's good-faith reading
> of a real screenshot, it was wrong, and it propagated unchallenged through discovery and planning.
> **When a requirement rests on an image, open the image.**

## Summary

On Mom's phone the Android system navigation bar sits **on top of** the app's own bottom controls.
The buttons she needs — most critically **Simpan Rental** — are partially covered, and scrolling lists
cannot scroll their last item clear of it. The app must reserve the space the system navigation
occupies, on every screen, on every device.

## Problem statement

Mom reported that "android navigation blocks the buttons." Her screenshots confirm it:

- `docs/mom-ss/android-nav-blocking-on-sewa-baru-screen.jpeg` — the final step of *Sewa Baru*. The
  `Batal` and `Simpan Rental` buttons are drawn with the three system nav icons (■ ● ◀) rendered
  directly across them. The bottom portion of both buttons is under system furniture.
- `docs/mom-ss/android-nav-blocking-on-pilih-kendaraan-screen.jpeg` — the vehicle grid. The bottom row
  of vehicle cards runs underneath the nav bar and is cut off.
- ~~`docs/mom-ss/sewa-baru-text-too-big.jpeg` — Beranda. The last summary card's line ("0 pelanggan") is
  clipped by the tab bar; the list cannot scroll far enough to reveal it.~~
  **⚠️ WITHDRAWN 2026-07-25 — see §Amendment A-1.** Proven on the pixels to be a ScrollView fold at
  scroll offset ≈ 0, not an overlap. Beranda never had this defect. The two bullets above are the real,
  confirmed evidence; this one is not.

**Why this is urgent and not cosmetic.** *Simpan Rental* is the commit point of the entire rental-entry
flow. A tap that lands in the covered strip goes to the Android system, not to the app — from Mom's
side the button "doesn't work," and the natural recovery for a busy operator is to tap harder, tap
repeatedly, or back out and re-enter the whole rental. This is the single highest-consequence control
in the app and it is the one being obstructed.

This is not a Mom-specific misconfiguration. It is unconditional on every Android device: the app's
bottom surfaces do not reserve system-navigation space at all. It has presumably been true since v1.0.0
and simply wasn't caught, because it is invisible on the emulator/device the app is developed on when
the nav bar is translucent or gesture-slim.

> **Scoping note (Product-verified, so the plan doesn't chase a non-bug):** the **bottom tab bar**
> (Beranda / Rental / Hutang / User) *already* accounts for the system inset and renders correctly in
> all four screenshots. The defect is in (a) screen-level pinned action bars and (b) the bottom padding
> of scrollable content. The tab bar itself needs no fix.

## Affected users

- **Mom (`ops`, primary).** Blocked from reliably committing a new rental; loses the bottom of every
  scrolling list. She uses the classic 3-button navigation, which is the *tallest* system nav mode.
- **Farrel (`admin`).** Same defect, lower impact — he knows to scroll or nudge the layout.

## Goals

- **G1** Every control the app pins to the bottom of a screen is fully visible and fully tappable,
  clear of the system navigation area.
- **G2** Every scrollable list/form can scroll its last item completely clear of whatever sits below it
  (tab bar and/or system navigation).
- **G3** The fix is device-driven, so it is correct on 3-button navigation, gesture navigation, and
  devices with no nav inset at all — not tuned to one phone.
- **G4** No screen gains dead whitespace on devices that don't need it.

## Non-goals

- Any change to what the buttons *do*, or to the rental flow itself.
- Edge-to-edge / immersive display treatment, translucent system bars, or restyling the nav area.
- Landscape orientation support (see OQ-1).
- Anything about text size or text spacing — that is **PRD-5**.
- The bottom tab bar's own height/inset handling, which is already correct.

## Behavioral requirements

- **BR-1 (bottom controls clear the system nav).** On every screen with a pinned bottom action bar,
  the full height of every button in that bar is visible and receives touches. No part of any control
  may fall inside the system navigation area.
- **BR-2 (scrollable content clears what's below it).** Any scrolling list or form can be scrolled
  until its final item is entirely visible above the tab bar and/or system navigation area.
- **BR-3 (inset-driven, not hardcoded).** The reserved space MUST come from the device's reported
  bottom inset. A fixed constant is not acceptable: it would under-reserve on 3-button navigation and
  over-reserve on gesture navigation, and would silently break on the next device.
- **BR-4 (applies app-wide, including future screens).** The behavior must live in the shared bottom-bar
  primitive and the shared screen scaffolding, so a new screen inherits it. A per-screen patch list is
  not an acceptable outcome — the same defect would return with the next screen added.
- **BR-5 (no visual regression at zero inset).** On a device reporting no bottom inset, screens look as
  they do today. No new gap, no shifted layout.
- **BR-6 (iOS not regressed).** The current iOS home-indicator spacing behavior must be preserved or
  improved, never lost. (LAVENDER ships Android-only today; this exists so the shared component stays
  honest.)

## User flows

1. **Commit a rental (the blocked one).** Mom completes *Sewa Baru* step 3 → the `Batal` /
   `Simpan Rental` bar sits fully above the system nav → she taps anywhere on *Simpan Rental*, including
   its lower half → the rental saves on the first tap.
2. **Pick a vehicle from the bottom of the grid.** Mom scrolls the *Pilih Kendaraan* grid to the end →
   the last row of vehicle cards is fully visible and tappable.
3. **Read the bottom of Beranda.** Mom scrolls Beranda to the end → the final summary card, including
   its last line, is fully readable above the tab bar. *(Still required. Note per §Amendment A-1 that
   this flow was never shown to be broken — the screenshot cited for it was an unscrolled frame. It is
   now the visual-audit residual: scroll to the very bottom on Mom's device and confirm.)*
4. **Return a vehicle / record a payment / add a user.** Every other screen with a pinned bottom bar
   behaves as in flow 1.

## Failure & edge behavior

- **Gesture navigation instead of 3-button:** smaller inset, still respected; no oversized gap.
- **Keyboard open on a form:** the bottom bar must not end up double-offset (inset *and* keyboard),
  leaving a floating gap above the keyboard.
- **Device with no bottom inset:** unchanged from today (BR-5).
- **Very short screens (content shorter than the viewport):** the bar stays pinned and clear; no
  scroll is introduced where none is needed.

## Acceptance criteria (testable)

- [ ] **AC-1** On a device with **3-button** system navigation, the *Simpan Rental* bar on *Sewa Baru*
      step 3 is fully visible and the button responds to a tap on its lowest visible row. *(G1, BR-1)*
- [ ] **AC-2** The same holds for **every** screen with a pinned bottom bar — verified individually, not
      by sampling one. *(G1, BR-1, BR-4)*
- [ ] **AC-3** Every scrolling list/form (Beranda, Rental, Hutang, User, Pilih Kendaraan, Pilih User,
      and every detail screen) can scroll its last item fully clear of the tab bar and system nav. *(G2, BR-2)*
- [ ] **AC-4** On a device using **gesture** navigation, controls are clear **and** there is no
      conspicuous empty band below them. *(G3, G4, BR-3)*
- [ ] **AC-5** With a zero bottom inset, screen layout is byte-for-byte unchanged in behavior from
      today. *(BR-5)*
- [ ] **AC-6** With the keyboard open on a form screen, the bottom bar sits directly above the keyboard
      with no stacked/duplicated gap. *(edge behavior)*
- [ ] **AC-7** A new screen built on the shared bottom-bar primitive inherits the correct inset with no
      extra per-screen code. *(BR-4)*
- [ ] **AC-8** Confirmed on **Mom's actual phone** (Poco M3, her navigation mode), not only on an
      emulator — this defect is invisible in the configuration it was developed in.
- [ ] **AC-9** Ships OTA-only: `app.json` `version` unchanged, no native dependency, no APK.

## Constraints the design must honor (Product-surfaced; not the design itself)

- The reserved space must derive from the runtime-reported bottom inset (BR-3). Note that the existing
  shared bottom bar branches on **platform** (`iOS` vs everything else) rather than on the inset — that
  branch is the defect, and replacing it is the point of BR-3/BR-4.
- Fix belongs in the shared primitives (bottom bar + screen scaffolding), not sprinkled per screen (BR-4).
- Screens currently declare only a **top** safe-area edge; whatever the design chooses, the outcome must
  satisfy BR-1/BR-2 without introducing a doubled offset where a tab bar is also present.
- Do not restyle, resize, or relabel any control while fixing this. PRD-5 owns text; this PRD owns space.

## Open questions

- **OQ-1** Is portrait-only guaranteed (locked orientation), or must landscape be handled too? If
  landscape is reachable, left/right insets come into play and AC coverage widens.
- **OQ-2** Does Mom use 3-button navigation permanently, or does MIUI switch her between modes? Answer
  only affects which mode is verified **first** — BR-3 requires both to work regardless.
