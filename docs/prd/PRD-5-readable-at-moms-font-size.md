# PRD-5 — The app must stay readable at Mom's font size

- **PRD:** 5 — refer to this as **PRD-5**.
- **Status:** ready to plan. Two open questions are **cosmetic calibration**, not blockers (see below).
- **Target release:** *not set by Product* — PM decides where this lands (`/pm`). It is JS/layout-only,
  so it is OTA-eligible with no `app.json` `version` bump.
- **Author:** Product · 2026-07-21
- **Priority:** **urgent — information integrity.** Two separate numbers are currently rendered touching
  each other on the rental list. Cosmetically-reported, but it corrupts how Mom reads money.
- **Related:** PRD-4 (same reporting session, same device, **different root cause** — do not merge).
  Evidence: Mom's Poco M3 screenshots in `docs/mom-ss/`.

## Summary

Mom has increased the text size on her phone. LAVENDER inherits that setting without limit, but its
screens were laid out for the default size — so labels are **clipped**, headers **wrap and crowd**, and
adjacent pieces of data **collide into each other**. The app must honor a larger text size *up to a
supported maximum*, and must remain correct and unambiguous at every size in that range.

## Problem statement

Mom reported two things that sound different but are one defect:

1. *"Text such as 'Sewa Baru' seems too big"* (she flagged this as cosmetic, not urgent).
2. *"Text too close with other texts"* — and she noted this one **gives information**, i.e. it changes
   what she reads. She flagged it urgent.

Her screenshots show the app inheriting her enlarged OS text size everywhere, with no layout adapting
to it:

- **Clipped label** — `docs/mom-ss/sewa-baru-text-too-big.jpeg`: the primary *Sewa Baru* quick-action
  button on Beranda renders its label wider than the button, so the last character is cut off. Mom read
  a truncated word and described it as "too big"; the real fault is that it is **incomplete**.
- **Colliding data** — `docs/mom-ss/date-text-too-close-with-sisa-payment.jpeg`: on a rental card the
  row reads `21 Juli → 22 JuliSisa Rp 50.000`. The return date and the outstanding balance are printed
  with **no gap at all**. They are two unrelated facts — a date and an amount of money — fused into one
  string.
- **Crowded header** — `docs/mom-ss/android-nav-blocking-on-sewa-baru-screen.jpeg` and
  `…-pilih-kendaraan-screen.jpeg`: the *Sewa Baru* title and its "Langkah 3 dari 3 · Detail Sewa"
  subtitle both wrap and stack tightly against each other and against the back arrow.
- **Truncated identifiers** — the vehicle grid shows `N 2314 A…` and `N 2435 A..`: **licence plates**,
  the field Mom uses to identify which physical vehicle she is renting out, are cut off mid-value. Two
  different motorcycles of the same model can become visually indistinguishable.

**Why "too close" is the urgent half.** `22 JuliSisa Rp 50.000` is not merely ugly. The rental list is
the screen Mom scans to answer "who still owes me money?" A date fused to a rupiah figure invites a
misread, and every misread here is about **money owed**. Truncated plates carry the same class of risk
in the vehicle picker — picking the wrong vehicle at handover corrupts the rental record at its source.
Neither is a styling preference; both are the app presenting wrong-looking information.

**Root cause (single, systemic).** The app applies **no ceiling** to the OS text-scale setting, and the
layouts were authored at the default scale — fixed-height controls, single-line rows, and gaps that
only ever worked because the default-size glyphs happened to leave slack. When the glyphs grow, the
slack disappears first, then the text starts overflowing its container.

## Affected users

- **Mom (`ops`, primary).** Runs the phone at an enlarged text size — presumably deliberately, and
  she should not have to give that up to use the app her son built her. She is the one misreading data.
- **Farrel (`admin`).** Runs the default size, sees none of this. That asymmetry is exactly why it
  shipped, and it is why AC-8 (verify on *her* device) exists.
- **Any future operator** who enlarges text for the same reason Mom did.

## The policy (Farrel's call, 2026-07-21)

**Clamp, then fix.** The app honors the OS text size up to a **defined maximum scale**, and holds at
that maximum beyond it. Inside the supported range, layouts must genuinely adapt — the clamp is a
guarantee of the range the layouts are held to, **not** a substitute for fixing them.

Two options were rejected and are recorded so they are not re-litigated:
- *Fully fluid at any scale* — most respectful of the accessibility setting, but an unbounded sweep
  across every screen with no verifiable ceiling.
- *Ask Mom to lower her phone's text size* — rejected on principle. The app adapts to its user, not the
  reverse; and it would leave the defect in place for the next person.

## Goals

- **G1** No text is ever clipped, cut off, or truncated inside a control at any supported text size —
  most critically button labels and licence plates.
- **G2** Distinct pieces of data are always visibly separated. Money must never touch adjacent text.
- **G3** The app honors an enlarged OS text size up to a defined maximum, and stays stable beyond it.
- **G4** At the default text size, every screen looks and behaves exactly as it does today.
- **G5** The whole app is covered, not only the four screens Mom happened to photograph.

## Non-goals

- Redesigning the type scale or the visual identity. This is *fit*, not a restyle.
- Making screens look **identical** at every text size — reflowing, wrapping, and stacking are the
  expected and correct outcomes at large sizes.
- Full accessibility conformance (screen-reader labels, contrast audit, touch-target audit). Worth
  doing; not this PRD.
- Anything about system navigation overlap — that is **PRD-4**.
- Localisation / shortening Indonesian copy to dodge the problem.

## Behavioral requirements

- **BR-1 (nothing is clipped).** At any supported text size, no label, value, or identifier is cut off
  by its container. Controls grow to fit their content; fixed heights that clip text are not acceptable.
- **BR-2 (data never fuses).** Two adjacent but distinct pieces of information always have clear visual
  separation. Where a row can no longer hold both, it wraps or stacks — it never lets them touch.
  This applies with **no exception** to any rupiah amount.
- **BR-3 (identifiers render in full).** Licence plates are never truncated anywhere they are used to
  *choose* or *identify* a vehicle. If the layout cannot fit one on a line, the layout changes.
- **BR-4 (bounded scale).** The app applies a maximum effective text scale (see OQ-1). Past that point
  the layout is stable and unchanged; below it, text scales as the user asked.
- **BR-5 (default size unchanged).** At scale 1.0 there is no visual regression anywhere. This is the
  guard against "fixing" Mom's phone by degrading everyone else's.
- **BR-6 (headers stay legible).** A screen title and its subtitle never overlap, never collide with
  the back control, and remain readable when they wrap.
- **BR-7 (app-wide).** Every screen is audited against BR-1..BR-3 at the maximum supported size, not
  just the four Mom reported.
- **BR-8 (durable).** The rules live in the shared text/layout primitives wherever possible, so a new
  screen inherits correct behavior rather than re-introducing the defect.

## User flows

1. **Read the rental list (the urgent one).** Mom opens *Rental* at her text size → each card shows the
   date range and *Sisa Rp 50.000* clearly separated (side by side with a real gap, or stacked) → she
   reads the outstanding amount without ambiguity.
2. **Start a new rental.** Mom taps the Beranda quick action → the button reads *Sewa Baru* in full,
   no cut-off character.
3. **Pick the right vehicle.** Mom opens *Pilih Kendaraan* → every card shows its **complete** licence
   plate → she can distinguish two Honda Beats.
4. **Work through the rental steps.** The *Sewa Baru* header and its "Langkah N dari 3" subtitle wrap
   cleanly with breathing room, and the step content below is unaffected.
5. **Farrel's phone (regression guard).** Farrel opens the app at default text size → nothing has
   changed from today.

## Failure & edge behavior

- **Text size raised above the supported maximum:** layout holds at the maximum; nothing breaks,
  nothing clips.
- **Longest realistic content at maximum size:** longest customer name, longest vehicle name, and a
  7-figure rupiah amount all render without clipping or collision.
- **Empty / zero values** (`Rp 0`, no note, blank km): no layout collapse or stray separator.
- **Text size changed while the app is running:** the app must not be left in a broken layout state.
- **Both PRD-4 and PRD-5 conditions at once** (large text *and* 3-button nav): the combination is
  Mom's actual phone, and is the configuration that must be verified.

## Acceptance criteria (testable)

- [ ] **AC-1** On the rental list at the maximum supported text size, the date range and the *Sisa*
      amount are visibly separated — they never touch and never read as one string. *(G2, BR-2)*
- [ ] **AC-2** The Beranda *Sewa Baru* and *User Baru* quick actions show their labels in full at the
      maximum supported size. *(G1, BR-1)*
- [ ] **AC-3** Every licence plate in the vehicle picker renders complete, with no ellipsis or cut, at
      the maximum supported size. *(G1, BR-3)*
- [ ] **AC-4** Screen titles and subtitles neither overlap each other nor the back control at the
      maximum supported size. *(BR-6)*
- [ ] **AC-5** Every screen in the app has been checked at the maximum supported size, and none shows
      clipped text or touching text. Coverage is enumerated screen by screen in the test report. *(G5, BR-7)*
- [ ] **AC-6** At the default text size, all screens are unchanged from current behavior. *(G4, BR-5)*
- [ ] **AC-7** Raising the OS text size beyond the supported maximum produces no further growth and no
      broken layout. *(G3, BR-4)*
- [ ] **AC-8** Verified on **Mom's actual phone at her actual setting** (Poco M3), not only on an
      emulator — and confirmed *by Mom* that the rental list now reads unambiguously.
- [ ] **AC-9** No rupiah amount anywhere in the app is adjacent to another value without clear
      separation, at any supported size. *(BR-2)*
- [ ] **AC-10** Ships OTA-only: `app.json` `version` unchanged, no native dependency, no APK.

## Constraints the design must honor (Product-surfaced; not the design itself)

- The clamp must be **one shared decision**, not a per-`<Text>` sprinkle — a value applied in the shared
  text primitives/theme so new code inherits it (BR-8). There is currently **no** scale handling
  anywhere in `app/`, so this is a new, single point of control.
- Fixed-height controls are the mechanism behind the clipping. Wherever a fixed height forces text to
  clip, the height gives way — not the text (BR-1).
- Rows carrying a date and an amount need a layout that degrades by wrapping/stacking, not one that
  relies on leftover horizontal slack (BR-2).
- The vehicle card must be able to give a plate the room it needs; shrinking the plate to fit is not an
  acceptable resolution of BR-3 if it makes it harder to read.
- **Do not** touch rental math, connectors, or any value — this PRD changes presentation only.
- Verify with PRD-4 applied (or explicitly note if not), since Mom's device exhibits both.

## Open questions

- **OQ-1 (calibration, non-blocking).** What is the maximum supported text scale? A cap around **1.3×**
  was the working assumption. Before fixing it, **read Mom's actual setting off her phone** — a cap at or
  below what she already uses would silently shrink her text and read as the app fighting her.
- **OQ-2 (cosmetic, non-blocking).** Should some headline sizes be reduced at the **default** scale too?
  Mom said "Sewa Baru" seems too big; the diagnosis above is that it is *clipped* rather than oversized,
  but a 20pt semi-bold button label and a 40pt list title are genuinely large at baseline. Ask her
  whether the type still feels too big **after** the clipping is fixed, rather than guessing now.
- **OQ-3** When a rental card can no longer fit the date range and *Sisa* on one line, which reads
  better for Mom — stacking them, or dropping the date to a second line and giving *Sisa* its own row?
  A judgment call best answered with a mockup in front of her.
