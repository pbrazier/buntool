# File Conversion Standards

BunTool is a legal tool. Any file conversion must produce output that is a faithful, print-quality representation of the original — equivalent to "printing to PDF". No content may be lost, altered, reordered, or degraded in a way that changes meaning.

## Core principle

Converted output must be legally defensible as an accurate reproduction of the source file. If a conversion method cannot guarantee this, the feature must be disabled entirely — not offered with a degraded fallback.

## Image conversion

- Images are placed onto an A4 page at full quality, scaled to fill the usable area while preserving aspect ratio. This is lossless — the image content is unchanged.
- Images are centred on the page with 1.5cm margins.
- If an image is very small (under 400px in both dimensions), log a warning — it may be hard to read at A4 size, but the content is still accurate.

## Document conversion (DOCX, etc.)

- DOCX conversion requires LibreOffice (headless mode). There is no fallback.
- If LibreOffice is not installed, DOCX uploads are disabled in the UI via the `/capabilities` endpoint.
- The frontend checks `/capabilities` on page load and only offers DOCX if the server confirms LibreOffice is available.
- Never offer a lossy text-extraction conversion as a fallback. If we can't do it faithfully, we don't do it.

## General rules

- All converted pages must be A4 portrait.
- The conversion module is `convert.py`. Keep all conversion logic there.
- The `/convert` endpoint in `app.py` handles single-file conversion requests from the frontend.
- The `/capabilities` endpoint reports which file types the server can handle.
- Never silently degrade quality. If there is any risk of content loss, disable the feature.
