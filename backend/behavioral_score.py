import json
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

def load_profiles():
    with open("data/user_profiles.json", "r") as f:
        profiles =  json.load(f)
    return{p["user_id"]:p for p in profiles}

PROFILES= load_profiles()

def build_training_data(profile):
    sessions=[]
    for _ in range(100):
        keystroke = np.random.normal(
            profile["avg_keystroke_delay_ms"],
            profile["keystroke_std_deviation"]
        )
        
        session_dur = np.random.normal(
            profile["avg_session_duration_ms"],500
        )
        hour = np.random.choice(profile["typical_hours"])
        backspace = np.random.normal(profile["backspace_rate"], 0.01)

        sessions.append([keystroke, session_dur, hour, backspace])

    return np.array(sessions)

def train_model(profile):
    training_data = build_training_data(profile)
    model = IsolationForest(
        contamination=0.05,
        random_state=42
    )
    model.fit(training_data)
    return model

# Train a model for every user at startup
# This takes a few seconds but only happens once
print(" Training behavioral models for all users...")
MODELS = {
    user_id: train_model(profile)
    for user_id, profile in PROFILES.items()
}
print(f" Trained {len(MODELS)} behavioral models")

#step 3 - score live behaviour

def compute_behavioral_score(user_id: str, behavior: dict) -> dict:
    """
    Takes live behavior from PaymentForm
    Compares it against this user's trained model
    Returns score 0-100 + which signals fired
    """

    # If user not found, give medium-high risk
    if user_id not in PROFILES:
        return {
            "score": 65,
            "signals": ["unknown_user"]
        }

    profile = PROFILES[user_id]
    model = MODELS[user_id]

    # ── Extract live signals ──
    live_keystroke = behavior.get("keystroke_mean_delay", 150)
    live_session = behavior.get("session_duration_ms", 5000)
    live_hour = behavior.get("time_of_day_hour", 12)
    live_backspace = behavior.get("backspace_count", 0) / max(
        behavior.get("keystroke_count", 1), 1
    )
    live_device = behavior.get("device_fingerprint", "")

    # ── Run Isolation Forest ──
    live_data = np.array([[
        live_keystroke,
        live_session,
        live_hour,
        live_backspace
    ]])

    # Score: -1 = anomaly, 1 = normal
    # decision_function gives confidence: more negative = more anomalous
    raw_score = model.decision_function(live_data)[0]

    # Convert to 0-100 scale
    # raw_score typically ranges from -0.5 to 0.5
    normalized = (raw_score + 0.5) / 1.0         # shift to 0-1
    normalized = max(0.0, min(1.0, normalized))   # clamp to 0-1
    isolation_risk = round((1 - normalized) * 100) # invert: high = risky


    # ── Check individual signals ──
    # These add transparency — judges can see WHY it's flagged
    signals = []

    # Keystroke too slow compared to their normal
    keystroke_deviation = abs(
        live_keystroke - profile["avg_keystroke_delay_ms"]
    ) / max(profile["keystroke_std_deviation"], 1)

    if keystroke_deviation > 3:
        signals.append("keystroke_pattern_mismatch")

    # Unusual hour
    if live_hour not in profile["typical_hours"]:
        signals.append("unusual_transaction_hour")

    # Unknown device
    if live_device and live_device not in profile["known_devices"]:
        signals.append("unknown_device_detected")

    # Session too long (hesitant, unfamiliar)
    if live_session > profile["avg_session_duration_ms"] * 2:
        signals.append("unusually_long_session")

    # Too many backspaces (nervous, reading from note)
    if live_backspace > profile["backspace_rate"] * 3:
        signals.append("high_backspace_rate")

    # Unusual amount
    amount = behavior.get("amount", 0)
    if amount > profile["typical_amount_max"] * 2:
        signals.append("unusually_high_amount")


    # ── Combine isolation score + signal penalties ──
    # Each signal adds extra risk on top of ML score
    signal_penalty = len(signals) * 8  # 8 points per fired signal
    final_score = min(100, isolation_risk + signal_penalty)

    return {
        "score": final_score,
        "signals": signals,
        "details": {
            "isolation_risk": isolation_risk,
            "keystroke_deviation": round(keystroke_deviation, 2),
            "live_keystroke_ms": live_keystroke,
            "expected_keystroke_ms": profile["avg_keystroke_delay_ms"],
            "live_hour": live_hour,
            "typical_hours": profile["typical_hours"],
            "device_known": live_device in profile["known_devices"]
        }
    }

