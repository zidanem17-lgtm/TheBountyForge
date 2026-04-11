# TheBountyForge

> **Where Rookie Hackers Become Pros** — a mobile-first PWA for learning bug bounty reconnaissance.

TheBountyForge is an educational security scanner designed for beginner bug bounty hunters. It runs entirely in the browser with no backend required, making it ideal for tablets, iPads, and desktops.

---

## Features

- **Subdomain Discovery** — checks 28 common subdomain prefixes
- **Port Scanning** — tests 14 well-known ports with service identification and risk warnings
- **Directory Enumeration** — probes 26 commonly misconfigured or sensitive paths
- **Vulnerability Checks** — simulates 8 common web security tests (SQLi, XSS, CSRF, headers, etc.)
- **Scan Reports** — download a plain-text `.txt` report of all findings
- **PWA** — installable on iOS/Android home screen, works offline via Service Worker
- **Mobile-optimised UI** — touch-friendly, safe-area aware, responsive down to small phones

> **Note:** All scanning in v1.0 is simulated with randomised demo data. No actual network requests are made to the target. This is intentional — the tool is for learning and demonstration only.

---

## Getting Started

### Serve locally

Any static file server works:

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then open `http://localhost:8080/thebountyforge-mobile.html` in your browser.

### Deploy

Upload all files to any static host (GitHub Pages, Netlify, Vercel, etc.). No build step required.

---

## File Structure

```
TheBountyForge/
├── thebountyforge-mobile.html   # Main SPA — markup + styles
├── thebountyforge-app.js        # App logic (TheBountyForge class)
├── sw.js                        # Service Worker for offline caching
├── manifest.json                # PWA manifest
├── icon-192.png                 # App icon (192×192) — add your own
├── icon-512.png                 # App icon (512×512) — add your own
└── screenshot1.png              # PWA store screenshot — add your own
```

---

## Legal Disclaimer

Only scan websites and systems you **own** or have **explicit written permission** to test. Unauthorised security testing is illegal in most jurisdictions. This tool is provided for educational purposes only.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT
