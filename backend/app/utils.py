import json
import logging
import os
import re
from textwrap import dedent
from typing import List, Dict, Any, Optional, Sequence
from uuid import uuid4

try:
    import openai
except ImportError:  # pragma: no cover - optional dependency
    openai = None  # type: ignore

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency
    load_dotenv = None

import requests
from app.config import settings

logger = logging.getLogger(__name__)


QUESTION_TYPES = ("mcq", "scenario", "true_false", "fill_blank")


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    compact = re.sub(r"\s+", " ", str(value)).strip()
    return compact.lower() if compact else None


def _generate_topic_miss_question(
    topic_label: str,
    difficulty: str,
    focus_concept: Optional[str],
) -> Dict[str, Any]:
    prompt = (
        f"The current notes do not contain enough details about {topic_label}. What should you do next to "
        "prepare for this topic?"
    )
    options = [
        {"id": "A", "text": f"Locate or upload study material that covers {topic_label}, then retry the quiz."},
        {"id": "B", "text": "Guess the answers until a new question appears."},
        {"id": "C", "text": "Disable the topic filter so the quiz uses unrelated notes."},
        {"id": "D", "text": "Skip preparing; the topic will not be assessed."},
    ]
    explanation = (
        f"Local fallback: no retrieved notes mention {topic_label}. Add relevant content or enable an LLM "
        "provider for richer questions."
    )
    return {
        "question_id": f"fallback-{uuid4()}",
        "prompt": prompt,
        "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "medium",
        "options": options,
        "correctOptionId": "A",
        "correctOptionText": options[0]["text"],
        "explanation": explanation,
        "conceptLabel": focus_concept or topic_label,
        "questionType": "mcq",
        "focusConcept": focus_concept or topic_label,
        "focusKeywords": [],
    }


def _generate_fallback_quiz_question(
    topic: Optional[str],
    contexts: List[str],
    difficulty: str,
    focus_concept: Optional[str],
    history: Optional[Sequence[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    topic_label = (topic or focus_concept or "the material" or "").strip() or "the material"
    sentences = _extract_sentences(contexts)

    topic_terms = [
        token
        for token in re.findall(r"\w+", topic_label.lower())
        if len(token) >= 3
    ]
    focus_terms = []
    if focus_concept:
        focus_terms = [
            token
            for token in re.findall(r"\w+", str(focus_concept).lower())
            if len(token) >= 3
        ]

    used_snippets: set[str] = set()
    if history:
        for turn in history:
            if not isinstance(turn, dict):
                continue
            for key in ("correctOptionText", "correct_option_text", "prompt", "question"):
                normalized = _normalize_text(turn.get(key))
                if normalized:
                    used_snippets.add(normalized)

    best_sentence: Optional[str] = None
    best_score = -1

    for sentence in sentences:
        normalized = _normalize_text(sentence)
        if not normalized or normalized in used_snippets:
            continue
        tokens = set(re.findall(r"\w+", normalized))
        score = 0
        if topic_terms:
            score += sum(3 for term in topic_terms if term in tokens)
        if focus_terms:
            score += sum(2 for term in focus_terms if term in tokens)
        if score == 0:
            score += sum(1 for term in topic_terms if term in normalized)
            score += sum(1 for term in focus_terms if term in normalized)
        if score > best_score:
            best_score = score
            best_sentence = sentence

    if best_sentence is None and sentences:
        for sentence in sentences:
            normalized = _normalize_text(sentence)
            if normalized:
                best_sentence = sentence
                best_score = 0
                break

    if best_sentence is None:
        return _generate_topic_miss_question(topic_label, difficulty, focus_concept)

    if best_score <= 0 and topic_terms:
        return _generate_topic_miss_question(topic_label, difficulty, focus_concept)

    correct_text = best_sentence.strip()
    if len(correct_text) > 220:
        snippet = correct_text[:220].rstrip()
        if " " in snippet:
            snippet = snippet.rsplit(" ", 1)[0]
        correct_text = f"{snippet}..."

    prompt = (
        f"According to the notes, which statement is accurate about {topic_label}?"
    )

    distractors = [
        f"The notes argue that {topic_label} is unrelated to the material under review.",
        f"They insist that {topic_label} has been completely deprecated in practice.",
        "They present the opposite claim of the provided passage.",
    ]

    options = [
        {"id": "A", "text": correct_text},
        {"id": "B", "text": distractors[0]},
        {"id": "C", "text": distractors[1]},
        {"id": "D", "text": distractors[2]},
    ]

    return {
        "question_id": f"fallback-{uuid4()}",
        "prompt": prompt,
        "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "medium",
        "options": options,
        "correctOptionId": "A",
        "correctOptionText": correct_text,
        "explanation": None,
        "conceptLabel": focus_concept or topic_label,
        "questionType": "mcq",
        "focusConcept": focus_concept or topic_label,
        "focusKeywords": [],
    }


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_QUIZ_MODEL = os.getenv("OLLAMA_QUIZ_MODEL")
OLLAMA_QA_MODEL = os.getenv("OLLAMA_QA_MODEL")


def _normalized_env_value(name: str) -> Optional[str]:
    """Return a trimmed environment value or None when unset/blank."""
    raw = os.getenv(name)
    if raw is None:
        return None
    trimmed = raw.strip()
    return trimmed or None


def _get_quiz_llm_provider() -> str:
    value = _normalized_env_value("QUIZ_LLM_PROVIDER")
    if value:
        return value.lower()
    if _get_groq_api_key():
        return "groq"
    return "openai"


def _get_quiz_llm_model() -> str:
    explicit = _normalized_env_value("QUIZ_LLM_MODEL")
    if explicit:
        return explicit
    provider = _get_quiz_llm_provider()
    if provider == "groq":
        return _get_groq_model()
    return "gpt-3.5-turbo"


def _get_qa_llm_provider() -> str:
    value = _normalized_env_value("QA_LLM_PROVIDER")
    if value:
        return value.lower()
    if _get_groq_api_key():
        return "groq"
    return "openai"


def _get_qa_llm_model() -> str:
    explicit = _normalized_env_value("QA_LLM_MODEL")
    if explicit:
        return explicit
    provider = _get_qa_llm_provider()
    if provider == "groq":
        return _get_groq_model()
    return "gpt-3.5-turbo"


def _get_groq_api_key() -> Optional[str]:
    return settings.GROQ_API_KEY


def _get_groq_model() -> str:
    return settings.GROQ_MODEL


def _resolve_history_value(turn: Any, keys: Sequence[str]) -> Optional[str]:
    if isinstance(turn, dict):
        for key in keys:
            if key in turn and turn[key]:
                return str(turn[key])
        return None

    for key in keys:
        if hasattr(turn, key):
            value = getattr(turn, key)
            if value:
                return str(value)
        alt_key = key
        if "_" in key:
            alt_key = key.replace("_", "")
        else:
            alt_key = re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()
        if hasattr(turn, alt_key):
            value = getattr(turn, alt_key)
            if value:
                return str(value)
    return None


def _prepare_context_snippets(contexts: Sequence[str], limit: int = 3, max_chars: int = 600) -> List[str]:
    snippets: List[str] = []
    for ctx in contexts:
        cleaned = re.sub(r"\s+", " ", str(ctx or "")).strip()
        if not cleaned:
            continue
        snippets.append(cleaned[: max_chars])
        if len(snippets) >= limit:
            break
    return snippets


def _format_history_for_prompt(history: Optional[Sequence[Dict[str, Any]]], limit: int = 3) -> str:
    if not history:
        return "None"
    rows: List[str] = []
    for turn in list(history)[-limit:]:
        question_text = _resolve_history_value(turn, ("question", "prompt")) or ""
        answer_text = _resolve_history_value(turn, ("correct_option_text", "correctOptionText")) or ""
        was_correct = "incorrect"
        if isinstance(turn, dict):
            flag = turn.get("was_correct")
            if flag is None:
                flag = turn.get("wasCorrect")
            if isinstance(flag, bool):
                was_correct = "correct" if flag else "incorrect"
            elif str(flag).lower() in {"true", "1", "yes"}:
                was_correct = "correct"
        q_clean = re.sub(r"\s+", " ", question_text)[:140]
        a_clean = re.sub(r"\s+", " ", answer_text)[:90]
        rows.append(f"- Q: {q_clean} | Answer: {a_clean} ({was_correct})")

    return "\n".join(rows) if rows else "None"


def _extract_json_block(content: str) -> Optional[Dict[str, Any]]:
    if not content:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{(?:.|\n)*\}", content)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def _extract_openai_message_content(choice: Any) -> Optional[str]:
    content = None
    if not choice:
        return None
    if isinstance(choice, dict):
        content = choice.get("message", {}).get("content")
    else:
        message = getattr(choice, "message", None)
        if message is not None:
            content = getattr(message, "content", None)
    if isinstance(content, str):
        return content
    if content and hasattr(content, "__iter__"):
        segments: List[str] = []
        for segment in content:
            text = getattr(segment, "text", None)
            if isinstance(segment, dict):
                text = segment.get("text")
            if text:
                segments.append(str(text))
        if segments:
            return "".join(segments)
    return None


def _perform_openai_chat_completion(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float,
    max_tokens: int,
) -> Optional[str]:
    if openai is None:
        logger.debug("OpenAI client not available; skipping remote quiz generation.")
        return None
    try:
        client_cls = getattr(openai, "OpenAI", None)
        if client_cls is not None:
            client = client_cls()
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            choice = response.choices[0]
            content = _extract_openai_message_content(choice)
        elif hasattr(openai, "ChatCompletion"):
            response = openai.ChatCompletion.create(  # type: ignore[attr-defined]
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            choice = response["choices"][0]
            content = _extract_openai_message_content(choice)
        else:  # pragma: no cover - defensive
            raise RuntimeError("OpenAI client library missing chat completion support.")
    except Exception as exc:  # pragma: no cover - relies on external service
        logger.warning("OpenAI chat completion failed: %s", exc)
        return None
    return content.strip() if isinstance(content, str) else None


def _call_openai_quiz_model(messages: List[Dict[str, str]], model: str) -> Optional[str]:
    return _perform_openai_chat_completion(messages, model, temperature=0.4, max_tokens=700)


def _normalized_history_prompts(history: Optional[Sequence[Dict[str, Any]]]) -> set[str]:
    prompts: set[str] = set()
    answers: set[str] = set()
    if not history:
        return prompts
    for turn in history:
        prompt_text = _resolve_history_value(turn, ("prompt", "question"))
        if prompt_text:
            normalized = _normalize_text(prompt_text)
            if normalized:
                prompts.add(normalized)
        answer_text = _resolve_history_value(
            turn,
            (
                "correct_option_text",
                "correctOptionText",
                "answer",
                "answerText",
            ),
        )
        if answer_text:
            normalized_answer = _normalize_text(answer_text)
            if normalized_answer:
                answers.add(normalized_answer)
    return prompts.union(answers)


def _call_ollama_generate(
    model: Optional[str],
    prompt: str,
    *,
    temperature: float = 0.2,
    timeout: int = 90,
) -> Optional[str]:
    if not model:
        return None
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": temperature},
            },
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover - relies on external service
        logger.warning("Ollama generate failed (%s): %s", model, exc)
        return None
    payload = response.json()
    content = payload.get("response")
    return str(content).strip() if content else None


def _call_ollama_quiz_model(prompt: str) -> Optional[str]:
    return _call_ollama_generate(OLLAMA_QUIZ_MODEL, prompt, temperature=0.4, timeout=60)


def _call_ollama_answer_model(prompt: str) -> Optional[str]:
    return _call_ollama_generate(OLLAMA_QA_MODEL, prompt, temperature=0.1, timeout=90)


def _call_groq_chat_completion(
    messages: List[Dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    model: Optional[str] = None,
) -> Optional[str]:
    api_key = _get_groq_api_key()
    if not api_key:
        logger.warning("Groq API key missing; cannot call Groq completion.")
        return None
    resolved_model = model or _get_groq_model()
    logger.debug("Calling Groq chat completion (model=%s)", resolved_model)
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": resolved_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        response.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover - external service
        logger.warning("Groq chat completion failed: %s", exc)
        if exc.response:
             print(f"GROQ_ERROR_BODY: {exc.response.text}")
        return None
    payload = response.json()
    logger.debug("Groq response payload keys: %s", list(payload.keys()))
    choices = payload.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    return content.strip() if isinstance(content, str) else None


def _coerce_llm_question_payload(
    payload: Dict[str, Any],
    difficulty: str,
    topic: Optional[str],
    focus_concept: Optional[str],
) -> Optional[Dict[str, Any]]:
    prompt = payload.get("prompt")
    options_raw = payload.get("options")
    answer_id = payload.get("answer") or payload.get("correctOptionId")
    answer_text = payload.get("answerText") or payload.get("correctOptionText")
    explanation = payload.get("explanation")
    question_type = payload.get("questionType") or "mcq"

    if not prompt or not options_raw:
        return None

    if isinstance(options_raw, dict):
        options_iterable = options_raw.values()
    else:
        options_iterable = options_raw

    options: List[Dict[str, str]] = []
    seen: set[str] = set()
    for idx, option in enumerate(options_iterable):
        if isinstance(option, dict):
            opt_id = str(option.get("id") or "").strip()
            opt_text = option.get("text")
        else:
            opt_id = ""
            opt_text = option
        if not opt_id:
            opt_id = chr(ord("A") + idx)
        opt_id = opt_id.upper()
        opt_text_clean = re.sub(r"\s+", " ", str(opt_text or "")).strip()
        if not opt_text_clean or opt_id in seen:
            continue
        seen.add(opt_id)
        options.append({"id": opt_id, "text": opt_text_clean})

    if len(options) < 2:
        return None

    answer_id = str(answer_id or "").strip().upper()
    normalized_answer_text = re.sub(r"\s+", " ", str(answer_text or "")).strip().lower()

    if not any(opt["id"] == answer_id for opt in options):
        answer_id = ""

    if not answer_id and normalized_answer_text:
        for opt in options:
            if re.sub(r"\s+", " ", opt["text"]).strip().lower() == normalized_answer_text:
                answer_id = opt["id"]
                break

    if not answer_id:
        logger.warning("LLM quiz payload missing explicit answer id; defaulting to first option.")
        answer_id = options[0]["id"]

    focus_keywords = payload.get("focusKeywords") or payload.get("keywords") or []
    if isinstance(focus_keywords, str):
        focus_keywords = [segment.strip() for segment in focus_keywords.split(",") if segment.strip()]
    elif isinstance(focus_keywords, Sequence):
        focus_keywords = [str(segment).strip() for segment in focus_keywords if str(segment).strip()]
    else:
        focus_keywords = []

    question_type = question_type if question_type in QUESTION_TYPES else "mcq"

    result = {
        "question_id": payload.get("questionId") or f"llm-{uuid4()}",
        "prompt": str(prompt).strip(),
        "difficulty": difficulty if difficulty in {"easy", "medium", "hard"} else "medium",
        "options": options,
        "correctOptionId": answer_id,
        "explanation": explanation.strip() if isinstance(explanation, str) else explanation,
        "conceptLabel": payload.get("conceptLabel") or focus_concept or topic,
        "questionType": question_type,
        "focusConcept": payload.get("focusConcept") or focus_concept or topic,
        "focusKeywords": focus_keywords,
        "correctOptionText": answer_text if answer_text else None,
    }

    if not result["correctOptionText"]:
        for opt in options:
            if opt["id"] == answer_id:
                result["correctOptionText"] = opt["text"]
                break

    return result


def _generate_quiz_question_with_llm(
    topic: Optional[str],
    contexts: List[str],
    difficulty: str,
    history: Optional[List[Dict[str, Any]]],
    focus_concept: Optional[str],
    source_names: Optional[Sequence[str]] = None,
) -> Optional[Dict[str, Any]]:
    snippets = _prepare_context_snippets(contexts)
    if not snippets:
        return None

    topic_label = topic or focus_concept or "General concept"
    history_block = _format_history_for_prompt(history)
    context_block = "\n".join(f"{idx + 1}. {snippet}" for idx, snippet in enumerate(snippets))
    requested_difficulty = difficulty if difficulty in {"easy", "medium", "hard"} else "medium"

    schema_description = (
        "{\n"
        "  \"prompt\": string,\n"
        "  \"questionType\": one of ['mcq','scenario','true_false','fill_blank'],\n"
        "  \"options\": [ { \"id\": string, \"text\": string } ],\n"
        "  \"answer\": string (option id),\n"
        "  \"answerText\": string,\n"
        "  \"explanation\": string,\n"
        "  \"focusKeywords\": array of short phrases\n"
        "}"
    )

    selected_sources = []
    if source_names:
        for name in source_names:
            label = str(name).strip()
            if label and label not in selected_sources:
                selected_sources.append(label)
    source_overview = ", ".join(selected_sources)

    base_user_prompt = (
        f"Topic: {topic_label}\n"
        f"Focus concept: {focus_concept or topic_label}\n"
        f"Requested difficulty: {requested_difficulty}\n"
        f"Selected sources: {source_overview or 'Not specified'}\n"
        "Context snippets:\n"
        f"{context_block}\n\n"
        "Craft one adaptive quiz question grounded strictly in the context. Avoid repeating recent questions.\n"
        f"Recent questions:\n{history_block}\n\n"
        "Respond with JSON only, matching this schema:\n"
        f"{schema_description}\n"
        "Rules:\n"
        "- Use clear, student-friendly wording.\n"
        "- Keep options mutually exclusive and under 120 characters.\n"
        "- For fill_blank, include exactly one blank marked as '_____'.\n"
        "- For true_false, provide options 'A' (True) and 'B' (False).\n"
        "- Populate focusKeywords with up to 4 important terms.\n"
        "- Stay faithful to the selected sources; do not introduce outside knowledge.\n"
        "- If you provide an explanation, reference the relevant source name when helpful.\n"
        "- Do not reuse any previous question wording or answers; every new question must be materially different.\n"
    )

    system_prompt = (
        "You are an instructional designer generating high-quality quiz questions from study notes. "
        "Output valid JSON only."
    )

    provider = _get_quiz_llm_provider()
    quiz_model = _get_quiz_llm_model()
    prior_signatures = _normalized_history_prompts(history)

    def _invoke_llm(prompt_body: str) -> Optional[str]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_body},
        ]
        content: Optional[str] = None
        openai_ready = False
        if provider in {"openai", "auto", "default"}:
            openai_ready = set_openai_key_from_env()
            if openai_ready:
                content = _call_openai_quiz_model(messages, quiz_model)
        if not content and provider in {"groq", "auto"}:
            content = _call_groq_chat_completion(messages, temperature=0.45, max_tokens=700)
        if not content and OLLAMA_QUIZ_MODEL and provider in {"ollama", "auto"}:
            prompt = system_prompt + "\n\n" + prompt_body
            content = _call_ollama_quiz_model(prompt)
        if not content and provider == "ollama" and not openai_ready:
            if set_openai_key_from_env():
                content = _call_openai_quiz_model(messages, quiz_model)
        return content

    attempts = 0
    additional_guardrails = ""
    while attempts < 3:
        prompt_to_send = base_user_prompt + additional_guardrails
        content = _invoke_llm(prompt_to_send)
        if not content:
            attempts += 1
            additional_guardrails = "\n\nIf you cannot access the model, try again with a novel question."
            continue
        data = _extract_json_block(content)
        if not isinstance(data, dict):
            logger.warning("LLM quiz response was not valid JSON: %s", content)
            attempts += 1
            additional_guardrails = "\n\nThe previous response was invalid JSON. Output valid JSON only and follow the schema exactly."
            continue
        payload = _coerce_llm_question_payload(data, requested_difficulty, topic, focus_concept)
        if not payload:
            attempts += 1
            additional_guardrails = "\n\nThe previous output did not match the schema. Regenerate a valid JSON object with all required fields."
            continue
        normalized_prompt = _normalize_text(payload.get("prompt"))
        normalized_answer = _normalize_text(payload.get("correctOptionText"))
        duplicate_signature = False
        if normalized_prompt and normalized_prompt in prior_signatures:
            duplicate_signature = True
        elif normalized_answer and normalized_answer in prior_signatures:
            duplicate_signature = True
        if duplicate_signature:
            logger.info("LLM quiz response duplicated prior question; requesting regeneration.")
            prior_examples = "\n".join(sorted(list(prior_signatures))[:5])
            additional_guardrails = (
                "\n\nPrevious questions or answers you must not repeat:\n"
                f"{prior_examples}\n"
                "Generate a distinctly different question that covers a new angle or sub-concept from the context."
            )
            if source_overview:
                additional_guardrails += f" Stay within these sources: {source_overview}."
            attempts += 1
            continue
        return payload

    return None

def set_openai_key_from_env() -> bool:
    """Set OpenAI key from env if present. Returns True if a key was set.

    This function no longer raises so the app can run in local fallback mode.
    """
    if openai is None:
        return False
    key = settings.OPENAI_API_KEY
    if not key:
        return False
    openai.api_key = key
    return True


def generate_answer_with_context(
    question: str,
    contexts: List[str],
    model: str = "gpt-3.5-turbo",
    conversation: Optional[List[Dict[str, Any]]] = None,
) -> str:
    system = "You are a helpful assistant that answers questions using the provided context. Cite sources when possible."
    joined = "\n\n---\n\n".join(contexts)
    conversation_snippet = ""
    if conversation:
        clipped = conversation[-6:]
        history_lines = [f"{turn.get('role', 'user').title()}: {turn.get('content', '')}" for turn in clipped]
        conversation_snippet = "\n\nRECENT HISTORY:\n" + "\n".join(history_lines)
    prompt = (
        "Use the following extracted notes and answer the question. "
        "If the answer is not in the notes, say you don't know and suggest how to find it."
        f"\n\nCONTEXT:\n{joined}{conversation_snippet}\n\nQUESTION: {question}\n\nAnswer concisely with references to the context."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
    ]

    provider = _get_qa_llm_provider() or "openai"
    requested_model = _get_qa_llm_model() or model

    if provider in {"openai", "auto", "default"} and openai is not None:
        if set_openai_key_from_env():
            content = _perform_openai_chat_completion(messages, requested_model, temperature=0.2, max_tokens=500)
            if content:
                return content

    if provider in {"groq", "auto"}:
        content = _call_groq_chat_completion(
            messages,
            temperature=0.2,
            max_tokens=500,
        )
        if content:
            return content

    if provider in {"ollama", "auto"}:
        combined_prompt = system + "\n\n" + prompt
        content = _call_ollama_answer_model(combined_prompt)
        if content:
            return content

    # Local fallback: find most relevant sentence from contexts
    if not contexts:
        return "I don't have any context to answer that question. Ingest notes first."
    q_tokens = re.findall(r"\w+", question.lower())
    best_sentence = None
    best_score = 0
    for ctx in contexts:
        sentences = re.split(r"(?<=[.!?])\s+", ctx)
        for s in sentences:
            s_tokens = re.findall(r"\w+", s.lower())
            score = sum(1 for t in q_tokens if t in s_tokens)
            if score > best_score:
                best_score = score
                best_sentence = s
    if best_sentence and best_score > 0:
        return f"(Local fallback) Best match from notes: {best_sentence.strip()}"
    # otherwise return short concat of top contexts
    combined = "\n\n".join(contexts)
    return f"(Local fallback) Couldn't find precise answer. Top context excerpt:\n{combined[:800]}"


def generate_summary(contexts: List[str], model: str = "gpt-3.5-turbo") -> str:
    """Generate a structured study summary using Groq API (preferred) or OpenAI as fallback."""
    
    # Enhanced prompt for better structured summaries
    enhanced_prompt = dedent("""
        Create a comprehensive, structured study guide from the provided content. Format your response as Markdown:
        
        # 📚 Executive Summary
        (2-3 sentence high-level overview)
        
        ## 🧠 Core Concepts & Functions
        *Analyse the types, functions, and characteristics found in the text.*
        • **Types/Classifications**: (List if applicable)
        • **Functions/Mechanisms**: (What does it do?)
        • **Key Definitions**: (Define 3-4 critical terms)
        
        ## 🔑 Key Takeaways
        • (List 5-6 most important points to remember)
        
        ## ⚖️ Analysis
        • **Advantages/Strengths**: (If applicable)
        • **Disadvantages/Limitations**: (If applicable)
        
        ## 📝 Study Tips
        • (2-3 practical tips for mastering this material)
        
        Use professional yet student-friendly language. Focus on depth and clarity.
        
        CONTENT:
    """).strip()
    
    joined = "\n\n".join(contexts[:8])  # Limit to first 8 chunks for better quality
    
    messages = [
        {"role": "system", "content": "You are an expert educational assistant creating high-quality study materials for students."},
        {"role": "user", "content": enhanced_prompt + "\n\n" + joined},
    ]
    
    # Try Groq first (faster and often better quality)
    if _get_groq_api_key():
        logger.info("Using Groq API for summary generation")
        content = _call_groq_chat_completion(
            messages,
            temperature=0.3,
            max_tokens=1200,
        )
        if content:
            return content
    
    # Fallback to OpenAI
    if openai is not None and set_openai_key_from_env():
        logger.info("Using OpenAI for summary generation")
        content = _perform_openai_chat_completion(messages, model, temperature=0.3, max_tokens=1200)
        if content:
            return content
    
    # Local fallback: Display first 22 chunks as requested
    if not contexts:
        return "📚 [DEBUG] The document seems empty or could not be read. Please check the content."
    
    combined_fallback = "\n\n".join(contexts[:3])
    return f"# 📚 Content Preview (Local Fallback)\n\n*API limits reached or unavailable. Displaying raw document content (First 3 Sections).*\n\n{combined_fallback}"
    
    


def generate_quiz(contexts: List[str], num_questions: int = 5, model: str = "gpt-3.5-turbo") -> str:
    if openai is not None and set_openai_key_from_env():
        joined = "\n\n".join(contexts)
        prompt = f"Create {num_questions} quiz questions (mix of MCQ and short answer) with answers and difficulty tags, based on the context:\n\n{joined}"
        messages = [
            {"role": "system", "content": "You are a teacher creating adaptive quizzes."},
            {"role": "user", "content": prompt}
        ]
        content = _perform_openai_chat_completion(messages, model, temperature=0.6, max_tokens=700)
        if content:
            return content
    # Local fallback quiz generation: make simple questions from first sentences
    if not contexts:
        return "(Local fallback) No context available to generate quiz."
    combined = "\n\n".join(contexts)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", combined) if s.strip()]
    out = []
    for i in range(min(num_questions, len(sentences))):
        q = f"Q{i+1}: What is a key point from: '{sentences[i][:80]}...'?"
        a = sentences[i][:200]
        out.append(f"{q}\nA: {a}\nDifficulty: medium")
    return "\n\n".join(["(Local fallback) " + o for o in out])


def _sanitize_statement(value: str) -> Optional[str]:
    cleaned = re.sub(r"\s+", " ", value or "").strip("\"' `")
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if any(prefix in lowered for prefix in ("http://", "https://", "www.", "brainkart")):
        return None
    if len(cleaned.split()) < 5:
        return None
    if sum(1 for char in cleaned if char.isdigit()) > 8:
        return None
    if cleaned.count(" - ") >= 4:
        return None
    max_length = 220
    if len(cleaned) > max_length:
        snippet = cleaned[:max_length].rstrip()
        if " " in snippet:
            snippet = snippet.rsplit(" ", 1)[0]
        cleaned = f"{snippet}..."
    return cleaned


def _extract_sentences(contexts: List[str]) -> List[str]:
    sentences: List[str] = []
    for ctx in contexts:
        for sentence in re.split(r"(?<=[.!?])\s+", ctx):
            cleaned = _sanitize_statement(sentence)
            if cleaned:
                sentences.append(cleaned)
    return sentences



def build_quiz_prompt(text: str, difficulty: str, count: int, types: Optional[Sequence[str]]) -> str:
    """Construct a strict JSON-generation prompt tailored for quiz creation."""
    allowed_types = ("mcq", "tf", "short", "fill")
    requested_types = [t for t in (types or []) if t in allowed_types]
    if not requested_types:
        requested_types = list(allowed_types)

    difficulty_key = (difficulty or "medium").strip().lower()
    difficulty_key = difficulty_key if difficulty_key in {"easy", "medium", "hard"} else "medium"
    difficulty_directives = {
        "easy": "Focus on direct recall facts with clear correct answers.",
        "medium": "Emphasize conceptual reasoning that links ideas together.",
        "hard": "Demand higher-order thinking with plausible but incorrect distractors.",
    }

    notes = text.strip()
    schema_block = (
        "{\n"
        '  "questions": [\n'
        '    {\n'
        '      "type": "mcq",\n'
        '      "question": "",\n'
        '      "options": ["", "", "", ""],\n'
        '      "answer": ""\n'
        "    },\n"
        "    {\n"
        '      "type": "tf",\n'
        '      "question": "",\n'
        '      "answer": ""\n'
        "    },\n"
        "    {\n"
        '      "type": "short",\n'
        '      "question": "",\n'
        '      "answer": ""\n'
        "    },\n"
        "    {\n"
        '      "type": "fill",\n'
        '      "question": "",\n'
        '      "answer": ""\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    instructions = dedent(
        f"""
        SYSTEM INSTRUCTIONS:
        - You are an instructional designer producing adaptive quiz content.
        - Rely exclusively on the provided context excerpts.
        - Ensure each run yields novel questions even when the context repeats.
        - {difficulty_directives[difficulty_key]}
        - Allowed question types: {', '.join(allowed_types)}. Use only the requested subset.
        - Do not add commentary, explanations, Markdown, or stray text.
        - Output exactly one JSON object matching the schema. Do not alter key names.
        - Omit any question objects whose type was not requested.

        USER REQUEST:
        - Generate {count} questions at {difficulty_key} difficulty.
        - Requested types (in any order): {', '.join(requested_types)}.
        - When generating MCQ, supply exactly four concise options with one correct answer.
        - True/false questions must use factual statements grounded in the context.
        - Short answers should be answerable in one short phrase or sentence.
        - Fill questions must contain exactly one blank represented by "_____" in the question text.
        - Keep wording student-friendly and avoid repeating identical phrasing across questions.

        JSON FORMAT (STRICT):
        {schema_block}

        CONTEXT (USE ONLY THIS MATERIAL):
        <<<NOTES>>>
        {notes}
        <<<END NOTES>>>

        REMINDERS:
        - Return ONLY the JSON object.
        - Do not wrap the JSON in code fences.
        - Do not include trailing commas.
        """
    ).strip()

    return instructions



def generate_adaptive_quiz_question(
    topic: Optional[str],
    contexts: List[str],
    difficulty: str,
    last_turn: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    focus_concept: Optional[str] = None,
    source_names: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    """Public wrapper that delegates to the enhanced adaptive quiz generator."""

    llm_payload = _generate_quiz_question_with_llm(
        topic=topic,
        contexts=contexts,
        difficulty=difficulty,
        history=history,
        focus_concept=focus_concept,
        source_names=source_names,
    )
    if llm_payload:
        return llm_payload

    logger.warning("LLM quiz generator failed; using deterministic fallback question.")
    return _generate_fallback_quiz_question(
        topic=topic,
        contexts=contexts,
        difficulty=difficulty,
        focus_concept=focus_concept,
        history=history,
    )
