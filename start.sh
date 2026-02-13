#!/bin/bash

# BunTool Start Script
# Validates environment and starts the application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  BunTool Startup Validation"
echo "=========================================="
echo ""

# Check Python version
echo -n "Checking Python version... "
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}FAILED${NC}"
    echo "Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}FAILED${NC}"
    echo "Python $PYTHON_VERSION found, but Python $REQUIRED_VERSION or higher is required."
    exit 1
fi
echo -e "${GREEN}OK${NC} (Python $PYTHON_VERSION)"

# Check if virtual environment exists
echo -n "Checking virtual environment... "
if [ ! -d ".venv" ]; then
    echo -e "${RED}FAILED${NC}"
    echo "Virtual environment not found. Creating one now..."
    python3 -m venv .venv
    echo -e "${GREEN}Created${NC}"
else
    echo -e "${GREEN}OK${NC}"
fi

# Activate virtual environment
echo -n "Activating virtual environment... "
source .venv/bin/activate
echo -e "${GREEN}OK${NC}"

# Check if requirements are installed
echo -n "Checking dependencies... "
MISSING_DEPS=0

# Check for key packages
for package in flask werkzeug waitress pypdf pikepdf pdfplumber reportlab python-docx; do
    if ! python -c "import ${package//-/_}" 2>/dev/null; then
        MISSING_DEPS=1
        break
    fi
done

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${YELLOW}MISSING${NC}"
    echo "Installing required packages..."
    pip install -q -r requirements.txt
    echo -e "${GREEN}Installed${NC}"
else
    echo -e "${GREEN}OK${NC}"
fi

# Check for Charter fonts
echo -n "Checking Charter fonts... "
REPORTLAB_FONTS_DIR=$(python -c "import reportlab; import os; print(os.path.join(os.path.dirname(reportlab.__file__), 'fonts'))" 2>/dev/null)

if [ -z "$REPORTLAB_FONTS_DIR" ]; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "Could not locate ReportLab fonts directory."
else
    FONTS_INSTALLED=0
    for font in Charter_Regular.ttf Charter_Bold.ttf Charter_Italic.ttf Charter_Bold_Italic.ttf; do
        if [ -f "$REPORTLAB_FONTS_DIR/$font" ]; then
            FONTS_INSTALLED=$((FONTS_INSTALLED + 1))
        fi
    done
    
    if [ $FONTS_INSTALLED -eq 4 ]; then
        echo -e "${GREEN}OK${NC}"
    elif [ $FONTS_INSTALLED -gt 0 ]; then
        echo -e "${YELLOW}PARTIAL${NC} ($FONTS_INSTALLED/4 fonts found)"
        echo "Some Charter fonts are missing. Installing..."
        cp static/Charter*.ttf "$REPORTLAB_FONTS_DIR/" 2>/dev/null || echo -e "${YELLOW}Warning: Could not copy fonts${NC}"
    else
        echo -e "${YELLOW}MISSING${NC}"
        echo "Installing Charter fonts..."
        if cp static/Charter*.ttf "$REPORTLAB_FONTS_DIR/" 2>/dev/null; then
            echo -e "${GREEN}Installed${NC}"
        else
            echo -e "${YELLOW}Warning: Could not install fonts. Traditional font option may not work.${NC}"
        fi
    fi
fi

# Check required directories
echo -n "Checking required directories... "
mkdir -p logs tempfiles
echo -e "${GREEN}OK${NC}"

# Check if port 7001 is available
echo -n "Checking port 7001... "
if lsof -Pi :7001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}IN USE${NC}"
    echo "Port 7001 is already in use. Please stop the other process or change the port in app.py"
    exit 1
else
    echo -e "${GREEN}AVAILABLE${NC}"
fi

# Check for SECRET_KEY environment variable
echo -n "Checking SECRET_KEY... "
if [ -z "$SECRET_KEY" ]; then
    echo -e "${YELLOW}NOT SET${NC}"
    echo "Warning: SECRET_KEY environment variable not set. Using Flask default (not recommended for production)."
else
    echo -e "${GREEN}OK${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}All checks passed!${NC}"
echo "=========================================="
echo ""
echo "Starting BunTool on http://127.0.0.1:7001"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the application
python app.py
