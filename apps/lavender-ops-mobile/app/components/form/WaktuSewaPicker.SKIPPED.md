# WaktuSewaPicker — extraction deferred

Attempted Phase 0 extraction of the inline datetime picker flow from
DetailSewaScreen + PengembalianScreen, but the coupling between picker
state and parent rental state (mulai/estimasi linkage, automatic durasi
recompute) made the API too thorny for a 2h time-box.

Deferred to Phase 4 (connector swap) when both screens will be touched
anyway. At that point, decide whether to extract or keep inline.
