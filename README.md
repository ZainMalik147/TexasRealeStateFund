# Texas Real Estate Fund — Website

This is a single-page static site in a "Modern Institutional Luxury" style. The background is a 3D architectural scene built with Three.js r160 and driven by scrolling. There is no build step and nothing to install: any static host can serve it as-is (Netlify, Vercel, Cloudflare Pages, GitHub Pages, or regular hosting with HTTPS).

## Structure
```
index.html            Page content, SEO meta, JSON-LD, GA4 loader
assets/css/styles.css Design system (navy #0B2341 / gold #C4A05A / ivory)
assets/js/main.js     UI: loader, nav, reveals, email tracking, contact form → mailto
assets/js/scene.js    Fixed 3D city + twisted landmark tower + gold star crown
assets/js/emblem.js   Interactive 3D logo (Philosophy section)
assets/js/logo3d.js   3D geometry traced from the logo
assets/img/           logo-stacked(-light).svg, logo-horizontal(-light).svg, logo-mark(-light).svg,
                      favicon.svg, icons, og-image.jpg, logo-original.jpg
robots.txt  sitemap.xml  llms.txt  site.webmanifest
```

## Before launch: replace the placeholders
| Placeholder | Where |
|---|---|
| `https://www.texasrealestatefund.com` (domain) | index.html (canonical, OG, JSON-LD), robots.txt, sitemap.xml, llms.txt |
| `Or@texasrealestatefund.com` (email) | index.html (3×, plus JSON-LD), assets/js/main.js `EMAIL`, llms.txt |
| `G-XXXXXXXXXX` (GA4 Measurement ID) | index.html `window.TREF_GA_ID` |
| Search Console / Bing verification codes | index.html (commented meta tags) |

## Analytics and search setup (all free; create everything under the client's own accounts)
1. **Google Analytics 4:** create a property, then a Web data stream, and paste the ID into `TREF_GA_ID`. Email clicks are sent as the event `contact_email_click` and form use as `contact_form_compose`. Mark `contact_email_click` as a Key event in GA4.
2. **Google Search Console:** add a Domain property (verify via DNS), or a URL-prefix property using the meta tag. Then submit `/sitemap.xml`.
3. **Bing Webmaster Tools:** use "Import from Google Search Console", or the `msvalidate.01` meta tag. Then submit the sitemap. AI Performance (Copilot) reporting shows up in Bing Webmaster Tools once the site is verified.
4. **AI search:** `robots.txt` allows the major AI crawlers. `llms.txt` and the JSON-LD give them a short, factual summary of the firm.

## Notes
- The 3D scene is decorative and uses no photography, so there are no image-rights issues and nothing in it suggests the firm owns a particular building. To use licensed photography instead, set it as the `.scene` background in CSS and remove the `scene.js` import in `main.js`.
- Visitors with *reduced motion* turned on get a still camera. Devices without WebGL fall back to the static logo.
- The footer disclaimer is generic placeholder text. Have counsel review it, along with any privacy notice, before going live.
- Local preview: `python -m http.server 5173`, then open http://localhost:5173
