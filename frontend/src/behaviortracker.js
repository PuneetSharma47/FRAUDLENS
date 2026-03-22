// behaviorTracker.js
// Runs silently on the payment page
// Records HOW the user interacts — never visible to user
// Packages everything into a payload when payment is submitted

const tracker = {

  // ─────────────────────────────────────────
  // STORAGE
  // All signals stored here during the session
  // ─────────────────────────────────────────

  keystrokeDelays : [],   // time between each keypress in ms
  lastKeyTime     : null, // timestamp of last keypress
  sessionStart    : Date.now(), // when page loaded
  backspaceCount  : 0,    // how many times backspace was pressed
  keystrokeCount  : 0,    // total keypresses


  // ─────────────────────────────────────────
  // RECORD KEYSTROKE
  // Called on every keypress in the form
  // ─────────────────────────────────────────

  recordKeystroke(key) {
    const now = Date.now()

    // Count backspaces separately — hesitation signal
    if (key === 'Backspace') {
      this.backspaceCount++
    }

    // Record time gap between this key and last key
    if (this.lastKeyTime !== null) {
      const delay = now - this.lastKeyTime
      // Only record if delay is realistic (10ms - 2000ms)
      // Filters out copy-paste and auto-fill
      if (delay > 10 && delay < 2000) {
        this.keystrokeDelays.push(delay)
      }
    }

    this.lastKeyTime = now
    this.keystrokeCount++
  },


  // ─────────────────────────────────────────
  // GET DEVICE FINGERPRINT
  // Creates a short hash from browser properties
  // Same device = same hash every time
  // ─────────────────────────────────────────

  getDeviceFingerprint() {
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.language,
      new Date().getTimezoneOffset()
    ].join('|')

    // Simple hash function
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // convert to 32-bit integer
    }

    // Return as 8-character hex string
    return Math.abs(hash).toString(16).slice(0, 8)
  },


  // ─────────────────────────────────────────
  // GET MEAN KEYSTROKE DELAY
  // Average time between keypresses
  // ─────────────────────────────────────────

  getMeanDelay() {
    if (this.keystrokeDelays.length === 0) return 150 // default
    const sum = this.keystrokeDelays.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.keystrokeDelays.length)
  },


  // ─────────────────────────────────────────
  // GET PAYLOAD
  // Called by PaymentForm when user clicks Pay
  // Returns everything packed as one object
  // ─────────────────────────────────────────

  getPayload(userId, amount) {
    return {
      user_id              : userId,
      amount               : parseFloat(amount) || 0,
      keystroke_mean_delay : this.getMeanDelay(),
      keystroke_count      : this.keystrokeCount,
      session_duration_ms  : Date.now() - this.sessionStart,
      time_of_day_hour     : new Date().getHours(),
      device_fingerprint   : this.getDeviceFingerprint(),
      backspace_count      : this.backspaceCount
    }
  },


  // ─────────────────────────────────────────
  // RESET
  // Called when user starts a new transaction
  // Clears all recorded signals
  // ─────────────────────────────────────────

  reset() {
    this.keystrokeDelays = []
    this.lastKeyTime     = null
    this.sessionStart    = Date.now()
    this.backspaceCount  = 0
    this.keystrokeCount  = 0
  },


  // ─────────────────────────────────────────
  // SIMULATE ATTACKER
  // Used for demo — injects fake attacker signals
  // One button press triggers full fraud demo
  // ─────────────────────────────────────────

  simulateAttacker() {
    this.keystrokeDelays = [380, 420, 350, 410, 390, 440, 370, 400]
    this.backspaceCount  = 4
    this.keystrokeCount  = 12
    this.sessionStart    = Date.now() - 12000 // 12 second session
  }

}

export default tracker