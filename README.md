# Erin's junk journal

A Ghost 5+ theme for Erin Mikail Staples. A scrappy camp scrapbook: woven pink canvas, worn paper, torn cut-out type, translucent masking tape, thread binding, a tucked-in photo, embroidered merit patches, and stitched, numbered index tabs tucked into the page edge. Plus a cheeky plain-site alternative. No runtime framework, tracking, third-party font requests, or external image requests by default.

## Install in Ghost

1. Use Node.js 24 LTS, run `npm ci`, then `npm run zip`.
2. Upload `dist/erin-junk-journal.zip` in Ghost Admin → Settings → Design & branding → Change theme → Upload theme, then activate it.
3. Set the publication title, description, language, and icon in Ghost Admin.
4. In the theme's design settings, edit **Introduction**, **Contact email**, and optionally **Portrait**. The bundled portrait and contact address come from Erin's existing public site. Clear the email to hide its link.
5. Publish a page with the slug `about` to replace the journal's introductory About content. Publish one with the slug `contact` to replace the contact introduction. These pages also work at their own URLs. These pages should contain public content; don't embed restricted content into public pages.
6. Publish posts normally for **Words & ideas**. The existing public `how-to` tag and internal `#project` tag collect posts in **Things I make**, so Erin's existing tutorials appear without retagging. All entries remain in the paginated archive.
7. Ghost primary navigation appears as extra links on About. Secondary navigation appears on Contact, suitable for verified social/profile links. The five journal tabs are intentionally fixed; edit `partials/navigation.hbs` and matching section IDs to change them.

Writing shows the six latest posts; projects shows the six latest experiments. Writing's pagination leads to older entries in the archive; the archive's first page is the homepage's Writing section. No custom routes are required. Tag and author archives, individual posts/pages, pagination, member access through Ghost's native content helper, editor cards, and native comments are supported. Membership, email, and comments require a configured Ghost instance. Ghost page-builder settings control the title and feature image on standalone pages.

## Porting the existing site

The public [sitemap index](https://www.erinmikailstaples.com/sitemap.xml) and all four child sitemaps were reviewed on **2026-11-11**. The site already runs Ghost, so switching its theme does not require reimporting content or changing URLs.

| Existing URLs | Count | Theme support |
| --- | ---: | --- |
| Homepage | 1 | `home.hbs`, with the journal and plain mode |
| Standalone pages | 12 | `page.hbs`, with dedicated résumé templates and preserved Ghost editor content |
| Posts | 62 | `post.hbs`, with native content, tags, authors, access handling, and comments |
| Tag archives | 65 | `tag.hbs` and native pagination |
| Author archives | 1 | `author.hbs` at `/author/erin/` |

The existing page URLs are `/resume/`, `/about/`, `/tools/`, `/links/`, `/strangeloop-2023/`, `/newsletter/`, `/coming-from/`, `/now/`, `/codeland-2022/`, `/personal-updates/`, `/words/`, and `/humor/`. They remain standalone pages, not redirects to journal tabs. In particular, `/words/` is an existing curated page and `/tag/all-posts/` remains the full post archive. The current primary navigation (All Posts, Now, Events, Resume) is supplied by Ghost and appears on the journal's About page. The theme's own resume links use the current Ghost site URL, including on staging.

The previous résumé lived in a theme template rather than its Ghost editor body. If the `/resume/` page has an empty editor body, `page-resume.hbs` and the previously assigned `custom-resume.hbs` show the draft in `partials/resume-content.hbs`. If the page has editor content, that content takes precedence instead. Review the draft, including the unconfirmed Tiger Data start date, before activating this theme. To maintain the résumé in Ghost instead, add the complete content to that page in Ghost Admin; theme fallback content is not included in Ghost content exports.

The public `/about/`, `/tools/`, `/links/`, and `/newsletter/` pages currently have no rendered editor body. The new theme does not invent replacement content or a newsletter signup flow. Fill those pages in Ghost if desired; the journal's About tab already has a fallback bio when the About page is empty. Ghost Portal and membership settings remain managed in Ghost.

Before the first activation:

1. Export content and back up the active theme, navigation, custom settings, code injection, `routes.yaml`, and redirects from Ghost Admin. Keep the existing domain and permalink settings. This repository does not replace routes or redirects.
2. Upload to a staging Ghost site first if available. Check the resume's long content and embeds, both older and newer posts, all standalone pages above, tag/author pagination, member-only content, comments, and Portal/signup behavior. Re-select any old theme-specific custom page templates that do not exist in this theme. The public sitemap cannot reveal private pages, unpublished content, custom routing configuration, or Admin-only template assignments.
3. Configure this theme's introduction, contact email, portrait, and any Ghost font overrides. Theme-specific settings from the previous theme are not automatically equivalent.
4. Activate in Ghost Admin, then check both journal and plain mode at the live URLs. To roll back, activate the previous theme. Uploading a theme does not migrate or overwrite posts, pages, media, members, navigation, or routing configuration.

If moving to a *different* Ghost installation, content/media/settings migration is a separate step; a theme ZIP contains presentation, not a backup of the publication.

`scripts/fixtures/site-pages.json` records the audited page slugs and primary navigation for offline preview checks. The résumé preview uses the theme draft; other preview bodies are labeled placeholders, not copies of the live pages. These checks exercise the theme templates; they do not replace a real Ghost staging check.

## GitHub Actions deploys

`.github/workflows/ghost-theme.yml` runs unit/package checks, Chromium interaction and accessibility checks, Ghost **5 and 6** validation, packaging, and validation of the resulting ZIP on pull requests and pushes to `main`. Each successful run retains the installable ZIP as an artifact for 14 days. Pull requests never receive Ghost credentials, upload a theme, or activate one.

Checks use Node.js 24 LTS and GScan's API directly, so compatibility errors and archive-reading failures fail CI rather than being swallowed by the GScan CLI.

After checks pass on `main`, the workflow uploads the exact validated ZIP as the `erin-junk-journal` theme using [Ghost's official deployment action](https://github.com/TryGhost/action-deploy-theme), then activates it through the Admin API (`scripts/activate-ghost-theme.mjs`). A manual workflow run also works, but deploys are restricted to `main`. Actions are pinned to immutable commit hashes, the GitHub token is read-only, and uploads are serialized.

### One-time setup

1. Ensure the Ghost hosting plan supports custom themes. In the target site's Ghost Admin, create a custom integration under **Settings > Integrations**.
2. In this GitHub repository, create an environment named **`ghost-production`** under **Settings > Environments**. Optionally add required reviewers and restrict deployment branches to `main`.
3. Add these environment secrets (repository Actions secrets also work):

   | Secret | Value |
   | --- | --- |
   | `GHOST_ADMIN_API_URL` | The HTTPS API URL copied from the custom integration, including the correct Ghost admin host. Do not use `https://ghost.org` or guess the host from the public domain. |
   | `GHOST_ADMIN_API_KEY` | The **Admin API key**, not the Content API key, from that integration. |

4. Merge the PR. Alternatively, open **Actions > Theme checks and Ghost deploy > Run workflow** and select `main`.
5. After the workflow succeeds, check both journal and plain mode at the live URLs.

**Every push to `main` goes live.** Each upload replaces the same `erin-junk-journal` theme, which keeps its Ghost design settings, and the workflow activates it. If the theme is already active, Ghost reloads it with the new files. To roll back, revert the commit on `main` and let the workflow redeploy. For a faster emergency rollback, activate a different theme in Ghost Admin. The next push to `main` re-activates `erin-junk-journal`. Older per-commit uploads (`erin-junk-journal-<SHA>`) are no longer created and can be deleted in Ghost Admin.

Missing credentials fail the deploy job with an explicit setup error; validation and the downloadable theme artifact still run. Never put API keys in Git, workflow inputs, issues, or chat. No live deploy can be verified until the integration secrets are configured.

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
npm run check:zip # validate the packaged theme against Ghost 5 and 6
```

Run `npx playwright install chromium` once before the browser checks. They use their own preview server on port 2468 and save screenshots in `test-results/`. Automated checks supplement, rather than replace, manual assistive-technology testing.

## Interaction and accessibility

- The numbered fabric index tabs and scrapbook patches are real links. Labels are live text, not baked into images; decorative artwork is hidden from assistive technology and removed in plain mode. Keyboard, touch, browser Back/Forward, deep links, and opening in a new tab work. Navigation places focus on the new section heading.
- The lightbulb note appears on hover and can be opened by click, touch, or keyboard using native `details`/`summary`. Escape dismisses it; without JavaScript it remains clickable. Portraits have descriptive alternative text and decorative elements are hidden from assistive technology.
- The Postcrossing postcard links to Erin's public profile. Hover or keyboard focus opens a paper-style stats popup over the postcard; Escape dismisses it without moving focus. Stats stay visible below the postcard on touch devices and as ordinary text in plain mode. Counts and sent-card mileage are a manually maintained snapshot, not live. Update the values and date in `home.hbs` after checking [the public profile](https://www.postcrossing.com/user/erinmikail): the sent count's distance tooltip reported **99,165 miles** on 13 Nov 2026 (sent cards only, not combined with received-card distance).
- Portrait photos retain their original colors. Hover or keyboard focus draws an original mustache, tiara, and stars on a separate decorative SVG layer, reset on exit. Reduced motion shows static doodles. The bundled photo is unchanged; custom portraits use Ghost's large image size. Doodle coordinates are tailored to the bundled headshot and may need adjustment if the portrait changes.
- The sticker sheet lets visitors drag metallic stickers onto the journal, or pick one to place it in the middle. Placed stickers are buttons: drag them, or use arrow keys (Shift for bigger steps) to move, R/Shift+R to rotate, and Delete to peel off. Stickers are saved per page in browser storage, capped at 30, announced to screen readers, and hidden in plain mode and print.
- With JavaScript disabled, all five journal sections remain visible and navigation uses native anchors.
- Plain mode exposes all the same sections as one readable document, with a prominent name, a smaller mission statement, and body text limited to a reading width of roughly 65 characters. Navigation wraps on small screens and comes before the content in both visual and keyboard order. It persists across pages when browser storage is available and reports when it cannot save. Its small early external script avoids a journal flash for returning plain-mode readers.
- Self-hosted typefaces, visible focus indicators, a skip link, semantic headings, reduced-motion support, responsive layouts, and print styles are included. Desktop side tabs become top index tabs on smaller screens; journal scraps rearrange for tablets and phones without forcing horizontal scrolling.
- Ghost generates metadata via `ghost_head` and loads editor-card assets. Native third-party embeds and Portal may add their own assets on a live installation.

## Existing-site content

The starter introduction and bio are adapted from [Erin's homepage](https://www.erinmikailstaples.com/) and [résumé](https://www.erinmikailstaples.com/resume/), rather than guessed. The résumé, GitHub, and events links use the existing site's public destinations. No old employer from the dated Now page is presented as current. Replace the starter copy through Ghost as things change.

The bundled portrait is an optimized copy of [Erin's existing site portrait](https://storage.ghost.io/c/4b/2d/4b2d833d-2041-4b75-939b-93da42322ff4/content/images/2025/08/2025-07-erin-mikail-staples-headshot-1.PNG), used for this personal theme at Erin's request. The MIT license covers the theme code, not rights to that photograph. Replace the image and personal links before reusing this theme for another person.

The five bundled `assets/images/patch-*.png` illustrations are AI-generated textile artwork, created for this theme with Gemini 3 Pro Image and processed into transparent, locally served PNGs. They are original camp-inspired motifs, not official scouting insignia. Navigation remains usable if images are unavailable.

[Reenie Beanie](https://fonts.google.com/specimen/Reenie+Beanie) by James Grieshaber is bundled in `assets/fonts/` under the SIL Open Font License 1.1.
Space Grotesk (Florian Karsten), [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) (Mathieu Triay), Abril Fatface, Alfa Slab One, Bowlby One, Special Elite, and Rubik Mono One are also bundled under the SIL Open Font License 1.1. The ransom-note display faces are subset to the letters in Erin's name, so edit `home.hbs` and re-subset them if the name changes.
