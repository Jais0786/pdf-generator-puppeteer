import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  try {
    // Create browser instance
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Use test HTML or provided query HTML
    const html = req.query.html || `
      <html>
        <body style="font-family:Arial;padding:2rem">
          <h1 style="color:#2E3A59;">PDF Generator Test</h1>
          <p>This page confirms that Puppeteer + Vercel serverless works correctly.</p>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();

    // Send the PDF file
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=test.pdf");
    res.end(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
