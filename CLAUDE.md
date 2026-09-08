# Digitalverse website

Marketing site for **digitalverse.com.au**. Plain static HTML — no framework, no build
step, no package.json. What is in the repo is what ships.

## Deployment — read this first

GitHub Pages serves `main` directly, with `CNAME` pointing at `digitalverse.com.au`.
**Every push to `main` is live immediately.** There is no staging environment and no CI
check. Preview locally before pushing.

Repo: https://github.com/Digitalverse-AI/digitalverse-website

## Local preview

```bash
node tools/dev-server.mjs
```

Serves the repo at http://localhost:4321 with live reload — save any file and the
browser refreshes itself. Zero dependencies; it only uses the Node standard library.
It mirrors GitHub Pages' extensionless URLs (`/privacy` resolves to `privacy.html`),
so links behave the same locally as in production.

## Page structure

Each page is a standalone, self-contained document:

| | |
|---|---|
| `index.html` | Home — the long scrolling page most nav links anchor into |
| `ai-readiness.html` | AI readiness offer |
| `agent-accountability.html` | Accountability / governance |
| `constraint-first-ai-agents.html` | Insight article |
| `customer-reengagement-case-study.html` | Case study |
| `privacy.html` | Privacy policy |

Styles are not shared: every page carries its own inline `<style>` block and one or two
inline `<script>` blocks. Fonts come from Google Fonts (Inter); analytics is inline
`gtag` (`AW-18217007323`).

The one shared file is `assets/snapshot-modal.js` (see below).

## The AI Strategy Snapshot modal

`assets/snapshot-modal.js` is the site's single shared script. It injects its own
styles and markup, then wires every `[data-snapshot-open]` button on the page. To put
a booking CTA anywhere:

```html
<button class="btn btn-primary" type="button" data-snapshot-open aria-haspopup="dialog">Book a Free Snapshot</button>
<script src="assets/snapshot-modal.js" defer></script>
```

It is loaded on `index.html`, `agent-accountability.html`,
`constraint-first-ai-agents.html` and `customer-reengagement-case-study.html`.

Two things to know before changing it:

- **The HubSpot form renders in a cross-origin iframe.** Its fields, fonts and colours
  cannot be styled from this repo at all — that is done in the HubSpot form editor. The
  modal shell is deliberately neutral (no background of its own) so it suits whatever
  the form looks like.
- **The embed script is fetched on first open**, not on page load, so pages nobody
  converts on pay nothing for it.

Portal `443641127`, form `b4cb8e1e-515b-4c33-85af-15178f877296`, region `ap1`.

## Analytics and conversion tracking

Two tags on every page except the `ai-readiness.html` redirect stub:

- **Google tag** `AW-18217007323` — Google Ads. There is no GA4 property
  installed, so there is no on-site behaviour or funnel reporting.
- **HubSpot** `js.hs-scripts.com/443641127.js` — captures the Google Ads
  `gclid` on landing and sets HubSpot's analytics cookies.

**Conversions are reported server-side by HubSpot**, not from the browser.
HubSpot matches a form submission to the stored `gclid` and reports it to the
Google Ads conversion action `Submit lead form`
(`AW-18217007323/o_byCJ_B8fAcENvxxe5D`).

Do not add a browser-side `gtag('event', 'conversion', …)` for this form. It
would double-count against HubSpot's sync, and it cannot work anyway: the
embed renders in a cross-origin iframe that posts nothing to the parent window
(verified — both the current embed and the older v2 embed behave this way), so
there is no submit event to hang a conversion off.

The `tel:` contact button is still untracked; it would need its own conversion
action and label.

## Retired: the readiness simulator

`simulator.digitalverse.com.au` was the site-wide CTA and is no longer linked from
anywhere. `ai-readiness.html` was its landing page and is now a redirect stub that
forwards to `/` while preserving query parameters, so old `utm_medium=paid` ad clicks
keep their attribution. The original page is in git history
(`git show <commit>:ai-readiness.html`). The simulator subdomain itself is a separate
service and is not part of this repo.

## Design tokens — duplicated, so edit every copy

Five pages open their `<style>` block with an identical `:root` block. Because there is
no shared stylesheet, **a token change must be applied to all five**, or pages drift:

```css
--ink: #05070d;    --navy: #080d16;   --panel: #0d151f;  --panel-2: #121b26;
--text: #f5f7fa;   --muted: #a7b4c6;  --soft: #dbe4ef;
--cyan: #00b7ff;   --teal: #23e6b4;   --violet: #bb46ff; --blue: #326bff;
--amber: #f4c95d;  --radius: 8px;
```

`privacy.html` is the exception — it has its own lighter styles and no token block.

The site is dark-only (`color-scheme: dark`). Token names map onto the brand palette in
`assets/digitalverse_colour_palette_onboard.json`; brand rationale and the
**Onboard. Scale Up. Transform.** tagline are in
`assets/digitalverse_brand_asset_notes_onboard.md`.

## When adding or changing a page

- Add the URL to `sitemap.xml`.
- Update `llms.txt` if the page changes what the business says it does.
- Keep the `<nav>` block in sync across pages — it is copy-pasted, not shared.
- Set `<link rel="canonical">`, OG and Twitter meta; every existing page has the full set.
- Pages carry JSON-LD (`schema.org`) — match the surrounding page's pattern.

## Gotchas

**macOS `Icon\r` files.** Something (a sync client or Finder custom icons) scatters
zero-byte `Icon\r` files through this tree. They previously landed inside `.git/refs/`
and corrupted every `git fetch` with `fatal: bad object refs/Icon?`. They are now
gitignored. If fetch breaks that way again:

```bash
find .git -name 'Icon*' -size 0 -delete
```

Two such files are still tracked from before the ignore rule (`Icon\r`,
`assets/Icon\r`); `git rm --cached` them when convenient.

**Oversized media.** `assets/Digitalverse Mixed Reel.mp4` is 112MB — above GitHub's
100MB hard limit, so committing it would get the push rejected. It is gitignored. Host
large video externally and embed it rather than committing it.
