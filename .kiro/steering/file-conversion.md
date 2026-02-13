# File Conversion Standards

BunTool is a legal tool. Any file conversion must produce output that is a faithful, print-quality representation of the original — equivalent to "printing to PDF". No content may be lost, altered, reordered, or degraded in a way that changes meaning.

## Core principle

Converted output must be legally defensible as an accurate reproduction of the source file. If a conversion method cannot guarantee this, the tool must either warn the user clearly or refuse the conversion.

## Image conversion

- Images are placed onto an A4 page at full quality, scaled to fill the usable area while preserving aspect ratio. This is lossless — the image content is unchanged.
- Images are centred on the page with 1.5cm margins.
- If an image is very small (under 400px in both dimensions), log a warning — it may be hard to read at A4 size, but the content is still accurate.

## Document conversion (DOCX, etc.)

- Pure-Python DOCX-to-PDF conversion (e.g. re-rendering via reportlab) is NOT faithful. It loses tables, images, precise formatting, headers/footers, and layout. This is not acceptable for legal use.
- DOCX conversion must carry a clear warning in the UI that the output is a best-effort text extraction and the user should verify accuracy or convert externally for guaranteed fidelity.
- If LibreOffice or another high-fidelity converter becomes available on the server, prefer that over the text-extraction approach.

## General rules

- All converted pages must be A4 portrait.
- The conversion module is `convert.py`. Keep all conversion logic there.
- The `/convert` endpoint in `app.py` handles single-file conversion requests from the frontend.
- Never silently degrade quality. If there is any risk of content loss, warn the user.
