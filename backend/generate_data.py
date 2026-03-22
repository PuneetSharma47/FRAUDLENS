# generate_data.py
# Run this ONCE before the hackathon demo
# Command: python generate_data.py

import json
import random
import os
import pandas as pd
from faker import Faker
from datetime import datetime, timedelta

fake = Faker('en_IN')
random.seed(42)

# Make sure data folder exists
os.makedirs("data", exist_ok=True)

# ─────────────────────────────────────────
# STEP 1: GENERATE 50 USER PROFILES
# ─────────────────────────────────────────

users = []
for i in range(50):
    user_id = f"u_{1000 + i}"

    avg_keystroke = random.randint(80, 150)
    typical_hours = random.sample(range(8, 23), random.randint(2, 4))
    known_devices = [fake.md5()[:8] for _ in range(random.randint(1, 2))]
    known_locations = random.sample(
        ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad',
         'Chennai', 'Kolkata', 'Jaipur'],
        random.randint(1, 2)
    )
    min_amt = random.choice([100, 200, 500])
    max_amt = random.choice([1000, 2000, 5000, 10000])

    users.append({
        "user_id": user_id,
        "name": fake.name(),
        "avg_keystroke_delay_ms": avg_keystroke,
        "keystroke_std_deviation": random.randint(10, 25),
        "avg_session_duration_ms": random.randint(3000, 7000),
        "typical_hours": typical_hours,
        "known_devices": known_devices,
        "known_locations": known_locations,
        "typical_amount_min": min_amt,
        "typical_amount_max": max_amt,
        "backspace_rate": round(random.uniform(0.01, 0.08), 3)
    })

with open("data/user_profiles.json", "w") as f:
    json.dump(users, f, indent=2)

print(f"✅ Generated {len(users)} user profiles")


# ─────────────────────────────────────────
# STEP 2: GENERATE 400 NORMAL TRANSACTIONS
# ─────────────────────────────────────────

transactions = []
user_ids = [u["user_id"] for u in users]
base_time = datetime.now() - timedelta(days=30)

for i in range(400):
    sender = random.choice(users)
    receiver_id = random.choice(
        [uid for uid in user_ids if uid != sender["user_id"]]
    )
    amount = random.randint(
        sender["typical_amount_min"],
        sender["typical_amount_max"]
    )
    hour = random.choice(sender["typical_hours"])
    txn_time = base_time + timedelta(
        days=random.randint(0, 29),
        hours=hour,
        minutes=random.randint(0, 59)
    )

    transactions.append({
        "txn_id": f"txn_{1000 + i}",
        "sender_id": sender["user_id"],
        "receiver_id": receiver_id,
        "amount": amount,
        "timestamp": txn_time.strftime("%Y-%m-%d %H:%M:%S"),
        "is_fraud": 0,
        "fraud_type": "none"
    })


# ─────────────────────────────────────────
# STEP 3: GENERATE FRAUDULENT TRANSACTIONS
# ─────────────────────────────────────────

# --- FRAUD TYPE 1: MULE CHAIN ---
mule_id = "u_1040"

for i in range(33):
    txn_time = base_time + timedelta(
        days=random.randint(0, 29),
        hours=random.randint(0, 3),
        minutes=random.randint(0, 59)
    )

    # Money IN to mule
    transactions.append({
        "txn_id": f"txn_mule_in_{i}",
        "sender_id": random.choice(user_ids),
        "receiver_id": mule_id,
        "amount": random.randint(5000, 20000),
        "timestamp": txn_time.strftime("%Y-%m-%d %H:%M:%S"),
        "is_fraud": 1,
        "fraud_type": "mule_chain"
    })

    # Money OUT from mule (minutes later)
    transactions.append({
        "txn_id": f"txn_mule_out_{i}",
        "sender_id": mule_id,
        "receiver_id": "u_1049",
        "amount": random.randint(4000, 18000),
        "timestamp": (txn_time + timedelta(
            minutes=random.randint(2, 8)
        )).strftime("%Y-%m-%d %H:%M:%S"),
        "is_fraud": 1,
        "fraud_type": "mule_chain"
    })


# --- FRAUD TYPE 2: STAR PATTERN ---
aggregator_id = "u_1045"

for i in range(34):
    txn_time = base_time + timedelta(
        days=random.randint(0, 5),
        hours=random.randint(10, 14),
        minutes=random.randint(0, 59)
    )

    transactions.append({
        "txn_id": f"txn_star_{i}",
        "sender_id": random.choice(user_ids),
        "receiver_id": aggregator_id,
        "amount": random.randint(10, 50),
        "timestamp": txn_time.strftime("%Y-%m-%d %H:%M:%S"),
        "is_fraud": 1,
        "fraud_type": "star_aggregation"
    })


# --- FRAUD TYPE 3: VELOCITY LOOP ---
loop_users = ["u_1010", "u_1020", "u_1030"]

for i in range(33):
    txn_time = base_time + timedelta(
        days=random.randint(0, 29),
        hours=random.randint(1, 4),
        minutes=0
    )

    for j, (sender, receiver) in enumerate(
        zip(loop_users, loop_users[1:] + [loop_users[0]])
    ):
        transactions.append({
            "txn_id": f"txn_loop_{i}_{j}",
            "sender_id": sender,
            "receiver_id": receiver,
            "amount": random.randint(10000, 50000),
            "timestamp": (txn_time + timedelta(
                minutes=j * 3
            )).strftime("%Y-%m-%d %H:%M:%S"),
            "is_fraud": 1,
            "fraud_type": "velocity_loop"
        })


# ─────────────────────────────────────────
# STEP 4: SAVE EVERYTHING
# ─────────────────────────────────────────

df = pd.DataFrame(transactions)
df = df.sort_values("timestamp").reset_index(drop=True)
df.to_csv("data/transactions.csv", index=False)

print(f"✅ Generated {len(df)} transactions")
print(f"   Normal:        {len(df[df['is_fraud'] == 0])}")
print(f"   Fraudulent:    {len(df[df['is_fraud'] == 1])}")
print(f"   Mule chain:    {len(df[df['fraud_type'] == 'mule_chain'])}")
print(f"   Star pattern:  {len(df[df['fraud_type'] == 'star_aggregation'])}")
print(f"   Velocity loop: {len(df[df['fraud_type'] == 'velocity_loop'])}")
print()
print("📁 Files saved:")
print("   data/user_profiles.json")
print("   data/transactions.csv")
print()
print("🚀 You're ready. Run the backend now:")
print("   uvicorn main:app --reload")
