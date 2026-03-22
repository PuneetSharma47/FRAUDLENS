// PaymentForm.jsx
import { useState, useEffect } from "react"
import axios from "axios"
import tracker from "./behaviortracker"

export default function PaymentForm({ onPaymentStart, onAnalysisComplete }) {

  const [senderId,   setSenderId]   = useState("u_1001")
  const [receiverId, setReceiverId] = useState("")
  const [amount,     setAmount]     = useState("")
  const [error,      setError]      = useState("")
  const [loading,    setLoading]    = useState(false)
  const [showPin,    setShowPin]    = useState(false)
  const [pin,        setPin]        = useState("")
  const [pinTimings, setPinTimings] = useState([])
  const [lastPinTime, setLastPinTime] = useState(null)

  useEffect(() => { tracker.reset() }, [])

  const handleKeyDown = (e) => { tracker.recordKeystroke(e.key) }

  const validate = () => {
    if (!senderId.trim())  { setError("Sender ID is required"); return false }
    if (!receiverId.trim()) { setError("Receiver UPI ID is required"); return false }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount"); return false
    }
    if (senderId === receiverId) { setError("Cannot send to yourself"); return false }
    setError("")
    return true
  }

  // When Pay Now clicked — show PIN pad first
  const handlePayClick = () => {
    if (!validate()) return
    setShowPin(true)
    setPin("")
    setPinTimings([])
    setLastPinTime(null)
  }

  // Record each PIN digit tap timing
  const handlePinDigit = (digit) => {
    if (pin.length >= 6) return
    const now = Date.now()
    if (lastPinTime !== null) {
      setPinTimings(prev => [...prev, now - lastPinTime])
    }
    setLastPinTime(now)
    setPin(prev => prev + digit)
  }

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  // After PIN entered — send to backend
  const handlePinConfirm = async () => {
    if (pin.length < 4) { setError("Enter at least 4 digits"); return }

    setShowPin(false)
    setLoading(true)
    onPaymentStart()

    try {
      const behaviorData = tracker.getPayload(senderId, amount)

      // Add PIN timing to behavior data
      const pinMeanDelay = pinTimings.length > 0
        ? pinTimings.reduce((a, b) => a + b, 0) / pinTimings.length
        : behaviorData.keystroke_mean_delay

      const requestBody = {
        sender_id   : senderId,
        receiver_id : receiverId,
        amount      : parseFloat(amount),
        behavior    : {
          keystroke_mean_delay : pinMeanDelay,
          session_duration_ms  : behaviorData.session_duration_ms,
          time_of_day_hour     : behaviorData.time_of_day_hour,
          device_fingerprint   : behaviorData.device_fingerprint,
          backspace_count      : behaviorData.backspace_count,
          keystroke_count      : pin.length
        }
      }

      const response = await axios.post(
        "http://localhost:8000/analyze-transaction",
        requestBody
      )

      onAnalysisComplete(response.data, {
        sender_id   : senderId,
        receiver_id : receiverId,
        amount      : parseFloat(amount)
      })

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Backend not reachable. Run: uvicorn main:app --reload"
      )
      onAnalysisComplete(null, null)
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateAttacker = () => {
    setSenderId("u_1001")
    setReceiverId("u_1040")
    setAmount("14763")
    setError("")
    tracker.simulateAttacker()
  }

  const handleSimulateLegit = () => {
    setSenderId("u_1001")
    setReceiverId("u_1007")
    setAmount("500")
    setError("")
    tracker.reset()
  }

  const s = {
    container: {
      backgroundColor:"#0C1120", border:"1px solid #1A2540",
      borderRadius:"16px", padding:"28px", fontFamily:"monospace"
    },
    label: {
      display:"block", fontSize:"0.75rem", color:"#64748B",
      marginBottom:"6px", letterSpacing:"1px", textTransform:"uppercase"
    },
    input: {
      width:"100%", backgroundColor:"#050810", border:"1px solid #1A2540",
      borderRadius:"8px", padding:"10px 14px", color:"#E2E8F0",
      fontSize:"0.95rem", fontFamily:"monospace", outline:"none",
      boxSizing:"border-box", marginBottom:"16px"
    },
    payBtn: {
      width:"100%", backgroundColor:"#3B82F6", color:"#fff",
      border:"none", borderRadius:"10px", padding:"14px",
      fontSize:"1rem", fontWeight:"700", fontFamily:"monospace",
      cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.7 : 1, marginBottom:"12px", letterSpacing:"1px"
    },
    demoBtn: (color) => ({
      flex:1, backgroundColor:"transparent", border:`1px solid ${color}`,
      borderRadius:"8px", padding:"8px", color, fontSize:"0.75rem",
      fontFamily:"monospace", cursor:"pointer", fontWeight:"600"
    }),
    error: {
      backgroundColor:"#1a0a0a", border:"1px solid #EF4444",
      borderRadius:"8px", padding:"10px 14px", color:"#EF4444",
      fontSize:"0.82rem", marginBottom:"12px"
    },
    divider: { border:"none", borderTop:"1px solid #1A2540", margin:"20px 0" },
    infoRow: { display:"flex", justifyContent:"space-between", marginBottom:"6px" },
    infoLabel: { fontSize:"0.75rem", color:"#64748B" },
    infoValue: { fontSize:"0.75rem", color:"#E2E8F0", fontFamily:"monospace" },

    // PIN Pad styles
    pinOverlay: {
      position:"fixed", top:0, left:0, width:"100%", height:"100%",
      backgroundColor:"rgba(0,0,0,0.85)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000
    },
    pinBox: {
      backgroundColor:"#0C1120", border:"1px solid #1A2540",
      borderRadius:"20px", padding:"32px", width:"300px",
      fontFamily:"monospace", textAlign:"center"
    },
    pinDots: {
      display:"flex", justifyContent:"center", gap:"12px", margin:"20px 0"
    },
    pinDot: (filled) => ({
      width:"14px", height:"14px", borderRadius:"50%",
      backgroundColor: filled ? "#3B82F6" : "#1A2540",
      transition:"background-color 0.15s"
    }),
    pinGrid: {
      display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px",
      marginBottom:"12px"
    },
    pinDigitBtn: {
      backgroundColor:"#131929", border:"1px solid #1A2540",
      borderRadius:"12px", padding:"16px", fontSize:"1.2rem",
      color:"#E2E8F0", fontFamily:"monospace", cursor:"pointer",
      fontWeight:"700"
    },
    pinConfirmBtn: {
      width:"100%", backgroundColor:"#3B82F6", color:"#fff",
      border:"none", borderRadius:"10px", padding:"14px",
      fontSize:"1rem", fontWeight:"700", fontFamily:"monospace",
      cursor:"pointer", marginTop:"8px"
    }
  }

  return (
    <div style={s.container}>

      {/* PIN PAD OVERLAY */}
      {showPin && (
        <div style={s.pinOverlay}>
          <div style={s.pinBox}>
            <p style={{color:"#64748B", fontSize:"0.75rem",
                       letterSpacing:"1px", textTransform:"uppercase",
                       margin:"0 0 4px 0"}}>
              UPI PIN
            </p>
            <p style={{color:"#E2E8F0", fontSize:"1rem",
                       fontWeight:"700", margin:"0 0 4px 0"}}>
              Enter your 6-digit PIN
            </p>
            <p style={{color:"#64748B", fontSize:"0.72rem", margin:0}}>
              🔴 Behavioral tracking active
            </p>

            {/* PIN dots */}
            <div style={s.pinDots}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={s.pinDot(i < pin.length)} />
              ))}
            </div>

            {/* Number grid */}
            <div style={s.pinGrid}>
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <button key={d} style={s.pinDigitBtn}
                  onClick={() => handlePinDigit(String(d))}>
                  {d}
                </button>
              ))}
              <button style={s.pinDigitBtn}
                onClick={handlePinBackspace}>⌫</button>
              <button style={s.pinDigitBtn}
                onClick={() => handlePinDigit("0")}>0</button>
              <button style={{...s.pinDigitBtn,
                backgroundColor:"#1a2540"}}
                onClick={handlePinConfirm}>✓</button>
            </div>

            <p style={{color:"#64748B", fontSize:"0.7rem", margin:"8px 0 0 0"}}>
              Tap speed is being recorded silently
            </p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{marginBottom:"24px"}}>
        <h2 style={{fontSize:"1.2rem", fontWeight:"700",
                    color:"#E2E8F0", margin:"0 0 4px 0"}}>
          💳 UPI Payment
        </h2>
        <p style={{fontSize:"0.8rem", color:"#64748B", margin:0}}>
          Behavioral tracking active — monitoring silently
        </p>
      </div>

      {/* DEMO BUTTONS */}
      <div style={{display:"flex", gap:"8px", marginBottom:"16px"}}>
        <button style={s.demoBtn("#10B981")} onClick={handleSimulateLegit}>
          ✅ Demo: Legitimate
        </button>
        <button style={s.demoBtn("#EF4444")} onClick={handleSimulateAttacker}>
          🚨 Demo: Attacker
        </button>
      </div>

      <hr style={s.divider} />

      <label style={s.label}>Your UPI ID</label>
      <input style={s.input} type="text" value={senderId}
        onChange={e => setSenderId(e.target.value)}
        onKeyDown={handleKeyDown} placeholder="e.g. u_1001" />

      <label style={s.label}>Pay To (UPI ID)</label>
      <input style={s.input} type="text" value={receiverId}
        onChange={e => setReceiverId(e.target.value)}
        onKeyDown={handleKeyDown} placeholder="e.g. u_1007" />

      <label style={s.label}>Amount (₹)</label>
      <input style={s.input} type="number" value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={handleKeyDown} placeholder="e.g. 500" min="1" />

      {error && <div style={s.error}>⚠️ {error}</div>}

      <button style={s.payBtn} onClick={handlePayClick} disabled={loading}>
        {loading ? "⏳ Analyzing..." : "PAY NOW →"}
      </button>

      <hr style={s.divider} />

      {/* LIVE SIGNALS */}
      <p style={{fontSize:"0.72rem", color:"#64748B", margin:"0 0 10px 0",
                 letterSpacing:"1px", textTransform:"uppercase"}}>
        Live Behavioral Signals
      </p>
      <div style={s.infoRow}>
        <span style={s.infoLabel}>Keystroke Delays Recorded</span>
        <span style={{...s.infoValue, color:"#10B981"}}>Active</span>
      </div>
      <div style={s.infoRow}>
        <span style={s.infoLabel}>Device Fingerprint</span>
        <span style={{...s.infoValue, color:"#3B82F6"}}>
          {tracker.getDeviceFingerprint()}
        </span>
      </div>
      <div style={s.infoRow}>
        <span style={s.infoLabel}>Current Hour</span>
        <span style={s.infoValue}>{new Date().getHours()}:00</span>
      </div>
      <div style={s.infoRow}>
        <span style={s.infoLabel}>Session Time</span>
        <span style={s.infoValue}>Active</span>
      </div>

    </div>
  )
}