# AI Showcase Platform — Visual Design Brief

## 1. Design goal

Build a distinctive AI engineering showcase that feels like a credible independent engineering studio and a real developer platform — not a generic AI SaaS template.

The site presents agents, governed agents, multi-agent systems, MCP servers, skills, automations, and consulting. Visitors should be able to understand the work, inspect how it behaves, and try safe demos. The visual design must make the technical work legible and compelling.

**Design principle:** editorial confidence on the public site; operational clarity in the playground; practical information density in the dashboard.

Do not redesign the architecture or reduce the scope described in the project spec. This brief governs visual design and interaction patterns.

## 2. Art direction: “Editorial engineering”

Use a restrained Swiss/editorial design language paired with carefully composed technical interfaces.

- Strong typography and clear hierarchy, not decorative gradients.
- Generous whitespace on public pages; purposeful density in the app.
- Asymmetric layouts and deliberate alignment rather than a grid of identical cards.
- Real UI previews, event traces, diagrams, and product screenshots as visual evidence.
- Thin borders, flat surfaces, subtle separators, and restrained shadows.
- A small accent palette used consistently.
- Motion only when it explains a system state or adds useful feedback.

The site should feel designed by a thoughtful engineer with a strong visual eye. It should not look like a clone of a popular AI landing-page template. The identity should be crisp and tactile—not glossy: deep cobalt, warm paper, ink typography, precise rules, and carefully composed interface details.

## 3. Color system

Use a warm, light theme for marketing and account pages, and a separate dark theme for the live playground console. The dashboard should default to light for readability.

Suggested tokens:

```css
:root {
  --page: #F7F6F2;
  --surface: #FFFFFF;
  --surface-muted: #EFEEE8;
  --text: #191A18;
  --text-muted: #686A65;
  --border: #DCDDD5;
  --accent: #3547C8;
  --accent-hover: #2737A8;
  --accent-soft: #E9ECFF;
  --accent-ink: #222F91;
  --success: #287A55;
  --warning: #A56516;
  --danger: #B83A36;
}

[data-theme="console"] {
  --page: #111310;
  --surface: #191B18;
  --surface-muted: #20231F;
  --text: #F0F1EB;
  --text-muted: #A1A69B;
  --border: #343831;
  --accent: #9AA8FF;
  --accent-hover: #B2BCFF;
  --accent-soft: #242B4B;
}
```

Guidelines:
- Make deep cobalt/indigo the brand signature: confident, precise, and slightly ink-like rather than glossy or electric-orange.
- Use the accent for primary actions, links, focus states, selected navigation, and small data highlights—not as a large background fill.
- Pair it with warm paper, graphite, and quiet cool neutrals. Let the accent appear in a few deliberate places so it becomes recognizable.
- Use semantic green, amber, and red for execution and risk states only; never use orange as the brand accent.
- Avoid purple-blue gradient backgrounds, neon glows, blurred gradient blobs, metallic shine, and rainbow accents.
- Do not make every panel a different shade. The border and typography should do most of the work.
- Keep contrast accessible; muted text must remain readable.

## 4. Typography

Use a characterful, highly readable sans-serif for headings and body text, paired with a monospace font only for technical data.

Suggested pairing:
- **Headings and body:** Geist Sans, Inter, or another clean modern grotesk.
- **Technical details:** Geist Mono or IBM Plex Mono.

Rules:
- Headlines should be large, short, and confident.
- Use weight and scale for hierarchy rather than multiple accent colors.
- Body copy should have comfortable line-height and a sensible maximum width.
- Use monospace for tool names, event types, IDs, timestamps, model names, and code — not entire paragraphs.
- Use tabular numerals for metrics, durations, token counts, and quotas.
- Avoid ultra-light text, excessive letter spacing, and tiny all-caps labels everywhere.

## 5. Shape language and component rules

This is a deliberately **square-cornered, editorial interface**.

- Buttons: modest 4–6px radius. Primary and secondary buttons should be rectangular, not pills.
- Inputs and selects: 4–6px radius, clear labels, visible borders.
- Cards and panels: 6–10px radius at most; use square corners where that looks better.
- Tables: flat rows with fine dividers, not individually boxed rows.
- Badges: compact rectangular labels with slight corner rounding. Use pills only if a component genuinely benefits from a fully rounded status indicator; do not use them by default.
- Navigation: simple text links and restrained active indicators.
- Avoid nested cards, floating islands, glassmorphism, oversized rounded containers, and shadows on every component.
- Avoid icon-only controls unless the meaning is familiar; provide labels or tooltips where needed.
- Use Lucide icons consistently, with restrained size and stroke weight. No emoji as UI icons.

Use shadcn/ui as an accessible component foundation, not as the visual identity. Customize its defaults to fit this system.

## 6. Public site

### Header

- Compact horizontal header with the wordmark on the left.
- Navigation links: Work / Offerings, Playground, Pricing, About.
- Right side: Log in and a single prominent action such as “Open playground”.
- Use a subtle bottom border rather than a floating pill-shaped navbar.
- On scroll, keep the header unobtrusive. Mobile navigation should be simple and accessible.

### Homepage hero

Build a strong editorial composition, not a centered headline over a gradient.

Suggested layout:
- Small eyebrow: `INDEPENDENT AI ENGINEERING` or similar.
- Large left-aligned headline, for example: **“AI systems you can inspect, test, and trust.”**
- Short paragraph explaining the work: agents, tool use, governance, and production-minded architecture.
- Two actions: “Explore the work” (primary) and “Try a live demo” (secondary).
- On the right or beneath the headline, show a carefully composed live-console preview: an agent run, a tool request, an approval pause, and an audit event.
- Use realistic sample data and legible labels. The preview should look like a real interface, not an abstract fake dashboard.

Below the hero:
1. A concise capabilities strip: Agents / Governance / MCP / Orchestration / Automation.
2. Featured projects or offerings with distinct layouts and real interface previews.
3. A “How I approach systems” section with three or four concrete principles.
4. A selected technical case study or architecture diagram.
5. A final call to action and a restrained footer.

Do not fill the page with six identical feature cards. Alternate between wide feature rows, split layouts, diagrams, and smaller text-led sections.

### Offerings pages

Each offering should explain a concrete capability and link to its corresponding demo.

Recommended structure:
1. Breadcrumb and small category label.
2. Large headline with a specific promise.
3. Short explanation of the problem and approach.
4. A substantial interface preview or architecture diagram.
5. A “How it works” sequence with 3–5 steps.
6. A “Try it” section linking to the playground.
7. Technical details in a compact, scannable section.
8. Related offerings.

Make each offering page visually related but not mechanically identical. Avoid generic benefit grids and invented performance claims.

### Pricing

- Clear two- or three-column comparison with restrained surfaces.
- Make Free the easy entry point and Pro the upgrade choice.
- Use rectangular buttons and simple feature rows.
- Explain that payments are test-mode/demo-only; never imply the project accepts real commercial payments.
- Show limits in concrete terms: runs per day, demo access, and run-history window.
- Avoid giant gradient pricing cards, “most popular” pill stickers, or aggressive sales styling.

### About and consulting

- Use a personal, direct, engineering-led tone.
- Consulting packages should read like clear scopes of work: outcome, deliverables, timeframe, and boundaries.
- Use a plain, prominent booking/contact action.
- Do not fabricate testimonials, clients, logos, case-study results, or credentials.

## 7. Playground: premium live engineering workspace

The playground is the product’s signature interactive surface. It must feel as considered and modern as the dashboard—not like a basic demo form with a sidebar added afterward. Design it as a compact developer workbench: strong hierarchy, excellent information density, and a clear sense of live system behavior.

The playground should share the dashboard’s component language, typography, indigo accent, border treatment, and spacing system. It may use a dark graphite workspace to make the execution trace feel focused, but avoid a generic “hacker terminal” look.

### Visual direction

- Background: deep graphite (`#141613`), not pure black.
- Panels: two or three restrained surface levels (`#1B1E1A`, `#22251F`) separated by fine borders.
- Brand accent: cool indigo/cobalt (`#9AA8FF`) for selection, links, focus, and key active states.
- Semantic colors: green for success, amber for waiting/attention, red for failure or rejection. Never use these as decorative highlights.
- Typography: same sans-serif family as the dashboard; monospace only for event names, tool IDs, timestamps, JSON, and model details.
- Prefer crisp lines, clear alignment, subtle selected-row backgrounds, and small transitions over glow, blur, gradients, or floating glass cards.
- Use square-cornered geometry. Keep buttons and inputs rectangular with modest 4–6px radii; avoid pill-shaped selectors and oversized rounded containers.

### Workspace structure

On desktop, use a stable three-zone layout with a clear visual hierarchy:

1. **App rail / navigation** — compact left rail or narrow sidebar for Overview, Playground, Runs, Approvals, and Billing. Show the active destination with a slim indigo indicator and a restrained background, not a giant rounded pill.
2. **Demo workspace** — the main column for the selected demo, its purpose, user input, run controls, response, and meaningful outputs.
3. **Run inspector** — a contextual right-hand panel for execution state, tool activity, event timeline, and selected-event details. Allow it to collapse or become a lower drawer on narrower screens.

At the top of the workspace, use a clear page title and a short description. Align run controls and the quota indicator on the same horizontal rhythm. Do not waste the first screen on a giant heading or a row of decorative cards.

### Demo switcher

- Show demos as compact rows in a dedicated sidebar or selector area, with a distinct name, short description, and a small type marker such as `LIVE` or `REPLAY`.
- Make the selected demo obvious through typography, a left rule, and a subtle surface change—not an oversized pill.
- Group demos by intent when useful: Agents, Governance, Tools, Orchestration, Builder.
- Include a compact quota readout and indicate whether the selected demo runs live or uses a recorded sample.
- Never show fake live status, fabricated activity, or an animation that implies a request is executing when it is not.

### Main interaction area

The central area should be designed like a real tool, not a generic chatbot:

- Start with a compact demo header: demo name, one-sentence purpose, live/replay mode, and relevant model/provider information where appropriate.
- Place the input in a substantial but restrained workspace panel. Use a clearly labeled textarea or structured form, example prompts, and one primary rectangular action.
- Show the response as readable content with structured sections when useful—not inside a giant chat bubble.
- Keep secondary actions such as Clear, Load example, and View raw output quiet and aligned.
- If a demo produces a structured result, render that result as a first-class artifact: policy decision, tool result, delegated task summary, generated workflow, or input/output comparison.
- Include a useful idle state that teaches the visitor what to try, without fake metrics or generic illustrations.

### Run inspector and execution trace

The inspector is what makes the playground feel like an engineering product. Make it visually rich through useful information, not decoration.

- At the top, show a compact run-state strip: state, elapsed time, run ID, and live/replay indicator.
- Below it, show a vertical execution timeline with distinct event types: request received, model step, tool requested, policy evaluated, approval required, tool completed, response emitted.
- Each event row should have a timestamp, concise label, state icon, and expandable details.
- Selecting an event should reveal its payload in an inspector view. Provide readable key/value formatting by default and a raw JSON toggle for technical users.
- Clearly differentiate the selected event from hover state. Use thin connectors or a subtle timeline rule rather than an ornamental node graph.
- When the run is live, append events as they arrive and preserve scroll position unless the user is already following the latest event.
- Add compact filters only when useful (for example, All / Model / Tools / Policy). Avoid a dense toolbar full of tiny chips.
- Provide copy controls for IDs and payloads where helpful; show feedback when content is copied.

### Governed agent demo

This is the flagship demo and should receive the most design attention. The approval workflow should be immediately understandable even to a visitor who does not know agent frameworks.

Use a composed split view:
- **Conversation / task area:** the user request, agent reasoning summary where safe and available, and the final response.
- **Execution trace:** ordered tool and policy events, with the current state clearly marked.
- **Approval detail:** when an action pauses for approval, open a focused decision panel in the workspace or inspector.

Tool calls should appear as structured rows, not generic chat bubbles. Each row should show the tool name, a concise argument summary, risk classification, and state. Selecting a row opens its full arguments and policy result.

When approval is required:
- Make the paused state unmistakable with a narrow amber status rule and clear text such as `Waiting for approval`.
- Explain which action is requested and why the policy requires a decision.
- Show the proposed arguments in a readable, editable form.
- Present **Approve**, **Edit arguments**, and **Reject** as distinct actions. Approval must not be the visually dominant or preselected action when the risk is high.
- After the decision, append the decision and tool result to the audit timeline.
- Distinguish policy evaluation from human approval; they are separate events.

Run states must be explicit: Queued, Running, Waiting for approval, Completed, Failed, and Expired. Use text and icons as well as color.

### MCP explorer

Make the MCP explorer resemble a professional API workbench.

- Left pane: server list and tools, with server connection state and selected tool indicated clearly.
- Center pane: tool name, description, schema-driven input form, required fields, help text, and validation.
- Right pane or lower result area: request/response, execution state, and timing.
- Provide tabs or a segmented view for `Result`, `Request`, and `Schema`; keep raw JSON available without making it the default view.
- Use a subtle code surface for JSON, with readable indentation and syntax hierarchy. Do not place every section inside another card.
- Handle disconnected servers, invalid arguments, tool errors, and empty responses with explicit, useful states.

### Agent builder

The builder is the playground's authoring surface: a drag-and-drop canvas where visitors assemble a run from a curated node palette (model, agent, tool, supervisor, approval gate, output) and execute it. It must read as a precision engineering tool, not a toy graph. The "no animated constellation" rule applies to run traces; this canvas earns its graphics through function.

- Canvas: quiet dotted grid, thin connector edges with small directional arrowheads, rectangular nodes with 4–6px radii, monospace node ids. Selection uses the indigo left rule and a subtle surface change, never glow.
- Palette: a compact left panel of draggable node types, each with a one-line description. Node configuration opens in the right inspector as a labeled form, never a floating modal.
- Validation: invalid graphs (dangling inputs, missing model, cycles, over the node cap) show explicit inline errors on the offending nodes and a one-line summary; Run stays disabled until valid.
- During a run, the active node and edge take the current-state treatment (queued, running, waiting for approval, completed, failed) with text and icon, not color alone. The full run trace still lives in the inspector; the canvas only mirrors state.
- Saved graphs: a compact list showing name, node count, and last-modified. Saving requires an account; the UI states this plainly without nagging guests.
- Mobile: the canvas stays pannable and zoomable; node configuration moves to a bottom sheet; Run and approval actions remain reachable.
- States to design: empty canvas with template offer, preloaded template, editing, invalid graph, running, waiting for approval, completed, failed, saved, quota exhausted.

### Other demos

- **Multi-agent:** show delegation as a compact hierarchy or readable vertical trace. Make supervisor/worker relationships legible without an animated constellation of nodes.
- **Skills:** show input and output side by side, with a clear enabled/disabled comparison and concise explanation of what changed.
- **Automations:** show trigger → steps → approval gate → result as a structured sequence. Use motion only when a real step changes state.
- Keep the visual grammar consistent across demos, but give each demo a layout that suits its task rather than forcing every one into the same three-column arrangement.

### Interaction and motion

- Use restrained 120–180ms transitions for selection, panel expansion, and status changes.
- Animate the appearance of real streamed events subtly; do not animate idle interfaces.
- Avoid pulsing dots that continue indefinitely, glowing borders, animated gradient backgrounds, and decorative waveform effects.
- Provide visible focus states, keyboard-operable event rows, and accessible labels for icon controls.
- Keep the main action and approval decisions usable at laptop widths without horizontal scrolling.

### Responsive behavior

- Desktop: persistent navigation, main workspace, and collapsible inspector.
- Tablet: reduce the navigation width and make the inspector a tab or drawer.
- Mobile: stack the input/output area and move the trace into a dedicated `Activity` tab or drawer. Keep approval decisions visible without requiring side-to-side scrolling.
- Never simply shrink the desktop three-column layout until its text becomes unusable.

### Required states

Design all of these explicitly:
- Idle and ready.
- Starting or queued.
- Streaming response.
- Tool requested.
- Waiting for approval.
- Reconnecting.
- Completed.
- Failed with a useful message.
- Quota exhausted.
- Provider rate-limited.
- Recorded replay.
- Empty history.

When reconnecting, show that the stream is reconnecting and preserve the current run. When falling back to replay, label it clearly. Never fake live execution or hide provider failures behind a generic spinner.

## 8. Dashboard: light, information-dense, practical

The dashboard should prioritize scanning and task completion over visual spectacle.

### App shell

- Fixed or sticky left navigation on desktop, with Overview, Runs, Approvals, Billing, and Settings if implemented.
- Top bar with workspace name, current plan/quota, and account menu.
- On small screens, collapse navigation into an accessible drawer.
- Keep the same typography, border colors, and spacing as the public site, but allow more compact layouts.

### Overview

- Show plan and quota remaining near the top.
- Present key numbers in a compact row of metric blocks, not oversized floating cards.
- Use one clear usage chart for the last 14 days.
- Show pending approvals and recent runs in practical lists.
- Each widget must have intentional loading, empty, and error states.

### Runs table

- Use a real data table with aligned columns, subtle row dividers, readable status text, and restrained hover feedback.
- Filters for demo, status, and date should be compact and aligned with the table.
- Put filters in the URL as required by the spec.
- Use pagination and a clear empty state.
- Run status should remain understandable without color alone.

### Run detail

- Show run summary at the top: demo, status, start time, duration, and token usage.
- Main area: chronological event timeline.
- Secondary panel: tool calls, approval decisions, and run metadata.
- Raw event payloads can expand inline.
- Make replay a clear action, not a decorative icon.

### Approvals

- Prioritize pending approvals above historical decisions.
- Each item should make the requested tool, arguments, risk, policy, and available decisions easy to compare.
- Confirm consequential actions where appropriate.
- Show who decided and when in the history.

### Billing

- Plain plan summary, limits, current period, invoices, and consulting orders.
- Upgrade/cancel actions should be clear and honest about test-mode behavior.
- Avoid turning billing into a marketing page.

## 9. Authentication, forms, and feedback

- Keep login/register forms narrow, focused, and visually quiet.
- Use visible labels above fields, not placeholder-only labels.
- Provide clear validation and server-error messages near the relevant field or form.
- Password visibility controls should have accessible labels.
- Use consistent focus rings and keyboard navigation.
- Toasts should be brief and reserved for transient feedback. Persistent issues belong in the page.
- Confirm destructive or consequential actions; do not use a toast as the only confirmation.
- Every form needs loading, success, and failure states.

## 10. Motion and interaction

Motion should be subtle, quick, and functional.

- Use short transitions for hover, focus, selection, and expanding details.
- Stream new timeline events naturally without moving existing content unpredictably.
- Respect `prefers-reduced-motion`.
- Do not animate every card on scroll.
- Avoid springy buttons, floating blobs, cursor-following effects, parallax for its own sake, and animated gradient text.
- Never display fake typing, fake live counters, or fabricated activity in the console.

## 11. Responsive behavior

Desktop is the primary showcase context, but all workflows must work on mobile.

- Marketing layouts should reflow rather than shrink desktop compositions.
- The hero preview should move below the headline on narrow screens.
- Playground inspector panels should become tabs or stacked sections on mobile.
- Approval actions must remain visible and comfortably tappable.
- Tables should use a deliberate responsive strategy: selected columns, horizontal scrolling, or a compact row layout.
- Avoid horizontal overflow and tiny technical text.
- Navigation, forms, dialogs, and popovers must remain keyboard and touch accessible.

## 12. Accessibility and implementation

- Use semantic HTML and correct heading hierarchy.
- Meet WCAG AA contrast for text and interactive controls.
- Provide visible keyboard focus, labels, accessible names, and meaningful alt text.
- Do not communicate risk, run status, or approval state through color alone.
- Use shadcn/ui primitives where they help accessibility, but override the default styling to match this brief.
- Keep Server Components as the default. Client Components should be limited to genuinely interactive areas such as the playground, charts, filters, and approval controls.
- Avoid adding dependencies solely for visual effects.
- Use real data or clearly labeled seed data for UI previews. Do not hard-code fake “live” states that contradict runtime state.

## 13. Anti-patterns to avoid

Do not use:
- Pill-shaped buttons, tabs, badges, and containers everywhere.
- Purple/blue gradient hero backgrounds or glowing gradient orbs.
- Glassmorphism, frosted panels, excessive blur, or neon outlines.
- A page made entirely of identical rounded cards.
- Huge centered headlines with generic “Unlock the power of AI” copy.
- Random decorative icons, emoji, or abstract AI brain imagery.
- Excessive drop shadows and nested card-on-card layouts.
- Charts that exist only for decoration.
- Fake terminal output, fabricated live metrics, fake testimonials, or unsupported claims.
- Tiny gray text and low-contrast borders that compromise usability.
- Animation that suggests the agent is doing work when it is idle or replaying a recording.

## 14. Suggested design tokens

Start with a small system and extend only when a real need appears:

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px.
- Content max width: around 1200–1320px for marketing layouts.
- Reading width: around 640–720px for long-form text.
- Public page section spacing: 80–120px desktop, 48–72px mobile.
- Control height: around 40–44px for standard inputs and buttons.
- Borders: 1px, low-contrast neutral.
- Radius: 4–6px controls; 6–10px panels; square corners are acceptable.
- Use a consistent 8px-based rhythm where practical.

Treat these as starting points, not a reason to force every layout into identical dimensions.

## 15. Build order

Implement visual design in this order:

1. Establish tokens, typography, buttons, fields, navigation, tables, status labels, and layout primitives.
2. Build the public homepage with a realistic governed-agent console preview.
3. Build one polished governed-agent playground end-to-end, including idle, running, waiting-for-approval, success, failure, and replay states.
4. Apply the same console system to the MCP explorer, the agent builder canvas, and the remaining demos.
5. Build the dashboard shell, runs table, run detail, and approvals workflow.
6. Finish pricing, offering detail pages, auth, billing, and responsive refinements.
7. Perform accessibility and visual regression checks at desktop, tablet, and mobile widths.

Do not build every page as a separate visual experiment. Establish reusable rules, then make each page distinctive through its content and composition.

## 16. Definition of visual done

The design is ready when:

- The homepage looks like a credible engineering studio, not a generic AI template.
- The playground communicates real agent execution and human approval at a glance.
- The builder canvas reads as a precision authoring tool — thin edges, rectangular nodes, explicit validation — not a decorative node graph.
- Recorded replay and live execution are never visually confused.
- Dashboard tables and timelines remain readable with realistic data volume.
- Every run state, empty state, loading state, and error state has intentional styling.
- Mobile layouts are usable without horizontal overflow.
- Keyboard navigation and focus states are complete.
- There are no default pill-everything components, decorative gradients, fake metrics, or redundant nested cards.
- The public site, playground, and dashboard feel like one product with appropriately different information density.
