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
| `solar-installer-ai-operations-case-study.html` | Case study — AI operations agent for a growing solar and electrification installer (client unnamed) |
| `ai-automation-western-sydney.html` | Service-area page; title/h1 carry "AI automation Western Sydney"; Service + FAQPage schema. `ai-consulting-western-sydney.html` is a redirect stub to it |
| `ai-automation-blue-mountains.html` | Service-area page for the Blue Mountains (the business is based in Glenbrook). `ai-consulting-blue-mountains.html` is a redirect stub to it |
| `ai-readiness.html` | Redirect stub → `/`, preserves query params |
| `privacy.html` | Privacy policy (`noindex`) |
| `ai-assessment.html` | Paid-ads landing page (`noindex`), **generated** — never edit by hand; see "Landing pages" below |

Styles are not shared: every page carries its own inline `<style>` block and one or two
inline `<script>` blocks. Fonts come from Google Fonts (Inter); analytics is inline
`gtag` (`AW-18217007323`).

The one shared file is `assets/snapshot-modal.js` (see below).

## The AI Assessment modal

`assets/snapshot-modal.js` is the site's single shared script. It injects its own
styles and markup, then wires every `[data-snapshot-open]` button on the page. To put
a booking CTA anywhere:

```html
<button class="btn btn-primary" type="button" data-snapshot-open aria-haspopup="dialog">Book a Free Assessment</button>
<script src="assets/snapshot-modal.js" defer></script>
```

It is loaded on every page except `privacy.html` and the `ai-readiness.html` stub.

**After changing `assets/snapshot-modal.js`, re-stamp its version query.**
Cloudflare fronts this site and caches `assets/*` for four hours
(`cf-cache-status: HIT`, `max-age=14400`), while HTML is served fresh
(`DYNAMIC`). Without a new query string, an edited module keeps serving stale
to visitors for up to four hours after deploy:

```bash
H=$(shasum -a 256 assets/snapshot-modal.js | cut -c1-8)
sed -i '' -E "s|snapshot-modal\.js(\?v=[0-9a-f]+)?|snapshot-modal.js?v=$H|g" *.html
```

The same applies to any other file under `assets/` that pages depend on.

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

The site is **light-themed** (`color-scheme: light`). Six pages open their `<style>`
block with an identical `:root` token block (agent-accountability adds `--danger`).
There is no shared stylesheet, so **a token change must be applied to every copy**:

```css
--ink: #ffffff;  --navy: #f6f8fb;  --panel: #ffffff;  --panel-2: #fbfcfe;
--line: rgba(11,18,32,0.10);  --line-strong: rgba(15,158,124,0.42);
--text: #08101a;  --soft: #38455c;  --muted: #4b5871;  --muted-2: #5f6c85;
--small-print: #56637a;
--cyan: #00b7ff;  --teal: #23e6b4;  --violet: #bb46ff;  --blue: #326bff;  --amber: #f4c95d;
--teal-text: #0b7d62;  --teal-text-hover: #096851;  --teal-graphic: #12a179;
--radius: 8px;  --shadow: 0 18px 44px rgba(11,18,32,0.06);
```

Contrast rules that came out of the light-theme spec review, keep them:
- `#23e6b4` is **never** text on white (1.61:1). Text uses `--teal-text`; decorative
  dots/rules use `--teal-graphic` (3.28:1, the graphics floor).
- `privacy.html` has its own lighter styles and no token block.
- Brand palette source: `assets/digitalverse_colour_palette_onboard.json`.

## Identity, canonical host and phone

**The offer is the "AI Assessment"** (renamed from "AI Strategy Snapshot" on 2026-09-22 to match the
HubSpot form heading and the paid campaign). Visible copy, FAQ questions, schema, llms.txt and the
privacy notice all say AI Assessment; the word "Snapshot" must not appear in anything a visitor or
crawler reads. Code identifiers deliberately keep the old name (`assets/snapshot-modal.js`,
`data-snapshot-open`, `.snapshot-modal*`) so nothing has to be re-wired.

- **Canonical host is the bare domain** `https://digitalverse.com.au/`. `www.` 301s to
  it. Every self-reference (canonical, og:url, sitemap, llms.txt, JSON-LD) must use the
  bare host — Google was indexing a mix of both before this was fixed.
- **Phone**: machine-readable fields are E.164 `+61494436113` (`tel:`, schema
  `telephone`, `wa.me/61494436113`). Visible text is `+61 4 94436113`. No other number
  or format anywhere.
- **Schema** (homepage `ProfessionalService`) mirrors the Google Business Profile
  exactly: 12 Ross St, Glenbrook NSW 2773, geo, `hasMap`/`sameAs` → Maps CID
  `15754954551684232246` and LinkedIn `company/131434244`, founder-on-record Vicky De Greyte (`alternateName` Victoria; LinkedIn
  `in/victoria-de-greyte-5ab94710a`). **Simon De Greyte is deliberately not named anywhere on
  the site** — not in schema, llms.txt or copy (his decision, 2026-09-14). Do not add him. The street address lives **only** in JSON-LD, never in visible copy.
- `llms.txt` is the AI-assistant summary; keep its "Key facts for citation" in step with
  the homepage schema and FAQ. It is the source of truth agents are told to check
  claims against — do not add facts to pages that are not in it.
- **Positioning term is "AI automation"** (Simon's call, 2026-09-11, backed by Google Trends:
  the largest buyer-intent term in Australia). Customer-facing copy says "AI automation" and
  uses a "we build and run" voice. **Never say "AI consulting" in visible copy.** It survives
  only as a searcher phrasing: FAQ *questions* ("Are there AI consultants in…?", "How much does
  an AI consultant cost?") match Google's People-also-ask boxes verbatim and must stay; schema
  `serviceType`/`knowsAbout` and the llms.txt query list keep it as a secondary term.
- Articles carry a visible byline (`.article-byline`) and `Article.author` as the Vicky `Person`
  node above; `publisher` stays the organisation. New articles must do the same.
- The homepage carries a 7-question FAQ with matching `FAQPage` JSON-LD; the two area
  pages carry 5 each. Question/answer text in the schema must stay verbatim with the
  visible text.

## When adding or changing a page

- Add the URL to `sitemap.xml`.
- Update `llms.txt` if the page changes what the business says it does.
- Keep the `<nav>` block in sync across pages — it is copy-pasted, not shared.
- Set `<link rel="canonical">`, OG and Twitter meta; every existing page has the full set.
- Pages carry JSON-LD (`schema.org`) — match the surrounding page's pattern.

## Gotchas

**`BingSiteAuth.xml`** at the root is Bing Webmaster Tools' site-verification file. Keep
it exactly where and as it is (filename is case-sensitive); do not add it to the sitemap.

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


## Landing pages (paid campaigns)

`ai-assessment.html` (served as `/ai-assessment`) is generated, not hand-written:

- Copy and settings live in `landing/ai-assessment.json`; the page shell is `landing/_template.html`.
- Rebuild after any change: `node tools/build-landing.mjs landing/ai-assessment.json` (zero dependencies;
  output is deterministic, so re-running is safe). Unknown placeholders, missing keys, non-array
  `{{#each}}` lists and non-https URLs fail the build on purpose.
- New campaign = copy the JSON to `landing/<slug>.json`, change `slug` and the copy, rebuild. The template
  HTML-escapes every value; `{{key|json}}` is for the JSON-LD block only.
- Landing pages are `noindex, follow`, standalone (no site nav, logo not linked, the only links are the
  customer story, privacy, WhatsApp and email), mobile-first, and embed the existing HubSpot form twice
  (`landing/<slug>.json` → `form.form_id`). They are not in `sitemap.xml` or `llms.txt`.
- UTM tracking needs nothing in the markup: the HubSpot tracking script stores the full landing URL
  (including `utm_*`) on the contact. There is no Meta Pixel on the site.
- `.nojekyll` at the repo root stops GitHub Pages running Jekyll, so `{{ }}` in the template can never
  break a deploy.

## Machine readability (AI crawlers and agents)

AI crawlers and converters (Cloudflare Markdown for Agents, readability extractors) strip
`<header>`, `<footer>`, `<nav>` and often `<aside>` as boilerplate. So:

- Only chrome (nav labels, logo, footer links, tagline) may live in header/footer/nav. Real copy
  goes in `<section>`/`<article>` inside `<main>`; content side-panels use
  `<section class="aside-panel">`, never `<aside>`.
- Every page has `<meta name="title">` mirroring `<title>` (converters build frontmatter from
  meta title/description/og:image, not from `<title>`).
- Entity facts agents need (legal name, email, url) live in JSON-LD, which converters keep
  verbatim; the homepage node is `@id https://digitalverse.com.au/#organization` and other
  pages' provider/publisher nodes reference it.
- FAQ questions are `<h3>` inside `<summary>`; every content section has a real heading.
