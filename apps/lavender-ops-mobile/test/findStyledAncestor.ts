// Test-only helper (v1.0.4, Tester). RNTL's `.parent` walks the *host*-node tree one level at a
// time, and how many host levels sit between a `<Text>` and the styled `<View>`/`<TouchableOpacity
// style={...}>` that visually contains it is an implementation detail of the wrapping
// component's own internals (not always exactly one level). Rather than hardcode a `.parent`
// depth per component, this walks upward until a predicate over the flattened style matches —
// i.e. the ancestor a given assertion actually cares about (a fixed height/minHeight for a CTA,
// a flexWrap row for a money-adjacency check, etc.).
import { StyleSheet } from "react-native"

type HostElement = {
  parent: HostElement | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors RNTL's own
  // `ReactTestInstance.props: any`, so callers can flatten/inspect `style` without fighting an
  // over-narrow test-only type.
  props: { style?: any }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- flattened RN style shape
type FlatStyle = Record<string, any>

/** Walks up from `start` and returns the first ancestor whose flattened style has a `height` or
 * `minHeight` key — the node a fixed-height-container assertion cares about. */
export function findStyledAncestor(start: HostElement): HostElement | null {
  return findAncestorWhere(
    start,
    (flat) => flat.height !== undefined || flat.minHeight !== undefined,
  )
}

/** Walks up from `start` and returns the first ancestor whose flattened style has a `flexWrap`
 * key — the row a money-adjacency ("must wrap, not fuse") assertion cares about. */
export function findFlexWrapAncestor(start: HostElement): HostElement | null {
  return findAncestorWhere(start, (flat) => flat.flexWrap !== undefined)
}

function findAncestorWhere(
  start: HostElement,
  predicate: (flat: FlatStyle) => boolean,
): HostElement | null {
  let node: HostElement | null = start.parent
  while (node) {
    const flat: FlatStyle = StyleSheet.flatten(node.props.style) ?? {}
    if (predicate(flat)) return node
    node = node.parent
  }
  return null
}
