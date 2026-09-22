# Celbrea Care

Interactive demonstration of the Celbrea Care pathway: thermal screening with the Celbrea pad, risk scoring, referral and counter-referral, inventory control, georeferenced operations, and follow-up for breast health programs.

Built for institutional presentations (public health networks and private operators) and for external investor walkthroughs.

## Product overview

Celbrea Care wraps the Welwaze Medical Celbrea thermal screening device in an operational software layer:

- Point-of-care capture (QR lot control and A/B thermal reading)
- Dynamic risk score and eligibility rules
- Electronic referral and BI-RADS counter-referral
- Navigator queue and patient timeline
- Cohorts, messaging, and recurrence cycles
- Celbrea-exclusive dashboard: inventory, georeferencing, positives vs negatives

Demo geography uses Sao Paulo primary care units and neighborhoods as a sample network.

## Languages

The interface ships with three languages, selectable by flag control (persisted in the browser):

| Code | Language |
|------|----------|
| PT | Portuguese (Brazil) |
| EN | English |
| ES | Spanish |

Use the language switcher on the login screen or in the application top bar.

## Repository layout

```
mockup/
  index.html          Login
  app.html            Operational shell and views
  css/celbrea-care.css
  js/i18n.js          PT / EN / ES dictionary
  js/app.js           Navigation and interactions
  assets/brand/       Celbrea, Welwaze, and device imagery
README.md
```

## Run locally

No build step is required. From the repository root:

```bash
cd mockup
python3 -m http.server 8765
```

Open:

- http://localhost:8765/index.html
- http://localhost:8765/app.html#celbrea

## Deploy on Vercel

This artifact is a static site under `mockup/`.

### Option A — GitHub import (recommended)

1. Import https://github.com/jgustavobarbosa/celbreatech in the Vercel dashboard
2. Set **Root Directory** to `mockup`
3. Framework Preset: Other
4. Build Command: leave empty
5. Output Directory: leave empty (or `.`)
6. Deploy

### Option B — CLI

```bash
cd mockup
npx vercel
```

Production:

```bash
cd mockup
npx vercel --prod
```

### About `npx plugins add vercel/vercel-plugin`

That command installs the **Vercel plugin for coding agents** (Cursor / Claude Code). It adds skills and slash commands such as deploy helpers. It does **not** publish the site by itself; use Option A or B above to go live.

In Cursor you can also install via `/add-plugin vercel`.

## Suggested demo path

1. Sign in (or open the Celbrea Dashboard directly)
2. Review KPIs, Sao Paulo georeferencing, and pad inventory by unit
3. Compare positives and negatives (demographics, comorbidities, neighborhoods)
4. Run New screening: patient, anamnesis, QR, digital twin A/B
5. Score, referral order, patient timeline
6. Navigator queue: simulate BI-RADS 4
7. Switch PT / EN / ES for the investor narrative

## Brand and UI

- Product mark: celbrea (magenta to coral)
- Manufacturer: Welwaze Medical
- Device reference: Celbrea pad regions A (pink) and B (blue)
- Typography: SF Pro / system UI stack (Apple-like presentation)
- Icons: Lucide

## Notes

- Data on screen is synthetic and for demonstration only.
- No backend, authentication, or live FHIR/SISREG connection in this artifact.
- Suitable for pitch and product discovery; not a clinical production deployment.

## License and contact

Proprietary demonstration asset for Celbrea / Welwaze partnership conversations.

Repository: https://github.com/jgustavobarbosa/celbreatech
