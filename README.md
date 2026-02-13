# BunTool

<p align="center">
  <img src="static/buntool.webp" width="300" alt="BunTool Logo">
</p>

**Automatically create professional court bundles in seconds.**

## Quick Start

To start the application:

```bash
# Using the start script (recommended - validates everything):
./start.sh

# Or manually:
source .venv/bin/activate  # Activate virtual environment
python app.py              # Run the app
```

The server runs on http://127.0.0.1:7001

The start script automatically:
- Validates Python version (3.8+)
- Creates/checks virtual environment
- Installs missing dependencies
- Installs Charter fonts if needed
- Checks port availability
- Starts the server

See the Installation and Setup section below for first-time setup instructions.

BunTool is a web-based application designed to streamline the creation of court bundles for the English legal system. It takes multiple PDF files and combines them into a single, professionally formatted bundle with automatic indexing, pagination, hyperlinks, and bookmarks.

🔗 **Live Instance:** [buntool.co.uk](https://buntool.co.uk)

## Features

### Core Functionality
- 📄 **PDF Merging** - Combine multiple PDF files into a single document
- 📑 **Automatic Indexing** - Generate table of contents with customizable formatting
- 🔢 **Smart Pagination** - Add page numbers with multiple style options
- 🔗 **Hyperlinks** - Clickable index entries that jump to documents
- 🔖 **Bookmarks** - PDF outline/bookmarks for easy navigation
- 📅 **Date Parsing** - Automatically extract dates from filenames
- 🎨 **Customizable Styling** - Multiple font options for index and page numbers

### Advanced Features
- 📋 **Section Markers** - Organize documents into logical sections
- 📄 **Coversheet Support** - Optional custom cover page
- 🔐 **Confidential Marking** - Add confidential labels to bundles
- 📊 **Multiple Date Formats** - UK/US date formatting options
- 🔢 **Roman Numerals** - Optional roman numeral pagination for front matter
- 📦 **ZIP Export** - Download bundle with all source files and editable index
- 📝 **DOCX Index** - Separate Word document index for editing

### Compliance
- ✅ Complies with English Court bundle requirements
- ✅ Suitable for various legal and professional applications
- ✅ Maintains document integrity and metadata

## What BunTool Does

BunTool automates the tedious process of creating court bundles by:

1. **Accepting** multiple PDF files via drag-and-drop or file selection
2. **Parsing** filenames to extract titles and dates automatically
3. **Generating** a professional table of contents with customizable formatting
4. **Merging** all documents with proper pagination starting from page 1
5. **Adding** clickable hyperlinks from the index to each document
6. **Creating** PDF bookmarks for easy navigation
7. **Outputting** a single, court-ready PDF bundle

The result is a professional bundle that would typically take hours to create manually, completed in seconds.

## Use Cases

- **Legal Professionals** - Court bundles, hearing bundles, trial bundles
- **Solicitors** - Case file compilation and organization
- **Barristers** - Brief preparation and document bundling
- **Corporate Legal** - Document compilation for litigation
- **General Use** - Any scenario requiring organized PDF compilation

## Installation and Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment support
- **LibreOffice** (strongly recommended for DOCX conversion — see below)

### LibreOffice (Recommended)

BunTool can accept Word documents (.docx) and convert them to PDF for inclusion in bundles. For this conversion to be faithful and legally reliable, LibreOffice must be installed on the server. Without it, DOCX files are converted using basic text extraction which loses formatting, tables, images, and layout — this is not suitable for legal use.

Install LibreOffice:

```bash
# macOS
brew install --cask libreoffice

# Ubuntu / Debian
sudo apt install libreoffice

# Fedora / RHEL
sudo dnf install libreoffice
```

BunTool detects LibreOffice automatically at startup. If it is not found, a warning is displayed in the terminal and users uploading DOCX files will see a warning in the browser. Images (PNG, JPG, etc.) do not require LibreOffice — they are converted accurately using Pillow and ReportLab.

### AI Features (Optional)

BunTool has optional AI-powered features that can suggest section groupings and clean document names for your bundle. These require an API key from one of the supported providers:

| Provider | Package | Free Tier | Notes |
|----------|---------|-----------|-------|
| **Google Gemini** | `google-genai` | Yes — generous free tier | Recommended for trying out AI features at no cost |
| **OpenAI** | `openai` | No | GPT-4o-mini is fast and affordable |
| **Anthropic** | `anthropic` | No | Claude Sonnet for high-quality suggestions |

**Setup:**

1. Install the package for your chosen provider:
   ```bash
   pip install google-genai   # or: pip install openai / pip install anthropic
   ```

2. Copy the example config and add your API key:
   ```bash
   cp ai_config.example.json ai_config.json
   ```

3. Edit `ai_config.json`:
   ```json
   {
     "provider": "google",
     "api_key": "your-api-key-here",
     "model": ""
   }
   ```
   Valid providers: `openai`, `anthropic`, `google`. Leave `model` empty to use the default for each provider.

4. Restart the server. You should see `AI features enabled: google (gemini-2.0-flash)` in the terminal.

The AI buttons appear in Step 2 when configured. If AI is not configured, the tool works exactly as before — no functionality is lost.

You can also configure via environment variables instead of the config file:
```bash
export BUNTOOL_AI_PROVIDER=google
export BUNTOOL_AI_API_KEY=your-key-here
export BUNTOOL_AI_MODEL=gemini-2.0-flash
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/TrisSherliker/buntool.git
   cd buntool
   ```

2. **Create a virtual environment**
   ```bash
   python3 -m venv .venv
   ```

3. **Activate the virtual environment**
   
   On macOS/Linux:
   ```bash
   source .venv/bin/activate
   ```
   
   On Windows:
   ```bash
   .venv\Scripts\activate
   ```

4. **Install required packages**
   ```bash
   pip install -r requirements.txt
   ```

5. **Install Charter fonts** (Required for traditional font option)
   
   The Charter font files need to be copied to ReportLab's fonts directory:
   
   On macOS/Linux:
   ```bash
   cp static/Charter*.ttf .venv/lib/python*/site-packages/reportlab/fonts/
   ```
   
   On Windows:
   ```bash
   copy static\Charter*.ttf .venv\Lib\site-packages\reportlab\fonts\
   ```

6. **Configure environment variables** (Recommended for production)
   ```bash
   export SECRET_KEY="your-secret-key-here"
   export FLASK_ENV="production"
   ```

7. **Start the server**
   ```bash
   python app.py
   ```

8. **Access the application**
   
   Open your browser and navigate to: `http://127.0.0.1:7001`

## Configuration

### Environment Variables

- `SECRET_KEY` - Flask secret key for session security (required for production)
- `FLASK_ENV` - Set to `production` for production deployment
- `MAX_CONTENT_LENGTH` - Maximum upload size (default: 100MB)

### Application Settings

Edit `app.py` to customize:
- Port number (default: 7001)
- Host address (default: 0.0.0.0)
- Upload limits
- Temporary file locations

## Usage Guide

### Basic Workflow

1. **Enter Bundle Details** (Step 1)
   - Bundle title (e.g., "Bundle A: Proceedings")
   - Case name (e.g., "Smith v Jones")
   - Claim number (optional)

2. **Upload PDF Files** (Step 2)
   - Drag and drop PDFs or click to select
   - Files are automatically analyzed for dates and titles
   - Reorder files by dragging rows
   - Edit titles and dates as needed
   - Add section markers to organize documents

3. **Choose Options** (Step 3)
   - **Index Options:**
     - Font style (Sans, Serif, Mono, Traditional)
     - Optional coversheet
     - Date format
     - Confidential marking
   - **Page Numbering Options:**
     - Footer font style
     - Alignment (left, center, right)
     - Numbering style (Page 1, 1 of 100, etc.)
     - Optional prefix text
     - Roman numerals for front matter

4. **Create Bundle** (Step 4)
   - Click "CREATE BUNDLE"
   - Download PDF bundle
   - Optionally download ZIP with all files

### Tips for Best Results

- **Filename Conventions:** Include dates in filenames (YYYY-MM-DD or DD-MM-YYYY) for automatic parsing
- **File Organization:** Upload files in the order you want them to appear
- **Section Markers:** Use sections to group related documents
- **Title Editing:** Review auto-generated titles and adjust as needed
- **Date Verification:** Check that dates are correctly parsed from filenames

## Architecture

### Technology Stack

- **Backend:** Flask (Python web framework)
- **PDF Processing:** pypdf, pikepdf, pdfplumber
- **PDF Generation:** ReportLab
- **Document Processing:** python-docx
- **Server:** Waitress (production WSGI server)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3

### File Structure

```
buntool/
├── app.py                 # Flask application and routes
├── bundle.py              # Core PDF processing logic
├── makedocxindex.py       # DOCX index generation
├── requirements.txt       # Python dependencies
├── static/                # Static assets (CSS, JS, fonts, images)
├── templates/             # HTML templates
├── licenses/              # Third-party licenses
└── README.md             # This file
```

### Data Flow

1. User uploads files via web interface
2. Files stored in temporary directory with session ID
3. CSV index generated from user input
4. PDFs merged and processed by bundle.py
5. Index, pagination, hyperlinks, and bookmarks added
6. Final bundle saved to output directory
7. Temporary files cleaned up
8. User downloads completed bundle

## Security Considerations

⚠️ **Important:** This application processes potentially sensitive legal documents. Please review the `SECURITY_REVIEW.md` file for detailed security analysis and recommendations.

### Key Security Points

- Files are processed in isolated temporary directories
- Automatic cleanup of temporary files
- File type validation (PDF only)
- Filename sanitization
- Session-based isolation

### Recommended for Production

Before deploying to production, implement:
- Flask secret key configuration
- CSRF protection
- Rate limiting
- Input validation
- Security headers
- HTTPS/TLS encryption
- Regular security updates

See `SECURITY_REVIEW.md` for complete security recommendations.

## Privacy and Data Handling

- **File Processing:** All files are processed locally on the server
- **Temporary Storage:** Files stored temporarily during processing
- **Automatic Deletion:** Files deleted after bundle creation
- **Logging:** Minimal logging of filenames and metadata for debugging
- **No Cloud Storage:** Files are not uploaded to external services (S3 code is commented out)

For self-hosted instances, you control all data handling and retention policies.

## Troubleshooting

### Common Issues

**Fonts not displaying correctly**
- Ensure Charter fonts are copied to ReportLab's fonts directory
- Check file permissions on font files

**Upload fails**
- Check file size limits (default 100MB total)
- Verify PDF files are not corrupted
- Ensure sufficient disk space in temp directory

**Server won't start**
- Check if port 7001 is already in use
- Verify all dependencies are installed
- Check Python version (3.8+ required)

**Bundle creation fails**
- Check server logs in `logs/` directory
- Verify all uploaded PDFs are valid
- Ensure sufficient memory for large bundles

## Development

### Running in Development Mode

```bash
export FLASK_ENV=development
python app.py
```

### Testing

The application includes extensive logging for debugging. Logs are stored in:
- Development: `logs/` directory
- Production: `/tmp/buntool/logs/`

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

See the TODO section in `bundle.py` for planned features:
- [ ] Enhanced error handling
- [ ] Input validation improvements
- [ ] Page number offset capability
- [ ] State reload from ZIP import
- [ ] Additional customization options

## Dependencies

### Core Dependencies
- Flask 3.1.0 - Web framework
- Werkzeug 3.1.3 - WSGI utilities
- waitress 3.0.2 - Production WSGI server

### PDF Processing
- pypdf 5.1.0 - PDF manipulation
- pikepdf 9.5.1 - PDF processing
- pdfplumber 0.11.5 - PDF text extraction
- reportlab 4.3.0 - PDF generation

### Document Processing
- python-docx 1.1.2 - DOCX generation

See `requirements.txt` for complete list and `licenses/` directory for third-party licenses.

## License

Copyright © Tristan Sherliker and contributors to BunTool

Licensed under the Mozilla Public License, version 2.0 (MPL-2.0).

See `LICENSE.md` for full license text.

## Acknowledgments

- Charter font for legal document styling
- ReportLab for PDF generation capabilities
- The Python PDF processing community

## Support and Contact

- **Issues:** Report bugs via GitHub Issues
- **Email:** tris@sherliker.net
- **Website:** [buntool.co.uk](https://buntool.co.uk)

## Disclaimer

This software is provided "as is" without warranty of any kind. While designed for legal document preparation, users should verify all output meets their specific requirements and court rules. Always review generated bundles before filing or submission.