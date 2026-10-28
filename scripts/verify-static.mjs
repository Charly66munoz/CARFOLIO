// Local asset inspection and T4-T6 Chrome smoke checks; comprehensive coverage remains T8.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = process.cwd()
const foundation = process.argv.includes('--foundation')
const interactions = process.argv.includes('--pointer') || process.argv.includes('--interactions')
const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!browser) throw new Error('No installed Chromium browser found; record this check as pending.')
const profile = path.join(root, '.tmp', `browser-${Date.now()}`)
await mkdir(profile, { recursive: true })
const child = spawn(browser, [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--disable-extensions', '--disable-crash-reporter', '--disable-breakpad',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore', env: { ...process.env, TEMP: path.join(root, '.tmp'), TMP: path.join(root, '.tmp') } })
let ws
try {
  let port
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break } catch { await delay(100) }
  }
  if (!port) throw new Error('Browser debugging endpoint unavailable.')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let sequence = 0
  const pending = new Map()
  const errors = []
  ws.onmessage = ({ data }) => {
    const result = JSON.parse(data)
    if (result.method === 'Runtime.exceptionThrown') errors.push(result.params.exceptionDetails.text)
    if (pending.has(result.id)) {
      const { resolve, reject } = pending.get(result.id)
      pending.delete(result.id)
      if (result.error) reject(new Error(JSON.stringify(result.error)))
      else resolve(result.result)
    }
  }
  ws.onclose = () => { for (const { reject } of pending.values()) reject(new Error('Browser connection closed.')); pending.clear() }
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  let loaded = false
  for (let i = 0; i < 100; i++) {
    loaded = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('main'))")
    if (loaded) break
    await delay(100)
  }
  if (!loaded) throw new Error('Application failed to mount.')
  if (interactions) {
    const checks = []
    const state = () => evaluate(`(() => { const n=document.querySelector('.navigator'); return { angle:Number(n.dataset.angle), index:Number(n.dataset.selectedIndex), phase:n.dataset.phase, confirmation:document.querySelector('.confirmation-status')?.textContent ?? '' }; })()`)
    const geometry = () => evaluate(`(async () => {
      const r=document.querySelector('.wheel-surface').getBoundingClientRect();
      const {WHEEL_OUTER_CONTOUR}=await import('/src/features/wheel-navigation/wheelContour.ts');
      const angle=Number(document.querySelector('.navigator').dataset.angle);
      const i=Math.round(((270-angle)%360+360)%360), [x,y]=WHEEL_OUTER_CONTOUR[i];
      return {cx:r.x+r.width/2,cy:r.y+r.height/2,radius:Math.hypot(x-625.95594,y-645.82089)*r.width*.87/1254-6};
    })()`)

    const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label) }
    let mouseHeld = false
    const mouse = (type, x, y) => {
      if(type==='mousePressed') mouseHeld=true
      if(type==='mouseReleased') mouseHeld=false
      return send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !mouseHeld ? 'none' : 'left', buttons: mouseHeld ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 })
    }
    const location = (g, angle, radius = g.radius) => ({ x:g.cx+radius*Math.cos(angle*Math.PI/180), y:g.cy+radius*Math.sin(angle*Math.PI/180) })
    async function drag(delta, outside = false) {
      const g=await geometry(); const a=location(g,-90); const b=location(g,-90+delta,outside ? g.radius+110 : g.radius)
      await mouse('mouseMoved',a.x,a.y); await mouse('mousePressed',a.x,a.y)
      await delay(50)
      assert(await evaluate('document.querySelector(".wheel-surface").hasPointerCapture(1)'), 'mouse capture acquired')
      await mouse('mouseMoved',b.x,b.y); await mouse('mouseReleased',b.x,b.y); await delay(320)
      assert(!(await evaluate('document.querySelector(".wheel-surface").hasPointerCapture(1)')), 'mouse capture released')
    }
    await drag(20,true)
    const clockwiseState=await state()
    assert(clockwiseState.index===3 && clockwiseState.angle===18,'clockwise mouse drag outside circle commits PROJECTS: '+JSON.stringify(clockwiseState))
    await drag(-20)
    assert((await state()).index===2,'counterclockwise mouse drag returns HOME')
    const g=await geometry(); const a=location(g,-90); const b=location(g,-60)
    await mouse('mouseMoved',a.x,a.y); await mouse('mousePressed',a.x,a.y); await mouse('mouseMoved',b.x,b.y)
    await evaluate('document.querySelector(".wheel-surface").dispatchEvent(new PointerEvent("pointercancel",{pointerId:1,bubbles:true}))')
    await mouse('mouseReleased',b.x,b.y); await delay(320)
    assert((await state()).angle===0,'synthetic pointercancel rolls back without confirmation')
    await mouse('mousePressed',g.cx+g.radius+130,g.cy); await mouse('mouseMoved',g.cx+g.radius+140,g.cy+50); await mouse('mouseReleased',g.cx+g.radius+140,g.cy+50)
    assert((await state()).angle===0,'background cannot initiate dragging')
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5})
    const touch=async(type,angle)=>{ const p=location(g,angle); await send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x:p.x,y:p.y,id:7}]}) }
    await touch('touchStart',-90); await touch('touchMove',-110); await touch('touchEnd',-110); await delay(320)
    assert(
      (await state()).angle === -18,
      "browser touch gesture commits EXPERIENCE",
    );
    await touch('touchStart',-90); await touch('touchMove',-120); await touch('touchCancel',-120); await delay(320)
    assert(
      (await state()).angle === -18,
      "protocol touch cancellation restores committed EXPERIENCE",
    );
    await send('Emulation.setTouchEmulationEnabled',{enabled:false})
    const settled=[]
    for(const angle of [-36,-18,0,18,36]) {
      await drag(angle-(await state()).angle)
      const alignment=await evaluate(`(() => { const label=document.querySelector('.section-label--active').getBoundingClientRect(); const viewport=document.querySelector('.track-viewport').getBoundingClientRect(); return Math.abs(label.x+label.width/2-viewport.x-viewport.width/2); })()`)
      assert((await state()).angle===angle && alignment<=1,'settled angle '+angle+' centers track within one CSS pixel')
      settled.push({angle,trackCenterError:alignment})
      const screenshot=await send('Page.captureScreenshot',{format:'png'})
      await writeFile('docs/settled-'+angle+'.png',Buffer.from(screenshot.data,'base64'))
    }
    if(process.argv.includes('--interactions')) {
      const originalUrl=await evaluate('location.href')
      const count=()=>evaluate(`Number(document.querySelector('.confirmation-status').textContent.split('·')[1]?.trim() ?? 0)`)
      const key=async(key,code,repeat=false)=>{
        await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:key==='Enter'?13:key==='Home'?36:key==='End'?35:key==='ArrowRight'?39:37,autoRepeat:repeat,text:key==='Enter'?'\r':undefined})
        await send('Input.dispatchKeyEvent',{type:'keyUp',key,code})
      }
      const click=async(selector)=>{
        const p=await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`)
        await mouse('mouseMoved',p.x,p.y);await mouse('mousePressed',p.x,p.y);await mouse('mouseReleased',p.x,p.y)
      }
      assert(await count()===0,'dragging, release and snap completion never confirm')
      await click('.section-slot:nth-child(3) button');await delay(320)
      assert((await state()).index===2 && await count()===0,'inactive HOME label selects without confirming')
      await click('.section-slot:nth-child(3) button')
      assert(await count()===1,'active label confirms exactly once')
      await evaluate('document.querySelector(".wheel-surface").focus()')
      await key('ArrowRight','ArrowRight');await key('Enter','Enter')
      assert((await state()).angle===18 && (await state()).confirmation.includes('PROJECTS confirmed') && await count()===2,'Enter during settling confirms committed PROJECTS once and finishes snap')
      await key('Enter','Enter',true)
      assert(await count()===2,'slider ignores repeated Enter')
      await evaluate('document.querySelector(".wheel-center").focus()')
      await key('Enter','Enter')
      assert(await count()===3,'native center-button Enter produces one confirmation: '+JSON.stringify(await state()))
      await key('Enter','Enter',true)
      assert(await count()===3,'native center button suppresses repeated Enter')
      await evaluate('document.querySelector(".wheel-surface").focus()')
      await key('Home','Home');await key('ArrowLeft','ArrowLeft');await delay(320)
      assert((await state()).angle===-36,'Home selects ABOUT and left endpoint clamps')
      await key('End','End');await key('ArrowRight','ArrowRight');await delay(320)
      assert((await state()).angle===36,'End selects STACK and right endpoint clamps')
      const c=await count();const geometryNow=await geometry();const start=location(geometryNow,-90)
      await mouse('mouseMoved',start.x,start.y);await mouse('mousePressed',start.x,start.y);await key('Enter','Enter')
      assert(await count()===c,'active gesture rejects Enter confirmation')
      await mouse('mouseReleased',start.x,start.y);await delay(320)
      assert(await count()===c,'rim press and its subsequent browser click do not confirm')
      await click('.navigator-controls button:nth-child(2)')
      assert(await count()===c+1,'explicit Enter control confirms once')
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
      await delay(50)
      await evaluate('document.querySelector(".wheel-surface").focus()')
      await key('ArrowLeft','ArrowLeft')
      assert((await state()).angle===18 && (await state()).phase==='idle','reduced-motion selection finishes immediately')
      await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:false});await delay(150)
      assert(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),'320px page has no horizontal overflow')
      assert((await state()).index===3,'resize preserves committed selection')
      assert(await evaluate('location.href')===originalUrl,'confirmation leaves URL unchanged')
    }
    const evidence={checks,settled,errors,finalState:await state(),touch:'Chrome DevTools touch input; no physical-device test'}
    await writeFile('docs/pointer-verification.json',JSON.stringify(evidence,null,2))
    console.log(JSON.stringify(evidence))
    if(errors.length) throw new Error('Browser runtime errors')
  } else if (foundation) {
    const result = { mounted: true, text: await evaluate('document.querySelector("main").textContent'), errors }
    await writeFile('.tmp/foundation-verification.json', JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    if (errors.length) throw new Error('Browser runtime errors.')
  } else {
    await evaluate('Promise.all([...document.images].map(image => image.decode()))')
    const layouts = []
    for (const [width, height, name] of [[1440, 900, 'desktop'], [320, 740, 'mobile'], [1440, 600, 'short']]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await delay(150)
      const layout = await evaluate(`(() => {
        const stage = document.querySelector('.wheel-stage').getBoundingClientRect();
        const active = document.querySelector('.section-label--active').getBoundingClientRect();
        return { viewport: [innerWidth, innerHeight], clientWidth: document.documentElement.clientWidth, document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height }, activeCenterX: active.x + active.width / 2, labels: [...document.querySelectorAll('.section-label')].map(x => x.textContent), counter: document.querySelector('.section-counter').textContent, images: [...document.images].map(x => ({ source: x.src.startsWith('data:') ? 'embedded local SVG' : new URL(x.src).pathname, width: x.width, height: x.height, natural: [x.naturalWidth, x.naturalHeight], loaded: x.complete && x.naturalWidth > 0 })) };
      })()`)
      layouts.push({ name, ...layout })
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      await writeFile(`docs/home-${name}.png`, Buffer.from(screenshot.data, 'base64'))
      if (layout.document[0] > layout.clientWidth || Math.abs(layout.activeCenterX - layout.clientWidth / 2) > 1 || layout.images.some(x => !x.loaded)) throw new Error(`Layout check failed: ${name}`)
    }
    const asset = await evaluate(`(() => {
      const image = document.querySelector('.wheel-artwork');
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let minAlpha = 255, maxAlpha = 0, transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) { minAlpha = Math.min(minAlpha, pixels[i]); maxAlpha = Math.max(maxAlpha, pixels[i]); if (pixels[i] < 255) transparent++; }
      const sheet = document.createElement('canvas'); sheet.width = 2000; sheet.height = 860;
      const s = sheet.getContext('2d'); s.fillStyle = '#d4d4d4'; s.fillRect(0, 0, 2000, 860);
      const drawWheel = () => s.drawImage(image, -625.95594/1254*295.8, -645.82089/1254*295.8, 295.8, 295.8);
      for (const [index, angle] of [-36, -18, 0, 18, 36].entries()) {
        const x = index * 400; s.fillStyle = index % 2 === 0 ? '#ffffff' : '#ef79d5'; s.fillRect(x, 0, 400, 430);
        s.fillStyle = '#222222'; s.font = '16px sans-serif'; s.fillText(angle + ' degrees / stage-center origin', x + 12, 25);
        s.save(); s.translate(x + 200, 225); s.rotate(angle * Math.PI / 180); drawWheel(); s.restore();
        s.strokeStyle = '#00ff88'; s.beginPath(); s.moveTo(x + 190, 225); s.lineTo(x + 210, 225); s.moveTo(x + 200, 215); s.lineTo(x + 200, 235); s.stroke();
        s.save(); s.translate(x + 200, 645); s.rotate(angle * Math.PI / 180); drawWheel(); s.restore();
        // The dedicated band verifier checks the calibrated contour without drawing UI overlays.
      }
      s.fillStyle = '#222222'; s.fillText('Unmodified candidate; calibrated hub; visible-edge band verification is in verify-wheel-band.mjs. Overlays are inspection-only.', 12, 842);
      const samples = [[0, 0], [526, 320], [526, 526]].map(([x, y]) => ({ x, y, rgba: [...ctx.getImageData(x, y, 1, 1).data] }));
      return { size: [canvas.width, canvas.height], totalPixels: pixels.length / 4, minAlpha, maxAlpha, pixelsWithTransparency: transparent, samples, composite: sheet.toDataURL('image/png').split(',')[1] };
    })()`)
    const { composite, ...metadata } = asset
    await writeFile('docs/asset-inspection.png', Buffer.from(composite, 'base64'))
    const calibrationExpression = `(async () => {
      const image = document.querySelector('.wheel-artwork');
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const points = [];
      for (let angle = 0; angle < 360; angle += 30) {
        let best = null;
        for (let r = 135; r <= 180; r++) {
          const x = Math.round(627 + r * Math.cos(angle * Math.PI / 180));
          const y = Math.round(650 + r * Math.sin(angle * Math.PI / 180));
          const pixel = ctx.getImageData(x, y, 1, 1).data; const light = pixel[0] + pixel[1] + pixel[2];
          if (!best || light > best.light) best = { x, y, light };
        }
        points.push(best);
      }
      const m = [0, 1, 2].map(i => [0, 1, 2].map(j => points.reduce((sum, p) => sum + [p.x, p.y, 1][i] * [p.x, p.y, 1][j], 0)).concat(points.reduce((sum, p) => sum + [p.x, p.y, 1][i] * (p.x*p.x + p.y*p.y), 0)));
      for (let i = 0; i < 3; i++) { const divisor = m[i][i]; m[i] = m[i].map(v => v / divisor); for (let j = 0; j < 3; j++) if (j !== i) { const factor = m[j][i]; m[j] = m[j].map((v,k) => v - factor * m[i][k]); } }
      const hub = { x: m[0][3]/2, y: m[1][3]/2 };
      const rotor = document.querySelector('.wheel-rotor'); const stage = document.querySelector('.wheel-stage');
      const rect = stage.getBoundingClientRect(); const size = rect.width; const art = getComputedStyle(image); const offset = new DOMMatrix(art.transform);
      const localX = parseFloat(art.left) + offset.m41 + hub.x * parseFloat(art.width) / image.naturalWidth - size/2;
      const localY = parseFloat(art.top) + offset.m42 + hub.y * parseFloat(art.height) / image.naturalHeight - size/2;
      const positions = [-36,-18,0,18,36].map(angle => { rotor.style.transform = 'rotate(' + angle + 'deg)'; const t = new DOMMatrix(getComputedStyle(rotor).transform); return { angle, x: rect.x + size/2 + t.a*localX + t.c*localY, y: rect.y + size/2 + t.b*localX + t.d*localY }; });
      rotor.style.transform = 'rotate(0deg)';
      const maxHubDisplacement = Math.max(...positions.flatMap(p => positions.map(q => Math.hypot(p.x-q.x,p.y-q.y))));
      const samples = [[0,0],[627,381],[627,627]].map(([x,y]) => ({x,y,rgba:[...ctx.getImageData(x,y,1,1).data]}));
      const {WHEEL_PRESENTATION} = await import('/src/features/wheel-navigation/presentation.ts');
      const {isWheelDragPoint} = await import('/src/features/wheel-navigation/wheelHitTest.ts');
      const {WHEEL_OUTER_CONTOUR} = await import('/src/features/wheel-navigation/wheelContour.ts');
      const [ax,ay]=WHEEL_OUTER_CONTOUR[0], [bx,by]=WHEEL_OUTER_CONTOUR[1];
      const length=Math.hypot(bx-ax,by-ay), scale=size*.87/1254;
      const testPoint=inset=>({x:((ax+bx)/2-625.95594)*scale-(by-ay)/length*inset,y:((ay+by)/2-645.82089)*scale+(bx-ax)/length*inset});
      const eligible=inset=>isWheelDragPoint(testPoint(inset),{x:0,y:0},size,0);
      const min=WHEEL_PRESENTATION.dragBandMinInsetPx,max=WHEEL_PRESENTATION.dragBandMaxInsetPx;
      if(!eligible(min)||!eligible((min+max)/2)||!eligible(max)||eligible(-1)||eligible(max+1)||isWheelDragPoint({x:0,y:0},{x:0,y:0},size,0))throw new Error('Visible-edge band eligibility failed');
      return { hub, positions, maxHubDisplacement, samples, bandMinInset:WHEEL_PRESENTATION.dragBandMinInsetPx,bandMaxInset:WHEEL_PRESENTATION.dragBandMaxInsetPx };
    })()`
    const calibration = await evaluate(calibrationExpression)
    if (calibration.maxHubDisplacement > 1 || calibration.samples[1].rgba[3] !== 0) throw new Error('T2 asset calibration failed')
    const calibrationRuns=[]
    for(const [width,height,dpr] of [[1440,900,1],[320,740,1],[1440,900,2],[320,740,2]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});await delay(100)
      const result=await evaluate(calibrationExpression)
      if(result.maxHubDisplacement>1) throw new Error('Responsive calibration failed')
      calibrationRuns.push({width,height,dpr,...result})
    }
    const evidence = { browser: await evaluate('navigator.userAgent'), layouts, asset: metadata, calibration, calibrationRuns, errors }
    await writeFile('docs/static-verification.json', JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify({ layouts: layouts.map(x => ({ name: x.name, overflow: x.document[0] > x.clientWidth, stage: x.stage, counter: x.counter })), asset: metadata, calibrationRuns:calibrationRuns.map(x=>({width:x.width,dpr:x.dpr,hubMovement:x.maxHubDisplacement,bandInsets:[x.bandMinInset,x.bandMaxInset]})), errors }))
    if (errors.length) throw new Error('Browser runtime errors.')
  }
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close()
  child.kill()
}
