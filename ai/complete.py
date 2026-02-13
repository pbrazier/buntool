"""
AI completion handler for BunTool.
Routes requests to the configured provider.
"""

import json
import logging
from ai.provider import _load_config

logger = logging.getLogger('bundle_logger')


def complete(system_prompt, user_prompt):
    """
    Send a prompt to the configured AI provider and return the parsed JSON response.
    Returns a dict on success, or raises an exception on failure.
    """
    config = _load_config()
    provider = config.get('provider', '')
    api_key = config.get('api_key', '')
    model = config.get('model', '')

    if not provider or not api_key:
        raise RuntimeError("AI is not configured. Set provider and api_key in ai_config.json or environment variables.")

    logger.info(f"[AI] Sending request to {provider} ({model})")

    if provider == 'openai':
        return _complete_openai(api_key, model, system_prompt, user_prompt)
    elif provider == 'anthropic':
        return _complete_anthropic(api_key, model, system_prompt, user_prompt)
    elif provider == 'google':
        return _complete_google(api_key, model, system_prompt, user_prompt)
    else:
        raise ValueError(f"Unknown AI provider: {provider}")


def _complete_openai(api_key, model, system_prompt, user_prompt):
    """Call OpenAI API."""
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("OpenAI package not installed. Run: pip install openai")

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    content = response.choices[0].message.content
    logger.debug(f"[AI] OpenAI response: {content[:200]}...")
    return json.loads(content)


def _complete_anthropic(api_key, model, system_prompt, user_prompt):
    """Call Anthropic API."""
    try:
        import anthropic
    except ImportError:
        raise RuntimeError("Anthropic package not installed. Run: pip install anthropic")

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    content = response.content[0].text
    logger.debug(f"[AI] Anthropic response: {content[:200]}...")
    # Anthropic doesn't have a JSON mode, so extract JSON from response
    return _extract_json(content)


def _complete_google(api_key, model, system_prompt, user_prompt):
    """Call Google Gemini API."""
    try:
        from google import genai
    except ImportError:
        raise RuntimeError("Google GenAI package not installed. Run: pip install google-genai")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=f"{system_prompt}\n\n{user_prompt}",
        config={
            "response_mime_type": "application/json",
            "temperature": 0.3,
        },
    )
    content = response.text
    logger.debug(f"[AI] Google response: {content[:200]}...")
    return json.loads(content)


def _extract_json(text):
    """Extract JSON from a text response that may contain markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        # Remove markdown code fences
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)
