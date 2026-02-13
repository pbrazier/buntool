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
            'google': 'gemini-2.0-flash',
        }
        config['model'] = defaults.get(config['provider'], '')

    return config


def is_ai_configured():
    """Check if AI features are available."""
    config = _load_config()
    return bool(config.get('provider') and config.get('api_key'))


def get_ai_provider_info():
    """Return provider name and model for display purposes."""
    config = _load_config()
    if not is_ai_configured():
        return None
    return {
        'provider': config['provider'],
        'model': config['model'],
    }
