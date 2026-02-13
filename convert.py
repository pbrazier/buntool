"""
convert.py - File conversion utilities for BunTool.
Converts images and office documents to PDF format.
"""

import os
import logging
import subprocess
import shutil
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

logger = logging.getLogger('bundle_logger')

# Supported file types
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif', '.webp'}
OFFICE_EXTENSIONS = {'.docx'}
SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | OFFICE_EXTENSIONS | {'.pdf'}


def _find_libreoffice():
    """Return the path to the LibreOffice binary, or None if not found."""
    for name in ('libreoffice', 'soffice'):
        path = shutil.which(name)
        if path:
            return path
    # macOS app bundle location
    mac_path = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    if os.path.isfile(mac_path):
        return mac_path
    return None


LIBREOFFICE_PATH = _find_libreoffice()


def has_libreoffice():
    """Check whether LibreOffice is available for high-fidelity document conversion."""
    return LIBREOFFICE_PATH is not None


def get_file_extension(filename):
    """Return lowercase file extension including the dot."""
    return os.path.splitext(filename)[1].lower()


def is_convertible(filename):
    """Check if a file can be converted to PDF."""
    ext = get_file_extension(filename)
    return ext in (IMAGE_EXTENSIONS | OFFICE_EXTENSIONS)


def is_supported(filename):
    """Check if a file type is supported (PDF or convertible)."""
    ext = get_file_extension(filename)
    return ext in SUPPORTED_EXTENSIONS


def convert_image_to_pdf(image_path, output_pdf_path):
    """Convert an image file to a single-page A4 PDF, scaled to fill the usable area."""
    try:
        img = Image.open(image_path)

        # Convert to RGB if necessary (e.g. RGBA PNGs, palette images)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        img_width_px, img_height_px = img.size

        # Warn if image is very low resolution (likely unreadable on A4)
        MIN_READABLE_PX = 400
        if img_width_px < MIN_READABLE_PX and img_height_px < MIN_READABLE_PX:
            logger.warning(
                f"Image {os.path.basename(image_path)} is very small "
                f"({img_width_px}x{img_height_px}px) and may be hard to read on A4."
            )

        # Save a temporary copy for reportlab to reference
        temp_img_path = image_path + '.conv.jpg'
        img.save(temp_img_path, 'JPEG', quality=95)

        # A4 page with margins
        a4_width, a4_height = A4
        margin = 1.5 * cm
        usable_w = a4_width - (2 * margin)
        usable_h = a4_height - (2 * margin)

        # Scale to fill the usable area while maintaining aspect ratio
        scale = min(usable_w / img_width_px, usable_h / img_height_px)
        draw_w = img_width_px * scale
        draw_h = img_height_px * scale

        # Centre the image in the usable area
        x = margin + (usable_w - draw_w) / 2
        y = margin + (usable_h - draw_h) / 2

        c = canvas.Canvas(output_pdf_path, pagesize=A4)
        c.drawImage(temp_img_path, x, y, width=draw_w, height=draw_h, preserveAspectRatio=True)
        c.save()

        # Clean up temp file
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

        logger.info(f"Converted image to PDF: {image_path} -> {output_pdf_path} "
                     f"(source {img_width_px}x{img_height_px}px, drawn {draw_w:.0f}x{draw_h:.0f}pt)")
        return output_pdf_path
    except Exception as e:
        logger.error(f"Error converting image {image_path}: {str(e)}")
        raise


def convert_docx_to_pdf(docx_path, output_pdf_path):
    """Convert a DOCX file to PDF. Uses LibreOffice for faithful conversion, falls back to text extraction."""
    if LIBREOFFICE_PATH:
        return _convert_docx_libreoffice(docx_path, output_pdf_path)
    else:
        logger.warning("LibreOffice not available — using text-extraction fallback for DOCX. "
                        "Output may not faithfully represent the original document.")
        return _convert_docx_reportlab(docx_path, output_pdf_path)


def _convert_docx_libreoffice(docx_path, output_pdf_path):
    """Convert DOCX to PDF using LibreOffice headless mode (faithful, print-quality)."""
    try:
        output_dir = os.path.dirname(output_pdf_path)
        result = subprocess.run(
            [LIBREOFFICE_PATH, '--headless', '--convert-to', 'pdf', '--outdir', output_dir, docx_path],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")

        # LibreOffice names the output based on the input filename
        lo_output = os.path.join(output_dir, os.path.splitext(os.path.basename(docx_path))[0] + '.pdf')
        if lo_output != output_pdf_path:
            os.rename(lo_output, output_pdf_path)

        logger.info(f"Converted DOCX to PDF via LibreOffice: {docx_path} -> {output_pdf_path}")
        return output_pdf_path
    except Exception as e:
        logger.error(f"LibreOffice conversion error for {docx_path}: {str(e)}")
        raise


def _convert_docx_reportlab(docx_path, output_pdf_path):
    """This fallback is disabled. DOCX conversion requires LibreOffice for legal fidelity."""
    raise RuntimeError(
        "DOCX conversion is not available. LibreOffice is required for faithful document conversion. "
        "Install it with: brew install --cask libreoffice"
    )


def convert_to_pdf(input_path, output_dir):
    """
    Convert a file to PDF. Returns the path to the PDF.
    If the file is already a PDF, returns the original path.
    """
    ext = get_file_extension(input_path)
    if ext == '.pdf':
        return input_path

    basename = os.path.splitext(os.path.basename(input_path))[0]
    output_pdf_path = os.path.join(output_dir, f"{basename}.pdf")

    if ext in IMAGE_EXTENSIONS:
        return convert_image_to_pdf(input_path, output_pdf_path)
    elif ext in OFFICE_EXTENSIONS:
        return convert_docx_to_pdf(input_path, output_pdf_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
