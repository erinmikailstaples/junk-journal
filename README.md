# Erin's junk journal

A Ghost 5+ theme for Erin Mikail Staples. A scrappy camp scrapbook: woven pink canvas, worn paper, torn cut-out type, translucent masking tape, thread binding, a tucked-in photo, embroidered merit patches, and stitched, numbered index tabs tucked into the page edge. Plus a cheeky plain-site alternative. No runtime framework, tracking, third-party fonts, or external image requests by default.

## Install in Ghost

1. Run `npm ci`, then `npm run zip`.
2. Upload `dist/erin-junk-journal.zip` in Ghost Admin → Settings → Design & branding → Change theme → Upload theme, then activate it.
3. Set the publication title, description, language, and icon in Ghost Admin.
4. In the theme's design settings, edit **Introduction**, **Contact email**, and optionally **Portrait**. The bundled portrait and contact address come from Erin's existing public site. Clear the email to hide its link.
5. Publish a page with the slug `about` to replace the journal's introductory About content. Publish one with the slug `contact` to replace the contact introduction. These pages also work at their own URLs. These pages should contain public content; don't embed restricted content into public pages.
6. Publish posts normally for **Words & ideas**. The existing public `how-to` tag and internal `#project` tag collect posts in **Things I make**, so Erin's existing tutorials appear without retagging. All entries remain in the paginated archive.
7. Ghost primary navigation appears as extra links on About. Secondary navigation appears on Contact, suitable for verified social/profile links. The five journal tabs are intentionally fixed; edit `partials/navigation.hbs` and matching section IDs to change them.

Writing shows the six latest posts; projects shows the six latest experiments. Writing's pagination leads to older entries in the archive; the archive's first page is the homepage's Writing section. No custom routes are required. Tag and author archives, individual posts/pages, pagination, member access through Ghost's native content helper, editor cards, and native comments are supported. Membership, email, and comments require a configured Ghost instance. Ghost page-builder settings control the title and feature image on standalone pages.

## Preview and develop

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:2368`. This renders the actual theme templates, not a Ghost installation. Preview entries use real titles from Erin's site with explicitly labeled placeholder article bodies and links to the originals; it does not copy or publish those articles or emulate Ghost membership. `PORT=3000 npm run dev` changes the port. Restart the preview process after editing partials or settings; templates and static assets are read per request. For final publishing verification, use a real Ghost instance.

```sh
npm test       # navigation, history, focus, plain mode, storage failure
npm run test:browser # Chromium responsive, keyboard, no-JS, axe accessibility checks
npm run check  # Ghost theme validation with GScan
npm run zip    # uploadable theme, without development dependencies
```

Run `npx playwright install chromium` once before the browser checks. They use their own preview server on port 2468 and save screenshots in `test-results/`. Automated checks supplement, rather than replace, manual assistive-technology testing.

## Interaction and accessibility

- The numbered fabric index tabs and scrapbook patches are real links. Labels are live text, not baked into images; decorative artwork is hidden from assistive technology and removed in plain mode. Keyboard, touch, browser Back/Forward, deep links, and opening in a new tab work. Navigation places focus on the new section heading.
- The envelope opens with native `details`/`summary`; no essential information is hover-only. Portraits have descriptive alternative text and decorative elements are hidden from assistive technology.
- With JavaScript disabled, all five journal sections remain visible and navigation uses native anchors.
- Plain mode exposes all the same sections as one readable document. It persists across pages when browser storage is available and reports when it cannot save. Its small early external script avoids a journal flash for returning plain-mode readers.
- System fonts, visible focus indicators, a skip link, semantic headings, reduced-motion support, responsive layouts, and print styles are included. Desktop side tabs become top index tabs on small screens so they don't force horizontal scrolling.
- Ghost generates metadata via `ghost_head` and loads editor-card assets. Native third-party embeds and Portal may add their own assets on a live installation.

## Existing-site content

The starter introduction and bio are adapted from [Erin's homepage](https://www.erinmikailstaples.com/) and [résumé](https://www.erinmikailstaples.com/resume/), rather than guessed. The résumé, GitHub, and events links use the existing site's public destinations. No old employer from the dated Now page is presented as current. Replace the starter copy through Ghost as things change.

The bundled portrait is an optimized copy of [Erin's existing site portrait](https://storage.ghost.io/c/4b/2d/4b2d833d-2041-4b75-939b-93da42322ff4/content/images/2025/08/2025-07-erin-mikail-staples-headshot-1.PNG), used for this personal theme at Erin's request. The MIT license covers the theme code, not rights to that photograph. Replace the image and personal links before reusing this theme for another person.

The five bundled `assets/images/patch-*.png` illustrations are AI-generated textile artwork, created for this theme with Gemini 3 Pro Image and processed into transparent, locally served PNGs. They are original camp-inspired motifs, not official scouting insignia. Navigation remains usable if images are unavailable.
