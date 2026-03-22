# main.py
# The bridge between React frontend and Python backend
# Run with: uvicorn main:app --reload
# Runs on: http://localhost:8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import pandas as pd

from behavioral_score import compute_behavioral_score, MODELS
from graph_score import compute_graph_score, generate_graph_html
from risk_engine import combine_scores, get_score_breakdown

# ─────────────────────────────────────────
# CREATE THE APP
# ─────────────────────────────────────────

app = FastAPI(
    title="FraudLens API",
    description="AI-Powered Payment Fraud Detection",
    version="1.0.0"
)

# ─────────────────────────────────────────
# CORS MIDDLEWARE
# Without this React on :3000 cannot talk
# to FastAPI on :8000 — browser blocks it
# ─────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# REQUEST MODELS
# Defines exact shape of data coming in
# Pydantic validates everything automatically
# If wrong data comes in — auto error response
# ─────────────────────────────────────────

class BehaviorData(BaseModel):
    keystroke_mean_delay : float = 150
    session_duration_ms  : float = 5000
    time_of_day_hour     : int   = 12
    device_fingerprint   : str   = ""
    backspace_count      : int   = 0
    keystroke_count      : int   = 1

class TransactionRequest(BaseModel):
    sender_id   : str
    receiver_id : str
    amount      : float
    behavior    : BehaviorData

# ─────────────────────────────────────────
# API 1 — ANALYZE TRANSACTION
# The most important endpoint
# Called by PaymentForm.jsx on every payment
# ─────────────────────────────────────────

@app.post("/analyze-transaction")
async def analyze_transaction(request: TransactionRequest):

    # ── Convert behavior to dict ──
    behavior_dict         = request.behavior.dict()
    behavior_dict["amount"] = request.amount

    # ── Run behavioral scorer ──
    behavioral_result = compute_behavioral_score(
        request.sender_id,
        behavior_dict
    )

    # ── Run graph scorer ──
    graph_result = compute_graph_score(
        request.sender_id,
        request.receiver_id,
        request.amount
    )

    # ── Combine into final decision ──
    final_score, verdict, explanation = combine_scores(
        behavioral_result,
        graph_result
    )

    # ── Get detailed breakdown ──
    breakdown = get_score_breakdown(
        behavioral_result,
        graph_result
    )

    # ── Save live transaction to CSV ──
    # Keeps the graph learning during demo
    try:
        new_txn = pd.DataFrame([{
            "txn_id"     : f"live_{pd.Timestamp.now().strftime('%H%M%S%f')}",
            "sender_id"  : request.sender_id,
            "receiver_id": request.receiver_id,
            "amount"     : request.amount,
            "timestamp"  : pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_fraud"   : 1 if final_score > 70 else 0,
            "fraud_type" : "live_detection" if final_score > 70 else "none"
        }])

        existing = pd.read_csv("data/transactions.csv")
        updated  = pd.concat([existing, new_txn], ignore_index=True)
        updated.to_csv("data/transactions.csv", index=False)

    except Exception as e:
        print(f"⚠️ Could not save transaction: {e}")

    # ── Return full response to React ──
    return {
        "behavioral_risk"    : behavioral_result["score"],
        "behavioral_signals" : behavioral_result["signals"],
        "behavioral_details" : behavioral_result.get("details", {}),

        "graph_risk"         : graph_result["score"],
        "graph_signals"      : graph_result["signals"],
        "graph_details"      : graph_result.get("details", {}),

        "final_score"        : final_score,
        "verdict"            : verdict,
        "explanation"        : explanation,
        "risk_level"         : breakdown["risk_level"],
        "risk_color"         : breakdown["risk_color"],

        "transaction"        : {
            "sender_id"  : request.sender_id,
            "receiver_id": request.receiver_id,
            "amount"     : request.amount
        }
    }


# ─────────────────────────────────────────
# API 2 — GRAPH VISUALIZATION
# Returns the transaction network as HTML
# Called by Dashboard.jsx to show fraud map
# ─────────────────────────────────────────

@app.get("/graph", response_class=HTMLResponse)
async def get_graph():
    try:
        html = generate_graph_html()
        return HTMLResponse(content=html)
    except Exception as e:
        return HTMLResponse(
            content=f"<h1 style='color:red'>Graph error: {e}</h1>"
        )


# ─────────────────────────────────────────
# API 3 — HEALTH CHECK
# Run this to confirm backend is working
# Open: http://localhost:8000/health
# ─────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status"        : "running",
        "models_loaded" : len(MODELS),
        "message"       : "FraudLens backend is online"
    }


# ─────────────────────────────────────────
# API 4 — GET ALL TRANSACTIONS
# Returns transaction history for dashboard
# ─────────────────────────────────────────

@app.get("/transactions")
async def get_transactions():
    try:
        df = pd.read_csv("data/transactions.csv")

        # Return last 20 transactions
        recent = df.tail(20).to_dict(orient="records")
        total  = len(df)
        fraud  = len(df[df["is_fraud"] == 1])
        clean  = len(df[df["is_fraud"] == 0])

        return {
            "transactions" : recent,
            "total"        : total,
            "fraud_count"  : fraud,
            "clean_count"  : clean,
            "fraud_rate"   : round(fraud / total * 100, 1)
        }

    except Exception as e:
        return {"error": str(e), "transactions": []}


# ─────────────────────────────────────────
# API 5 — GET USER PROFILE
# Returns stored behavioral baseline for a user
# Useful for debugging during hackathon
# ─────────────────────────────────────────

@app.get("/user/{user_id}")
async def get_user(user_id: str):
    try:
        import json
        with open("data/user_profiles.json", "r") as f:
            profiles = json.load(f)

        profile = next(
            (p for p in profiles if p["user_id"] == user_id),
            None
        )

        if not profile:
            return {"error": f"User {user_id} not found"}

        return profile

    except Exception as e:
        return {"error": str(e)}