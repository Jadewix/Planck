# Case-study template

All case studies open as large cards on the portfolio page. They share one HTML template (`#case-study-template` in `index.html`), one renderer (`src/scripts/project-cards.js`), and one content file (`src/content/case-studies.js`). Changing the template updates all studies. Do not copy and maintain a separate layout for each project.

## Research and editorial decisions

Reviewed on 20 October 2026:

- [Clay — Slack](https://clay.global/work/slack): starts with the engagement and scope, then explains the audience challenge and concrete design decisions through sections and visuals. We use an explicit brief and scope instead of a long generic agency introduction.
- [Instrument — Oura](https://www.instrument.com/work/oura-smart-ring): separates the challenge, approach, impact, and agency roles. It ties its metrics to a stated period. We separate outcome from deliverables, label client-reported results, and keep missing metric periods in this content checklist rather than inventing them.
- [Metalab — Slack](https://archive.metalab.com/projects/slack): presents expertise, platforms, deliverables, the starting point, and design explorations. We put Planck's role near the title and include optional gallery figures for approved process or interface images.
- [Metalab — Ro](https://www.metalab.com/work/ro): uses concise project-type and deliverables metadata. We keep the overview short and reserve the main card for the work.

These are structural references, not sources for Planck's project claims or images. No agency wording, images, testimonials, or results have been copied. Planck's existing graphite/violet palette and typography are used throughout.

## Shared structure

1. Project title, short headline, category.
2. Role, deliverable, delivery dates when confirmed, and live website when available.
3. A large project screenshot with a factual caption and alt text.
4. **The brief**: the business need before the engagement.
5. **What we delivered**: Planck's contribution, followed by a short scope list.
6. Optional gallery: screenshots, before/after comparisons, or approved design artifacts with captions.
7. **The outcome**: delivery or business result, with optional metrics and clear attribution.
8. Contact link and return to projects.

No fake timeline, technology stack, research phase, design process, testimonial, business result, or gallery is added to fill space. AITS is explicitly design-only. Current figures come from the project owner in this chat; they have not been independently verified.

## Add a project

Add an object to the exported `caseStudies` array. Follow an existing entry, using a unique URL-safe `id`. Required fields: `id`, `name`, `headline`, `category`, `role`, `deliverable`, `image`, `brief`, `delivery`, `scope`, `outcome`, `metrics`, and `gallery`. `website` may be omitted when there is no public site. `timeline` is optional; do not invent dates or a year.

Each `image` or gallery entry has `{ src, width, height, alt, caption }`. Place local images in `public/images/`, use their actual pixel dimensions, and write captions explaining what the image demonstrates. `metrics` entries have `{ value, label, note }`; use `[]` when no measured outcome is available. `gallery: []` hides the gallery completely.

In the matching `.case-copy`, add:

```html
<button class="case-study-trigger" type="button"
  data-case-study="project-id" aria-haspopup="dialog"
  aria-controls="case-study-project-id" hidden>View case study</button>
```

The renderer creates the dialog and enables the button. Buttons remain hidden without JavaScript; the portfolio copy and website links remain available. For a project without a website, point its green expand control at `#case-study-project-id` and remove `target="_blank"`. It will open the same card. Keep links to real client websites as normal external links. Do not create separate routes or fabricate a live-site destination.

Content is inserted with `textContent`, not interpreted as HTML. Markup changes belong in the shared template. Native dialogs supply modal focus containment and Escape dismissal; the handler restores focus, resets the internal scroll, and restores background scrolling when closed. The top close button stays outside the scrolling article.

## Content and asset checklist

The initial cards use only confirmed facts and the provided homepage captures. These additions would make the stories more substantial:

| Project | Most useful missing material |
| --- | --- |
| Fusion | Confirm the comparison baseline for June (+10%) and July (+30%) and any separate order/revenue breakdown; confirm the delivery year for May 1–30; approved store, product variation, inventory and order-management screens. |
| Vigorfit | Approved booking, coach availability/classes, client-admin, and WhatsApp reminder visuals (current cover is the homepage); delivery year for September 1–25; date and definition of the 50-user/3-coach figures. |
| AITS | Before/after screens or approved Figma exports showing the full-site visual redesign; project dates; specific navigation/UX changes if relevant; client feedback or measured outcomes. Development remains outside Planck's role. |
| All | Project dates or duration, approved process details, platform/stack where relevant, and client-approved testimonials with attribution if available. |

Before providing screenshots, remove personal client details, booking data, financial details, and other private information. Provide exported visuals or files; private account credentials are not needed. A testimonial should be supplied or approved by the client; do not manufacture one.

Once supplied, add confirmed details to the narrative or optional gallery. Extend the shared template if adding a new field for every study; avoid bespoke layouts.

Delivery windows and feature scope were confirmed by the owner after the initial draft. The owner clarified that Fusion’s sales figures concern online orders and revenue, with +10% in June and +30% in July. The cards label these “online sales” rather than assigning separate growth rates to order count and revenue. The comparison baseline was not specified, so no month-on-month comparison is inferred.
