# BunTool Security Review

**Review Date:** February 3, 2026  
**Reviewer:** Security Analysis  
**Application:** BunTool - Court Bundle PDF Generator

## Executive Summary

BunTool is a Flask-based web application for creating court bundles from PDF files. This review identifies security vulnerabilities and provides recommendations for improving the application's security posture.

## Critical Findings

### 1. **Missing Secret Key Configuration** ⚠️ CRITICAL
**Location:** `app.py`  
**Issue:** Flask application does not set `app.secret_key`, which is required for session security.

**Risk:** Without a secret key, Flask sessions are not cryptographically signed, making them vulnerable to tampering.

**Recommendation:**
```python
import secrets
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
```

### 2. **Path Traversal Vulnerability** ⚠️ HIGH
**Location:** `app.py` - `/download/bundle` and `/download/zip` routes  
**Issue:** User-supplied paths are used directly with `os.path.abspath()` without validation.

**Risk:** Attackers could potentially access files outside the intended directory.

**Current Code:**
```python
absolute_path = os.path.abspath(bundle_path)
```

**Recommendation:**
```python
# Validate that the path is within BUNDLES_DIR
absolute_path = os.path.abspath(bundle_path)
bundles_dir_abs = os.path.abspath(BUNDLES_DIR)
if not absolute_path.startswith(bundles_dir_abs):
    return jsonify({"status": "error", "message": "Invalid file path"}), 403
```

### 3. **Insufficient Input Validation** ⚠️ MEDIUM
**Location:** `app.py` - form inputs  
**Issue:** Limited validation on user inputs (bundle_title, case_name, claim_no, footer_prefix).

**Risk:** Potential for injection attacks or unexpected behavior with malicious input.

**Recommendation:**
- Add length limits (already present in HTML but not enforced server-side)
- Sanitize inputs to remove potentially dangerous characters
- Validate date formats
- Add CSRF protection

### 4. **Missing CSRF Protection** ⚠️ MEDIUM
**Location:** `app.py` - all POST routes  
**Issue:** No CSRF tokens implemented for form submissions.

**Risk:** Cross-Site Request Forgery attacks possible.

**Recommendation:**
```python
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)
```

### 5. **Commented-Out AWS S3 Code** ⚠️ LOW
**Location:** `app.py` - lines with boto3 imports and S3 upload functions  
**Issue:** Commented code reveals infrastructure details and potential data handling practices.

**Risk:** Information disclosure; confusion about actual behavior.

**Recommendation:** Remove commented code entirely or move to separate documentation.

## Medium Priority Findings

### 6. **Error Message Information Disclosure** ⚠️ MEDIUM
**Location:** Multiple locations in `app.py` and `bundle.py`  
**Issue:** Detailed error messages and stack traces may be exposed to users.

**Risk:** Information leakage about system internals.

**Recommendation:**
- Use generic error messages for users
- Log detailed errors server-side only
- Implement proper error handling middleware

### 7. **File Upload Size Validation** ⚠️ MEDIUM
**Location:** `app.py` - `create_bundle` route  
**Issue:** File size validation occurs after files are uploaded.

**Current Code:**
```python
total_size = sum([f.content_length for f in files])
if total_size > app.config['MAX_CONTENT_LENGTH']:
```

**Risk:** Server resources consumed before validation.

**Recommendation:** Flask's `MAX_CONTENT_LENGTH` should handle this, but ensure it's properly configured and tested.

### 8. **Insecure Temporary File Handling** ⚠️ MEDIUM
**Location:** `app.py` and `bundle.py`  
**Issue:** Temporary files created with predictable names in shared temp directory.

**Risk:** Potential for race conditions or unauthorized access.

**Recommendation:**
- Use `tempfile.mkstemp()` for secure temporary file creation
- Ensure proper file permissions (0600)
- Verify cleanup in all error paths

### 9. **Missing Rate Limiting** ⚠️ MEDIUM
**Location:** All routes  
**Issue:** No rate limiting implemented.

**Risk:** Denial of service through resource exhaustion.

**Recommendation:**
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@limiter.limit("10 per minute")
@app.route('/create_bundle', methods=['POST'])
def create_bundle():
    # ...
```

### 10. **Logging Sensitive Information** ⚠️ MEDIUM
**Location:** `bundle.py` - extensive logging throughout  
**Issue:** Logs contain filenames, titles, and potentially sensitive document metadata.

**Risk:** Privacy violation; sensitive data in logs.

**Recommendation:**
- Review all logging statements
- Redact or hash sensitive information
- Implement log rotation and secure storage
- Document data retention policy

## Low Priority Findings

### 11. **Hardcoded Configuration Values** ⚠️ LOW
**Location:** `app.py`  
**Issue:** Port, host, and other settings hardcoded.

**Recommendation:** Use environment variables or configuration files.

### 12. **Missing Security Headers** ⚠️ LOW
**Location:** `app.py`  
**Issue:** No security headers configured.

**Recommendation:**
```python
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

### 13. **External CDN Dependencies** ⚠️ LOW
**Location:** `templates/index.html`  
**Issue:** Multiple external JavaScript libraries loaded from CDNs without SRI.

**Risk:** Supply chain attacks if CDN is compromised.

**Recommendation:** Add Subresource Integrity (SRI) hashes:
```html
<script src="https://cdn.jsdelivr.net/npm/chrono-node@1.4.9/dist/chrono.min.js" 
        integrity="sha384-..." crossorigin="anonymous"></script>
```

### 14. **PDF Processing Library Security** ⚠️ LOW
**Location:** `requirements.txt`  
**Issue:** PDF processing libraries (pypdf, pikepdf, pdfplumber) can have vulnerabilities.

**Recommendation:**
- Keep libraries updated
- Monitor security advisories
- Consider sandboxing PDF processing

## Positive Security Practices

✅ **Good:**
- Use of `secure_filename()` from Werkzeug
- Temporary file cleanup implemented
- File type validation (PDF only)
- Use of production WSGI server (Waitress)
- Separation of concerns (app.py vs bundle.py)

## Compliance Considerations

### Data Privacy
- **Issue:** Application processes potentially sensitive legal documents
- **Recommendation:** 
  - Add privacy policy
  - Implement data retention policy
  - Consider GDPR compliance if serving EU users
  - Document what data is logged and for how long

### File Retention
- **Current:** Files deleted "within a few hours"
- **Recommendation:** 
  - Implement automated cleanup with configurable retention
  - Document exact retention period
  - Provide immediate deletion option

## Recommended Security Improvements Priority List

### Immediate (Critical)
1. Add Flask secret key configuration
2. Fix path traversal vulnerability in download routes
3. Add CSRF protection

### Short-term (High Priority)
4. Implement rate limiting
5. Add comprehensive input validation
6. Review and sanitize logging
7. Add security headers

### Medium-term
8. Implement proper error handling
9. Add monitoring and alerting
10. Security audit of PDF processing
11. Add SRI to external resources

### Long-term
12. Consider security hardening (sandboxing, containerization)
13. Implement security testing in CI/CD
14. Regular dependency updates and vulnerability scanning

## Testing Recommendations

1. **Penetration Testing:** Conduct professional security assessment
2. **Fuzzing:** Test PDF processing with malformed files
3. **Load Testing:** Verify DoS protections
4. **Code Review:** Regular security-focused code reviews

## Conclusion

BunTool is a functional application with several security concerns that should be addressed before production deployment. The most critical issues are the missing secret key and path traversal vulnerability. With the recommended fixes, the application can achieve a reasonable security posture for its intended use case.

**Overall Risk Rating:** MEDIUM-HIGH (before fixes)  
**Recommended Risk Rating:** LOW-MEDIUM (after implementing critical and high-priority fixes)
