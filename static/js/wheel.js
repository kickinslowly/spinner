
/* Spin the Wheel — core logic */
(function(){
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const segContainer = document.getElementById("segments");
  const spinBtn = document.getElementById("spinBtn");
  const addSegBtn = document.getElementById("addSegBtn");
  const addDefaultBtn = document.getElementById("addDefaultBtn");
  const clearBtn = document.getElementById("clearBtn");
  const shuffleColorsBtn = document.getElementById("shuffleColorsBtn");
  const saveLocalBtn = document.getElementById("saveLocalBtn");
  const loadLocalBtn = document.getElementById("loadLocalBtn");
  const saveServerBtn = document.getElementById("saveServerBtn");
  const loadServerBtn = document.getElementById("loadServerBtn");
  const shareBtn = document.getElementById("shareBtn");
  const wheelKeyInput = document.getElementById("wheelKey");
  const segmentCount = document.getElementById("segmentCount");
  const winnerEl = document.getElementById("winner");
  const confetti = new Confetti();

  // Speed controls
  const speedInput = document.getElementById("speedInput");
  const speedValue = document.getElementById("speedValue");

  const tick = new Audio("/static/sounds/tick.wav");

  // Layer tabs (dynamic)
  const layerTabs = document.getElementById("layerTabs");
  const addLayerBtn = document.getElementById("addLayerBtn");

  function renderTabs(){
    if(!layerTabs) return;
    layerTabs.innerHTML = "";
    layers.forEach((layer, i)=>{
      const btn = document.createElement("button");
      btn.className = "tab-btn" + (i===activeLayer?" active":"");
      btn.innerHTML = `<span class="name">${(layer.name||`Layer ${i+1}`).replace(/</g,'&lt;')}</span><span class="edit" title="Rename">✎</span>`;
      btn.addEventListener("click", ()=> switchLayer(i));
      btn.querySelector(".edit")?.addEventListener("click", (e)=>{
        e.stopPropagation();
        const newName = prompt("Rename layer:", layer.name || `Layer ${i+1}`);
        if(newName!==null){
          layer.name = newName.trim() || layer.name || `Layer ${i+1}`;
          renderTabs();
        }
      });
      layerTabs.appendChild(btn);
    });
  }

  function switchLayer(i){
    if(i<0 || i>=layers.length) return;
    activeLayer = i;
    segments = layers[activeLayer].segments;
    renderSegmentRows();
    drawWheel();
    renderTabs();
  }

  let layers = [];
  let activeLayer = 0;
  let segments = []; // alias to current layer's segments
  let angle = 0;
  let spinning = false;
  let rafId = null;
  let spinToken = 0;

  const defaultColors = ["#2bab5e","#f2c054","#5c85c7","#db4d4d","#f59e0b","#10b981","#8b5cf6","#22d3ee","#ef4444","#f472b6"];

  function randColor(){
    return defaultColors[Math.floor(Math.random()*defaultColors.length)];
  }

  // ---- Speed helpers ----
  function activeWheelKey(){
    const keyFromInit = (window.INIT_WHEEL_KEY || "").trim();
    if(keyFromInit) return keyFromInit;
    const keyFromInput = (wheelKeyInput?.value || "").trim();
    return keyFromInput || "default-wheel";
  }
  function loadSavedSpeed(){
    const k = activeWheelKey();
    const val = localStorage.getItem("wheel:speed:"+k);
    const n = Number(val);
    if(!isNaN(n) && n>0) return n;
    return 1;
  }
  function saveSpeed(n){
    const k = activeWheelKey();
    try{ localStorage.setItem("wheel:speed:"+k, String(n)); }catch(e){}
  }
  function updateSpeedLabel(n){
    if(speedValue){
      const v = Number(n)||1;
      // Show more precision for very small speeds so 0.02 doesn't appear as 0.0x
      const label = v < 1 ? v.toFixed(2) : v.toFixed(1);
      speedValue.textContent = label + "x";
    }
  }
  function getSpeed(){
    const n = Number(speedInput?.value);
    if(!isNaN(n) && n>0) return n;
    return loadSavedSpeed();
  }

  function addSegment(text="New Option", weight=1, color=randColor()){
    segments.push({text, weight: Number(weight)||1, color});
    renderSegmentRows();
    drawWheel();
  }

  function removeSegment(i){
    segments.splice(i,1);
    renderSegmentRows();
    drawWheel();
  }

  function renderSegmentRows(){
    segContainer.innerHTML = "";
    segments.forEach((seg,i)=>{
      const row = document.createElement("div");
      row.className="seg-row";
      row.innerHTML = `
        <input type="text" value="${seg.text.replace(/"/g,'&quot;')}" data-i="${i}" data-k="text">
        <input type="number" value="${seg.weight}" min="0" step="0.1" data-i="${i}" data-k="weight">
        <input type="color" value="${seg.color}" data-i="${i}" data-k="color">
        <button data-i="${i}" data-act="dup">⧉</button>
        <button data-i="${i}" data-act="del">✕</button>
      `;
      segContainer.appendChild(row);
    });
    segContainer.querySelectorAll("input").forEach(inp=>{
      inp.addEventListener("input", e=>{
        const i = Number(e.target.dataset.i);
        const k = e.target.dataset.k;
        if(k==="weight"){
          segments[i][k] = Number(e.target.value)||0;
        }else{
          segments[i][k] = e.target.value;
        }
        drawWheel();
      });
    });
    segContainer.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", e=>{
        const i = Number(e.target.dataset.i);
        const act = e.target.dataset.act;
        if(act==="del") removeSegment(i);
        if(act==="dup"){ const s = segments[i]; addSegment(s.text, s.weight, s.color); }
      });
    });
    segmentCount.textContent = String(segments.length);
  }

  function totalWeight(){
    return segments.reduce((a,s)=>a+Math.max(0, Number(s.weight)||0), 0);
  }

  function pickWeighted(){
    const tw = totalWeight();
    if(tw<=0 || segments.length===0) return null;
    let r = Math.random()*tw;
    for(let i=0;i<segments.length;i++){
      r -= Math.max(0, Number(segments[i].weight)||0);
      if(r<=0) return i;
    }
    return segments.length-1;
  }

  function shuffleColors(){
    segments.forEach(s=>s.color = randColor());
    drawWheel();
  }

  function drawWheel(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    const cx = w/2, cy = h/2;
    const r = Math.min(cx, cy)-10;

    // Compute angle per segment based on weight
    const tw = totalWeight();
    if(tw<=0){
      // Draw base circle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle = "#1f2a60";
      ctx.fill();
      ctx.restore();
      return;
    }

    let start = angle;
    segments.forEach((seg,i)=>{
      const frac = (Math.max(0,Number(seg.weight)||0))/tw;
      const sweep = frac * Math.PI*2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,r,start,start+sweep);
      ctx.closePath();
      ctx.fillStyle = seg.color || randColor();
      ctx.fill();
      // divider
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // label
      ctx.fillStyle = "#0b1020";
      ctx.font = "bold 20px system-ui";
      ctx.rotate(start + sweep/2);
      ctx.textAlign = "right";
      ctx.fillText(seg.text.substring(0,30), r-14, 6);
      ctx.restore();

      start += sweep;
    });

    // hub
    ctx.save();
    ctx.translate(cx,cy);
    ctx.beginPath();
    ctx.arc(0,0,24,0,Math.PI*2);
    ctx.fillStyle="#0b1020";
    ctx.fill();
    ctx.restore();
  }

  function spin(){
    if(segments.length===0 || totalWeight()<=0) return;
    // cancel any in-flight animation and start fresh immediately
    spinToken++;
    const myToken = spinToken;
    if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
    spinning = true;
    winnerEl.style.display="none";

    // Determine target winning index by weights
    const idx = pickWeighted();
    if(idx===null){ spinning=false; return; }

    // Map index to an angle interval
    const tw = totalWeight();
    let start = angle; // current
    let targetStart = 0, targetEnd = 0;
    let winSweep = 0;
    for(let i=0;i<segments.length;i++){
      const frac = (Math.max(0,Number(segments[i].weight)||0))/tw;
      const sweep = frac * Math.PI*2;
      if(i===idx){ targetStart = start; targetEnd = start + sweep; winSweep = sweep; break; }
      start += sweep;
    }

    // We want the pointer (top) to land in the middle of [targetStart, targetEnd]
    const pointerAngle = -Math.PI/2; // top
    const mid = (targetStart + targetEnd)/2;
    let delta = (pointerAngle - mid);
    // Normalize delta to [0, 2π) so alignment never reduces guaranteed extra rotation
    const twoPi = Math.PI * 2;
    delta = ((delta % twoPi) + twoPi) % twoPi;

    // Ensure at least 2 full spins before entering winning segment on EVERY spin
    const extraTurns = 2 + Math.random(); // 2–3 extra full turns beyond alignment
    const targetAngle = angle + extraTurns * twoPi + delta;

    const baseDuration = 4000; // ms at 1.0x
    const speedFactor = Math.max(0.02, Math.min(5, getSpeed()));
    const duration = Math.max(600, baseDuration / speedFactor);
    const t0 = performance.now();
    let lastTickAngle = angle;

    const entryAngle = targetAngle - (winSweep/2);
    let winnerShown = false;
    function showWinnerOnce(){
      if(winnerShown) return;
      winnerShown = true;
      const win = segments[idx];
      const lname = (layers[activeLayer]?.name) ? layers[activeLayer].name : `Layer ${activeLayer+1}`;
      winnerEl.textContent = `🎉 ${win.text} (${lname})`;
      winnerEl.style.display="block";
      confetti.burst(window.innerWidth/2, 120);
    }

    function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

    function frame(t){
      // If a newer spin started, abandon this frame
      if(myToken !== spinToken) { return; }
      const p = Math.min(1, (t - t0)/duration);
      const eased = easeOutCubic(p);
      const a = angle + (targetAngle - angle)*eased;
      const prev = angle;
      angle = a;
      drawWheel();

      // Early reveal: as soon as we enter the winning segment on the final lap
      if(!winnerShown && angle >= entryAngle){
        showWinnerOnce();
      }

      // play tick when crossing a divider (every segment boundary)
      const segCount = Math.max(1, segments.length);
      const per = (Math.PI*2)/segCount;
      if(Math.floor((prev % (Math.PI*2))/per) !== Math.floor((a % (Math.PI*2))/per)){
        try{ tick.currentTime=0; tick.play(); }catch(e){}
      }

      if(p<1){
        rafId = requestAnimationFrame(frame);
      }else{
        if(myToken === spinToken){
          spinning=false;
          rafId = null;
          // Ensure winner shown at end (fallback)
          showWinnerOnce();
        }
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function saveLocal(){
    const key = wheelKeyInput?.value?.trim() || "default-wheel";
    const payload = { layers: layers };
    localStorage.setItem("wheel:"+key, JSON.stringify(payload));
    alert("Saved to browser under key: " + key);
  }
  function normalizeSegments(arr){
    return (arr||[]).map(s=>({
      text: s.text ?? String(s.text ?? ""),
      weight: (s.weight===0) ? 0 : (Number(s.weight) ? Number(s.weight) : 1),
      color: s.color || randColor()
    }));
  }

  function normalizeLayersData(data){
    // Returns an array of {name, segments}
    if(Array.isArray(data)){
      // legacy: single-layer array
      return [{ name: "Layer 1", segments: normalizeSegments(data) }];
    }
    if(data && Array.isArray(data.layers)){
      return data.layers.map((l, idx)=>({
        name: (l && typeof l.name==='string' && l.name.trim()) ? l.name.trim() : `Layer ${idx+1}`,
        segments: normalizeSegments(l?.segments)
      }));
    }
    if(data && (Array.isArray(data.segments) || Array.isArray(data.layer2))){
      return [
        { name: "Layer 1", segments: normalizeSegments(data.segments) },
        { name: "Layer 2", segments: normalizeSegments(data.layer2) }
      ].filter(l=> l.segments.length>0 || true);
    }
    return [];
  }

  function loadLocal(key){
    const k = key || (wheelKeyInput?.value?.trim() || "default-wheel");
    const raw = localStorage.getItem("wheel:"+k);
    if(!raw){ alert("No wheel in browser for key: "+k); return; }
    try{
      const data = JSON.parse(raw);
      const newLayers = normalizeLayersData(data);
      layers = newLayers.length ? newLayers : [{ name: "Layer 1", segments: [] }];
      activeLayer = Math.min(activeLayer, layers.length-1);
      segments = layers[activeLayer].segments;
      renderSegmentRows(); drawWheel(); renderTabs();
    }catch(e){ alert("Failed to parse saved wheel."); }
  }

  // --- Local wheel picker ---
  function getLocalWheelKeys(){
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("wheel:speed:")) continue; // exclude speed settings
      if(k.startsWith("wheel:")){
        try{
          const raw = localStorage.getItem(k);
          const data = JSON.parse(raw);
          if(Array.isArray(data) || (data && typeof data === 'object')){
            keys.push(k.slice(6)); // strip "wheel:" prefix
          }
        }catch(e){ /* ignore bad entries */ }
      }
    }
    keys.sort((a,b)=> a.localeCompare(b));
    return keys;
  }

  function promptSelectLocalWheelKey(){
    const keys = getLocalWheelKeys();
    if(keys.length===0){
      alert("No wheels saved in this browser yet. Save one first.");
      return null;
    }
    const list = keys.map((k,i)=> `${i+1}) ${k}`).join("\n");
    const resp = prompt("Select a wheel to load:\n"+list+"\n\nEnter number:", "1");
    if(resp===null) return null;
    const n = Number(resp);
    if(!Number.isInteger(n) || n<1 || n>keys.length){
      alert("Invalid selection.");
      return null;
    }
    return keys[n-1];
  }

  function share(){
    const key = (wheelKeyInput?.value?.trim());
    if(!key){ alert("Enter a wheel key first."); return; }
    const url = location.origin + "/wheel/" + encodeURIComponent(key);
    navigator.clipboard.writeText(url).then(()=> alert("URL copied: "+url));
  }

  // Defaults
  function addDefaults(){
    ["Pizza","Burgers","Tacos","Sushi","Salad","Pasta"].forEach((t)=> addSegment(t,1));
  }

  // Event bindings
  spinBtn?.addEventListener("click", spin);
  addSegBtn?.addEventListener("click", ()=> addSegment());
  addDefaultBtn?.addEventListener("click", addDefaults);
  clearBtn?.addEventListener("click", ()=>{ layers[activeLayer].segments = []; segments = layers[activeLayer].segments; renderSegmentRows(); drawWheel(); });
  addLayerBtn?.addEventListener("click", ()=>{
    const n = layers.length + 1;
    layers.push({ name: `Layer ${n}`, segments: [] });
    switchLayer(layers.length - 1);
  });
  shuffleColorsBtn?.addEventListener("click", shuffleColors);
  saveLocalBtn?.addEventListener("click", saveLocal);
  loadLocalBtn?.addEventListener("click", ()=>{
    const key = promptSelectLocalWheelKey();
    if(key){ if(wheelKeyInput){ wheelKeyInput.value = key; } loadLocal(key); }
  });
  shareBtn?.addEventListener("click", share);
  speedInput?.addEventListener("input", ()=>{
    const v = Number(speedInput.value);
    updateSpeedLabel(v);
    if(v>0) saveSpeed(v);
  });
  wheelKeyInput?.addEventListener("change", ()=>{
    const v = loadSavedSpeed();
    if(speedInput){ speedInput.value = v; updateSpeedLabel(v); }
  });

  // Auto-load if we're on /wheel/<key>
  async function boot(){
    function initSpeedUI(){
      const v = loadSavedSpeed();
      if(speedInput){ speedInput.value = v; updateSpeedLabel(v); }
    }

    // Initialize with a default single layer
    layers = [{ name: "Layer 1", segments: [] }];
    activeLayer = 0;
    segments = layers[0].segments;

    if(window.INIT_WHEEL_KEY){
      wheelKeyInput && (wheelKeyInput.value = window.INIT_WHEEL_KEY);
      initSpeedUI();
      // Load only from browser storage
      const raw = localStorage.getItem("wheel:"+window.INIT_WHEEL_KEY);
      if(raw){
        try{
          const data = JSON.parse(raw);
          const newLayers = normalizeLayersData(data);
          if(newLayers.length){ layers = newLayers; activeLayer = 0; segments = layers[0].segments; }
        }catch(e){ /* ignore parse errors */ }
      }
    }else{
      initSpeedUI();
      // starter segments for Layer 1 only
      addDefaults();
    }

    // Finalize initial render
    segments = layers[activeLayer].segments;
    renderSegmentRows(); drawWheel(); renderTabs();
  }
  boot();

  // First paint
  drawWheel();
})();
