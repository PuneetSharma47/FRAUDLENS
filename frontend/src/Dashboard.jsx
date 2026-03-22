// Dashboard.jsx
import { useState } from "react"

export default function Dashboard({ result, transaction, isLoading, onReset, history }) {

  const [showDetails, setShowDetails] = useState(false)
  const [showGraph,   setShowGraph]   = useState(false)

  const s = {
    container: {
      backgroundColor:"#0C1120", border:"1px solid #1A2540",
      borderRadius:"16px", padding:"28px", fontFamily:"monospace",
      minHeight:"400px"
    },
    divider: { border:"none", borderTop:"1px solid #1A2540", margin:"16px 0" },
    scoreLabel: {
      fontSize:"0.72rem", color:"#64748B", letterSpacing:"1px",
      textTransform:"uppercase", marginBottom:"6px"
    },
    scoreBar: {
      width:"100%", height:"6px", backgroundColor:"#1A2540",
      borderRadius:"3px", margin:"8px 0 16px 0", overflow:"hidden"
    },
    scoreBarFill: (width, color) => ({
      width:`${width}%`, height:"100%", backgroundColor:color,
      borderRadius:"3px", transition:"width 0.8s ease"
    }),
    verdictBox: (color, bg) => ({
      backgroundColor:bg, border:`1px solid ${color}`,
      borderRadius:"12px", padding:"20px", textAlign:"center",
      marginBottom:"16px"
    }),
    signalTag: (color) => ({
      display:"inline-block", backgroundColor:"rgba(255,255,255,0.04)",
      border:`1px solid ${color}`, borderRadius:"4px", padding:"2px 8px",
      fontSize:"0.72rem", color, margin:"3px 3px 3px 0"
    }),
    statBox: (color) => ({
      backgroundColor:"#060a14", border:`1px solid ${color}`,
      borderRadius:"10px", padding:"12px 16px", textAlign:"center", flex:1
    }),
    historyRow: (color) => ({
      display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"8px 12px", backgroundColor:"#060a14",
      border:`1px solid ${color}`, borderRadius:"8px", marginBottom:"6px"
    })
  }

  const getColor = (score) => {
    if (score < 40) return "#10B981"
    if (score < 70) return "#F59E0B"
    return "#EF4444"
  }

  const getVerdictConfig = (verdict) => {
    switch(verdict) {
      case "APPROVE": return { emoji:"✅", color:"#10B981", bg:"rgba(16,185,129,0.08)", text:"TRANSACTION APPROVED" }
      case "REVIEW":  return { emoji:"⚠️", color:"#F59E0B", bg:"rgba(245,158,11,0.08)", text:"REVIEW REQUIRED" }
      case "BLOCK":   return { emoji:"🚨", color:"#EF4444", bg:"rgba(239,68,68,0.08)", text:"TRANSACTION BLOCKED" }
      default:        return { emoji:"⏳", color:"#64748B", bg:"rgba(100,116,139,0.08)", text:"ANALYZING" }
    }
  }

  // ── LOADING ──
  if (isLoading) {
    return (
      <div style={{...s.container, display:"flex", flexDirection:"column",
                   alignItems:"center", justifyContent:"center"}}>
        <div style={{fontSize:"2.5rem", marginBottom:"16px"}}>⚙️</div>
        <p style={{color:"#3B82F6", fontSize:"1rem", fontWeight:"700", margin:"0 0 8px 0"}}>
          Analyzing Transaction...
        </p>
        <p style={{color:"#64748B", fontSize:"0.8rem", margin:0}}>
          Running behavioral + graph analysis
        </p>
      </div>
    )
  }

  // ── EMPTY STATE ──
  if (!result) {
    return (
      <div style={{...s.container, display:"flex", flexDirection:"column",
                   alignItems:"center", justifyContent:"center", gap:"12px"}}>
        <div style={{fontSize:"2.5rem"}}>🔍</div>
        <p style={{color:"#E2E8F0", fontSize:"1rem", fontWeight:"700", margin:0}}>
          Awaiting Transaction
        </p>
        <p style={{color:"#64748B", fontSize:"0.82rem", margin:0, textAlign:"center"}}>
          Fill the payment form and click Pay Now. Analysis results will appear here.
        </p>
        <div style={{marginTop:"16px", padding:"12px 16px", backgroundColor:"#060a14",
                     border:"1px solid #1A2540", borderRadius:"8px", width:"100%"}}>
          <p style={{color:"#64748B", fontSize:"0.72rem", margin:"0 0 8px 0",
                     letterSpacing:"1px", textTransform:"uppercase"}}>
            What gets analyzed
          </p>
          {["Keystroke timing pattern","Session duration","Device fingerprint",
            "Transaction hour","Receiver account network","Money flow patterns"
          ].map((item, i) => (
            <p key={i} style={{color:"#E2E8F0", fontSize:"0.8rem", margin:"4px 0"}}>
              ◦ {item}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const verdictConfig = getVerdictConfig(result.verdict)

  // ── STATS from history ──
  const totalTxns    = history.length
  const blockedCount = history.filter(h => h.result.verdict === "BLOCK").length
  const reviewCount  = history.filter(h => h.result.verdict === "REVIEW").length
  const savedAmount  = history
    .filter(h => h.result.verdict === "BLOCK")
    .reduce((sum, h) => sum + h.transaction.amount, 0)

  return (
    <div style={s.container}>

      {/* ── LIVE STATS ── */}
      <p style={{...s.scoreLabel, marginBottom:"10px"}}>Live Stats</p>
      <div style={{display:"flex", gap:"8px", marginBottom:"16px"}}>
        <div style={s.statBox("#1A2540")}>
          <div style={{fontSize:"1.4rem", fontWeight:"800", color:"#E2E8F0"}}>
            {totalTxns}
          </div>
          <div style={{fontSize:"0.65rem", color:"#64748B", marginTop:"2px"}}>
            TOTAL
          </div>
        </div>
        <div style={s.statBox("#10B981")}>
          <div style={{fontSize:"1.4rem", fontWeight:"800", color:"#10B981"}}>
            {totalTxns - blockedCount - reviewCount}
          </div>
          <div style={{fontSize:"0.65rem", color:"#64748B", marginTop:"2px"}}>
            APPROVED
          </div>
        </div>
        <div style={s.statBox("#F59E0B")}>
          <div style={{fontSize:"1.4rem", fontWeight:"800", color:"#F59E0B"}}>
            {reviewCount}
          </div>
          <div style={{fontSize:"0.65rem", color:"#64748B", marginTop:"2px"}}>
            REVIEW
          </div>
        </div>
        <div style={s.statBox("#EF4444")}>
          <div style={{fontSize:"1.4rem", fontWeight:"800", color:"#EF4444"}}>
            {blockedCount}
          </div>
          <div style={{fontSize:"0.65rem", color:"#64748B", marginTop:"2px"}}>
            BLOCKED
          </div>
        </div>
      </div>

      {/* Amount saved */}
      {savedAmount > 0 && (
        <div style={{backgroundColor:"rgba(16,185,129,0.08)",
                     border:"1px solid #10B981", borderRadius:"8px",
                     padding:"8px 14px", marginBottom:"16px",
                     display:"flex", justifyContent:"space-between"}}>
          <span style={{fontSize:"0.78rem", color:"#64748B"}}>
            💰 Amount Saved from Fraud
          </span>
          <span style={{fontSize:"0.78rem", fontWeight:"700", color:"#10B981"}}>
            ₹{savedAmount.toLocaleString()}
          </span>
        </div>
      )}

      <hr style={s.divider} />

      {/* ── CURRENT RESULT ── */}
      <h2 style={{fontSize:"1.2rem", fontWeight:"700",
                  color:"#E2E8F0", margin:"0 0 4px 0"}}>
        📊 Analysis Result
      </h2>
      <p style={{fontSize:"0.8rem", color:"#64748B", margin:"0 0 16px 0"}}>
        {transaction &&
          `${transaction.sender_id} → ${transaction.receiver_id} · ₹${transaction.amount}`}
      </p>

      {/* VERDICT */}
      <div style={s.verdictBox(verdictConfig.color, verdictConfig.bg)}>
        <div style={{fontSize:"2rem"}}>{verdictConfig.emoji}</div>
        <div style={{fontSize:"1.8rem", fontWeight:"800",
                     color:verdictConfig.color, letterSpacing:"3px",
                     margin:"8px 0 4px 0"}}>
          {verdictConfig.text}
        </div>
        <div style={{fontSize:"2.5rem", fontWeight:"800",
                     color:getColor(result.final_score)}}>
          {result.final_score}/100
        </div>
      </div>

      {/* EXPLANATION */}
      <div style={{backgroundColor:"#060a14", border:"1px solid #1A2540",
                   borderRadius:"8px", padding:"12px 16px", marginBottom:"16px"}}>
        <p style={{fontSize:"0.72rem", color:"#64748B", margin:"0 0 6px 0",
                   letterSpacing:"1px", textTransform:"uppercase"}}>Reason</p>
        <p style={{fontSize:"0.9rem", color:"#E2E8F0", margin:0, lineHeight:1.5}}>
          {result.explanation}
        </p>
      </div>

      {/* SCORE BARS */}
      <div style={s.scoreLabel}>Behavioral Risk</div>
      <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
        <div style={{flex:1}}>
          <div style={s.scoreBar}>
            <div style={s.scoreBarFill(result.behavioral_risk, getColor(result.behavioral_risk))} />
          </div>
        </div>
        <div style={{fontSize:"2rem", fontWeight:"800",
                     color:getColor(result.behavioral_risk)}}>
          {result.behavioral_risk}
        </div>
      </div>

      <div style={s.scoreLabel}>Graph Risk</div>
      <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
        <div style={{flex:1}}>
          <div style={s.scoreBar}>
            <div style={s.scoreBarFill(result.graph_risk, getColor(result.graph_risk))} />
          </div>
        </div>
        <div style={{fontSize:"2rem", fontWeight:"800",
                     color:getColor(result.graph_risk)}}>
          {result.graph_risk}
        </div>
      </div>

      <hr style={s.divider} />

      {/* SIGNALS */}
      <p style={{...s.scoreLabel, marginBottom:"8px"}}>Fired Signals</p>
      {result.behavioral_signals?.map((sig, i) => (
        <span key={i} style={s.signalTag("#3B82F6")}>
          {sig.replace(/_/g, " ")}
        </span>
      ))}
      {result.graph_signals?.map((sig, i) => (
        <span key={i} style={s.signalTag("#8B5CF6")}>
          {sig.replace(/_/g, " ")}
        </span>
      ))}
      {(!result.behavioral_signals?.length && !result.graph_signals?.length) && (
        <span style={s.signalTag("#10B981")}>no signals — clean transaction</span>
      )}

      {/* DETAILS TOGGLE */}
      <div style={{marginTop:"12px"}}>
        <button style={{backgroundColor:"transparent", border:"none",
                        color:"#3B82F6", fontSize:"0.78rem",
                        fontFamily:"monospace", cursor:"pointer", padding:0}}
          onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "▲ Hide Details" : "▼ Show Details"}
        </button>

        {showDetails && result.behavioral_details && (
          <div style={{backgroundColor:"#060a14", border:"1px solid #1A2540",
                       borderRadius:"8px", padding:"12px 16px", marginTop:"8px"}}>
            {[
              ["Live Keystroke",      `${result.behavioral_details.live_keystroke_ms}ms`],
              ["Expected Keystroke",  `${result.behavioral_details.expected_keystroke_ms}ms`],
              ["Keystroke Deviation", `${result.behavioral_details.keystroke_deviation}x`],
              ["Transaction Hour",    `${result.behavioral_details.live_hour}:00`],
              ["Typical Hours",       result.behavioral_details.typical_hours?.join(", ")],
              ["Device Known",        result.behavioral_details.device_known ? "Yes ✓" : "No ✗"],
            ].map(([label, value], i) => (
              <div key={i} style={{display:"flex", justifyContent:"space-between",
                                   marginBottom:"5px"}}>
                <span style={{fontSize:"0.75rem", color:"#64748B"}}>{label}</span>
                <span style={{fontSize:"0.75rem", color:"#E2E8F0",
                              fontFamily:"monospace"}}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr style={s.divider} />

      {/* ── TRANSACTION HISTORY ── */}
      <p style={{...s.scoreLabel, marginBottom:"10px"}}>
        Transaction History ({history.length})
      </p>
      <div style={{maxHeight:"180px", overflowY:"auto"}}>
        {history.slice().reverse().map((h, i) => {
          const cfg = getVerdictConfig(h.result.verdict)
          return (
            <div key={i} style={s.historyRow(cfg.color)}>
              <div>
                <span style={{fontSize:"0.78rem", color:"#E2E8F0"}}>
                  {h.transaction.sender_id} → {h.transaction.receiver_id}
                </span>
                <span style={{fontSize:"0.7rem", color:"#64748B",
                              marginLeft:"8px"}}>
                  ₹{h.transaction.amount}
                </span>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{fontSize:"0.72rem", color:"#64748B"}}>
                  {h.result.final_score}/100
                </span>
                <span style={{fontSize:"0.78rem", fontWeight:"700",
                              color:cfg.color}}>
                  {cfg.emoji} {h.result.verdict}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <hr style={s.divider} />

      {/* ── GRAPH NETWORK ── */}
      <div style={{marginBottom:"12px"}}>
        <button style={{backgroundColor:"transparent",
                        border:"1px solid #8B5CF6", borderRadius:"8px",
                        padding:"8px 16px", color:"#8B5CF6",
                        fontSize:"0.78rem", fontFamily:"monospace",
                        cursor:"pointer", width:"100%"}}
          onClick={() => setShowGraph(!showGraph)}>
          {showGraph ? "▲ Hide Transaction Graph" : "🕸️ Show Transaction Graph"}
        </button>

        {showGraph && (
          <iframe
            src="http://localhost:8000/graph"
            style={{width:"100%", height:"400px", border:"1px solid #1A2540",
                    borderRadius:"8px", marginTop:"10px", backgroundColor:"#060a14"}}
            title="Transaction Network Graph"
          />
        )}
      </div>

      {/* RESET */}
      <button style={{width:"100%", backgroundColor:"transparent",
                      border:"1px solid #1A2540", borderRadius:"8px",
                      padding:"10px", color:"#64748B", fontSize:"0.85rem",
                      fontFamily:"monospace", cursor:"pointer"}}
        onClick={onReset}>
        ↩ New Transaction
      </button>

    </div>
  )
}