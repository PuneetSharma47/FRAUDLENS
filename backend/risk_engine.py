# STEP 1: EXPLANATION GENERATOR
# Turns signal codes into human sentences
# This is what judges see on the dashboard
# ─────────────────────────────────────────

# Maps each signal code to a readable sentence
SIGNAL_MESSAGES = {
    # Behavioral signals
    "keystroke_pattern_mismatch":
        "Typing rhythm doesn't match user's baseline",
    "unusual_transaction_hour":
        "Transaction at unusual hour for this user",
    "unknown_device_detected":
        "Unrecognized device fingerprint",
    "unusually_long_session":
        "Session duration 2x longer than normal",
    "high_backspace_rate":
        "Unusually high correction rate — hesitant input",
    "unusually_high_amount":
        "Amount significantly higher than user's typical range",
    "unknown_user":
        "User profile not found in system",

    # Graph signals
    "mule_chain_detected":
        "Receiver flagged in known money mule network",
    "star_aggregation_detected":
        "Receiver shows aggregation fraud pattern",
    "velocity_loop_detected":
        "Circular transaction pattern detected (layering fraud)",
    "unusually_large_amount":
        "Transaction amount 5x above average",
}


def generate_explanation(all_signals):
    """
    Takes list of fired signal codes
    Returns one clean sentence for the dashboard
    """
    if not all_signals:
        return "Transaction matches user behavioral profile and network appears clean"

    # Convert signal codes to readable messages
    messages = []
    for signal in all_signals:
        if signal in SIGNAL_MESSAGES:
            messages.append(SIGNAL_MESSAGES[signal])

    if not messages:
        return "Anomalous patterns detected"

    # Join into one sentence
    if len(messages) == 1:
        return messages[0]
    elif len(messages) == 2:
        return f"{messages[0]} + {messages[1]}"
    else:
        # For 3+ signals, show first two + count of remaining
        return f"{messages[0]} + {messages[1]} (+ {len(messages)-2} more signals)"


# ─────────────────────────────────────────
# STEP 2: VERDICT THRESHOLD
# Applies score thresholds to decide action
# ─────────────────────────────────────────

def apply_verdict(final_score):
    """
    0-39   → APPROVE  (safe, let it through)
    40-69  → REVIEW   (suspicious, trigger OTP)
    70-100 → BLOCK    (high confidence fraud, stop it)
    """
    if final_score < 40:
        return "APPROVE"
    elif final_score < 70:
        return "REVIEW"
    else:
        return "BLOCK"
    
# STEP 3: COMBINE SCORES
# Main function called by main.py
# ─────────────────────────────────────────

def combine_scores(behavioral_result, graph_result):
    """
    Takes outputs from both analyzers
    Combines with weighted formula
    Returns final_score, verdict, explanation

    Why 40/60 weighting:
    - Graph signals are higher confidence (structural patterns)
    - Behavioral signals catch individual attacks
    - 60% graph weight prioritizes organized fraud detection
    """

    b_score = behavioral_result.get("score", 0)
    g_score = graph_result.get("score", 0)

    # Weighted combination
    # behavioral × 0.4 + graph × 0.6
    raw_combined = (b_score * 0.4) + (g_score * 0.6)
    final_score = round(raw_combined)

    # Cap at 100
    final_score = min(100, max(0, final_score))

    # Get verdict
    verdict = apply_verdict(final_score)

    # Combine all signals from both systems
    behavioral_signals = behavioral_result.get("signals", [])
    graph_signals = graph_result.get("signals", [])
    all_signals = behavioral_signals + graph_signals

    # Generate explanation
    explanation = generate_explanation(all_signals)

    return final_score, verdict, explanation


# ─────────────────────────────────────────
# STEP 4: SCORE BREAKDOWN
# Extra detail for the dashboard display
# ─────────────────────────────────────────

def get_score_breakdown(behavioral_result, graph_result):
    """
    Returns detailed breakdown for dashboard
    Shows exactly what contributed to the score
    """
    b_score = behavioral_result.get("score", 0)
    g_score = graph_result.get("score", 0)

    final_score = round((b_score * 0.4) + (g_score * 0.6))
    final_score = min(100, max(0, final_score))

    verdict = apply_verdict(final_score)

    # Risk level label
    if final_score < 20:
        risk_level = "VERY LOW"
        risk_color = "green"
    elif final_score < 40:
        risk_level = "LOW"
        risk_color = "green"
    elif final_score < 60:
        risk_level = "MEDIUM"
        risk_color = "yellow"
    elif final_score < 80:
        risk_level = "HIGH"
        risk_color = "orange"
    else:
        risk_level = "CRITICAL"
        risk_color = "red"

    return {
        "behavioral_score": b_score,
        "behavioral_weight": 0.4,
        "behavioral_contribution": round(b_score * 0.4),
        "behavioral_signals": behavioral_result.get("signals", []),

        "graph_score": g_score,
        "graph_weight": 0.6,
        "graph_contribution": round(g_score * 0.6),
        "graph_signals": graph_result.get("signals", []),

        "final_score": final_score,
        "verdict": verdict,
        "risk_level": risk_level,
        "risk_color": risk_color,

        "explanation": generate_explanation(
            behavioral_result.get("signals", []) +
            graph_result.get("signals", [])
        )
    }
