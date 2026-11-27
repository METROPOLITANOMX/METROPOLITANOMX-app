function $id(x){return document.getElementById(x);}
var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var FB = FB_ROOT + "/circuitos/" + circId;
var FB_IMG = FB_ROOT + "/antenas_img/" + circId;
var FB_FF = FB_ROOT + "/foto_finish/" + circId + ".json";
var FB_WU = FB_ROOT + "/warmup_capturas/" + circId;
$id("txtCircModal").textContent = "Circuito activo: " + circId;
$id("lblCircAntTop").textContent = "PISTA: " + circId;
var antId = localStorage.getItem("mxp_ant_id") || "";
var antNom = localStorage.getItem("mxp_ant_nom") || "";
var vozOn = true, camOk = false, PW = 192, PH = 108, fondoFull = null, calHasta = 0;
var est = "SIN_CAL", calibradaOk = false, ultMs = 0, ultMsPorPiloto = {}, pasos = 0, ultCmd = 0;
var framesHit = 0, _trigPendTs = 0, _ultWuTs = 0, _golpeFrames = 0, _movidaTs = 0;
var _imgCleared = false, _fpsCnt = 0, _fpsTs = Date.now(), _fpsVal = 0, _resTxt = "", _ultTxtAnt = "";
var _telBusy = false, _imgBusy = false, _wuBusy = false, _ultMegaId = "", _ultReacTs = 0, _ultOvaTs = 0, _telOk = false, _telErr = "";
var _ultPasoLocalTs = 0, _tSoloVoz = null, _tSoloCal = null, _esSala = null;
var _vozQueue = [], _vozHablando = false;
var salaCache = {};
var cfg = {
 estado: "ESPERA", modoDet: "TODO", verVivo: false, orientacion: "V",
 sensPct: 0.07, colorPct: 0.25, pxDiff: 45, antiViento: "OFF", nColores: 1, retardoMs: 25,
 perfilLuz: { nombre: "Normal", deltaE: 20, minChroma: 16, lGain: 1.0 },
 roi: { posX: 50, x: 30, y: 15, w: 25, h: 65 }, garajes: {}
};
activarWakeLock();
window.addEventListener("beforeunload", function() {
 if (_esSala) try { _esSala.close(); } catch (e) {}
 if (antId) {
  fetch(FB + "/antenas/" + antId + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
  fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
 }
});
function hablarAnt(texto, urgente) {
 if (!vozOn || !texto || !("speechSynthesis" in window)) return;
 try {
  if (urgente) { _vozQueue = []; _vozHablando = false; speechSynthesis.cancel(); }
  else if (_vozHablando || speechSynthesis.speaking) { if (_vozQueue.length >= 3) _vozQueue.shift(); _vozQueue.push(texto); return; }
  var decir = function(t) {
   _vozHablando = true; var u = new SpeechSynthesisUtterance(t); u.lang = "es-ES"; u.rate = 1.08;
   var fin = function(){ _vozHablando = false; if (_vozQueue.length) decir(_vozQueue.shift()); };
   u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
  };
  decir(texto);
 } catch (e) {}
}
function desbloquearAudio(avisar) {
 desbloquearAudioCore();
 var b = $id("btnAudioAnt"); if (b) { b.textContent = "🔊 OK"; b.style.background = "#20c997"; }
 if (avisar) { mxBeep(940, 110); hablarAnt("Megafonia de antena activada", true); }
}
function toggleOled(on) { desbloquearAudio(false); $id("oledBlack").style.display = on ? "flex" : "none"; }
if (antId && antNom) { $id("modalRanura").style.display = "none"; $id("lblNomAnt").textContent = "📡 " + antNom; }
function elegirRanura(id, nom) {
 desbloquearAudio(false); antId = id; antNom = nom;
 localStorage.setItem("mxp_ant_id", id); localStorage.setItem("mxp_ant_nom", nom);
 $id("modalRanura").style.display = "none"; $id("lblNomAnt").textContent = "📡 " + nom;
 calibradaOk = false; est = "SIN_CAL"; _imgCleared = false; enviarTelemetria();
 hablarAnt(nom + " conectada, esperando calibracion", true);
}
function elegirTemporal() { var n = prompt("Nombre para esta antena temporal:", "Antena Invitada"); if (!n) return; elegirRanura("tmp_" + Math.random().toString(36).slice(2, 6), n.trim().toUpperCase()); }
function iniciarModoSolo() {
 desbloquearAudio(false); antId = "ant_1"; antNom = "ANTENA 1 (SOLO)";
 localStorage.setItem("mxp_ant_id", antId); localStorage.setItem("mxp_ant_nom", antNom);
 $id("modalRanura").style.display = "none"; $id("lblNomAnt").textContent = "📡 " + antNom;
 if (_tSoloCal) clearInterval(_tSoloCal);
 var s = 10; hablarAnt("Modo solo activado, coloca el movil en meta y retirate, calibrando en 10 segundos", true);
 _tSoloCal = setInterval(function() {
  $id("lblEstado").textContent = "MODO SOLO — PREPARATE (" + s + "s)";
  if (s <= 5 && s >= 1) hablarAnt(String(s), false);
  if (s <= 0) {
   clearInterval(_tSoloCal); _tSoloCal = null; _ultPasoLocalTs = 0; pasos = 0;
   calibrarFondo(); cfg.estado = "EN_CURSO";
   fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO", modoDet: "TODO", tsInicio: ahoraSrv() }) }).catch(function(){});
   setTimeout(function(){ hablarAnt("Pista calibrada, crono en marcha, dale gas", true); }, 1500);
  }
  s--;
 }, 1000);
}
function ayudaAnt() {
 alert("GUIA ANTENA PRO:\n1. En WARM-UP detecta el color principal de cualquier objeto que cruce (ignorando negro/sombras) y lo envia a Direccion.\n2. En carrera con modo Color (1 color por defecto), distingue tonos vivos (Chroma + Hue°) y blancos exactos.\n3. En interior deja Anti-Viento en OFF en Direccion.\n4. Pulsa 🔊 AUDIO al inicio y 🌙 OLED tras calibrar.");
}
function toggleVoz() { desbloquearAudio(false); vozOn = !vozOn; var b = $id("btnVoz"); b.textContent = vozOn ? "Voz ON" : "Voz OFF"; b.style.background = vozOn ? "#20c997" : "#444"; }
function pintarOverlaysVisor() {
 var r = cfg.roi || { posX: 50, x: 30, y: 15, w: 25, h: 65 }, lin = $id("lin");
 if (cfg.orientacion === "H") { lin.style.left = "0"; lin.style.right = "0"; lin.style.width = "100%"; lin.style.height = "4px"; lin.style.top = (r.posX || 50) + "%"; lin.style.bottom = "auto"; }
 else { lin.style.top = "0"; lin.style.bottom = "0"; lin.style.height = "100%"; lin.style.width = "4px"; lin.style.left = (r.posX || 50) + "%"; lin.style.right = "auto"; }
 var rb = $id("roiBox"); rb.style.left = (r.x || 0) + "%"; rb.style.top = (r.y || 0) + "%"; rb.style.width = (r.w || 25) + "%"; rb.style.height = (r.h || 65) + "%";
}
function calibrarFondo() {
 fondoFull = null; framesHit = 0; _golpeFrames = 0; _trigPendTs = 0; ultMsPorPiloto = {};
 est = "CAL"; calibradaOk = true; calHasta = Date.now() + 1400; _imgCleared = false;
 enviarTelemetria(); hablarAnt("Calibrando pista vacia", true);
}
function salirAntena() {
 if (_esSala) try { _esSala.close(); } catch (e) {}
 if (antId) Promise.all([fetch(FB + "/antenas/" + antId + ".json", { method: "DELETE" }).catch(function(){}), fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE" }).catch(function(){})]).finally(function(){ location.href = "index.html"; });
 else location.href = "index.html";
}
var _cnv = $id("cnv"), _ctx = _cnv.getContext("2d", { willReadFrequently: true });
var _cnvProc = $id("cnvProc"), _ctxProc = _cnvProc.getContext("2d", { willReadFrequently: true });
var _cnvFf = $id("cnvFf"), _ctxFf = _cnvFf.getContext("2d");
var _cnvWu = $id("cnvWu"), _ctxWu = _cnvWu.getContext("2d");
var _cnvLive = document.createElement("canvas"); _cnvLive.width = 360; _cnvLive.height = 202;
var _ctxLive = _cnvLive.getContext("2d");
function esPixelNegro(r, g, b) {
 var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
 return mx < 55 || (mx < 78 && (mx - mn) < 18);
}
function nombreColorSimple(r, g, b, lb) {
 var ch = Math.sqrt(lb.a * lb.a + lb.b * lb.b);
 if (ch < 16) return (lb.L >= 70) ? "BLANCO" : "GRIS";
 var rn = r / 255, gn = g / 255, bn = b / 255;
 var mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn), d = mx - mn, h = 0;
 if (d > 0) {
  if (mx === rn) h = ((gn - bn) / d) % 6;
  else if (mx === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = h * 60;
  if (h < 0) h += 360;
 }
 if (h < 16 || h >= 340) return "ROJO";
 if (h < 42) return "NARANJA";
 if (h < 72) return "AMARILLO";
 if (h < 165) return "VERDE";
 if (h < 205) return "CIAN";
 if (h < 260) return "AZUL";
 if (h < 300) return "MORADO";
 return "ROSA";
}
function emitirPaso(pid, sinFf) {
 pasos++; mxBeep(940, 110); vibrar([35, 30, 35]);
 var tsPaso = ahoraSrv(), lapLocal = _ultPasoLocalTs ? (tsPaso - _ultPasoLocalTs) : 0; _ultPasoLocalTs = tsPaso;
 fetch(FB + "/eventos/" + antId + ".json", { method: "PUT", body: JSON.stringify({ ts: tsPaso, antId: antId, antNom: antNom, modo: cfg.modoDet, pilotoUid: pid || "", pasos: pasos }) }).catch(function(){});
 enviarTelemetria();
 if (!sinFf) {
  try {
   _ctxFf.drawImage(_cnv, 0, 0, 320, 180); _ctxFf.fillStyle = "rgba(255,42,42,0.8)";
   var pLine = (cfg.roi && cfg.roi.posX) || 50;
   if (cfg.orientacion === "H") _ctxFf.fillRect(0, Math.round((pLine / 100) * 180) - 1, 320, 2);
   else _ctxFf.fillRect(Math.round((pLine / 100) * 320) - 1, 0, 2, 180);
   fetch(FB_FF, { method: "PUT", body: JSON.stringify({ ts: tsPaso, antNom: antNom, pid: pid || "", modo: cfg.modoDet, img: _cnvFf.toDataURL("image/jpeg", 0.56) }) }).catch(function(){});
  } catch (e) {}
 }
 if (_tSoloVoz) clearTimeout(_tSoloVoz);
 var pNum = pasos;
 _tSoloVoz = setTimeout(function() {
  _tSoloVoz = null;
  if (lapLocal >= 1500 && !pid && antNom.indexOf("SOLO") >= 0) {
   hablarAnt("Vuelta " + Math.max(1, pNum - 1) + ", " + fmtVoz(lapLocal), false);
   $id("lblMegaAnt").textContent = "🔊 Vuelta: " + fmt(lapLocal);
  } else if (!pid && antNom.indexOf("SOLO") >= 0) hablarAnt("Paso " + pNum + ", crono iniciado", false);
 }, 750);
 $id("txtOledEst").textContent = "PASOS: " + pasos + " (DOBLE TOQUE)";
}
function extraerColorUnico(dProc, x0, y0, w0, h0, soloMov, diffMin, lG) {
 var bins = {}, cnt = 0;
 for (var py = y0; py < y0 + h0; py++) {
  for (var px = x0; px < x0 + w0; px++) {
   var k = (py * PW + px) * 4;
   if (soloMov && (Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
   var rr = Math.min(255, dProc[k] * lG), gg = Math.min(255, dProc[k + 1] * lG), bb = Math.min(255, dProc[k + 2] * lG);
   if (esPixelNegro(rr, gg, bb)) continue;
   cnt++;
   var key = Math.round(rr / 34) + "_" + Math.round(gg / 34) + "_" + Math.round(bb / 34);
   if (!bins[key]) bins[key] = { cnt: 0, r: 0, g: 0, b: 0 };
   bins[key].cnt++; bins[key].r += rr; bins[key].g += gg; bins[key].b += bb;
  }
 }
 var lista = Object.keys(bins).map(function(k) {
  var o = bins[k], n = o.cnt, r0 = Math.round(o.r / n), g0 = Math.round(o.g / n), b0 = Math.round(o.b / n), lb = rgbLab(r0, g0, b0);
  return {
   cnt: n, r: r0, g: g0, b: b0, zona: "CAR", hex: "rgb(" + r0 + "," + g0 + "," + b0 + ")",
   lab: { L: Math.round(lb.L * 100) / 100, a: Math.round(lb.a * 100) / 100, b: Math.round(lb.b * 100) / 100 },
   ch: Math.sqrt(lb.a * lb.a + lb.b * lb.b), nom: nombreColorSimple(r0, g0, b0, lb)
  };
 }).filter(function(c) { return !(c.ch < 16 && c.lab.L <= 30); }).sort(function(a, b) { return b.cnt - a.cnt; });
 if (!lista.length) return { cnt: 0, col: null };
 var elegido = lista[0];
 if (elegido.ch < 18) {
  for (var i = 1; i < lista.length; i++) {
   if (lista[i].ch >= 18 && lista[i].cnt >= elegido.cnt * 0.28) { elegido = lista[i]; break; }
  }
 }
 delete elegido.ch;
 return { cnt: cnt, col: elegido };
}
function capturarYEnviarWarmup(dProc) {
 var ts = ahoraSrv();
 if (_wuBusy || (ts - _ultWuTs) < 1100) return;
 _ultWuTs = ts;
 var r = cfg.roi || { x: 30, y: 15, w: 25, h: 65 }, pLine = r.posX || 50;
 var rx0 = Math.max(0, Math.floor((r.x / 100) * PW)), ry0 = Math.max(0, Math.floor((r.y / 100) * PH));
 var rw = Math.max(14, Math.min(PW - rx0, Math.floor((r.w / 100) * PW))), rh = Math.max(14, Math.min(PH - ry0, Math.floor((r.h / 100) * PH)));
 var pL = cfg.perfilLuz || {}, lG = pL.lGain || 1.0, diffMin = Math.max(16, (cfg.pxDiff || 45) * 0.60);
 var cropRect = { x: r.x, y: r.y, w: r.w, h: r.h };
 var res = extraerColorUnico(dProc, rx0, ry0, rw, rh, true, diffMin, lG);
 if (res.cnt < 8 || !res.col) {
  if (cfg.orientacion === "H") {
   var yL = Math.max(0, Math.min(PH - 36, Math.floor((pLine / 100) * PH) - 18));
   cropRect = { x: 15, y: Math.round((yL / PH) * 100), w: 70, h: 34 };
   res = extraerColorUnico(dProc, Math.floor(PW * 0.15), yL, Math.floor(PW * 0.70), 36, true, diffMin, lG);
  } else {
   var xL = Math.max(0, Math.min(PW - 48, Math.floor((pLine / 100) * PW) - 24));
   cropRect = { x: Math.round((xL / PW) * 100), y: 12, w: 26, h: 76 };
   res = extraerColorUnico(dProc, xL, Math.floor(PH * 0.12), 48, Math.floor(PH * 0.76), true, diffMin, lG);
  }
  if (res.cnt < 8 || !res.col) {
   cropRect = { x: 25, y: 18, w: 50, h: 64 };
   res = extraerColorUnico(dProc, Math.floor(PW * 0.30), Math.floor(PH * 0.20), Math.floor(PW * 0.40), Math.floor(PH * 0.60), false, diffMin, lG);
  }
 }
 if (!res.col) { _ultWuTs = 0; $id("lblEstado").textContent = "⚠️ SOLO SOMBRA/NEGRO (ACERCALO)"; return; }
 var colNom = res.col.nom;
 $id("lblEstado").textContent = "🎨 DETECTADO: " + colNom;
 $id("lblEstado").style.color = "#0dcaf0";
 hablarAnt("Color " + colNom.toLowerCase(), false);
 try {
  var sx = Math.max(0, Math.min(360, Math.floor((cropRect.x / 100) * 384)));
  var sy = Math.max(0, Math.min(192, Math.floor((cropRect.y / 100) * 216)));
  var sw = Math.max(24, Math.min(384 - sx, Math.floor((cropRect.w / 100) * 384)));
  var sh = Math.max(24, Math.min(216 - sy, Math.floor((cropRect.h / 100) * 216)));
  _ctxWu.drawImage(_cnv, sx, sy, sw, sh, 0, 0, 160, 112);
  var payload = JSON.stringify({ ts: ts, antId: antId, antNom: antNom, colorNom: colNom, img: _cnvWu.toDataURL("image/jpeg", 0.45), colores: [res.col] });
  _wuBusy = true;
  $id("lblMegaAnt").textContent = "⏳ Enviando " + colNom + " a Direccion...";
  var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var tOut = setTimeout(function() { if (ctrl) ctrl.abort(); }, 7000);
  fetch(FB_WU + "/" + antId + "_" + ts + ".json", {
   method: "PUT",
   body: payload,
   signal: ctrl ? ctrl.signal : undefined
  }).then(function(resp) {
   clearTimeout(tOut);
   if (!resp.ok) throw new Error("HTTP " + resp.status);
   _wuBusy = false;
   _ultTxtAnt = "WU:" + colNom;
   mxBeep(720, 90);
   $id("lblEstado").textContent = "✅ ENVIADO: " + colNom;
   $id("lblEstado").style.color = "#00e676";
   $id("lblMegaAnt").textContent = "✅ Enviado a Direccion: " + colNom;
  }).catch(function(err) {
   clearTimeout(tOut);
   _wuBusy = false;
   _ultWuTs = 0;
   _ultTxtAnt = "Err:" + ((err && err.message) || "WU");
   var msgErr = (err && err.name === "AbortError") ? "Tiempo agotado (7s)" : ((err && err.message) || "Red");
   $id("lblEstado").textContent = "❌ ERROR ENVIO: " + msgErr;
   $id("lblEstado").style.color = "#ff4d5e";
   $id("lblMegaAnt").textContent = "❌ Error Firebase Warm-Up: " + msgErr;
   hablarAnt("Error al enviar captura", false);
  });
 } catch (e) {
  _wuBusy = false;
  _ultWuTs = 0;
  $id("lblMegaAnt").textContent = "❌ Error preparando captura: " + (e.message || e);
 }
}
function obtenerFirmasPiloto(gObj, pid) {
 var g = gObj[pid]; if (!g) return []; var res = [], md = cfg.modoDet;
 if ((md === "GAR" || md === "CAR" || md === "HIBRIDO") && Array.isArray(g.colores) && g.colores.length) res.push(g.colores);
 if (md === "WARMUP" || md === "HIBRIDO") {
  var fw = g.firmasWarmup || {}, prop = Array.isArray(fw[antId]) ? fw[antId] : [], otr = [];
  if (!prop.length) Object.keys(fw).forEach(function(k){ if (Array.isArray(fw[k])) otr = otr.concat(fw[k]); });
  (prop.length ? prop : otr).forEach(function(it){ if (it && Array.isArray(it.colores) && it.colores.length) res.push(it.colores); });
 }
 return res;
}
function evaluarRoiColor(dProc) {
 var r = cfg.roi || { x: 30, y: 15, w: 25, h: 65 }, pLine = r.posX || 50;
 var rx0 = Math.max(0, Math.floor((r.x / 100) * PW)), ry0 = Math.max(0, Math.floor((r.y / 100) * PH));
 var rw = Math.max(12, Math.min(PW - rx0, Math.floor((r.w / 100) * PW))), rh = Math.max(12, Math.min(PH - ry0, Math.floor((r.h / 100) * PH)));
 var pL = cfg.perfilLuz || {}, lG = pL.lGain || 1.0, dEMax = pL.deltaE || 22;
 var diffMin = Math.max(18, (cfg.pxDiff || 45) * 0.70), fg = [];
 var recogerFg = function(x0, y0, w0, h0) {
  var out = [], mY = y0 + Math.floor(h0 * 0.48);
  for (var py = y0; py < y0 + h0; py += 2) {
   for (var px = x0; px < x0 + w0; px += 2) {
    var k = (py * PW + px) * 4;
    if ((Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
    var rr = Math.min(255, dProc[k] * lG), gg = Math.min(255, dProc[k + 1] * lG), bb = Math.min(255, dProc[k + 2] * lG);
    if (esPixelNegro(rr, gg, bb)) continue;
    var lb = rgbLab(rr, gg, bb);
    if (lb.L <= 28 && Math.sqrt(lb.a * lb.a + lb.b * lb.b) < 16) continue;
    out.push({ r: rr, g: gg, b: bb, lb: lb, ch: Math.sqrt(lb.a * lb.a + lb.b * lb.b), hue: Math.atan2(lb.b, lb.a), zn: (py < mY) ? "SUP" : "INF" });
   }
  }
  return out;
 };
 fg = recogerFg(rx0, ry0, rw, rh);
 if (fg.length < 12) {
  if (cfg.orientacion === "H") fg = recogerFg(Math.floor(PW * 0.15), Math.max(0, Math.min(PH - 36, Math.floor((pLine / 100) * PH) - 18)), Math.floor(PW * 0.70), 36);
  else fg = recogerFg(Math.max(0, Math.min(PW - 48, Math.floor((pLine / 100) * PW) - 24)), Math.floor(PH * 0.12), 48, Math.floor(PH * 0.76));
 }
 if (fg.length < 8) return { pid: "", colNom: "", info: "FG:" + fg.length + "px (muy poco)" };
 var domSum = { r: 0, g: 0, b: 0, cnt: 0 }, domViv = { r: 0, g: 0, b: 0, cnt: 0 };
 for (var di = 0; di < fg.length; di++) {
  var dpx = fg[di];
  domSum.cnt++; domSum.r += dpx.r; domSum.g += dpx.g; domSum.b += dpx.b;
  if (dpx.ch >= 18) { domViv.cnt++; domViv.r += dpx.r; domViv.g += dpx.g; domViv.b += dpx.b; }
 }
 var useV = (domViv.cnt >= domSum.cnt * 0.25);
 var dr = Math.round((useV ? domViv.r : domSum.r) / (useV ? domViv.cnt : domSum.cnt));
 var dg = Math.round((useV ? domViv.g : domSum.g) / (useV ? domViv.cnt : domSum.cnt));
 var db = Math.round((useV ? domViv.b : domSum.b) / (useV ? domViv.cnt : domSum.cnt));
 var colVisto = nombreColorSimple(dr, dg, db, rgbLab(dr, dg, db));
 var gObj = cfg.garajes || {}, ks = Object.keys(gObj);
 if (!ks.length) return { pid: "", colNom: colVisto, info: "VEO: " + colVisto + " | Sin garajes en sala" };
 var reqCols = Number(cfg.nColores || 1), minRatio = Math.max(0.12, (cfg.colorPct || 0.25) * 0.55), minPxPorColor = Math.max(4, Math.round(fg.length * 0.04));
 var usarZonas = (reqCols > 1), bestPid = "", bestScore = 0, bestDiag = "";
 for (var i = 0; i < ks.length; i++) {
  var pid = ks[i], firmas = obtenerFirmasPiloto(gObj, pid);
  for (var f = 0; f < firmas.length; f++) {
   var sig = firmas[f]; if (!sig.length) continue;
   var sigMeta = [], hasChromaticSig = false;
   for (var sc0 = 0; sc0 < sig.length; sc0++) {
    var cS = sig[sc0], rS = parseRgb(cS), lS = cS.lab || rgbLab(rS.r, rS.g, rS.b), chS = Math.sqrt(lS.a * lS.a + lS.b * lS.b);
    if (chS < 16 && lS.L <= 30) continue;
    if (chS >= 20) hasChromaticSig = true;
    sigMeta.push({ zona: cS.zona || "CAR", lb: lS, ch: chS, hue: Math.atan2(lS.b, lS.a) });
   }
   if (!sigMeta.length) continue;
   var hitC = new Array(sigMeta.length).fill(0), totH = 0;
   for (var p = 0; p < fg.length; p++) {
    var px = fg[p];
    for (var ci = 0; ci < sigMeta.length; ci++) {
     var sm = sigMeta[ci], z0 = sm.zona;
     if (usarZonas && ((z0 === "SUP" && px.zn !== "SUP") || (z0 === "INF" && px.zn !== "INF"))) continue;
     var l0 = sm.lb;
     if (sm.ch >= 20) {
      if (px.ch < 14) continue;
      var dHue = Math.abs(px.hue - sm.hue); if (dHue > Math.PI) dHue = 2 * Math.PI - dHue;
      if (dHue > 0.48) continue;
      var dL = px.lb.L - l0.L, da = px.lb.a - l0.a, db0 = px.lb.b - l0.b;
      if (Math.sqrt(dL * dL * 0.65 + da * da + db0 * db0) < dEMax) { hitC[ci]++; totH++; break; }
     } else {
      if (px.ch >= 20 || Math.abs(px.lb.L - l0.L) >= 12) continue;
      var dL2 = px.lb.L - l0.L, da2 = px.lb.a - l0.a, db2 = px.lb.b - l0.b;
      if (Math.sqrt(dL2 * dL2 + da2 * da2 + db2 * db2) < Math.min(18, dEMax)) { hitC[ci]++; totH++; break; }
     }
    }
   }
   var matched = 0, matchedChrom = 0;
   for (var h = 0; h < hitC.length; h++) {
    if (hitC[h] >= minPxPorColor) {
     matched++;
     if (sigMeta[h].ch >= 20) matchedChrom++;
    }
   }
   var ratio = totH / fg.length, reqEf = Math.min(reqCols, sigMeta.length);
   var chromOk = !hasChromaticSig || matchedChrom >= 1;
   var diag = pid + ":" + matched + "/" + reqEf + "col " + Math.round(ratio * 100) + "%";
   if (matched >= reqEf && chromOk && ratio >= minRatio) {
    var sc = matched * 1000 + totH; if (sc > bestScore) { bestScore = sc; bestPid = pid; bestDiag = diag; }
   } else if (!bestPid) bestDiag = diag;
  }
 }
 return { pid: bestPid, colNom: colVisto, info: "VEO: " + colVisto + " | " + (bestDiag || "Sin match") };
}
function comprobarEsquinasMovidas(dFull, pxDiff) {
 if (cfg.antiViento === "OFF") return false;
 var limPct = (cfg.antiViento === "ALTO") ? 0.50 : (cfg.antiViento === "MEDIO" ? 0.65 : 0.80);
 var pts = [[6,6],[14,6],[6,14],[PW-7,6],[PW-15,6],[PW-7,14],[6,PH-7],[14,PH-7],[6,PH-15],[PW-7,PH-7],[PW-15,PH-7],[PW-7,PH-15]];
 var movE = 0;
 for (var i = 0; i < pts.length; i++) {
  var k = (pts[i][1] * PW + pts[i][0]) * 4;
  if ((Math.abs(dFull[k] - fondoFull[k]) + Math.abs(dFull[k + 1] - fondoFull[k + 1]) + Math.abs(dFull[k + 2] - fondoFull[k + 2])) >= pxDiff) movE++;
 }
 return (movE / pts.length) >= limPct;
}
function procFrame() {
 var v = $id("vid"); if (!camOk || !antId || !v || v.videoWidth <= 0) return;
 _fpsCnt++; var ah = Date.now();
 if ((ah - _fpsTs) >= 1000) { _fpsVal = _fpsCnt; _fpsCnt = 0; _fpsTs = ah; }
 if (!_resTxt && v.videoWidth) _resTxt = v.videoWidth + "x" + v.videoHeight;
 if (!calibradaOk) { var stT = _telOk ? "FB OK" : (_telErr ? ("ERR " + _telErr) : "CONECTANDO..."); $id("lblEstado").textContent = "COLOCADA — ESPERANDO CALIBRACION (" + _fpsVal + " fps)"; $id("lblEstado").style.color = "#ffc107"; $id("lblDatos").textContent = "ANT: " + (antId || "--") + " | " + stT + " | MODO: " + cfg.modoDet; return; }
 _ctx.drawImage(v, 0, 0, 384, 216); _ctxProc.drawImage(_cnv, 0, 0, PW, PH);
 var dFull = _ctxProc.getImageData(0, 0, PW, PH).data;
 if (!fondoFull || fondoFull.length !== dFull.length || ah < calHasta) {
  fondoFull = new Uint8ClampedArray(dFull); est = "CAL";
  $id("lblEstado").textContent = "CALIBRANDO PISTA VACIA..."; $id("lblEstado").style.color = "#0dcaf0"; return;
 }
 var activa = (cfg.estado === "EN_CURSO" || cfg.estado === "WARMUP" || cfg.estado === "TEST");
 if (!activa) {
  est = "LIBRE"; _golpeFrames = 0; _trigPendTs = 0;
  $id("lblEstado").textContent = "CALIBRADA ✓ — REPOSO [" + cfg.modoDet + "]"; $id("lblEstado").style.color = "#20c997";
  $id("lblDatos").textContent = "MODO: " + cfg.modoDet + " | " + (_resTxt || "--") + " | " + _fpsVal + "fps";
  $id("bar").style.width = "0%";
  for (var u0 = 0; u0 < dFull.length; u0 += 4) {
   fondoFull[u0] = Math.round(fondoFull[u0] * 0.94 + dFull[u0] * 0.06);
   fondoFull[u0 + 1] = Math.round(fondoFull[u0 + 1] * 0.94 + dFull[u0 + 1] * 0.06);
   fondoFull[u0 + 2] = Math.round(fondoFull[u0 + 2] * 0.94 + dFull[u0 + 2] * 0.06);
  }
  return;
 }
 var pxDiff = cfg.pxDiff || 45;
 if (comprobarEsquinasMovidas(dFull, pxDiff)) {
  _golpeFrames++;
  if (_golpeFrames >= 45) { _golpeFrames = 0; _movidaTs = ahoraSrv(); fondoFull = null; framesHit = 0; _trigPendTs = 0; calHasta = Date.now() + 1800; hablarAnt("Atencion, antena movida, recalibrando", true); $id("lblEstado").textContent = "⚠️ ANTENA MOVIDA"; $id("lblEstado").style.color = "#ff4d5e"; return; }
 } else _golpeFrames = 0;
 var pLine = (cfg.roi && cfg.roi.posX) || 50, mov = 0, nS = 0;
 if (cfg.orientacion === "H") {
  var cy = Math.max(10, Math.min(PH - 10, Math.round((pLine / 100) * PH)));
  for (var y = cy - 8; y <= cy + 8; y += 2) for (var x = 16; x < PW - 16; x += 2) { var k = (y * PW + x) * 4; nS++; if ((Math.abs(dFull[k] - fondoFull[k]) + Math.abs(dFull[k + 1] - fondoFull[k + 1]) + Math.abs(dFull[k + 2] - fondoFull[k + 2])) >= pxDiff) mov++; }
 } else {
  var cx = Math.max(12, Math.min(PW - 12, Math.round((pLine / 100) * PW)));
  for (var y2 = 12; y2 < PH - 12; y2 += 2) for (var x2 = cx - 9; x2 <= cx + 9; x2 += 2) { var k2 = (y2 * PW + x2) * 4; nS++; if ((Math.abs(dFull[k2] - fondoFull[k2]) + Math.abs(dFull[k2 + 1] - fondoFull[k2 + 1]) + Math.abs(dFull[k2 + 2] - fondoFull[k2 + 2])) >= pxDiff) mov++; }
 }
 var pct = mov / (nS || 1), pctInt = Math.round(pct * 100), sens = cfg.sensPct || 0.07, resetPct = Math.min(0.035, sens * 0.50);
 window._movVivo = pctInt;
 $id("bar").style.width = Math.min(100, Math.round((pct / sens) * 100)) + "%";
 $id("lblDatos").textContent = "MODO: " + cfg.modoDet + " (" + cfg.orientacion + ") | MOV: " + pctInt + "%/" + Math.round(sens * 100) + "% | " + _fpsVal + "fps";
 if (est === "CRUCE" && (ah - ultMs) > 1400 && pct < Math.max(resetPct, sens * 0.85)) est = "LIBRE";
 if (pct < resetPct && !_trigPendTs) {
  est = "LIBRE"; framesHit = 0;
  $id("lblEstado").textContent = (cfg.estado === "WARMUP" ? "🔥 WARM-UP [" + cfg.modoDet + "]" : "VIGILANDO [" + cfg.modoDet + "]");
  $id("lblEstado").style.color = "#00e676";
  for (var u = 0; u < dFull.length; u += 4) {
   fondoFull[u] = Math.round(fondoFull[u] * 0.93 + dFull[u] * 0.07);
   fondoFull[u + 1] = Math.round(fondoFull[u + 1] * 0.93 + dFull[u + 1] * 0.07);
   fondoFull[u + 2] = Math.round(fondoFull[u + 2] * 0.93 + dFull[u + 2] * 0.07);
  }
  return;
 }
 if (pct >= sens) framesHit++; else framesHit = 0;
 if (est === "LIBRE" && !_trigPendTs && (framesHit >= 2 || pct >= Math.max(0.10, sens * 1.6))) _trigPendTs = ah;
 if (_trigPendTs && (ah - _trigPendTs) >= (cfg.retardoMs || 0)) {
  _trigPendTs = 0;
  if (cfg.estado === "WARMUP") {
   est = "CRUCE"; ultMs = ah;
   capturarYEnviarWarmup(dFull);
   if (cfg.modoDet === "TODO") emitirPaso("", true);
   else {
    var rWu = evaluarRoiColor(dFull);
    if (rWu.pid) { _ultTxtAnt = "OK:" + rWu.pid; emitirPaso(rWu.pid, true); }
   }
   return;
  }
  if (cfg.modoDet === "TODO") {
   if ((ah - ultMs) > 1200) { est = "CRUCE"; ultMs = ah; $id("lblEstado").textContent = "¡PASO DETECTADO!"; emitirPaso(""); }
  } else {
   var res = evaluarRoiColor(dFull);
   $id("lblMegaAnt").textContent = "🔬 " + res.info;
   if (res.pid) {
    if ((ah - (ultMsPorPiloto[res.pid] || 0)) > 1500) {
     est = "CRUCE"; ultMs = ah; ultMsPorPiloto[res.pid] = ah;
     $id("lblEstado").textContent = "✅ MOTO: " + res.pid + (res.colNom ? (" (" + res.colNom + ")") : "");
     $id("lblEstado").style.color = "#00e676";
     emitirPaso(res.pid);
    }
   } else {
    est = "CRUCE"; ultMs = ah; _ultTxtAnt = res.info;
    $id("lblEstado").textContent = "❌ NO COINCIDE" + (res.colNom ? (" (VEO: " + res.colNom + ")") : "");
    $id("lblEstado").style.color = "#ffa94d";
   }
  }
 }
}
function iniciarBucleVision() {
 var v = $id("vid");
 if (v && "requestVideoFrameCallback" in v) { var cb = function(){ procFrame(); v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
 else { var raf = function(){ procFrame(); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
function procesarSala(s) {
 if (!s) return;
 var nuevoModo = s.modoDet || "TODO";
 if (nuevoModo !== cfg.modoDet) {
  cfg.modoDet = nuevoModo;
  _trigPendTs = 0; framesHit = 0; ultMsPorPiloto = {}; _ultTxtAnt = "MODO:" + nuevoModo;
  var nomM = { TODO: "Modo cualquier paso", GAR: "Modo color garaje", CAR: "Modo color garaje", WARMUP: "Modo firmas Warm-Up", HIBRIDO: "Modo hibrido" };
  hablarAnt(nomM[nuevoModo] || "Modo actualizado", true);
  enviarTelemetria();
 }
 cfg.estado = s.estado || "ESPERA"; cfg.verVivo = !!s.verVivo; cfg.orientacion = s.orientacion || "V";
 cfg.sensPct = Math.max(0.06, Math.min(1.0, (Number(s.sensPct || 7)) / 100));
 cfg.colorPct = Math.max(0.06, Math.min(1.0, (Number(s.colorPct || 25)) / 100));
 cfg.pxDiff = Math.max(20, Math.min(90, Number(s.pxDiff || 45)));
 cfg.antiViento = s.antiViento || "OFF";
 cfg.nColores = Number(s.nColores || 1); cfg.retardoMs = Math.max(0, Math.min(150, Number(s.retardoMs || 25)));
 if (s.perfilLuz) cfg.perfilLuz = s.perfilLuz;
 if (s.roi && s.roi[antId]) cfg.roi = s.roi[antId];
 pintarOverlaysVisor();
 if (s.cmd && s.cmd.antId === antId && s.cmd.ts !== ultCmd) {
  ultCmd = s.cmd.ts;
  var cmdTs = Number(s.cmd.ts || 0); if (Math.abs(ahoraSrv() - cmdTs) < 60000 || Math.abs(Date.now() - cmdTs) < 60000) {
   if (s.cmd.roi) { cfg.roi = s.cmd.roi; pintarOverlaysVisor(); } else if (s.cmd.posX) { cfg.roi.posX = Number(s.cmd.posX); pintarOverlaysVisor(); }
   if (s.cmd.calibrar) calibrarFondo();
  }
 }
 if (s.megafonia && s.megafonia.id && s.megafonia.id !== _ultMegaId) {
  _ultMegaId = s.megafonia.id;
  if (Math.abs(ahoraSrv() - Number(s.megafonia.ts || 0)) < 12000 && s.megafonia.texto) {
   if (_tSoloVoz) { clearTimeout(_tSoloVoz); _tSoloVoz = null; }
   $id("lblMegaAnt").textContent = "📢 " + s.megafonia.texto;
   if (s.megafonia.beep) mxBeep(940, 110);
   hablarAnt(s.megafonia.texto, s.megafonia.texto.indexOf("SALIDA") >= 0);
  }
 }
 if (s.reaccion && s.reaccion.ts && s.reaccion.ts !== _ultReacTs) {
  _ultReacTs = s.reaccion.ts;
  if (Math.abs(ahoraSrv() - Number(s.reaccion.ts)) < 8000 && s.reaccion.texto) {
   var txtR = s.reaccion.autor + (s.reaccion.destinoNom ? (" para " + s.reaccion.destinoNom) : "") + " dice: " + s.reaccion.texto;
   $id("lblMegaAnt").textContent = "📣 " + txtR; hablarAnt(txtR, false);
  }
 }
 if (s.ovacion && s.ovacion.ts && s.ovacion.ts !== _ultOvaTs) {
  _ultOvaTs = s.ovacion.ts;
  if (Math.abs(ahoraSrv() - Number(s.ovacion.ts)) < 8000) { $id("lblMegaAnt").textContent = "👏 ¡OVACION DE LA GRADA!"; mxBeep(940, 120); hablarAnt("Ovacion de la grada para los pilotos", false); }
 }
}
function enviarTelemetria() {
 if (!antId || _telBusy || _wuBusy) return;
 _telBusy = true;
 var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
 var tOut = ctrl ? setTimeout(function(){ try { ctrl.abort(); } catch (e) {} }, 3500) : 0;
 fetch(FB + "/antenas/" + antId + ".json", {
  method: "PUT",
  signal: ctrl ? ctrl.signal : undefined,
  body: JSON.stringify({ ts: ahoraSrv(), nom: antNom, posX: (cfg.roi && cfg.roi.posX) || 50, orientacion: cfg.orientacion, mov: window._movVivo || 0, pasos: pasos, estado: est, calibrada: calibradaOk, movidaTs: _movidaTs, modoActivo: cfg.modoDet, ultTxt: _ultTxtAnt })
 }).then(function(r) {
  if (!r.ok) throw new Error("HTTP " + r.status);
  _telOk = true; _telErr = "";
 }).catch(function(e) {
  _telOk = false; _telErr = (e && e.name === "AbortError") ? "Timeout" : ((e && e.message) || "Red");
  var mEl = $id("lblMegaAnt");
  if (mEl) mEl.textContent = "⚠️ Error telemetria (" + _telErr + ") en /antenas/" + antId;
 }).finally(function() {
  if (tOut) clearTimeout(tOut);
  _telBusy = false;
 });
}
function sincronizarSalaAnt() {
 fetch(FB + "/sala.json?t=" + Date.now()).then(function(r){ return r.ok ? r.json() : null; }).then(function(s){ if (s) { salaCache = s; procesarSala(salaCache); } }).catch(function(){});
 fetch(FB + "/garaje.json?t=" + Date.now()).then(function(r){ return r.ok ? r.json() : null; }).then(function(g){ if (g) cfg.garajes = g; }).catch(function(){});
}
function conectarSseSala() {
 if (_esSala) try { _esSala.close(); } catch (e) {}
 try {
  _esSala = new EventSource(FB + "/sala.json");
  var onSse = function(ev) { try { var msg = JSON.parse(ev.data); if (msg && msg.path) { applySsePatch(salaCache, msg.path, msg.data, ev.type === "put"); procesarSala(salaCache); } } catch (e) {} };
  _esSala.addEventListener("put", onSse); _esSala.addEventListener("patch", onSse);
  _esSala.onerror = function(){ if (_esSala && _esSala.readyState === 2) setTimeout(conectarSseSala, 2500); };
 } catch (e) {}
}
conectarSseSala();
sincronizarSalaAnt();
if (antId) enviarTelemetria();
setInterval(enviarTelemetria, 400);
setInterval(function() {
 if (!antId || _wuBusy) return; var v = $id("vid");
 if ((cfg.verVivo || !calibradaOk || cfg.estado === "WARMUP" || cfg.estado === "TEST") && camOk && v && v.videoWidth > 0) {
  if (_imgBusy) return; _imgBusy = true; _imgCleared = false;
  _ctxLive.drawImage(v, 0, 0, 360, 202);
  var cIm = (typeof AbortController !== "undefined") ? new AbortController() : null;
  var tIm = cIm ? setTimeout(function(){ try { cIm.abort(); } catch (e) {} }, 4000) : 0;
  fetch(FB_IMG + "/" + antId + ".json", { method: "PUT", signal: cIm ? cIm.signal : undefined, body: JSON.stringify({ ts: ahoraSrv(), img: _cnvLive.toDataURL("image/jpeg", 0.50) }) })
   .catch(function(){}).finally(function(){ if (tIm) clearTimeout(tIm); _imgBusy = false; });
 } else if (!_imgCleared && calibradaOk && !cfg.verVivo && cfg.estado !== "WARMUP" && cfg.estado !== "TEST") {
  _imgCleared = true; fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE" }).catch(function(){});
 }
}, 500);
setInterval(sincronizarSalaAnt, 2000);
navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60, min: 30 } }, audio: false })
 .catch(function(){ return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, frameRate: { ideal: 60, min: 24 } }, audio: false }); })
 .then(function(st) {
  var v = $id("vid"); v.srcObject = st;
  try {
   var tr = st.getVideoTracks()[0];
   if (tr && tr.applyConstraints) {
    var caps = tr.getCapabilities ? tr.getCapabilities() : {};
    if (caps && caps.frameRate && caps.frameRate.max >= 55) tr.applyConstraints({ frameRate: { ideal: 60, min: 50 }, advanced: [{ focusMode: "continuous" }] }).catch(function(){});
    else tr.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(function(){});
   }
  } catch (e) {}
  return v.play();
 }).then(function(){ camOk = true; pintarOverlaysVisor(); iniciarBucleVision(); })
 .catch(function(e){ $id("lblEstado").textContent = "ERROR CAMARA: " + e.message; });