let scl = 3
let zoom = 1
let usingBanner = false
let margin = scl * 125
let iteration = 0
const opacityBuffer = 0.15
let loadingScreen, nScales, wScales, nRanges, wRanges, palette, operations, codeContent, noiseCount, waveCount, maxNoiseScale, maxWaveScale, maxNoiseRange, maxWaveRange, waveType, lineAlpha, setDScale, canvasEl, rotateAngle;
const resizeStuff = () => {
  const windowWidth = window.innerWidth
  const canvasWidth = canvasEl.width
  const scaleAmount = windowWidth / canvasWidth
  canvasEl.style.transform = `scale(${ scaleAmount * 1.7 }) translate(-50%, -50%)`
}
async function setup(cc = true) {
  if (cc) {
    createCanvas(1600 * scl, 900 * scl);
    colorMode(HSL)
    const localSeed = nfaRandom(0, 1000000) + nfaRandom(0, 1000000)
    noiseSeed(localSeed)
    randomSeed(localSeed)
  }
  zoom = random() < 0.5 ? 1 : random([0.5, 0.75, 0.75])
  palette = getPalette()
  loadingScreen = document.getElementById("loadingScreen")
  loadingScreen.style.fontFamily = "monospace"
  loadingScreen.style.color = palette[3]
  loadingScreen.style.opacity = 1
  loadingScreen.style.backgroundColor = palette[0]
  operations = getOperations()
  lineAlpha = random(0.75, 0.35)
  rotateAngle = random() < 0.33 ? 0 : (random(-1, 1) * PI / 4)
  setDScale = random() < 0.75 ? undefined : nScales[floor(random(nScales.length))]
  canvasEl = document.getElementById("defaultCanvas0")
  resizeStuff()
  window.onresize = () => resizeStuff()
}
function draw() {
  noLoop()
  background(palette[0]);
  let prevPoint = null
  for (let y = 0; y < height; y += 3 * scl * zoom) {
    for (let x = 0; x < width; x += 3 * scl * zoom) {
      let sx = x; let sy = y;
      operations.forEach(cb => {
        const n = cb(sx, sy)
        sx += n.x;
        sy += n.y
      })
      const dScale = setDScale || nScales[floor(random(nScales.length))]
      const op = mapMargin(sx, sy, 2) - opacityBuffer
      const cIndex = getNoise(sx, sy, dScale, [0, (palette.length - 1) * 2]) % (palette.length - 1)
      const cT = easeInOutCubic(cIndex - Math.trunc(cIndex))
      let c = color(longColorLerp(palette[floor(cIndex)], palette[ceil(cIndex)], cT))
      c = color(hue(c), saturation(c), lightness(c) + random(-10, 10))
      const sw = getNoise(sx, sy, dScale, [scl / 3, 3 * scl], 500) * zoom
      const delta = prevPoint ? dist(sx, sy, prevPoint.x, prevPoint.y) / (height / 2) : 0
      
      if (prevPoint && !isOut(sx, sy, 0.33) && !isOut(prevPoint.x, prevPoint.y, 0.33) && random() < min((1 - delta), zoom) * 0.85) {
        c.setAlpha(op - lineAlpha - (random(1 - lineAlpha)))
        stroke(c)
        strokeWeight(getNoise(sx, sy, dScale, [scl / 3, scl], 500) * zoom)
        line(sx, sy, prevPoint.x, prevPoint.y)
      }
      c.setAlpha(op)
      fill(c)
      noStroke()
      circle(sx, sy, sw)
      prevPoint = createVector(sx, sy)
    }
  }
  const zoomText = (() => {
    if (zoom === 0.5) return "Zoomed Way Out"
    if (zoom === 0.75) return "Zoomed Out"
    if (zoom === 1) return "Normal"
  })();
  const lineOpacityText = (() => { 
    if (lineAlpha > 0.65) return "Weak"
    if (lineAlpha < 0.45) return "Strong"
    return "Moderate"
  })();
  canvasEl.style.opacity = 1
  !iteration && nfaFinish([{ trait_type: "Palette Size", value: palette.length.toString() }, { trait_type: "Zoom", value: zoomText }, {trait_type: "Line Strength", value: lineOpacityText},{ trait_type: "Noise Operations", value: noiseCount.toString() }, { trait_type: "Other Operations", value: waveCount.toString() }, { trait_type: "Other Operation Type", value: waveType }]);
  iteration++;
}
const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const isOut = (x, y, mult = 1) => (x < margin*mult || y < margin*mult || x > width - margin*mult || y > height - margin*mult);
function mapMargin(x, y, mult = 2) {
  if (isOut(x, y)) return 0;
  const options = [1]
  const mapFade = (coord) => map(coord, margin, margin * mult, opacityBuffer, 1, true)
  if (x < margin * mult) options.push(mapFade(x));
  if (y < margin * mult) options.push(mapFade(y));
  if (x > width - margin * mult) options.push(mapFade(width - x));
  if (y > height - margin * mult) options.push(mapFade(height - y));
  return min(options);
}
function longColorLerp(c1, c2, t) {
  let startHue = hue(c1); let endHue = hue(c2);
  if (abs(startHue - endHue) > 180) {
    if (startHue < endHue) startHue += 360;
    else endHue += 360;
  }
  return color(lerp(startHue, endHue, t) % 360, lerp(saturation(c1), saturation(c2), t), lerp(lightness(c1), lightness(c2), t))
}
function getNoise(x, y, nScale = 0.01, range = 1, off = 0) {
  const r = Array.isArray(range) ? range : [-range, range]
  return map(noise(x * nScale + off, y * nScale + off), 0, 1, ...r)
}
function getPalette() {
  const mainC = color(random(360), random(53, 75), random(50, 70))
  const bgC = color(hue(mainC), random(30), random(10))
  const getSec = (chance = 0.75) => {
    const h = (hue(mainC) + randomGaussian(0, 57) + random(-5,5)) % 360
    return random() < chance ? color(h, random(35, 48), random(20, 45)) : null
  }  
  return [bgC, getSec(), getSec(1), mainC, getSec(1), getSec(), getSec()].filter(c => c)
}
function getOperations() {
  nScales = [];
  wScales = [];
  nRanges = [];
  wRanges = [];
  const baseCount = [1, 2, 2, 3]
  const nCount = random([...baseCount, ...baseCount, ...baseCount, 4, 4, 5, 5, 6])
  for (let i = 0; i < nCount; i++) {
    const nScale = random(0.007, 0.0006)
    nScales.push(nScale * scl)
    const minRange = map(nScale, 0.007, 0.0006, 30, 300)
    const maxRange = map(nScale, 0.007, 0.0006, 300, 1000)
    const nRange = random(minRange, maxRange)
    nRanges.push(nRange * scl / nCount )
  }
  const wCount = random() < 0.4 ? 0 : random([2, 2, 2, 3, 3, 4, 4, 5])
  const wOptions = [0.05, 0.025, 0.021, 0.01875, 0.0125,0.01125, 0.01]
  for (let j = 0; j < wCount; j++) {
    const wIndex = floor(random(wOptions.length)) 
    const wScale = wOptions[wIndex]
    wScales.push((wScale * scl) / TWO_PI)
    const wRange = (3 / (wScale / 0.2)) * random(0.6, 1)
    wRanges.push(wRange*scl)
  }
  noiseCount = nScales.length
  waveCount = wScales.length
  maxNoiseScale = round(max(nScales)/scl, 4)
  maxWaveScale = waveCount ? round(max(wScales)/scl, 4) : 0
  maxNoiseRange = round(max(nRanges)/scl)
  maxWaveRange = waveCount ? round(max(wRanges)/scl) : 0
  const noOff = random() < 0.085
  const noises = nScales.map((nScale, i) => (sx, sy) => ({
    x: getNoise(sx, sy, nScale, nRanges[i], noOff ? 0 : i * 100 * scl),
    y: getNoise(sx, sy, nScale, nRanges[i], noOff ? 0 : i * 100 * scl + 100)
  }))
  waveType = waveCount ? random(["Stroke", "Line", "Line", "Wave", "Wave", "Wave"]) : "None"  
  const waveMag = random(0.2, 0.6)
  const waves = wScales.map((wScale, i) => (sx, sy) => {
    const useX = noise(i*0.075) < 0.5 ? 1 : 0
    const angleOff = noise(i) * TWO_PI
    const x = sx * cos(rotateAngle) - sy * sin(rotateAngle);
    const y = sx * sin(rotateAngle) + sy * cos(rotateAngle);
    switch (waveType) { 
      case "Stroke": return {
        x: tan(angleOff + y * wScale * 0.5) * wRanges[i] * 4.2,
        y: tan(angleOff + x * wScale * 0.5) * wRanges[i] * 4.2,
      }
      case "Line":return {
        x: cos(angleOff+ x * wScale) * wRanges[i] * 0.75 * useX,
        y: sin(angleOff + y * wScale) * wRanges[i] * 0.75 * abs(useX - 1),
      }
      case "Wave": return {
        x: ((cos(angleOff + x * wScale) * wRanges[i]) + (sin(angleOff + y * wScale * waveMag) * wRanges[i])) * useX,
        y: ((sin(angleOff + y * wScale) * wRanges[i]) + (cos(angleOff + x * wScale * waveMag) * wRanges[i])) * abs(useX - 1),
      }
    }
  })
  return [...noises, ...waves].sort(() => random([-1, 1]))
}
async function keyPressed() {
  if (key === "s") {
    save(`its_just_noise${ usingBanner ? "_banner" : ""}${iteration}.png`)
  }
  if (key === "b") {
    canvasEl.style.opacity = 0
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (!usingBanner) {
      margin = scl * 50
      resizeCanvas(1500 * scl, 500 * scl)
    } else {
      margin = scl * 125
      resizeCanvas(1600 * scl, 900 * scl)
    }
    resizeStuff()
    usingBanner = !usingBanner
    draw()
  }
  if (key === "n") {
    canvasEl.style.opacity = 0
    const localSeed = new Date().getTime()
    noiseSeed(localSeed)
    randomSeed(localSeed)
    setup(false)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    draw()
  }
}