import { useState } from "react"
import PaymentForm from "./PaymentForm"
import Dashboard from "./Dashboard"

export default function App() {

  const [analysisResult, setAnalysisResult] = useState(null)
  const [isLoading,      setIsLoading]      = useState(false)
  const [currentTxn,     setCurrentTxn]     = useState(null)
  const [history,        setHistory]        = useState([])  // ← ADDED

  const handlePaymentStart = () => {
    setIsLoading(true)
    setAnalysisResult(null)
  }

  const handleAnalysisComplete = (result, txnDetails) => {
    setAnalysisResult(result)
    setCurrentTxn(txnDetails)
    setIsLoading(false)

    // ← ADDED — save every transaction to history
    if (result && txnDetails) {
      setHistory(prev => [...prev, { result, transaction: txnDetails }])
    }
  }

  const handleReset = () => {
    setAnalysisResult(null)
    setCurrentTxn(null)
    setIsLoading(false)
  }

  return (
    <div style={{
      minHeight       : "100vh",
      backgroundColor : "#050810",
      fontFamily      : "monospace",
      padding         : "24px"
    }}>

      <div style={{ textAlign:"center", marginBottom:"32px" }}>
        <h1 style={{
          fontSize   : "2.5rem",
          fontWeight : "800",
          color      : "#E2E8F0",
          margin     : "0 0 8px 0",
          letterSpacing: "-1px"
        }}>
          Fraud<span style={{ color:"#3B82F6" }}>Lens</span>
        </h1>

        <p style={{
          color         : "#64748B",
          fontSize      : "0.9rem",
          margin        : 0,
          letterSpacing : "2px",
          textTransform : "uppercase"
        }}>
          AI-Powered Real-Time Payment Fraud Detection
        </p>

        <div style={{
          display        : "inline-flex",
          alignItems     : "center",
          gap            : "8px",
          marginTop      : "12px",
          padding        : "4px 14px",
          backgroundColor: "#0C1120",
          border         : "1px solid #1A2540",
          borderRadius   : "20px"
        }}>
          <div style={{
            width          : "8px",
            height         : "8px",
            borderRadius   : "50%",
            backgroundColor: "#10B981",
            animation      : "pulse 2s infinite"
          }} />
          <span style={{ fontSize:"0.75rem", color:"#10B981" }}>
            System Online
          </span>
        </div>
      </div>

      <div style={{
        display              : "grid",
        gridTemplateColumns  : "1fr 1fr",
        gap                  : "24px",
        maxWidth             : "1100px",
        margin               : "0 auto"
      }}>

        <PaymentForm
          onPaymentStart={handlePaymentStart}
          onAnalysisComplete={handleAnalysisComplete}
        />

        <Dashboard
          result={analysisResult}
          transaction={currentTxn}
          isLoading={isLoading}
          onReset={handleReset}
          history={history}
        />

      </div>

      <p style={{
        textAlign  : "center",
        marginTop  : "32px",
        color      : "#1A2540",
        fontSize   : "0.75rem"
      }}>
        FraudLens — GenCode X — Behavioral Biometrics + Graph AI
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background-color: #050810; }
        input:focus { outline: none; border-color: #3B82F6 !important; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

    </div>
  )
}