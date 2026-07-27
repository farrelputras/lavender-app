// v1.0.5 (PRD-8) dispatch ⑨ — item 4. Narrowly scoped: proves the "Tanggal" row now sits inside
// a FieldBox-shaped ancestor (BR-1: boxed = Mom can change it — even though this row opens a
// picker rather than accepting typed text, BR-4 still counts it a Field, since it's a recorded
// value she picks) and that the hand-rolled `dateRow` box (wrong border token, fixed `height`)
// is gone from the box itself.
import { StyleSheet } from "react-native"
import { render } from "@testing-library/react-native"

import { colors, borderRadius } from "@/theme/tokens"

import PembayaranSheet from "./PembayaranSheet"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only walk against RNTL's
// own `ReactTestInstance.props: any`, mirroring the project's existing `findStyledAncestor`
// idiom (test/findStyledAncestor.ts) and PengembalianScreen.characterization.test.tsx's local
// variant of the same pattern.
function findBorderedAncestor(start: any): any {
  let node = start.parent
  while (node) {
    const flat = StyleSheet.flatten(node.props?.style) ?? {}
    if (flat.borderColor !== undefined) return node
    node = node.parent
  }
  return null
}

describe("PembayaranSheet — Tanggal field box (PRD-8)", () => {
  it("boxes the Tanggal row in FieldBox's token set, not the old hand-rolled dateRow box", () => {
    const utils = render(
      <PembayaranSheet visible onClose={jest.fn()} onSubmit={jest.fn()} />,
    )

    const dateLabel = utils.getByText(/^\d{1,2} \w{3} \d{4}$/)
    const box = findBorderedAncestor(dateLabel)

    expect(box).not.toBeNull()
    const flat = StyleSheet.flatten(box!.props.style)
    // The tokens BR-3/BR-6 require — NOT the retired `outlineVariant` / radius 8 / fixed
    // `height: 56` the old hand-rolled `dateRow` box used.
    expect(flat.borderColor).toBe(colors.outline)
    expect(flat.backgroundColor).toBe(colors.surface)
    expect(flat.borderRadius).toBe(borderRadius.default)
    expect(flat.minHeight).toBe(52)
    expect(flat.height).toBeUndefined()
  })
})
