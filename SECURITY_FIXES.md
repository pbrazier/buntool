# Quick Security Fixes for BunTool

This document provides code snippets for implementing the critical security fixes identified in the security review.

## 1. Add Flask Secret Key (CRITICAL)

Add this near the top of `app.py`, after the Flask app initialization:

```python
import secrets
import os

app = Flask(__name__)

# Security: Set secret key for session management
app.secret_key = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

# Existing config
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
```

**Environment Variable Setup:**
```bash
# Generate a secure secret key
python3 -c "import secrets; print(secrets.token_hex(32))"

# Set it as an environment variable
export SECRET_KEY="your-generated-key-here"
```

## 2. Fix Path Traversal Vulnerability (CRITICAL)

Replace the download routes in `app.py`:

```python
@app.route('/download/bundle', methods=['GET'])
def download_bundle():
    bundle_path = request.args.get('path')
    if not bundle_path:
        return jsonify({"status": "error", "message": "Download Error: Bundle download path could not be found."}), 400

    # Security: Validate path is within BUNDLES_DIR
    absolute_path = os.path.abspath(bundle_path)
    bundles_dir_abs = os.path.abspath(BUNDLES_DIR)
    
    if not absolute_path.startswith(bundles_dir_abs + os.sep):
        app.logger.warning(f"Path traversal attempt detected: {bundle_path}")
        return jsonify({"status": "error", "message": "Invalid file path"}), 403
    
    if not os.path.exists(absolute_path):
        return jsonify({"status": "error", "message": "Download Error: bundle does not exist in expected location."}), 404

    return send_file(absolute_path, as_attachment=True)


@app.route('/download/zip', methods=['GET'])
def download_zip():
    zip_path = request.args.get('path')
    if not zip_path:
        return jsonify({"status": "error", "message": "Download Error: Zip download path could not be found."}), 400

    # Security: Validate path is within BUNDLES_DIR
    absolute_path = os.path.abspath(zip_path)
    bundles_dir_abs = os.path.abspath(BUNDLES_DIR)
    
    if not absolute_path.startswith(bundles_dir_abs + os.sep):
        app.logger.warning(f"Path traversal attempt detected: {zip_path}")
        return jsonify({"status": "error", "message": "Invalid file path"}), 403
    
    if not os.path.exists(absolute_path):
        return jsonify({"status": "error", "message": "Download Error: zip does not exist in expected location."}), 404

    return send_file(absolute_path, as_attachment=True)
```

## 3. Add CSRF Protection (CRITICAL)

Install Flask-WTF:
```bash
pip install Flask-WTF
```

Add to `requirements.txt`:
```
Flask-WTF==1.2.1
```

Add to `app.py`:
```python
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

# Enable CSRF protection
csrf = CSRFProtect(app)

# Existing config...
```

Update `templates/index.html` to include CSRF token in the form:
```html
<form id="bundleForm" action="/create_bundle" method="POST" enctype="multipart/form-data">
    <input type="hidden" name="csrf_token" value="{{ csrf_token() }}"/>
    <!-- Rest of form -->
</form>
```

Update `static/buntool.js` to include CSRF token in fetch request:
```javascript
// Get CSRF token from form
const csrfToken = document.querySelector('input[name="csrf_token"]').value;

fetch('/create_bundle', {
    method: 'POST',
    body: formData,
    headers: {
        'X-CSRFToken': csrfToken
    }
})
```

## 4. Add Rate Limiting (HIGH PRIORITY)

Install Flask-Limiter:
```bash
pip install Flask-Limiter
```

Add to `requirements.txt`:
```
Flask-Limiter==3.5.0
```

Add to `app.py`:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Apply stricter limit to bundle creation
@app.route('/create_bundle', methods=['GET', 'POST'])
@limiter.limit("10 per hour")
def create_bundle():
    # Existing code...
```

## 5. Add Security Headers (HIGH PRIORITY)

Add to `app.py`:
```python
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Only add HSTS if using HTTPS
    if request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response
```

## 6. Enhanced Input Validation (HIGH PRIORITY)

Add validation function to `app.py`:
```python
import re

def validate_text_input(text, max_length, field_name):
    """Validate text input for security"""
    if not text:
        return None
    
    # Check length
    if len(text) > max_length:
        raise ValueError(f"{field_name} exceeds maximum length of {max_length}")
    
    # Remove potentially dangerous characters but allow common punctuation
    # Allow: letters, numbers, spaces, and common punctuation
    sanitized = re.sub(r'[^\w\s\-.,()&:/]', '', text, flags=re.UNICODE)
    
    return sanitized.strip()

# Use in create_bundle route:
try:
    bundle_title = validate_text_input(
        request.form.get('bundle_title'), 
        1000, 
        'Bundle title'
    ) or 'Bundle'
    
    case_name = validate_text_input(
        request.form.get('case_name'), 
        300, 
        'Case name'
    )
    
    claim_no = validate_text_input(
        request.form.get('claim_no'), 
        100, 
        'Claim number'
    )
    
    footer_prefix = validate_text_input(
        request.form.get('footer_prefix'), 
        30, 
        'Footer prefix'
    )
except ValueError as e:
    return jsonify({"status": "error", "message": str(e)}), 400
```

## 7. Improved Error Handling (MEDIUM PRIORITY)

Add custom error handlers to `app.py`:
```python
@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large errors"""
    return jsonify({
        "status": "error",
        "message": "File size exceeds maximum allowed limit"
    }), 413

@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors"""
    app.logger.error(f"Internal server error: {error}")
    return jsonify({
        "status": "error",
        "message": "An internal error occurred. Please try again later."
    }), 500

@app.errorhandler(Exception)
def handle_exception(error):
    """Handle unexpected exceptions"""
    app.logger.error(f"Unhandled exception: {error}", exc_info=True)
    return jsonify({
        "status": "error",
        "message": "An unexpected error occurred"
    }), 500
```

## 8. Secure Logging Configuration (MEDIUM PRIORITY)

Add to `app.py`:
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure secure logging
if not app.debug:
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Set up rotating file handler
    file_handler = RotatingFileHandler(
        'logs/buntool.log',
        maxBytes=10240000,  # 10MB
        backupCount=10
    )
    
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('BunTool startup')
```

## 9. Environment Configuration Template

Create `.env.example` file:
```bash
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=production

# Application Settings
MAX_CONTENT_LENGTH=104857600  # 100MB in bytes
PORT=7001
HOST=0.0.0.0

# Security Settings
RATELIMIT_STORAGE_URL=memory://
```

Create `.env` file (add to .gitignore):
```bash
# Copy from .env.example and fill in actual values
cp .env.example .env
```

Load environment variables in `app.py`:
```python
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    raise ValueError("SECRET_KEY environment variable must be set")
```

Install python-dotenv:
```bash
pip install python-dotenv
```

## 10. Update .gitignore

Add to `.gitignore`:
```
# Environment variables
.env

# Logs
logs/
*.log

# Temporary files
tempfiles/
bundles/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/

# IDE
.vscode/
.idea/
*.swp
*.swo
```

## Testing Security Fixes

After implementing these fixes, test:

1. **Secret Key:** Verify sessions work correctly
2. **Path Traversal:** Try accessing `../../../etc/passwd` in download URLs
3. **CSRF:** Try submitting form without CSRF token
4. **Rate Limiting:** Make multiple rapid requests
5. **Input Validation:** Try submitting very long strings or special characters
6. **Error Handling:** Trigger errors and verify generic messages are shown

## Deployment Checklist

Before deploying to production:

- [ ] Set SECRET_KEY environment variable
- [ ] Enable HTTPS/TLS
- [ ] Configure rate limiting
- [ ] Set up log rotation
- [ ] Test all security fixes
- [ ] Review and update CORS settings if needed
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Document incident response procedures
- [ ] Regular security updates scheduled

## Additional Resources

- [Flask Security Best Practices](https://flask.palletsprojects.com/en/latest/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security_warnings.html)
