import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { WHEEL_PRESENTATION } from '../src/features/wheel-navigation/presentation.ts'

const root = process.cwd()
const base = path.join(root, '.tmp', 'audit-build')
const output = path.join(root, '.tmp', 'wheel-band-verification')
await mkdir(output, { recursive: true })
const profile = path.join(root, '.tmp', `audit-browser-${Date.now()}`)
await mkdir(profile, { recursive: true })
const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
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
  if (!port) throw new Error('Browser unavailable')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  ws.onmessage = async ({ data }) => {
    const event = JSON.parse(data)
    if (pending.has(event.id)) {
      const { resolve, reject } = pending.get(event.id); pending.delete(event.id)
      if (event.error) reject(new Error(JSON.stringify(event.error))); else resolve(event.result)
    }
    if (event.method === 'Fetch.requestPaused') {
      const requestId = event.params.requestId
      try {
        const url = new URL(event.params.request.url)
        let file
        if (url.pathname === '/original.png') file = path.join(root, 'src', 'assets', 'steering-wheel-neutral.png')
        else {
          file = path.resolve(base, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1))
          if (!file.startsWith(base + path.sep)) throw new Error('Outside audit build')
        }
        const body = await readFile(file)
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[path.extname(file)]
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: type ?? 'application/octet-stream' }], body: body.toString('base64') })
      } catch { await send('Fetch.fulfillRequest', { requestId, responseCode: 404 }) }
    }
  }
  function send(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) }) }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://carfolio.audit.invalid/' })
  for (let i = 0; i < 100; i++) { if (await evaluate('Boolean(document.querySelector(".navigator"))')) break; await delay(50) }
  await delay(100)




  await evaluate('Promise.all([...document.images].map(image => image.decode()))')
  if (process.argv.includes('--calibrate')) {
    const contour = await evaluate(`(() => {
      const image = document.querySelector('.wheel-artwork'), canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const alpha = (x, y) => {
        const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
        const at=(a,b)=>a<0||b<0||a>=canvas.width||b>=canvas.height?0:data[(b*canvas.width+a)*4+3];
        return at(ix,iy)*(1-fx)*(1-fy)+at(ix+1,iy)*fx*(1-fy)+at(ix,iy+1)*(1-fx)*fy+at(ix+1,iy+1)*fx*fy;
      };
      return Array.from({length:360}, (_,deg) => {
        const a=deg*Math.PI/180, dx=Math.cos(a), dy=Math.sin(a);
        // First outside-to-inside crossing ignores openings and the hub.
        let outer=710, inner=709;
        while(inner>400 && alpha(625.95594+inner*dx,645.82089+inner*dy)<128){outer=inner;inner--;}
        if(inner<=400)throw Error('Missing outer rim at '+deg);
        for(let i=0;i<20;i++){const mid=(inner+outer)/2;if(alpha(625.95594+mid*dx,645.82089+mid*dy)>=128)inner=mid;else outer=mid;}
        const radius=(inner+outer)/2;
        return [Number((625.95594+radius*dx).toFixed(4)),Number((645.82089+radius*dy).toFixed(4))];
      });
    })()`)
    const assetHash = createHash("sha256")
      .update(
        await readFile("src/assets/steering-wheel-transparent-candidate.webp"),
      )
      .digest("hex");
    const code='// Generated by node scripts/verify-wheel-band.mjs --calibrate.\n// Outer alpha=128 contour, 1 degree samples, source-image coordinates.\n'+
      `export const WHEEL_CONTOUR_ASSET_SHA256 = '${assetHash}'\n`+
      'export const WHEEL_OUTER_CONTOUR: ReadonlyArray<readonly [number, number]> = [\n'+contour.map(point=>'  '+JSON.stringify(point)).join(',\n')+'\n]\n'
    await writeFile('src/features/wheel-navigation/wheelContour.ts',code)
    console.log(JSON.stringify({calibratedPoints:contour.length,assetHash}))

  } else {
    const calibration = await readFile('src/features/wheel-navigation/wheelContour.ts', 'utf8')
    const contour = JSON.parse(calibration.split(' = ').at(-1).trim())
    const assetHash = createHash("sha256")
      .update(
        await readFile("src/assets/steering-wheel-transparent-candidate.webp"),
      )
      .digest("hex");
    if (!calibration.includes(assetHash)) throw new Error('Contour asset checksum is stale')
    await evaluate(`document.addEventListener('pointermove',e=>{window.lastBandPointer={x:e.clientX,y:e.clientY,target:e.target.className}})` )
    const checks = [], externalControlHits = []
    const assert = (ok, label) => { if (!ok) throw new Error(label); checks.push(label) }
    const state = () => evaluate(`(() => { const n=document.querySelector('.navigator'); return {angle:+n.dataset.angle,phase:n.dataset.phase,confirmation:document.querySelector('.confirmation-status').textContent}; })()`)
    let held = false
    const mouse = async (type, p) => {
      if(type==='mousePressed') held=true
      if(type==='mouseReleased') held=false
      await send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:type==='mouseMoved'&&!held?'none':'left',buttons:held?1:0,clickCount:type==='mouseMoved'?0:1})
    }
    const noCircle = () => evaluate(`(() => { const s=getComputedStyle(document.querySelector('.wheel-surface')); return s.outlineStyle==='none' && s.borderTopWidth==='0px' && s.boxShadow==='none'; })()`)
    const geometry = () => evaluate(`(() => {const r=document.querySelector('.wheel-surface').getBoundingClientRect();return {cx:r.x+r.width/2,cy:r.y+r.height/2,width:r.width};})()`)
    const point = (g, angle, segment, inset) => {
      const [ax,ay]=contour[segment], [bx,by]=contour[(segment+1)%contour.length]
      const scale=g.width*.87/1254, length=Math.hypot(bx-ax,by-ay), a=angle*Math.PI/180
      const x=((ax+bx)/2-625.95594)*scale-(by-ay)/length*inset
      const y=((ay+by)/2-645.82089)*scale+(bx-ax)/length*inset
      return {x:g.cx+x*Math.cos(a)-y*Math.sin(a),y:g.cy+x*Math.sin(a)+y*Math.cos(a)}
    }
    const select = async index => {
      await evaluate(`(() => {if(+document.querySelector('.navigator').dataset.selectedIndex!==${index})document.querySelectorAll('.section-label')[${index}].click();})()`)
      await delay(280)
    }
    // Inputs are computed from the stored contour, without calling app hit-testing code.
    for (const width of [1440,320]) for (const dpr of [1,2]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:dpr,mobile:false}); await delay(100)
      for (const [index,angle] of [[0,-36],[1,-18],[2,0],[3,18],[4,36]]) {
        await select(index)
        const g=await geometry()
        const min = WHEEL_PRESENTATION.dragBandMinInsetPx, max = WHEEL_PRESENTATION.dragBandMaxInsetPx
        for (const segment of [0,45,90,135,180,225,270,315]) for (const inset of [-1,min,3,8,12,20,max-1,max,max+1]) {
          const p=point(g,angle,segment,inset), before=await state(), accepted=inset>=min&&inset<=max
          await mouse('mouseMoved',p)
          const cursor=await evaluate('document.querySelector(".wheel-surface").style.cursor')
          if((cursor==='grab')!==accepted)console.log(JSON.stringify({p,cursor,observed:await evaluate('window.lastBandPointer'),state:await state(),g}))
          assert((cursor==='grab')===accepted,'hover eligibility '+[width,dpr,angle,segment,inset])
          const externalControl = await evaluate(`Boolean(document.elementFromPoint(${p.x},${p.y})?.closest('.navigator-controls'))`)
          if(externalControl)externalControlHits.push({width,dpr,angle,segment,inset})
          await mouse('mousePressed',p)
          assert((await state()).phase===(accepted?'armed':'idle'),'press eligibility '+[width,dpr,angle,segment,inset])
          assert(await noCircle(),'no circle on press')
          await mouse('mouseReleased',p)
          const after=await state()
          assert(after.angle===angle&&after.phase==='idle'&&(externalControl&&!accepted||after.confirmation===before.confirmation),'press preserves selection; band never confirms')
          assert(await noCircle(),'no circle after release')
        }
      }
      // Drag from the contour across the center button, then beyond the stage; capture must keep ownership.
      await select(2)
      const g=await geometry(), p=point(g,0,270,6), before=await state()
      await mouse('mousePressed',p)
      assert(await evaluate('document.querySelector(".wheel-surface").hasPointerCapture(1)'),'capture acquired')
      const r=Math.hypot(p.x-g.cx,p.y-g.cy), polar=Math.atan2(p.y-g.cy,p.x-g.cx)
      for(const degrees of [5,10,20]) {
        const a=polar+degrees*Math.PI/180
        await mouse('mouseMoved',{x:g.cx+(r+70)*Math.cos(a),y:g.cy+(r+70)*Math.sin(a)}); await delay(40)
        assert(Math.abs((await state()).angle-degrees)<.001,'smooth captured drag beyond band')
      }
      await mouse('mouseMoved',{x:g.cx,y:g.cy});await mouse('mouseReleased',{x:g.cx,y:g.cy});await delay(280)
      assert((await state()).angle===18&&(await state()).confirmation===before.confirmation,'release over hub snaps PROJECTS without confirmation')
      assert(!(await evaluate('document.querySelector(".wheel-surface").hasPointerCapture(1)')),'capture released')
      await mouse('mousePressed',{x:g.cx,y:g.cy});await mouse('mouseReleased',{x:g.cx,y:g.cy})
      assert((await state()).confirmation!==before.confirmation,'hub click confirms')
      assert(await noCircle(),'no circle after hub click')
      // The confirmed destination now owns the screen. Return through its real
      // floating control before continuing the unchanged mechanics matrix.
      for (let attempt=0; ; attempt++) {
        if (await evaluate('document.querySelector(".cinematic-scenes").dataset.phase') === 'section') break
        if (attempt===80) throw Error('Cinematic entry did not complete')
        await delay(50)
      }
      await evaluate('document.querySelector(".floating-wheel-control").click()')
      for (let attempt=0; ; attempt++) {
        if (await evaluate('document.querySelector(".cinematic-scenes").dataset.phase') === 'navigation') break
        if (attempt===80) throw Error('Navigation restoration did not complete')
        await delay(50)
      }
      for(const direction of [-1,1]) {
        await select(2);const start=point(g,0,270,6);await mouse('mousePressed',start)
        for(let d=5;d<=100;d+=5){const a=(Math.atan2(start.y-g.cy,start.x-g.cx)+direction*d*Math.PI/180);await mouse('mouseMoved',{x:g.cx+r*Math.cos(a),y:g.cy+r*Math.sin(a)})}
        const a=Math.atan2(start.y-g.cy,start.x-g.cx)+direction*100*Math.PI/180
        await mouse('mouseReleased',{x:g.cx+r*Math.cos(a),y:g.cy+r*Math.sin(a)});await delay(280)
        assert((await state()).angle===direction*36,'rotation clamps at '+direction*36)
      }
    }
    // Browser touch input (not a claim about physical hardware).
    await select(2);const g=await geometry(), p=point(g,0,270,6)
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:7}]})
    assert((await state()).phase==='armed','touch starts inside band')
    await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await delay(280)
    assert((await state()).angle===0,'touch cancellation restores HOME')
    await send('Emulation.setTouchEmulationEnabled',{enabled:false})
    await evaluate('document.activeElement.blur()')
    for(let i=0;i<12;i++){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'})
      if(await evaluate('document.activeElement.classList.contains("wheel-surface")'))break
    }
    assert(await evaluate('getComputedStyle(document.querySelector(".wheel-stage"),"::after").content.includes("ARROW KEYS")'),'keyboard focus badge visible')
    assert(await noCircle(),'keyboard has no large circle')
    const screenshot=await send('Page.captureScreenshot',{format:'png'})
    await writeFile(path.join(output,'keyboard-focus.png'),Buffer.from(screenshot.data,'base64'))
    const evidence={assetHash,calibrationPoints:contour.length,assertions:checks.length,checks,externalControlHits,touch:'Chrome protocol; physical devices not tested'}
    await writeFile(path.join(output,'results.json'),JSON.stringify(evidence,null,2))
    console.log(JSON.stringify({passed:checks.length,assetHash}))
  }
} finally {
  if (ws?.readyState === WebSocket.OPEN) ws.close()
  child.kill()
}
