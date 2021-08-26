let baseCSS = `
  :host {
    position: relative;
    width: 200px;
    height: 200px;
    display: block;
    font-family: sans-serif;
    font-weight: normal;
  }

  .clock {
    margin: 10%;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    position:absolute;
    box-sizing: border-box;
  }

  .clock:before {
    transform: translate(-50%, -50%);
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    content: '';
    border-radius: 50%;
    background: #000;
    width: 3%;
    min-width: 4px;
    height: 3%;
    min-height: 4px;
    z-index: 1;
  }

  svg {
    overflow: visible;
  }

  .marks {
    fill: transparent;
    stroke: #000;
    stroke-width: 4px;
  }

  .transform-origin-center {
    position: absolute;
    height: 50%;
    left: 50%;
    top: 0%;
    transform-origin: bottom left;
  }

  .tick-text {
    position: absolute;
    text-align: center;
  }

  .hand-sec {
    height: 45%;
    margin-top: 5%;
    width: 1px;
    background-color: orange;
  }
  
  .hand-min {
    height: 35%;
    margin-top: 15%;
    width: 1px;
    background-color: #555;
  }
  
  .hand-hour {
    height: 25%;
    margin-top: 25%;
    width: 1px;
    background-color: #333;
  }
`

class AnalogClockElement extends HTMLElement {
  MODES = ['clock', 'stopwatch']
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.stopwatchMode = null
    this.stopwatchTimetamps = []
    this.size = 200
    this.marks = 60
    this.ticks = true
    this.connected = false
  }
  
  connectedCallback() {
    this.setupClock()
    this.mode = this.getAttribute('mode') || 'clock'
    this.applyMode()
    this.setAttribute('role', 'timer')
    this.setAttribute('tabindex', '-1')
    this.connected = true
  }

  static get observedAttributes() {
    return ['size', 'mode', 'marks', 'ticks']
  }
  
  attributeChangedCallback(name, _oldVal, newVal) {
    switch (name) {
      case 'size':
        this.size = Number(newVal)
        this.style.setProperty('width', newVal + 'px')
        this.style.setProperty('height', newVal + 'px')
        break
      case 'mode':
        this.mode = newVal
        break
      case 'marks':
        this.marks = newVal
        this.setupClock()
        break
      case 'ticks':
        this.ticks = newVal !== 'false'
        this.setupClock()
        break
    }
  }

  updateTimeInLabel() {
    if (this.mode === 'clock') {
      const datetime = new Date()
      this.setAttribute('aria-label', `${datetime.getHours()}:${datetime.getMinutes()}`)
    } else {
      const datetime = new Date(0, 0, 0)
      datetime.setUTCMilliseconds(this.getTimeElapsed())
      const h = datetime.getHours()
      const m = datetime.getMinutes()
      const s = datetime.getSeconds()
      this.setAttribute('aria-label', `
        ${h > 0 ? `${h} hour${h !== 1 ? 's' : ''}` : ``}
        ${m > 0 ? `${m} minute${m !== 1 ? 's' : ''}` : ``}
        ${s} second${s !== 1 ? 's' : ''}
      `.trim())
    }
  }

  set mode(value) {
    if (!this.MODES.includes(value)) return
    if (this.getAttribute('mode') !== value) {
      this.setAttribute('mode', value)
      if (this.connected) this.applyMode()
    }
  }

  get mode() {
    return this.getAttribute('mode')
  }

  applyMode() {
    this.setTimeAndTransition()
    if (this.stopwatchMode === null) this.toggleStopwatch(false)
    this.classList.toggle('stopwatch-mode', this.mode === 'stopwatch')
    this.updateLabelOnInterval()
  }

  toggleStopwatch(shouldRun) {
    this.setTimeAndTransition()
    const isRunning = shouldRun == null ? this.stopwatchMode !== 'is-running' : shouldRun
    this.classList.toggle('is-resetting', isRunning === false || this.stopwatchTimetamps.length === 0)
    this.stopwatchMode = isRunning ? 'is-running' : 'is-paused'
    this.classList.remove('is-running', 'is-paused')
    this.classList.add(this.stopwatchMode)
    if (shouldRun == null) {
      if (this.stopwatchTimetamps.length === 0) {
        this.stopwatchTimetamps = [new Date()]
      } else {
        this.stopwatchTimetamps.push(new Date())
      }
    }
    this.updateLabelOnInterval()
  }

  updateLabelOnInterval() {
    this.updateTimeInLabel()
    if (this.timerInterval) clearInterval(this.timerInterval)
    if (this.mode === 'clock' || this.stopwatchMode === 'is-running') {
      this.timerInterval = setInterval(this.updateTimeInLabel.bind(this), this.mode === 'clock' ? 60000 : 1000)
    }
  }

  resetStopwatch() {
    this.stopwatchTimetamps = []
    this.toggleStopwatch(false)
  }

  getTimeElapsed() {
    const timestamps = Array.from(this.stopwatchTimetamps)
    // calculate duration to current time
    if (this.stopwatchMode === 'is-running') timestamps.push(new Date())

    let duration = 0
    let currentTime
    let paused = false
    for (const timestamp of timestamps) {
      if (paused) {
        paused = false
        currentTime = timestamp
      } else if (currentTime) {
        duration += timestamp.getTime() - currentTime.getTime()
        paused = true
      } else {
        currentTime = timestamp
      }
    }

    return duration
  }

  getTargetTime() {
    if (this.mode === 'stopwatch') {
      const date = new Date(0, 0, 0)
      date.setMilliseconds(this.getTimeElapsed())
      return date
    } else {
      return new Date()
    }
  }

  async setTimeAndTransition() {
    const currentPosForSec = window.getComputedStyle(this.secHand).transform
    const currentPosForMin = window.getComputedStyle(this.minHand).transform
    const currentPosForHour = window.getComputedStyle(this.hourHand).transform
    await this.resetHands()

    const timeNow = this.getTargetTime()
    const timeInSeconds = timeNow.getSeconds() + timeNow.getMinutes() * 60 + (timeNow.getHours() % 12) * 3600
    const resetAnimationDelayInDegrees = this.mode === 'clock' || this.stopwatchMode === 'is-running' ? 360/60000*300 : 0 // 300ms
    const sDeg = Math.round(((timeInSeconds/60)*360)%360 + resetAnimationDelayInDegrees)
    const mDeg = Math.round(((timeInSeconds/(60*60))*360)%360 + resetAnimationDelayInDegrees)
    const hDeg = Math.round(((timeInSeconds/(60*60)/12)*360)%360 + resetAnimationDelayInDegrees)

    // Safari bug #1: These would be much better as CSS variables, but https://bugs.webkit.org/show_bug.cgi?id=201736.
    // Safari bug #2: $rand is needed because of https://bugs.webkit.org/show_bug.cgi?id=229437.
    const rand = `r${Math.random().toString().slice(2, 6)}`
    
    const timeCSS = `
      :host(.stopwatch-mode.is-paused) .hand { animation-play-state: paused; }
      .hand-sec { animation: reset-sec-${rand} 300ms 1 ease-out, countup-sec-${rand} 60s 300ms infinite linear; }
      .hand-min { animation: reset-min-${rand} 300ms 1 ease-out, countup-min-${rand} 3600s 300ms infinite linear; }
      .hand-hour { animation: reset-hour-${rand} 300ms 1 ease-out, countup-hour-${rand} 86400s 300ms infinite linear; }
      :host(.stopwatch-mode.is-resetting.is-paused) .hand-sec { animation: reset-sec-${rand} 300ms ease-out 0s 1; }
      :host(.stopwatch-mode.is-resetting.is-paused) .hand-min { animation: reset-min-${rand} 300ms ease-out 0s 1; }
      :host(.stopwatch-mode.is-resetting.is-paused) .hand-hour { animation: reset-hour-${rand} 300ms ease-out 0s 1; }
      :host(.stopwatch-mode) .hand-sec { transform: rotate(${sDeg}deg); }
      :host(.stopwatch-mode) .hand-min { transform: rotate(${mDeg}deg); }
      :host(.stopwatch-mode) .hand-hour { transform: rotate(${hDeg}deg); }

      @keyframes reset-sec-${rand} {
        0% { transform: ${currentPosForSec} }
        100% { transform: rotate(${sDeg}deg); }
      }
      @keyframes reset-min-${rand} {
        0% { transform: ${currentPosForMin} }
        100% { transform: rotate(${mDeg}deg); }
      }
      @keyframes reset-hour-${rand} {
        0% { transform: ${currentPosForHour} }
        100% { transform: rotate(${hDeg}deg); }
      }
      @keyframes countup-sec-${rand} {
        0% { transform: rotate(${sDeg}deg); }
        100% { transform: rotate(${sDeg + 360}deg); }
      }
      @keyframes countup-min-${rand} {
        0% { transform: rotate(${mDeg}deg); }
        100% { transform: rotate(${mDeg + 360}deg); }
      }
      @keyframes countup-hour-${rand} {
        0% { transform: rotate(${hDeg}deg); }
        100% { transform: rotate(${hDeg + 360}deg); }
      }
    `

    // Safari bug #3: https://bugs.webkit.org/show_bug.cgi?id=191265
    const existingStyle = this.shadowRoot.querySelector('#keyframesCSS')
    const newStyle = existingStyle.cloneNode(true)
    existingStyle.remove()
    newStyle.textContent = timeCSS
    this.shadowRoot.append(newStyle)
  }

  setupClock() {
    let ticks = ``
    if (this.ticks) {
      for(let i = 12; i > 0; i--) {
        ticks += `<div class="transform-origin-center p${i}" part="tick tick${i}"><span class="tick-text">${i}</span></div>`
        const deg = 360/12 * (i - 12)
        baseCSS += `
          .p${i} { transform: rotate(${deg}deg); }
          .p${i} .tick-text { transform: translate(-50%, -50%) rotate(${-deg}deg); }
          `
      }
    }
    let variables = `
      .marks { 
        stroke: ${this.marks > 0 ? '#000' : 'transparent'};
        stroke-dasharray: 1px calc((${Math.PI} * 200px - ${this.marks}px)/${this.marks});
      }
    `
    if (this.size <= 50) variables += `.hand { min-height: 50%; margin-top: 0%; }`
    this.shadowRoot.innerHTML = `
      <style id="baseCSS">
        ${baseCSS}${variables}
      </style>
      <style id="keyframesCSS"></style>
      <svg viewBox="0 0 200 200" aria-hidden="true" width="100%" height="100%"><circle part="marks" cx="100" cy="100" r="100" class="marks"></circle></svg>
      <div class="clock" part="clock" aria-hidden="true">
      <div class="transform-origin-center hand hand-hour" part="hand-hour"></div>
      <div class="transform-origin-center hand hand-min" part="hand-min"></div>
      <div class="transform-origin-center hand hand-sec" part="hand-sec"></div>
      ${ticks}
      </div>
      <slot></slot>
    `

    this.secHand  = this.shadowRoot.querySelector('.hand-sec')
    this.minHand  = this.shadowRoot.querySelector('.hand-min')
    this.hourHand = this.shadowRoot.querySelector('.hand-hour')
  }

  // Resetting animation to the starting frame
  resetHands() {
    const clock = this
    return new Promise(function (resolve) {
      for (const hand of [clock.secHand, clock.minHand, clock.hourHand]) {
        hand.style.animation = 'none'
        hand.offsetHeight;
        hand.style.animation = null
      }
      resolve()
    })
  }
}

window.customElements.define('analog-clock', AnalogClockElement)
