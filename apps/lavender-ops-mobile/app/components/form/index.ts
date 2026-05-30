// Shared form-component library — see docs/superpowers/specs/2026-05-26-v1-roadmap-design.md §4.5
// Components extracted from inline declarations in DetailSewaScreen + PengembalianScreen.
// Existing screens are NOT rewritten in Phase 0; new screens (Phase 5) MUST compose from these.

export { SectionLabel } from "./SectionLabel"
export type { SectionLabelProps } from "./SectionLabel"

export { FieldCard } from "./FieldCard"
export type { FieldCardProps } from "./FieldCard"

export { FuelGauge } from "./FuelGauge"
export type { FuelGaugeProps } from "./FuelGauge"

export { Stepper } from "./Stepper"
export type { StepperProps } from "./Stepper"

export { RupiahInput } from "./RupiahInput"
export type { RupiahInputProps } from "./RupiahInput"

export { PhotoRow } from "./PhotoRow"
export type { PhotoItem, PhotoRowProps } from "./PhotoRow"

export { PhotoSlot } from "./PhotoSlot"
export type { PhotoSlotProps } from "./PhotoSlot"

export { BottomActionBar } from "./BottomActionBar"
export type { BottomActionBarProps } from "./BottomActionBar"
