"""
AI provider abstraction for BunTool.
Supports OpenAI, Anthropic, and Google Gemini via API keys.
"""

import os
import json
import logging

logger = logging.getLogger('bundle_logger')

# Config file path
AI_CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ai_config.json')


def _load_config():
    """Load AI config from file or environment variables."""
    config = {
        'provider': os.environ.get('BUNTOOL_AI_PROVIDER', ''),
        'api_key': os.environ.get('BUNTOOL_AI_API_KEY', ''),
        'model': os.environ.get('BUNTOOL_AI_MODEL', ''),
    }

    # File config overrides env vars if present
    if os.path.exists(AI_CONFIG_PATH):
        try:
            with open(AI_CONFIG_PATH, 'r') as f:
                file_config = json.load(f)
            config.update({k: v for k, v in file_config.items() if v})
        except Exception as e:
            logger.warning(f"Could not load AI config file: {e}")

    # Set sensible model defaults per provider
    if config['provider'] and not config['model']:
        defaults = {
            'openai': 'gpt-4o-mini',
            'anthropic': 'claude-sonnet-4-20250514',
            'google': 'gemini-2.5-flash-lite',
        }
        config['model'] = defaults.get(config['provider'], '')

    return config


PROVIDER_PACKAGES = {
    'openai': ('openai', 'pip install openai'),
    'anthropic': ('anthropic', 'pip install anthropic'),
    'google': ('google.genai', 'pip install google-genai'),
}


def check_ai_package():
    """Check if the required package for the configured provider is installed.
    Returns (ok: bool, message: str)."""
    config = _load_config()
    provider = config.get('provider', '')
    if not provider or not config.get('api_key'):
        return True, ""  # Not configured — nothing to check

    pkg_info = PROVIDER_PACKAGES.get(provider)
    if not pkg_info:
        return False, f"Unknown AI provider '{provider}'. Valid options: openai, anthropic, google"

    import_name, install_cmd = pkg_info
    try:
        __import__(import_name)
        return True, ""
    except ImportError:
        return False, (f"AI provider '{provider}' is configured but the required package is not installed. "
                       f"Run: {install_cmd}")


def is_ai_configured():
    """Check if AI features are available and the package is installed."""
    config = _load_config()
    if not (config.get('provider') and config.get('api_key')):
        return False
    ok, _ = check_ai_package()
    return ok


def get_ai_provider_info():
    """Return provider name and model for display purposes."""
    config = _load_config()
    if not is_ai_configured():
        return None
    return {
        'provider': config['provider'],
        'model': config['model'],
    }
