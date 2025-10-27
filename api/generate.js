// api/generate.js
// Serverless PDF generator using chrome-aws-lambda + puppeteer-core
// Works on Vercel / serverless platforms and locally (with full puppeteer) for development.
//
// Usage (GET):
//  /api/generate?url=https://example.com
//  /api/generate?html=<urlencoded-html>
//
// Usage (POST):
//  POST /api/generate  { "html": "<!doctype html>...." }
// Returns: application/pdf (inline)

const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core'); // puppeteer-core + chrome-aws-lambda

// helper: simple timeout-safe HTML wrapper for plain snippets
function wrapHtml(bodyHtml = '') {
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>PDF Export</title>
    <style>
      /* Default print styles — tweak if needed */
      body{font-family: "Inter", "Helvetica Neue", Arial, sans-serif; color:#122031; margin:0; padding:28px; background:#fff}
      .page { width: 8.5in; max-width: 100%; margin: 0 auto; }
      @page { size: Letter; margin: 0.5in; } /* Letter size */
    </style>
  </head>
  <body>
    <div class="page">${bodyHtml}</div>
  </body>
  </html>`;
}

module.exports = async (req, res) => {
  try {
    // Accept HTML via: POST JSON { html } OR GET param ?html=... OR ?url=...
    const method = req.method || 'GET';
    let html = null;
    let targetUrl = null;

    if (method === 'POST') {
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        const body = req.body || {};
        html = body.html || null;
        targetUrl = body.url || null;
      } else {
        // fallback: raw body might contain html
        html = req.body || null;
      }
    } else {
      // GET
      if (req.query && req.query.url) targetUrl = req.query.url;
      if (req.query && req.query.html) html = req.query.html;
    }

    // If user passed raw HTML but not a full document, wrap it
    if (html && !html.trim().startsWith('<!doctype') && !html.trim().startsWith('<html')) {
      html = wrapHtml(html);
    }

    // Launch chrome-aws-lambda (works on serverless). If running locally (dev), fallback to installed chrome.
    let browser = null;
    let page = null;

    const launchOptions = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath || process.env.CHROME_PATH,
      headless: chromium.headless,
    };

    // If executablePath is falsy (local dev), try to use a bundled chromium (puppeteer-core won't provide it).
    // On local machine you might need puppeteer (not puppeteer-core) or set CHROME_PATH env var.
    if (!launchOptions.executablePath) {
      // Try to use a local Chrome/Chromium path from env or fallback to puppeteer bundled
      // NOTE: If running locally you can set CHROME_PATH to your chrome executable (eg /usr/bin/chromium-browser)
      console.warn('No chrome executable path provided by chrome-aws-lambda — relying on system puppeteer. If this fails, set CHROME_PATH env or install full puppeteer for dev.');
    }

    // Launch the browser
    browser = await puppeteer.launch(launchOptions);

    page = await browser.newPage();

    // If targetUrl provided load URL, else set HTML
    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    } else {
      // No input — return error
      await browser.close();
      res.status(400).send('Missing: provide ?url=... or ?html=... or POST { "html": "..." }');
      return;
    }

    // Optional: set media type to print so CSS @media print applies
    await page.emulateMediaType('print');

    // Generate PDF
    const pdf = await page.pdf({
      format: 'letter',           // US Letter
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });

    // Close browser
    await browser.close();

    // Send response
    res.setHeader('Content-Type', 'application/pdf');
    // Suggest download name (optional)
    res.setHeader('Content-Disposition', 'inline; filename="export.pdf"');
    res.status(200).send(Buffer.from(pdf));
  } catch (err) {
    console.error('PDF generation error:', err);
    try { if (res && !res.headersSent) res.status(500).send('PDF generation error: ' + String(err.message || err)); }
    catch(e){ /* ignore */ }
  }
};
