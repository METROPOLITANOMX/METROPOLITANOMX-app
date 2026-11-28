var _antUltTxtTimers = {}, _antUltTxtTs = {}, _calibracionFeed = false;
var _camImgLastTs = { ant_1: 0, ant_2: 0 }, _camImgPollBusy = { ant_1: false, ant_2: false };
document.getElementById("dualCamsSlot").innerHTML = ["ant_1", "ant_2"].map(function(aid, ix) {
  var tit = ix === 0 ? "📡 ANTENA 1 (META)" : "📡 ANTENA 2 (REFUERZO)", col = ix === 0 ? "#38d9a9" : "#3bc9db";
  var fields = [["rx", "TUNEL X", 30, 0, 85], ["ry", "TUNEL Y", 15, 0, 85], ["rw", "ANCHO W", 25, 10, 80], ["rh", "ALTO H", 65, 10, 85]];
  return '<div class="cam-card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:' + col + ';font-size:12px">' + tit + '</b><button onclick="vibrar();calibrarUna(\'' + aid + '\')" style="background:' + col + ';color:#000;padding:5px 8px;font-size:10px">📍 CALIBRAR ' + (ix + 1) + '</button></div>' +
    '<div class="visor-dir"><img id="img_' + aid + '" alt="Sin señal"><div id="trig_' + aid + '" class="trig-line"></div><div id="roi_' + aid + '" class="roi-tunnel"><span class="roi-lbl">TUNEL ROI</span></div><div id="tel_' + aid + '" class="tel-bar">Esperando antena...</div></div>' +
    '<div class="color-readout"><span id="colorDot_' + aid + '" class="color-dot"></span><b id="colorTxt_' + aid + '">ESPERANDO COLOR VIVO</b><span id="colorPct_' + aid + '"></span></div>' +
    '<div style="font-size:10px;color:#ff6b6b;display:flex;justify-content:space-between"><span>LINEA ROJA DISPARO:</span><b id="lblPos_' + aid + '">50%</b></div>' +
    '<div class="rng-row"><button class="btn-step" onclick="stepRoi(\'' + aid + '\',\'pos\',-1)">-</button><input id="pos_' + aid + '" type="range" min="10" max="90" value="50" oninput="previewRoi(\'' + aid + '\')" onchange="enviarRoiAnt(\'' + aid + '\')"><button class="btn-step" onclick="stepRoi(\'' + aid + '\',\'pos\',1)">+</button></div>' +
    '<div class="grid2">' + fields.map(function(f) {
      return '<div><div style="font-size:9px;color:#0dcaf0;display:flex;justify-content:space-between"><span>' + f[1] + ':</span><b id="lbl' + f[0][0].toUpperCase() + f[0].slice(1) + '_' + aid + '">' + f[2] + '%</b></div>' +
        '<div class="rng-row"><button class="btn-step" onclick="stepRoi(\'' + aid + '\',\'' + f[0] + '\',-1)">-</button><input id="' + f[0] + '_' + aid + '" type="range" min="' + f[3] + '" max="' + f[4] + '" value="' + f[2] + '" oninput="previewRoi(\'' + aid + '\')" onchange="enviarRoiAnt(\'' + aid + '\')"><button class="btn-step" onclick="stepRoi(\'' + aid + '\',\'' + f[0] + '\',1)">+</button></div></div>';
    }).join("") + '</div>' +
    '<div class="grid3"><button onclick="vibrar();presetTunel(\'' + aid + '\',\'IZQ\')" style="background:#262626;color:#0dcaf0;padding:6px;font-size:9px">⬅️ TRAS IZQ</button><button onclick="vibrar();presetTunel(\'' + aid + '\',\'CEN\')" style="background:#262626;color:#ffc107;padding:6px;font-size:9px">🎯 CENTRO</button><button onclick="vibrar();presetTunel(\'' + aid + '\',\'DER\')" style="background:#262626;color:#0dcaf0;padding:6px;font-size:9px">TRAS DER ➡️</button></div></div>';
}).join("");

function aplicarLockSlidersUI() {
  var lab = document.getElementById("labCamaras"), b = document.getElementById("btnLockSliders");
  lab.classList.toggle("sliders-locked", _slidersLocked);
  b.textContent = _slidersLocked ? "🔒 CONTROLES BLOQUEADOS" : "🔓 EDITANDO CONTROLES";
  b.style.background = _slidersLocked ? "linear-gradient(180deg,#ffe066,#f59f00)" : "linear-gradient(180deg,#4be5b6,#12b886)";
  var rngs = lab.querySelectorAll("input[type=range],select#selAntiViento");
  for (var i = 0; i < rngs.length; i++) rngs[i].disabled = _slidersLocked;
}
function toggleLockSliders() { _slidersLocked = !_slidersLocked; aplicarLockSlidersUI(); }
function stepSlider(id, d, cb, lblId, suf) {
  if (_slidersLocked) return; vibrar(12);
  var el = document.getElementById(id), nv = Math.max(Number(el.min || 0), Math.min(Number(el.max || 100), Number(el.value) + d));
  el.value = nv; if (lblId) document.getElementById(lblId).textContent = nv + (suf || ""); if (cb) cb();
}
function stepRoi(aid, campo, d) {
  if (_slidersLocked) return; vibrar(12);
  var el = document.getElementById(campo + "_" + aid);
  el.value = Math.max(Number(el.min || 0), Math.min(Number(el.max || 100), Number(el.value) + d));
  previewRoi(aid); enviarRoiAnt(aid);
}

function previewRoi(aid) {
  var ori = (rootCache.sala && rootCache.sala.orientacion) || "V";
  var pos = Number(document.getElementById("pos_" + aid).value || 50), rx = Number(document.getElementById("rx_" + aid).value || 30), ry = Number(document.getElementById("ry_" + aid).value || 15), rw = Number(document.getElementById("rw_" + aid).value || 25), rh = Number(document.getElementById("rh_" + aid).value || 65);
  document.getElementById("lblPos_" + aid).textContent = pos + "%"; document.getElementById("lblRx_" + aid).textContent = rx + "%"; document.getElementById("lblRy_" + aid).textContent = ry + "%"; document.getElementById("lblRw_" + aid).textContent = rw + "%"; document.getElementById("lblRh_" + aid).textContent = rh + "%";
  var tr = document.getElementById("trig_" + aid);
  if (ori === "H") { tr.style.left = "0"; tr.style.right = "0"; tr.style.width = "100%"; tr.style.height = "4px"; tr.style.top = pos + "%"; tr.style.bottom = "auto"; }
  else { tr.style.top = "0"; tr.style.bottom = "0"; tr.style.height = "100%"; tr.style.width = "4px"; tr.style.left = pos + "%"; tr.style.right = "auto"; }
  var bx = document.getElementById("roi_" + aid); bx.style.left = rx + "%"; bx.style.top = ry + "%"; bx.style.width = rw + "%"; bx.style.height = rh + "%";
}
function presetTunel(aid, lado) {
  var pos = Number(document.getElementById("pos_" + aid).value || 50), ori = (rootCache.sala && rootCache.sala.orientacion) || "V", rx = 30, ry = 15, rw = 26, rh = 68;
  if (ori === "V") { rx = lado === "IZQ" ? Math.max(2, pos - rw - 4) : (lado === "DER" ? Math.min(85, pos + 4) : Math.max(2, Math.min(85, Math.round(pos - rw / 2)))); }
  else { rx = 16; rw = 68; rh = 26; ry = lado === "IZQ" ? Math.max(2, pos - rh - 4) : (lado === "DER" ? Math.min(85, pos + 4) : Math.max(2, Math.min(85, Math.round(pos - rh / 2)))); }
  document.getElementById("rx_" + aid).value = rx; document.getElementById("ry_" + aid).value = ry; document.getElementById("rw_" + aid).value = rw; document.getElementById("rh_" + aid).value = rh;
  previewRoi(aid); enviarRoiAnt(aid);
}
function leerRoiObj(aid) { return { posX: Number(document.getElementById("pos_" + aid).value || 50), x: Number(document.getElementById("rx_" + aid).value || 30), y: Number(document.getElementById("ry_" + aid).value || 15), w: Number(document.getElementById("rw_" + aid).value || 25), h: Number(document.getElementById("rh_" + aid).value || 65) }; }
function enviarRoiAnt(aid) {
  var roi = leerRoiObj(aid);
  Promise.all([
    fetchCmdCamDir(FB + "/sala/roi/" + aid + ".json", { method: "PUT", body: JSON.stringify(roi) }, "Guardar ROI"),
    fetchCmdCamDir(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: aid, posX: roi.posX, roi: roi }) }, "Enviar ROI a antena")
  ]).catch(function(){});
}
function mostrarErrorCmdCamDir(accion, err) {
  var msg = accion + ": " + ((err && err.message) || "sin conexión con Firebase");
  var estado = document.getElementById("lblEstadoGlobDir");
  if (estado) estado.textContent = "❌ " + msg;
}
function fetchCmdCamDir(url, opciones, accion) {
  return fetch(url, opciones).then(function(resp) {
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return resp;
  }).catch(function(err) {
    mostrarErrorCmdCamDir(accion, err);
    throw err;
  });
}
function asegurarVideoCalibracion() {
  if (testOn) return Promise.resolve();
  _calibracionFeed = true;
  return fetchCmdCamDir(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ verVivo: true, dirTs: ahoraSrv(), dirSession: dirSessionId }) }, "Activar vídeo de calibración").catch(function(err) {
    _calibracionFeed = false;
    throw err;
  });
}
function calibrarUna(aid) {
  asegurarVideoCalibracion().then(function() {
    return fetchCmdCamDir(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: aid, calibrar: true, roi: leerRoiObj(aid) }) }, "Calibrar antena");
  }).then(function() {
    hablarYAntenas("Calibrando " + (aid === "ant_1" ? "antena 1" : "antena 2"), false);
  }).catch(function(){});
}
function calibrarAmbas10s() {
  desbloquearAudioD(false); if (_tCalAmbas) return;
  _tCalAmbas = true;
  asegurarVideoCalibracion().then(function() {
    var s = 10;
    hablarYAntenas("Retiren las motos de meta, calibrando en diez segundos", false);
    _tCalAmbas = setInterval(function() {
      if (s <= 5 && s >= 1) hablarYAntenas(String(s), false);
      if (s <= 0) {
        clearInterval(_tCalAmbas); _tCalAmbas = null;
        Promise.all(["ant_1", "ant_2"].map(function(aid, ix) {
          return new Promise(function(resolve, reject) {
            setTimeout(function() {
              fetchCmdCamDir(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: aid, calibrar: true, roi: leerRoiObj(aid) }) }, "Calibrar antena")
                .then(resolve).catch(reject);
            }, ix * 600);
          });
        })).then(function() {
          hablarYAntenas("Pista vacia calibrada en ambas camaras", true);
        }).catch(function(){});
      }
      s--;
    }, 1000);
  }).catch(function(){ _tCalAmbas = null; });
}
function toggleTestAntenas() {
  var activar = !testOn;
  fetchCmdCamDir(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: activar ? "TEST" : "ESPERA", verVivo: activar, dirTs: ahoraSrv(), dirSession: dirSessionId }) }, activar ? "Iniciar test de vídeo" : "Detener test de vídeo")
    .then(function() {
      testOn = activar;
      _calibracionFeed = false;
      var b = document.getElementById("btnToggleTest");
      b.textContent = testOn ? "🛑 DETENER TEST" : "🎥 TEST VIVO"; b.style.background = testOn ? "#dc3545" : "linear-gradient(180deg,#845ef7,#5f3dc4)";
    }).catch(function(){});
}
function setModoAnt(m) {
  fetchCmdCamDir(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ modoDet: m, dirTs: ahoraSrv(), dirSession: dirSessionId }) }, "Cambiar método de captura")
    .then(function() {
      if (!rootCache.sala) rootCache.sala = {};
      rootCache.sala.modoDet = m;
      pintarDirUI();
    }).catch(function(){});
}
function setOrientacion(o) { fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ orientacion: o, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){}); previewRoi("ant_1"); previewRoi("ant_2"); }
function setNColores(n) { fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ nColores: n, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){}); }

function cfgDir() {
  fetch(FB + "/sala.json", {
    method: "PATCH",
    body: JSON.stringify({
      modoJuego: document.getElementById("selJuego").value, duracionMin: Number(document.getElementById("selDur").value) || 0,
      minLapSec: Number(document.getElementById("selMinLap").value) || 5, sensPct: Number(document.getElementById("rngSens").value) || 7,
      colorPct: Number(document.getElementById("rngColorPct").value) || 25, pxDiff: Number(document.getElementById("rngPxDiff").value) || 45,
      antiViento: document.getElementById("selAntiViento").value || "OFF", retardoMs: Number(document.getElementById("rngRetardo").value) || 0,
      dirTs: ahoraSrv(), dirSession: dirSessionId
    })
  }).catch(function(){});
}
function cfgLuz() {
  var dE = Number(document.getElementById("rngDeltaE").value) || 22, prev = (rootCache.sala && rootCache.sala.perfilLuz) || {};
  fetch(FB + "/sala/perfilLuz.json", { method: "PATCH", body: JSON.stringify({ nombre: prev.nombre || "Personalizado", deltaE: dE, minChroma: prev.minChroma || 20, lGain: prev.lGain || 1.0 }) }).catch(function(){});
}
function aplicarPresetLuz(tipo) {
  var ps = { SOL: { nombre: "Sol Fuerte", deltaE: 24, minChroma: 22, lGain: 0.92, sens: 12, col: 28, px: 52 }, NUBLADO: { nombre: "Nublado/Sombra", deltaE: 22, minChroma: 20, lGain: 1.05, sens: 8, col: 24, px: 45 }, BAJA: { nombre: "Poca Luz", deltaE: 24, minChroma: 18, lGain: 1.24, sens: 7, col: 20, px: 34 } };
  var p = ps[tipo] || ps.NUBLADO;
  document.getElementById("rngSens").value = p.sens; document.getElementById("lblSensDir").textContent = p.sens + "%";
  document.getElementById("rngColorPct").value = p.col; document.getElementById("lblColorPctDir").textContent = p.col + "%";
  document.getElementById("rngDeltaE").value = p.deltaE; document.getElementById("lblDeltaEDir").textContent = p.deltaE;
  document.getElementById("rngPxDiff").value = p.px; document.getElementById("lblPxDiffDir").textContent = p.px;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ sensPct: p.sens, colorPct: p.col, pxDiff: p.px, dirTs: ahoraSrv(), dirSession: dirSessionId, perfilLuz: { nombre: p.nombre, deltaE: p.deltaE, minChroma: p.minChroma, lGain: p.lGain } }) }).catch(function(){});
  hablarYAntenas("Perfil de luz " + p.nombre + " aplicado", false);
}
function cargarListaPerfiles() {
  fbJson(FB_ROOT + "/config/perfiles_camara.json?t=" + Date.now()).then(function(ps) {
    perfilesCam = ps || {}; var s = document.getElementById("selPerfilesGuardados"), prev = s.value;
    s.innerHTML = '<option value="">-- Cargar perfil guardado --</option>' + Object.keys(perfilesCam).map(function(k){ return '<option value="' + esc(k) + '">' + esc(perfilesCam[k].nombre || k) + '</option>'; }).join("");
    if (prev && perfilesCam[prev]) s.value = prev;
  }).catch(function(){});
}
function guardarPerfilActual() {
  var nom = prompt("Nombre para este perfil:", "Metro Sol Mediodia"); if (!nom) return;
  var pid = "p_" + nom.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) + "_" + Math.floor(10 + Math.random() * 89), s = rootCache.sala || {}, pL = s.perfilLuz || {};
  fbJson(FB_ROOT + "/config/perfiles_camara/" + pid + ".json", {
    method: "PUT",
    body: JSON.stringify({
      nombre: nom.trim(), orientacion: s.orientacion || "V", sensPct: Number(document.getElementById("rngSens").value) || 7,
      colorPct: Number(document.getElementById("rngColorPct").value) || 25, pxDiff: Number(document.getElementById("rngPxDiff").value) || 45,
      antiViento: document.getElementById("selAntiViento").value || "OFF", nColores: Number(s.nColores || 1),
      retardoMs: Number(document.getElementById("rngRetardo").value) || 25, deltaE: Number(document.getElementById("rngDeltaE").value) || 22,
      minChroma: pL.minChroma || 20, lGain: pL.lGain || 1.0, roi: { ant_1: leerRoiObj("ant_1"), ant_2: leerRoiObj("ant_2") }
    })
  }).then(function(){ cargarListaPerfiles(); alert("Perfil guardado ✓"); }).catch(function(){ alert("Error guardando perfil"); });
}
function cargarPerfilGuardado(pid) {
  var p = perfilesCam[pid]; if (!p) return;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ orientacion: p.orientacion || "V", sensPct: p.sensPct || 7, colorPct: p.colorPct || 25, pxDiff: p.pxDiff || 45, antiViento: p.antiViento || "OFF", nColores: p.nColores || 1, retardoMs: p.retardoMs || 25, perfilLuz: { nombre: p.nombre, deltaE: p.deltaE || 22, minChroma: p.minChroma || 20, lGain: p.lGain || 1.0 }, roi: p.roi || {}, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){});
  if (p.roi && p.roi.ant_1) fetch(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: "ant_1", posX: p.roi.ant_1.posX, roi: p.roi.ant_1 }) }).catch(function(){});
  if (p.roi && p.roi.ant_2) setTimeout(function(){ fetch(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: "ant_2", posX: p.roi.ant_2.posX, roi: p.roi.ant_2 }) }).catch(function(){}); }, 400);
  hablarYAntenas("Perfil " + p.nombre + " cargado", false);
}
function borrarPerfilGuardado() { var pid = document.getElementById("selPerfilesGuardados").value; if (pid && confirm("¿Borrar perfil?")) fetch(FB_ROOT + "/config/perfiles_camara/" + pid + ".json", { method: "DELETE" }).then(cargarListaPerfiles).catch(function(){}); }

function refrescarWarmupManual() {
  fbJson(FB_WU + ".json?t=" + Date.now()).then(function(d){ warmupCaps = d || {}; _lastWuSig = ""; pintarBandejasWarmup(); }).catch(function(){});
}
function pintarBandejasWarmup() {
  var actEl = document.activeElement; if (actEl && actEl.id && actEl.id.indexOf("selCap_") === 0) return;
  var pils = rootCache.pilotos || {}, gar = rootCache.garaje || {};
  var sig = Object.keys(warmupCaps).join(",") + "|" + Object.keys(pils).join(",") + "|" + Object.keys(gar).map(function(k){ return k + ":" + (gar[k] && gar[k].firmasWarmup ? JSON.stringify(gar[k].firmasWarmup).length : 0); }).join(",");
  if (sig === _lastWuSig) return;
  _lastWuSig = sig;

  var totalCaps = Object.keys(warmupCaps).length;
  document.getElementById("lblAccWu").textContent = "🔥 CAPTURAS WARM-UP MULTI-ANGULO (" + totalCaps + ")";
  var optsP = Object.keys(pils).filter(function(k){ return pils[k] && pils[k].nombre; }).map(function(k){ return '<option value="' + esc(k) + '">#' + esc(pils[k].dorsal || "1") + ' ' + esc(pils[k].nombre) + '</option>'; }).join("") +
    Object.keys(gar).filter(function(k){ return !pils[k] && gar[k] && gar[k].modelo; }).map(function(k){ return '<option value="' + esc(k) + '">#' + esc(gar[k].dorsal || "1") + ' ' + esc(k) + '</option>'; }).join("");
  if (!optsP) optsP = '<option value="">Sin pilotos</option>';

  ["ant_1", "ant_2"].forEach(function(aid) {
    var items = Object.keys(warmupCaps).filter(function(cid){
      var c = warmupCaps[cid]; if (!c) return false;
      return (aid === "ant_2") ? (c.antId === "ant_2") : (c.antId !== "ant_2");
    }).sort(function(a, b){ return (warmupCaps[b].ts || 0) - (warmupCaps[a].ts || 0); });
    document.getElementById("bandeja_" + aid).innerHTML = items.length ? items.map(function(cid) {
      var c = warmupCaps[cid], cols = (c.colores || []).map(function(cl){ return '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;border:1px solid #fff;background:' + esc(cl.hex || "#fff") + ';margin-right:4px;vertical-align:middle"></span>'; }).join("");
      var colTxt = c.colorNom ? (' <b style="color:#ffc107">' + esc(c.colorNom) + '</b>') : '';
      return '<div class="cap-card"><div class="cap-row">' + (c.img ? '<img src="' + c.img + '">' : '') + '<div style="flex:1;min-width:0"><div style="font-size:10px;color:#0dcaf0;margin-bottom:3px">' + esc(c.antNom || c.antId) + ' • ' + new Date(c.ts || Date.now()).toLocaleTimeString("es-ES") + '</div><div style="margin-bottom:4px">' + cols + colTxt + '</div><select id="selCap_' + esc(cid) + '" style="margin-bottom:4px;padding:5px;font-size:11px">' + optsP + '</select><div style="display:flex;gap:4px"><button onclick="vibrar(25);asignarCapturaPiloto(\'' + esc(cid) + '\')" style="flex:1;background:#20c997;color:#000;padding:5px;font-size:10px">+ ASIGNAR</button><button onclick="vibrar();descartarCaptura(\'' + esc(cid) + '\')" style="background:#3a1c1c;color:#ff4d5e;padding:5px 8px;font-size:10px">✕</button></div></div></div></div>';
    }).join("") : '<div style="color:#777;font-size:11px">Sin capturas.</div>';
  });
  var res = Object.keys(gar).filter(function(k){ return gar[k] && gar[k].firmasWarmup; }).map(function(k){
    var fw = gar[k].firmasWarmup || {}, c1 = Array.isArray(fw.ant_1) ? fw.ant_1.length : 0, c2 = Array.isArray(fw.ant_2) ? fw.ant_2.length : 0; if (!c1 && !c2) return "";
    return '<div class="fila"><span><b>#' + esc((pils[k] && pils[k].dorsal) || gar[k].dorsal || "1") + ' ' + esc((pils[k] && pils[k].nombre) || k) + '</b> — Cam1: <b>' + c1 + '</b> • Cam2: <b>' + c2 + '</b></span><button onclick="vibrar();borrarFirmasWuPiloto(\'' + esc(k) + '\')" style="background:#3a1c1c;color:#ff4d5e;padding:3px 7px;font-size:10px">Limpiar</button></div>';
  }).filter(Boolean).join("");
  document.getElementById("resumenFirmasWarmup").innerHTML = res || "Ninguna asignada.";
}
function asignarCapturaPiloto(cid) {
  var c = warmupCaps[cid], sel = document.getElementById("selCap_" + cid), pUid = sel ? sel.value : ""; if (!c || !pUid) { alert("Selecciona piloto."); return; }
  if (!Array.isArray(c.colores) || !c.colores.length) { alert("Esta captura no contiene un color vivo válido; no se puede asignar como firma."); return; }
  var aid = (c.antId === "ant_2") ? "ant_2" : "ant_1", gar = rootCache.garaje || {}, fw = (gar[pUid] && gar[pUid].firmasWarmup) || {}, arr = Array.isArray(fw[aid]) ? fw[aid].slice() : [];
  arr.push({ ts: c.ts || ahoraSrv(), colores: c.colores || [] }); if (arr.length > 6) arr = arr.slice(-6);
  fbJson(FB + "/garaje/" + pUid + "/firmasWarmup/" + aid + ".json", { method: "PUT", body: JSON.stringify(arr) }).then(function(){
    if (!rootCache.garaje[pUid]) rootCache.garaje[pUid] = {}; if (!rootCache.garaje[pUid].firmasWarmup) rootCache.garaje[pUid].firmasWarmup = {};
    rootCache.garaje[pUid].firmasWarmup[aid] = arr; _lastWuSig = ""; descartarCaptura(cid); hablarYAntenas("Captura asignada", false);
  }).catch(function(){ alert("Error asignando"); });
}
function descartarCaptura(cid) { delete warmupCaps[cid]; _lastWuSig = ""; fetch(FB_WU + "/" + cid + ".json", { method: "DELETE" }).catch(function(){}); pintarBandejasWarmup(); }
function limpiarBandejaWarmup() { warmupCaps = {}; _lastWuSig = ""; fetch(FB_WU + ".json", { method: "DELETE" }).catch(function(){}); pintarBandejasWarmup(); }
function borrarFirmasWuPiloto(pUid) { if (rootCache.garaje[pUid]) delete rootCache.garaje[pUid].firmasWarmup; _lastWuSig = ""; fetch(FB + "/garaje/" + pUid + "/firmasWarmup.json", { method: "DELETE" }).then(pintarBandejasWarmup).catch(function(){}); }

function pintarAntenasTel() {
  var s = rootCache.sala || {}, ants = rootCache.antenas || {}, ah = ahoraSrv(), md = s.modoDet || "TODO", antsAct = [];
  ["ant_1", "ant_2"].forEach(function(aid) {
    var a = ants[aid], tel = document.getElementById("tel_" + aid);
    var msgTs = a ? Number(a.ultTxtTs || 0) : 0, msgAge = ah - msgTs;
    var msg = a && a.ultTxt && msgTs > 0 && msgAge >= 0 && msgAge < 5000 ? a.ultTxt : "";
    if (_antUltTxtTs[aid] !== msgTs) {
      if (_antUltTxtTimers[aid]) clearTimeout(_antUltTxtTimers[aid]);
      _antUltTxtTs[aid] = msgTs;
      var msgWait = 5000 - Math.max(0, msgAge);
      if (msg && msgWait > 0) _antUltTxtTimers[aid] = setTimeout(function() {
        _antUltTxtTimers[aid] = null;
        var current = (rootCache.antenas || {})[aid];
        if (current && Number(current.ultTxtTs || 0) === msgTs) pintarAntenasTel();
      }, msgWait);
    }
    var colorTxt = document.getElementById("colorTxt_" + aid), colorDot = document.getElementById("colorDot_" + aid), colorPct = document.getElementById("colorPct_" + aid);
    if (colorTxt && colorDot && colorPct) {
      var cn = a && a.colorNom, colorHex = { ROJO: "#ff3b30", AZUL: "#1687ff", AMARILLO: "#ffd400", NARANJA: "#ff7900", VERDE: "#00d26a", MORADO: "#a855f7" };
      colorTxt.textContent = cn ? "CAPTANDO " + cn + " VIVO" : "ESPERANDO COLOR VIVO";
      colorDot.style.background = colorHex[cn] || "#343a40";
      colorPct.textContent = cn ? "DOMINANTE " + (Number(a.colorRatio) || 0) + "% DE COLOR VIVO" : "";
    }
    if (a && Math.abs(ah - Number(a.ts || 0)) < 15000) {
      antsAct.push(aid);
      if (a.movidaTs && (ah - Number(a.movidaTs)) < 12000) {
        tel.style.color = "#ff4d5e"; tel.textContent = "⚠️ MOVIDA POR GOLPE/VIENTO";
        if (_ultMovida[aid] !== a.movidaTs) { _ultMovida[aid] = a.movidaTs; hablarYAntenas("Antena " + (aid === "ant_1" ? "1" : "2") + " movida", false); }
      } else {
        var mAct = a.modoActivo || md, mOk = (mAct === md);
        tel.style.color = !mOk ? "#ff6b6b" : (a.calibrada ? "#00e676" : "#ffc107");
        var videoEstado = typeof a.camOk === "boolean" ? (a.camOk ? " | VIDEO: OK" : " | VIDEO: SIN SEÑAL") : "";
        tel.textContent = (a.calibrada ? "✅ CAL" : "⚠️ SIN CAL") + " [" + mAct + (mOk ? " ✓" : " ⏳") + "] | MOV:" + (a.mov || 0) + "% | P:" + (a.pasos || 0) + videoEstado + (msg ? (" | " + msg) : "");
      }
    } else { tel.style.color = "#888"; tel.textContent = "Desconectada"; }
  });
  return antsAct;
}

function bindCamImg(aid) {
  var es = new EventSource(FB_IMG + "/" + aid + ".json");
  var onIm = function(e) {
    try {
      var m = JSON.parse(e.data); if (!m) return;
      if (m.path === "/" && m.data === null) { _camImgLastTs[aid] = Date.now(); document.getElementById("img_" + aid).removeAttribute("src"); return; }
      var im = (m.path === "/" && m.data) ? m.data.img : (m.path === "/img" ? m.data : null);
      if (im) { _camImgLastTs[aid] = Date.now(); document.getElementById("img_" + aid).src = im; }
    } catch (er) {}
  };
  es.addEventListener("put", onIm); es.addEventListener("patch", onIm);
  es.onerror = function(){ if (es.readyState === 2) setTimeout(function(){ if (aid === "ant_1") _esImg1 = bindCamImg("ant_1"); else _esImg2 = bindCamImg("ant_2"); }, 2500); };
  return es;
}