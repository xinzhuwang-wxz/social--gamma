# Design QA: memory journal and public garden entry points

- Source visual truth: `output/letter-detail-reference.jpg` (the product's existing mailbox letter detail)
- Rendered implementation: `output/memory-journal-implementation.jpg`
- Viewport: 1280 x 720 CSS px, deviceScaleFactor 1
- Source pixels: 1280 x 720
- Implementation pixels: 1280 x 720
- Density normalization: none required; captures use the same browser viewport and density
- State: opened a received invitation letter for the source, then opened the completed West Lake night-ride flower for the implementation

## Full-view comparison evidence

The two captures share the existing warm paper palette, Songti text hierarchy, thin olive/brown borders, restrained shadows and the same mobile shell. The journal intentionally replaces the letter's formal single-sheet composition with a photographed cover, ruled paper, tape, tilted photo mounts, handwritten quote and provenance details. This preserves family resemblance without making a completed memory look like another invitation.

## Focused region comparison evidence

No separate cropped comparison was needed: at this viewport the full phone canvas is 402 x 682 CSS px and the key header, paper edge, typography, quote treatment and upper photo area are all legible in both source and implementation. Browser DOM inspection additionally confirmed that all journal text, participant profile buttons and image alternatives are present.

## Required fidelity surfaces

- Fonts and typography: passed. Existing Songti and Kaiti stacks are retained; metadata, title, body, quote and provenance have distinct readable hierarchy.
- Spacing and layout rhythm: passed. Journal sections align to the existing 13-18 px mobile gutters; no horizontal overflow or clipped persistent controls was observed.
- Colors and visual tokens: passed. Warm cream, muted olive, ochre and brown remain within the existing letter and garden system.
- Image quality and asset fidelity: passed. Existing production garden, flower, pet and butterfly assets are reused with intentional crop and scale; no placeholder boxes or custom SVG illustration replacements were introduced.
- Copy and content: passed. The journal uses evidence-backed Mock details, separates participant words from the flower's organization, and states the provenance boundary.

## Interaction verification

- Completed flower -> memory journal: passed.
- Journal participant -> public garden: passed.
- Mail invitation avatar -> public garden: passed.
- Matched chat avatar -> public garden -> back to chat: passed.
- Startup `/api/demo` sync is silent, removing the mailbox full-screen loading flash while preserving loading feedback for mutations: passed.
- ARK mini model with `thinking: disabled`: passed through a live `/api/clarify` response.

## Findings

No actionable P0, P1 or P2 mismatch remains.

## Follow-up polish

- P3: replace each public garden's shared base image after individualized home/garden mocks arrive; the stable layout and data entry points are already in place.
- P3: replace the two demo journal photos with user-confirmed event uploads once the evidence ingestion flow is connected.

## Comparison history

- Pass 1: no P0-P2 differences found. The only remaining items are deliberately deferred P3 asset swaps described above; no corrective visual loop was required.

final result: passed
