const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "5mb" }));

// Basic endpoint to generate PDF from HTML (GET or POST)
app.all("/generate", async (req, res) => {
  try {
    // Accept HTML via query or POST body
    const html = (req.method === "GET" ? req.query.html : req.body.html) || `
      <html><body style="font-family: Arial, sans-serif; padding: 20px">
      <h1>PDF Generator Test</h1>
      <p>Replace this HTML by sending 'html' as POST body (JSON) or ?html= in GET.</p>
      </body></html>`;

    // Launch browser (puppeteer will download a Chromium binary as part of npm install)
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" }
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=output.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).send("PDF generation failed: " + err.message);
  }
});

// health
app.get("/", (req, res) => res.send("OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
