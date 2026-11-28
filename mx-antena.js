var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var _antenaParams = new URLSearchParams(location.search);
var _amistosaIdAnt = _antenaParams.get("amistosa") || "";
var _amistosaAntId = _antenaParams.get("puesto") || "";
var _esAmistosaAnt = /^\d{4}$/.test(_amistosaIdAnt) && (_amistosaAntId === "ant_1" || _amistosaAntId === "ant_2");
var _amistosaUidAnt = localStorage.getItem("mxp_uid") || "";
var FB_CIRC = FB_ROOT + "/circuitos/" + circId;
var FB = _esAmistosaAnt ? FB_ROOT + "/amistosas/" + circId + "/" + _amistosaIdAnt : FB_CIRC;
var FB_IMG = _esAmistosaAnt ? FB + "/antenas_img" : FB_ROOT + "/antenas_img/" + circId;
var FB_FF = _esAmistosaAnt ? FB + "/foto_finish.json" : FB_ROOT + "/foto_finish/" + circId + ".json";
var FB_WU = _esAmistosaAnt ? FB + "/warmup_capturas" : FB_ROOT + "/warmup_capturas/" + circId;
var _antenaBloqueadaRol = localStorage.getItem("mxp_inst_role") !== "DIRECCION" && !_esAmistosaAnt;
var _amistosaAntAutorizada = false;
if (_antenaBloqueadaRol) location.replace("index.html");
document.getElementById("txtCircModal").textContent = "Circuito activo: " + circId;
document.getElementById("lblCircAntTop").textContent = "PISTA: " + circId;

var antId = _antenaBloqueadaRol ? "" : (_esAmistosaAnt ? _amistosaAntId : (localStorage.getItem("mxp_ant_id") || ""));
var antNom = _esAmistosaAnt ? (_amistosaAntId === "ant_1" ? "META AMISTOSA" : "REFUERZO AMISTOSA") : (localStorage.getItem("mxp_ant_nom") || "");
var vozOn = true, camOk = false, PW = 192, PH = 108, fondoFull = null, calHasta = 0;
var est = "SIN_CAL", calibradaOk = false, ultMs = 0, ultMsPorPiloto = {}, pasos = 0, ultCmd = 0;
var framesHit = 0, _trigPendTs = 0, _ultWuTs = 0, _golpeFrames = 0, _movidaTs = 0, _prevColorContact = false;
var _imgCleared = false, _fpsCnt = 0, _fpsTs = Date.now(), _fpsVal = 0, _resTxt = "", _ultTxtAnt = "";
var _telBusy = false, _imgBusy = false, _wuBusy = false, _salaPollBusy = false, _garajePollBusy = false, _ultMegaId = "", _ultReacTs = 0, _ultOvaTs = 0;
var _ultimoErrorRed = "", _ultimoErrorRedTs = 0;
var _ultPasoLocalTs = 0, _tSoloCal = null, _esSala = null, _tAvisoAnt = null, _avisoAntId = 0;
var _salaLastSseTs = 0, _salaLastPollTs = 0;
var _colorVivoAnt = "", _ratioColorAnt = 0, _colorSampleTs = 0;
var _ultTxtTs = 0;

var salaCache = {};
function antenaPuedeOperar() { return !_antenaBloqueadaRol && (!_esAmistosaAnt || _amistosaAntAutorizada); }
function validarAccesoAntenaAmistosa() {
  if (!_esAmistosaAnt) return Promise.resolve(true);
  if (!_amistosaUidAnt) return Promise.reject(new Error("No hay una cuenta de piloto activa."));
  return fbJson(FB + ".json").then(function(room) {
    var claim = room && room.rolesAntena && room.rolesAntena[_amistosaAntId];
    if (!room || room.status !== "ACTIVE" || room.circuitId !== circId || !room.pilotos || !room.pilotos[_amistosaUidAnt]) {
      throw new Error("Debes unirte primero a esta sala amistosa.");
    }
    if (!claim || claim.uid !== _amistosaUidAnt || Math.abs(ahoraSrv() - Number(claim.ts || 0)) > 30000) {
      throw new Error("El puesto de antena ya no está reservado para tu teléfono.");
    }
    _amistosaAntAutorizada = true;
    salaCache = room.sala || {};
    return escribirAntenaAmistosa("/pilotos/" + _amistosaUidAnt + ".json", "PATCH", { enPista: true, tsActivo: ahoraSrv() }).then(function() {
      return escribirAntenaAmistosa("/rolesAntena/" + _amistosaAntId + ".json", "PATCH", { ts: ahoraSrv() });
    }).then(function() { return true; });
  });
}
function escribirAntenaAmistosa(path, method, data) {
  return fetch(FB + path, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status + " en la sala amistosa");
    return r;
  });
}
var cfg = {
  estado: "ESPERA", modoDet: "TODO", verVivo: false, orientacion: "V",
  sensPct: 0.07, colorPct: 0.25, pxDiff: 45, antiViento: "OFF", nColores: 1, retardoMs: 25,
  perfilLuz: { nombre: "Normal", deltaE: 20, minChroma: 16, lGain: 1.0 },
  roi: { posX: 50, x: 30, y: 15, w: 25, h: 65 }, garajes: {}
};

function umbralDesdeSensibilidad(nivel) {
  var v = Math.max(2, Math.min(100, Number(nivel) || 7));
  return v / 100;
}

activarWakeLock();
window.addEventListener("beforeunload", function() {
  if (!antenaPuedeOperar()) return;
  if (_esSala) try { _esSala.close(); } catch (e) {}
  if (antId) {
    fetch(FB + "/antenas/" + antId + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
    fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
  }
  if (_esAmistosaAnt) fetch(FB + "/rolesAntena/" + antId + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
});

function hablarAnt(texto, urgente) {
  if (vozOn && texto) mxHablar(texto, true);
}
function mostrarAvisoAnt(texto) {
  var el = document.getElementById("lblMegaAnt"), id = ++_avisoAntId;
  if (_tAvisoAnt) clearTimeout(_tAvisoAnt);
  el.textContent = texto || "";
  _tAvisoAnt = texto ? setTimeout(function() {
    if (_avisoAntId !== id) return;
    el.textContent = ""; _tAvisoAnt = null;
  }, 5000) : null;
}
function reportarErrorRedAnt(contexto, err) {
  var msg = "❌ " + contexto + ": " + ((err && err.message) || "sin conexión"), ahora = Date.now();
  if (msg === _ultimoErrorRed && ahora - _ultimoErrorRedTs < 5000) return;
  _ultimoErrorRed = msg; _ultimoErrorRedTs = ahora;
  mostrarAvisoAnt(msg);
}
function comprobarRespuestaAnt(resp, contexto) {
  if (!resp.ok) throw new Error(contexto + " HTTP " + resp.status);
  return resp;
}

function desbloquearAudio(avisar) {
  desbloquearAudioCore();
  var b = document.getElementById("btnAudioAnt"); if (b) { b.textContent = "🔊 OK"; b.style.background = "#20c997"; }
  if (avisar) { mxBeep(940, 110); hablarAnt("Megafonia de antena activada", true); }
}
function toggleOled(on) { desbloquearAudio(false); document.getElementById("oledBlack").style.display = on ? "flex" : "none"; }

if (antId && antNom) { document.getElementById("modalRanura").style.display = "none"; document.getElementById("lblNomAnt").textContent = "📡 " + antNom; }

function elegirRanura(id, nom) {
  desbloquearAudio(false); antId = id; antNom = nom;
  localStorage.setItem("mxp_ant_id", id); localStorage.setItem("mxp_ant_nom", nom);
  document.getElementById("modalRanura").style.display = "none"; document.getElementById("lblNomAnt").textContent = "📡 " + nom;
  calibradaOk = false; est = "SIN_CAL"; _imgCleared = false; enviarTelemetria();
  hablarAnt(nom + " conectada, esperando calibracion", true);
}
function elegirTemporal() { var n = prompt("Nombre para esta antena temporal:", "Antena Invitada"); if (!n) return; elegirRanura("tmp_" + Math.random().toString(36).slice(2, 6), n.trim().toUpperCase()); }
function iniciarModoSolo() {
  desbloquearAudio(false); antId = "ant_1"; antNom = "ANTENA 1 (SOLO)";
  localStorage.setItem("mxp_ant_id", antId); localStorage.setItem("mxp_ant_nom", antNom);
  document.getElementById("modalRanura").style.display = "none"; document.getElementById("lblNomAnt").textContent = "📡 " + antNom;
  if (_tSoloCal) clearInterval(_tSoloCal);
  var s = 10; hablarAnt("Modo solo activado, coloca el movil en meta y retirate, calibrando en 10 segundos", true);
  _tSoloCal = setInterval(function() {
    document.getElementById("lblEstado").textContent = "MODO SOLO — PREPARATE (" + s + "s)";
    if (s <= 5 && s >= 1) hablarAnt(String(s), false);
    if (s <= 0) {
      clearInterval(_tSoloCal); _tSoloCal = null; _ultPasoLocalTs = 0; pasos = 0;
      calibrarFondo(); cfg.estado = "EN_CURSO";
      fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO", tsInicio: ahoraSrv() }) }).catch(function(){});
      setTimeout(function(){ hablarAnt("Pista calibrada, crono en marcha, dale gas", true); }, 1500);
    }
    s--;
  }, 1000);
}
function ayudaAnt() {
  alert("GUIA DE ANTENA:\n1. Coloca el movil firme, elige META o REFUERZO y deja la pista vacia para calibrar.\n2. La imagen y el estado de la antena se envian a Direccion; el color captado aparece en pantalla.\n3. WARM-UP guarda capturas de colores vivos para que Direccion las asigne a cada piloto.\n4. Pulsa AUDIO para oir avisos. OLED oscurece la pantalla; toca dos veces para volver al visor.");
}
function toggleVoz() { desbloquearAudio(false); vozOn = !vozOn; var b = document.getElementById("btnVoz"); b.textContent = vozOn ? "Voz ON" : "Voz OFF"; b.style.background = vozOn ? "#20c997" : "#444"; }

function pintarOverlaysVisor() {
  var r = cfg.roi || { posX: 50, x: 30, y: 15, w: 25, h: 65 }, lin = document.getElementById("lin");
  if (cfg.orientacion === "H") { lin.style.left = "0"; lin.style.right = "0"; lin.style.width = "100%"; lin.style.height = "4px"; lin.style.top = (r.posX || 50) + "%"; lin.style.bottom = "auto"; }
  else { lin.style.top = "0"; lin.style.bottom = "0"; lin.style.height = "100%"; lin.style.width = "4px"; lin.style.left = (r.posX || 50) + "%"; lin.style.right = "auto"; }
  var rb = document.getElementById("roiBox"); rb.style.left = (r.x || 0) + "%"; rb.style.top = (r.y || 0) + "%"; rb.style.width = (r.w || 25) + "%"; rb.style.height = (r.h || 65) + "%";
}

function calibrarFondo() {
  fondoFull = null; framesHit = 0; _golpeFrames = 0; _trigPendTs = 0; _prevColorContact = false; ultMsPorPiloto = {};
  est = "CAL"; calibradaOk = true; calHasta = Date.now() + 1400; _imgCleared = false;
  enviarTelemetria(); hablarAnt("Calibrando pista vacia", true);
}
function salirAntena() {
  if (_esSala) try { _esSala.close(); } catch (e) {}
  if (antId) {
    var borrar = [fetch(FB + "/antenas/" + antId + ".json", { method: "DELETE" }), fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE" })];
    if (_esAmistosaAnt) borrar.push(fetch(FB + "/rolesAntena/" + antId + ".json", { method: "DELETE" }));
    Promise.all(borrar.map(function(p) { return p.catch(function(){}); })).finally(function(){ location.href = _esAmistosaAnt ? "piloto.html" : "index.html"; });
  }
  else location.href = "index.html";
}

var _cnv = document.getElementById("cnv"), _ctx = _cnv.getContext("2d", { willReadFrequently: true });
var _cnvProc = document.getElementById("cnvProc"), _ctxProc = _cnvProc.getContext("2d", { willReadFrequently: true });
var _cnvFf = document.getElementById("cnvFf"), _ctxFf = _cnvFf.getContext("2d");
var _cnvWu = document.getElementById("cnvWu"), _ctxWu = _cnvWu.getContext("2d");
var _cnvLive = document.createElement("canvas"); _cnvLive.width = 384; _cnvLive.height = 216;
var _ctxLive = _cnvLive.getContext("2d");
var _frameRing = [], _frameRingNext = 0, _frameRingCount = 0, _frameRingSize = 4;

function guardarFotograma(dProc) {
  var frame = _frameRing[_frameRingNext];
  if (!frame) {
    var canvas = document.createElement("canvas");
    canvas.width = 384; canvas.height = 216;
    frame = { canvas: canvas, ctx: canvas.getContext("2d"), data: new Uint8ClampedArray(dProc.length), ts: 0 };
    _frameRing[_frameRingNext] = frame;
  }
  frame.ctx.drawImage(_cnv, 0, 0, 384, 216);
  frame.data.set(dProc); frame.ts = ahoraSrv();
  _frameRingNext = (_frameRingNext + 1) % _frameRingSize;
  _frameRingCount = Math.min(_frameRingSize, _frameRingCount + 1);
  return frame;
}

function fotogramaAnterior(atras) {
  if (!_frameRingCount) return null;
  var pasosAtras = Math.max(0, Math.min(_frameRingCount - 1, Number(atras) || 0));
  var idx = (_frameRingNext - 1 - pasosAtras + _frameRingSize) % _frameRingSize;
  return _frameRing[idx] || null;
}

function analizarColorVivo(r, g, b) {
  var rn = r / 255, gn = g / 255, bn = b / 255;
  var mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn), d = mx - mn, h = 0;
  if (d > 0) {
    if (mx === rn) h = ((gn - bn) / d) % 6;
    else if (mx === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  var s = mx ? d / mx : 0, v = mx, l = (mx + mn) / 2;
  if (s < 0.58 || v < 0.38 || l < 0.34) return null;
  if (h < 15 || h >= 345) return s >= 0.68 && v >= 0.52 && l >= 0.42 ? { nombre: "ROJO", h: h, s: s, v: v } : null;
  if (h < 42) return s >= 0.75 && v >= 0.62 && l >= 0.45 ? { nombre: "NARANJA", h: h, s: s, v: v } : null;
  if (h < 75) return v >= 0.55 && l >= 0.40 ? { nombre: "AMARILLO", h: h, s: s, v: v } : null;
  if (h < 165) return { nombre: "VERDE", h: h, s: s, v: v };
  if (h >= 195 && h < 255) return { nombre: "AZUL", h: h, s: s, v: v };
  if (h >= 255 && h < 345) return { nombre: "MORADO", h: h, s: s, v: v };
  return null;
}

function colorDominantePorZona(dProc, x0, y0, w0, h0, diffMin, lG, stride) {
  var bins = {}, vividCount = 0, sampleCount = 0;
  for (var py = y0; py < y0 + h0; py += stride) {
    for (var px = x0; px < x0 + w0; px += stride) {
      sampleCount++;
      var k = (py * PW + px) * 4;
      if (diffMin && (Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
      var rr = Math.min(255, dProc[k] * lG), gg = Math.min(255, dProc[k + 1] * lG), bb = Math.min(255, dProc[k + 2] * lG);
      var col = analizarColorVivo(rr, gg, bb);
      if (!col) continue;
      vividCount++;
      if (!bins[col.nombre]) bins[col.nombre] = { cnt: 0, r: 0, g: 0, b: 0 };
      bins[col.nombre].cnt++; bins[col.nombre].r += rr; bins[col.nombre].g += gg; bins[col.nombre].b += bb;
    }
  }
  var nombres = Object.keys(bins).sort(function(a, b){ return bins[b].cnt - bins[a].cnt; });
  if (!nombres.length) return { nombre: "", vividCount: 0, ratio: 0, sampleCount: sampleCount };
  var elegido = bins[nombres[0]];
  if (elegido.cnt < Math.max(4, Math.ceil(sampleCount * 0.004))) return { nombre: "", vividCount: vividCount, ratio: 0, sampleCount: sampleCount };
  return {
    nombre: nombres[0],
    vividCount: vividCount,
    ratio: vividCount ? Math.round((elegido.cnt / vividCount) * 100) : 0,
    sampleCount: sampleCount,
    r: Math.round(elegido.r / elegido.cnt),
    g: Math.round(elegido.g / elegido.cnt),
    b: Math.round(elegido.b / elegido.cnt),
    count: elegido.cnt
  };
}

function colorDominanteDePixeles(pixeles) {
  var bins = {};
  for (var i = 0; i < pixeles.length; i++) {
    var px = pixeles[i], col = analizarColorVivo(px.r, px.g, px.b);
    if (!col) continue;
    if (!bins[col.nombre]) bins[col.nombre] = { cnt: 0 };
    bins[col.nombre].cnt++;
  }
  var nombres = Object.keys(bins).sort(function(a, b){ return bins[b].cnt - bins[a].cnt; });
  return nombres.length ? nombres[0] : "";
}

function actualizarColorVivo(dProc) {
  var r = cfg.roi || { x: 30, y: 15, w: 25, h: 65 };
  var x0 = Math.max(0, Math.floor((r.x / 100) * PW)), y0 = Math.max(0, Math.floor((r.y / 100) * PH));
  var w0 = Math.max(12, Math.min(PW - x0, Math.floor((r.w / 100) * PW))), h0 = Math.max(12, Math.min(PH - y0, Math.floor((r.h / 100) * PH)));
  var pL = cfg.perfilLuz || {}, lG = pL.lGain || 1.0, diffMin = Math.max(18, (cfg.pxDiff || 45) * 0.70);
  var col = colorDominantePorZona(dProc, x0, y0, w0, h0, diffMin, lG, 2);
  _colorVivoAnt = col.nombre;
  _ratioColorAnt = col.ratio;
}

function detectarColorVivoEnRoi(dProc) {
  if (!fondoFull) return false;
  var r = cfg.roi || { x: 30, y: 15, w: 25, h: 65 };
  var x0 = Math.max(0, Math.floor((r.x / 100) * PW)), y0 = Math.max(0, Math.floor((r.y / 100) * PH));
  var w0 = Math.max(12, Math.min(PW - x0, Math.floor((r.w / 100) * PW))), h0 = Math.max(12, Math.min(PH - y0, Math.floor((r.h / 100) * PH)));
  var pL = cfg.perfilLuz || {}, lG = pL.lGain || 1.0, diffMin = Math.max(18, (cfg.pxDiff || 45) * 0.70);
  var bins = {};
  for (var py = y0; py < y0 + h0; py += 2) {
    for (var px = x0; px < x0 + w0; px += 2) {
      var k = (py * PW + px) * 4;
      if ((Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
      var col = analizarColorVivo(Math.min(255, dProc[k] * lG), Math.min(255, dProc[k + 1] * lG), Math.min(255, dProc[k + 2] * lG));
      if (!col) continue;
      var bin = bins[col.nombre];
      if (!bin) bin = bins[col.nombre] = { count: 0, rows: 0, lastRow: -1 };
      bin.count++;
      if (bin.lastRow !== py) { bin.rows++; bin.lastRow = py; }
    }
  }
  return Object.keys(bins).some(function(name){ return bins[name].count >= 4 && bins[name].rows >= 3; });
}

function emitirPaso(pid, sinFf, frame, lectura) {
  pasos++; mxBeep(940, 110); vibrar([35, 30, 35]);
  var tsPaso = frame && frame.ts ? Number(frame.ts) : ahoraSrv(), lapLocal = _ultPasoLocalTs ? (tsPaso - _ultPasoLocalTs) : 0; _ultPasoLocalTs = tsPaso;
  _ultTxtAnt = pid ? "PASO: " + pid : "PASO DETECTADO"; _ultTxtTs = tsPaso;
  var colorData = lectura ? {
    colorNom: lectura.colNom || "",
    colorRatio: Number(lectura.colorRatio) || 0,
    colorSaturation: Number(lectura.colorSaturation) || 0,
    colorArea: Number(lectura.colorArea) || 0,
    colorQuality: Number(lectura.colorQuality) || 0
  } : {};
  fetch(FB + "/eventos/" + antId + ".json", { method: "PUT", body: JSON.stringify(Object.assign({ ts: tsPaso, antId: antId, antNom: antNom, modo: cfg.modoDet, pilotoUid: pid || "", pasos: pasos }, colorData)) })
    .then(function(resp){ return comprobarRespuestaAnt(resp, "Paso"); }).catch(function(err){ reportarErrorRedAnt("No se pudo enviar el paso", err); });
  enviarTelemetria();
  if (!sinFf) {
    try {
      _ctxFf.drawImage((frame && frame.canvas) || _cnv, 0, 0, 320, 180); _ctxFf.fillStyle = "rgba(255,42,42,0.8)";
      var pLine = (cfg.roi && cfg.roi.posX) || 50;
      if (cfg.orientacion === "H") _ctxFf.fillRect(0, Math.round((pLine / 100) * 180) - 1, 320, 2);
      else _ctxFf.fillRect(Math.round((pLine / 100) * 320) - 1, 0, 2, 180);
      fetch(FB_FF, { method: "PUT", body: JSON.stringify(Object.assign({ ts: tsPaso, antNom: antNom, pid: pid || "", modo: cfg.modoDet, img: _cnvFf.toDataURL("image/jpeg", 0.56) }, colorData)) })
        .then(function(resp){ return comprobarRespuestaAnt(resp, "Foto-Finish"); }).catch(function(err){ reportarErrorRedAnt("No se pudo enviar la foto", err); });
    } catch (e) {}
  }

  if (!pid && antNom.indexOf("SOLO") >= 0) {
    if (lapLocal >= 1500) {
      hablarAnt("Vuelta " + Math.max(1, pasos - 1) + ", " + fmtVoz(lapLocal), false);
      mostrarAvisoAnt("🔊 Vuelta: " + fmt(lapLocal));
    } else hablarAnt("Paso " + pasos + ", crono iniciado", false);
  }
  document.getElementById("txtOledEst").textContent = "PASOS: " + pasos + " (DOBLE TOQUE)";
}

function extraerColorUnico(dProc, x0, y0, w0, h0, soloMov, diffMin, lG) {
  var bins = {}, cnt = 0;
  for (var py = y0; py < y0 + h0; py++) {
    for (var px = x0; px < x0 + w0; px++) {
      var k = (py * PW + px) * 4;
      if (soloMov && (Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
      var rr = Math.min(255, dProc[k] * lG), gg = Math.min(255, dProc[k + 1] * lG), bb = Math.min(255, dProc[k + 2] * lG);
      var vivo = analizarColorVivo(rr, gg, bb); if (!vivo) continue;
      cnt++;
      if (!bins[vivo.nombre]) bins[vivo.nombre] = { cnt: 0, r: 0, g: 0, b: 0 };
      bins[vivo.nombre].cnt++; bins[vivo.nombre].r += rr; bins[vivo.nombre].g += gg; bins[vivo.nombre].b += bb;
    }
  }
  var lista = Object.keys(bins).map(function(k) {
    var o = bins[k], n = o.cnt, r0 = Math.round(o.r / n), g0 = Math.round(o.g / n), b0 = Math.round(o.b / n), lb = rgbLab(r0, g0, b0);
    return {
      cnt: n, r: r0, g: g0, b: b0, zona: "CAR", hex: "rgb(" + r0 + "," + g0 + "," + b0 + ")",
      lab: { L: Math.round(lb.L * 100) / 100, a: Math.round(lb.a * 100) / 100, b: Math.round(lb.b * 100) / 100 },
      nom: k
    };
  }).sort(function(a, b) { return b.cnt - a.cnt; });
  if (!lista.length) return { cnt: 0, col: null };
  var elegido = lista[0];
  if (elegido.cnt < Math.max(12, Math.ceil(w0 * h0 * 0.004))) return { cnt: cnt, col: null };
  return { cnt: cnt, col: elegido };
}

function procesarCapturaColor(dProc, frame, soloPrueba) {
  var ts = ahoraSrv();
  if ((!soloPrueba && _wuBusy) || (ts - _ultWuTs) < 1100) return;
  _ultWuTs = ts;
  var dCaptura = (frame && frame.data) || dProc;
  var r = cfg.roi || { x: 30, y: 15, w: 25, h: 65 }, pLine = r.posX || 50;
  var rx0 = Math.max(0, Math.floor((r.x / 100) * PW)), ry0 = Math.max(0, Math.floor((r.y / 100) * PH));
  var rw = Math.max(14, Math.min(PW - rx0, Math.floor((r.w / 100) * PW))), rh = Math.max(14, Math.min(PH - ry0, Math.floor((r.h / 100) * PH)));
  var pL = cfg.perfilLuz || {}, lG = pL.lGain || 1.0, diffMin = Math.max(16, (cfg.pxDiff || 45) * 0.60);

  var cropRect = { x: r.x, y: r.y, w: r.w, h: r.h };
  var res = extraerColorUnico(dCaptura, rx0, ry0, rw, rh, true, diffMin, lG);
  if (res.cnt < 8 || !res.col) {
    if (cfg.orientacion === "H") {
      var yL = Math.max(0, Math.min(PH - 36, Math.floor((pLine / 100) * PH) - 18));
      cropRect = { x: 15, y: Math.round((yL / PH) * 100), w: 70, h: 34 };
      res = extraerColorUnico(dCaptura, Math.floor(PW * 0.15), yL, Math.floor(PW * 0.70), 36, true, diffMin, lG);
    } else {
      var xL = Math.max(0, Math.min(PW - 48, Math.floor((pLine / 100) * PW) - 24));
      cropRect = { x: Math.round((xL / PW) * 100), y: 12, w: 26, h: 76 };
      res = extraerColorUnico(dCaptura, xL, Math.floor(PH * 0.12), 48, Math.floor(PH * 0.76), true, diffMin, lG);
    }
    if (res.cnt < 8 || !res.col) {
      cropRect = { x: 25, y: 18, w: 50, h: 64 };
      res = extraerColorUnico(dCaptura, Math.floor(PW * 0.30), Math.floor(PH * 0.20), Math.floor(PW * 0.40), Math.floor(PH * 0.60), false, diffMin, lG);
    }
  }
  if (!res.col) {
    document.getElementById("lblEstado").textContent = soloPrueba ? "🧪 TEST: SIN COLOR VIVO" : "⚠️ SIN COLOR VIVO — NO GUARDADO";
    document.getElementById("lblEstado").style.color = "#ffa94d";
    if (soloPrueba) { _ultTxtAnt = "TEST: SIN COLOR"; _ultTxtTs = ts; enviarTelemetria(); }
    return;
  }
  var colNom = res.col.nom;
  document.getElementById("lblEstado").textContent = soloPrueba ? ("🧪 TEST: " + colNom) : ("🎨 DETECTADO: " + colNom);
  document.getElementById("lblEstado").style.color = soloPrueba ? "#b197fc" : "#0dcaf0";
  if (soloPrueba) {
    _ultTxtAnt = "TEST: " + colNom; _ultTxtTs = ts;
    mostrarAvisoAnt("🧪 Test color: " + colNom);
    enviarTelemetria();
    return;
  }
  hablarAnt("Color " + colNom.toLowerCase(), false);

  try {
    var sx = Math.max(0, Math.min(360, Math.floor((cropRect.x / 100) * 384)));
    var sy = Math.max(0, Math.min(192, Math.floor((cropRect.y / 100) * 216)));
    var sw = Math.max(24, Math.min(384 - sx, Math.floor((cropRect.w / 100) * 384)));
    var sh = Math.max(24, Math.min(216 - sy, Math.floor((cropRect.h / 100) * 216)));
    _ctxWu.drawImage((frame && frame.canvas) || _cnv, sx, sy, sw, sh, 0, 0, 160, 112);
    var payload = JSON.stringify({ ts: ts, antId: antId, antNom: antNom, colorNom: colNom, img: _cnvWu.toDataURL("image/jpeg", 0.45), colores: res.col ? [res.col] : [] });

    _wuBusy = true;
    mostrarAvisoAnt("⏳ Enviando " + colNom + " a Direccion...");
    var ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var tOut = setTimeout(function() { if (ctrl) ctrl.abort(); }, 7000);

    fetch(FB_WU + "/" + antId + "_" + ts + ".json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(resp) {
      clearTimeout(tOut);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      _wuBusy = false;
      _ultTxtAnt = "WU:" + colNom;
      _ultTxtTs = ahoraSrv();
      enviarTelemetria();
      mxBeep(720, 90);
      document.getElementById("lblEstado").textContent = "✅ ENVIADO: " + colNom;
      document.getElementById("lblEstado").style.color = "#00e676";
      mostrarAvisoAnt("✅ Enviado a Direccion: " + colNom);
    }).catch(function(err) {
      clearTimeout(tOut);
      _wuBusy = false;
      _ultWuTs = 0;
      _ultTxtAnt = "Err:" + ((err && err.message) || "WU");
      _ultTxtTs = ahoraSrv();
      enviarTelemetria();
      var msgErr = (err && err.name === "AbortError") ? "Tiempo agotado (7s)" : ((err && err.message) || "Red");
      document.getElementById("lblEstado").textContent = "❌ ERROR ENVIO: " + msgErr;
      document.getElementById("lblEstado").style.color = "#ff4d5e";
      mostrarAvisoAnt("❌ Error Firebase Warm-Up: " + msgErr);
      hablarAnt("Error al enviar captura", false);
    });
  } catch (e) {
    _wuBusy = false;
    _ultWuTs = 0;
    mostrarAvisoAnt("❌ Error preparando captura: " + (e.message || e));
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
  var diffMin = Math.max(18, (cfg.pxDiff || 45) * 0.70), fg = [], sampleArea = 0;

  var recogerFg = function(x0, y0, w0, h0) {
    var out = [], mY = y0 + Math.floor(h0 * 0.48);
    sampleArea = Math.ceil(w0 / 2) * Math.ceil(h0 / 2);
    for (var py = y0; py < y0 + h0; py += 2) {
      for (var px = x0; px < x0 + w0; px += 2) {
        var k = (py * PW + px) * 4;
        if ((Math.abs(dProc[k] - fondoFull[k]) + Math.abs(dProc[k + 1] - fondoFull[k + 1]) + Math.abs(dProc[k + 2] - fondoFull[k + 2])) < diffMin) continue;
        var rr = Math.min(255, dProc[k] * lG), gg = Math.min(255, dProc[k + 1] * lG), bb = Math.min(255, dProc[k + 2] * lG);
        var colorVivo = analizarColorVivo(rr, gg, bb); if (!colorVivo) continue;
        var lb = rgbLab(rr, gg, bb);
        out.push({ r: rr, g: gg, b: bb, lb: lb, ch: Math.sqrt(lb.a * lb.a + lb.b * lb.b), hue: Math.atan2(lb.b, lb.a), hsvHue: colorVivo.h, colorNom: colorVivo.nombre, saturation: colorVivo.s, zn: (py < mY) ? "SUP" : "INF" });
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

  var colVisto = colorDominanteDePixeles(fg);
  if (!colVisto) return { pid: "", colNom: "", info: "Sin color vivo en el tunel" };
  var colCount = 0, saturationTotal = 0;
  for (var ci0 = 0; ci0 < fg.length; ci0++) {
    if (fg[ci0].colorNom === colVisto) { colCount++; saturationTotal += fg[ci0].saturation; }
  }
  var colorRatio = fg.length ? Math.round((colCount / fg.length) * 100) : 0;
  var colorSaturation = colCount ? Math.round((saturationTotal / colCount) * 100) : 0;
  var colorArea = sampleArea ? Math.round((colCount / sampleArea) * 100) : 0;
  var colorQuality = colorSaturation * colorArea;
  var colorMeta = { colNom: colVisto, colorRatio: colorRatio, colorSaturation: colorSaturation, colorArea: colorArea, colorQuality: colorQuality };

  var gObj = cfg.garajes || {}, ks = Object.keys(gObj);
  if (!ks.length) return { pid: "", info: "VEO: " + colVisto + " | Sin garajes en sala", colorRatio: colorRatio, colorSaturation: colorSaturation, colorArea: colorArea, colorQuality: colorQuality, colNom: colVisto };

  var reqCols = Number(cfg.nColores || 1), minRatio = Math.max(0.12, (cfg.colorPct || 0.25) * 0.55), minPxPorColor = Math.max(4, Math.round(fg.length * 0.04));
  var usarZonas = (reqCols > 1), bestPid = "", bestScore = 0, bestDiag = "";

  for (var i = 0; i < ks.length; i++) {
    var pid = ks[i], firmas = obtenerFirmasPiloto(gObj, pid);
    for (var f = 0; f < firmas.length; f++) {
      var sig = firmas[f]; if (!sig.length) continue;
      var sigMeta = [], hasChromaticSig = false;
      for (var sc0 = 0; sc0 < sig.length; sc0++) {
        var cS = sig[sc0], rS = parseRgb(cS), vivoS = analizarColorVivo(rS.r, rS.g, rS.b);
        if (!vivoS) continue;
        var lS = cS.lab || rgbLab(rS.r, rS.g, rS.b), chS = Math.sqrt(lS.a * lS.a + lS.b * lS.b);
        hasChromaticSig = true;
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
  return { pid: bestPid, info: "VEO: " + colVisto + " | " + (bestDiag || "Sin match"), colorRatio: colorMeta.colorRatio, colorSaturation: colorMeta.colorSaturation, colorArea: colorMeta.colorArea, colorQuality: colorMeta.colorQuality, colNom: colorMeta.colNom };
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
  var v = document.getElementById("vid"); if (!camOk || !antId || !v || v.videoWidth <= 0) return;
  _fpsCnt++; var ah = Date.now();
  if ((ah - _fpsTs) >= 1000) { _fpsVal = _fpsCnt; _fpsCnt = 0; _fpsTs = ah; }
  if (!_resTxt && v.videoWidth) _resTxt = v.videoWidth + "x" + v.videoHeight;

  if (!calibradaOk) { _prevColorContact = false; document.getElementById("lblEstado").textContent = "COLOCADA — ESPERANDO CALIBRACION (" + _fpsVal + " fps)"; document.getElementById("lblEstado").style.color = "#ffc107"; return; }

  _ctx.drawImage(v, 0, 0, 384, 216); _ctxProc.drawImage(_cnv, 0, 0, PW, PH);
  var dFull = _ctxProc.getImageData(0, 0, PW, PH).data;
  var frameActual = guardarFotograma(dFull);
  if (!fondoFull || fondoFull.length !== dFull.length || ah < calHasta) {
    _prevColorContact = false;
    fondoFull = new Uint8ClampedArray(dFull); est = "CAL";
    document.getElementById("lblEstado").textContent = "CALIBRANDO PISTA VACIA..."; document.getElementById("lblEstado").style.color = "#0dcaf0"; return;
  }
  if ((ah - _colorSampleTs) >= 180) { _colorSampleTs = ah; actualizarColorVivo(dFull); }

  var activa = (cfg.estado === "EN_CURSO" || cfg.estado === "WARMUP" || cfg.estado === "TEST" || cfg.estado === "RADAR");
  if (!activa) {
    est = "LIBRE"; _golpeFrames = 0; _trigPendTs = 0; _prevColorContact = false;
    window._movVivo = 0;
    document.getElementById("lblEstado").textContent = "CALIBRADA ✓ — REPOSO [" + cfg.modoDet + "]"; document.getElementById("lblEstado").style.color = "#20c997";
    document.getElementById("lblDatos").textContent = "MODO: " + cfg.modoDet + " | " + (_resTxt || "--") + " | " + _fpsVal + "fps";
    document.getElementById("bar").style.width = "0%";
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
    if (_golpeFrames >= 45) { _golpeFrames = 0; _movidaTs = ahoraSrv(); fondoFull = null; framesHit = 0; _trigPendTs = 0; calHasta = Date.now() + 1800; hablarAnt("Atencion, antena movida, recalibrando", true); document.getElementById("lblEstado").textContent = "⚠️ ANTENA MOVIDA"; document.getElementById("lblEstado").style.color = "#ff4d5e"; return; }
  } else _golpeFrames = 0;

  var modoColor = cfg.estado === "WARMUP" || cfg.estado === "TEST" || (cfg.modoDet !== "TODO" && cfg.modoDet !== "RADAR");
  var colorContact = modoColor && detectarColorVivoEnRoi(dFull);
  var pLine = (cfg.roi && cfg.roi.posX) || 50, mov = 0, nS = 0;
  if (cfg.orientacion === "H") {
    var cy = Math.max(10, Math.min(PH - 10, Math.round((pLine / 100) * PH)));
    for (var y = cy - 8; y <= cy + 8; y += 2) for (var x = 16; x < PW - 16; x += 2) { var k = (y * PW + x) * 4; nS++; if ((Math.abs(dFull[k] - fondoFull[k]) + Math.abs(dFull[k + 1] - fondoFull[k + 1]) + Math.abs(dFull[k + 2] - fondoFull[k + 2])) >= pxDiff) mov++; }
  } else {
    var cx = Math.max(12, Math.min(PW - 12, Math.round((pLine / 100) * PW)));
    for (var y2 = 12; y2 < PH - 12; y2 += 2) for (var x2 = cx - 9; x2 <= cx + 9; x2 += 2) { var k2 = (y2 * PW + x2) * 4; nS++; if ((Math.abs(dFull[k2] - fondoFull[k2]) + Math.abs(dFull[k2 + 1] - fondoFull[k2 + 1]) + Math.abs(dFull[k2 + 2] - fondoFull[k2 + 2])) >= pxDiff) mov++; }
  }

  var pct = mov / (nS || 1), pctInt = Math.round(pct * 100), sens = cfg.sensPct || 0.07;
  var resetPct = sens * 0.75;

  if (est === "CRUCE" && (ah - ultMs) > 1400 && pct < Math.max(resetPct, sens * 0.85)) est = "LIBRE";

  if (pct < resetPct && !_trigPendTs && !colorContact && est !== "CRUCE") {
    est = "LIBRE"; framesHit = 0; _prevColorContact = false;
    window._movVivo = 0;
    document.getElementById("bar").style.width = "0%";
    document.getElementById("lblDatos").textContent = "MODO: " + cfg.modoDet + " (" + cfg.orientacion + ") | MOV: 0%/" + Math.round(sens * 100) + "% | " + _fpsVal + "fps";
    document.getElementById("lblEstado").textContent = (cfg.estado === "WARMUP" ? "🔥 WARM-UP [" + cfg.modoDet + "]" : (cfg.estado === "RADAR" ? "📡 RADAR LISTO" : "VIGILANDO [" + cfg.modoDet + "]"));
    document.getElementById("lblEstado").style.color = "#00e676";
    for (var u = 0; u < dFull.length; u += 4) {
      fondoFull[u] = Math.round(fondoFull[u] * 0.93 + dFull[u] * 0.07);
      fondoFull[u + 1] = Math.round(fondoFull[u + 1] * 0.93 + dFull[u + 1] * 0.07);
      fondoFull[u + 2] = Math.round(fondoFull[u + 2] * 0.93 + dFull[u + 2] * 0.07);
    }
    return;
  }

  window._movVivo = pctInt;
  document.getElementById("bar").style.width = Math.min(100, Math.round((pct / sens) * 100)) + "%";
  document.getElementById("lblDatos").textContent = "MODO: " + cfg.modoDet + " (" + cfg.orientacion + ") | MOV: " + pctInt + "%/" + Math.round(sens * 100) + "% | " + _fpsVal + "fps";

  if (pct >= sens) framesHit++; else framesHit = 0;
  if (est === "LIBRE" && !_trigPendTs) {
    if (colorContact && !_prevColorContact) _trigPendTs = ah - (Number(cfg.retardoMs) || 0);
    else if (cfg.estado !== "WARMUP" && cfg.estado !== "TEST" && (framesHit >= 2 || pct >= Math.max(0.10, sens * 1.6))) _trigPendTs = ah;
  }
  _prevColorContact = colorContact;

  if (_trigPendTs && (ah - _trigPendTs) >= (cfg.retardoMs || 0)) {
    _trigPendTs = 0;
    var frameFoto = fotogramaAnterior(1) || frameActual;

    if (cfg.estado === "WARMUP") {
      est = "CRUCE"; ultMs = ah;
      procesarCapturaColor(dFull, frameActual, false);
      return;
    }

    if (cfg.estado === "TEST") {
      if ((ah - ultMs) >= 900) {
        est = "CRUCE"; ultMs = ah;
        procesarCapturaColor(dFull, frameActual, true);
        mxBeep(940, 90);
      }
      return;
    }

    if (cfg.estado === "RADAR") {
      if ((ah - ultMs) > 900) { est = "CRUCE"; ultMs = ah; document.getElementById("lblEstado").textContent = "📡 ¡PASO RADAR!"; emitirPaso("", true, frameFoto); }
      return;
    }

    if (cfg.modoDet === "TODO") {
      if ((ah - ultMs) > 1200) { est = "CRUCE"; ultMs = ah; document.getElementById("lblEstado").textContent = "¡PASO DETECTADO!"; emitirPaso("", false, frameFoto); }
    } else {
      var res = evaluarRoiColor(dFull);
      mostrarAvisoAnt("🔬 " + res.info);
      if (res.pid) {
        if ((ah - (ultMsPorPiloto[res.pid] || 0)) > 1500) {
          est = "CRUCE"; ultMs = ah; ultMsPorPiloto[res.pid] = ah;
          document.getElementById("lblEstado").textContent = "✅ MOTO: " + res.pid + (res.colNom ? (" (" + res.colNom + ")") : "");
          document.getElementById("lblEstado").style.color = "#00e676";
          emitirPaso(res.pid, false, frameFoto, res);
        }
      } else {
        est = "CRUCE"; ultMs = ah; _ultTxtAnt = res.info; _ultTxtTs = ah; enviarTelemetria();
        document.getElementById("lblEstado").textContent = "❌ NO COINCIDE" + (res.colNom ? (" (VEO: " + res.colNom + ")") : "");
        document.getElementById("lblEstado").style.color = "#ffa94d";
      }
    }
  }
}

function iniciarBucleVision() {
  var v = document.getElementById("vid");
  if (v && "requestVideoFrameCallback" in v) {
    var cb = function() {
      try { procFrame(); } catch (e) { reportarErrorRedAnt("Error procesando fotograma", e); }
      v.requestVideoFrameCallback(cb);
    };
    v.requestVideoFrameCallback(cb);
  } else {
    var raf = function() {
      try { procFrame(); } catch (e) { reportarErrorRedAnt("Error procesando fotograma", e); }
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}

function procesarSala(s) {
  if (!s) return;
  var estadoPrevio = cfg.estado;
  aplicarBanderaUI(s, "banBanderaAnt");
  var modoDetRecibido = s.modoDet;
  var modosValidos = ["TODO", "GAR", "CAR", "WARMUP", "HIBRIDO", "RADAR"];
  var nuevoModo = typeof modoDetRecibido === "string" && modosValidos.indexOf(modoDetRecibido) >= 0 ? modoDetRecibido : cfg.modoDet;
  if (nuevoModo !== cfg.modoDet) {
    cfg.modoDet = nuevoModo;
    _trigPendTs = 0; framesHit = 0; ultMsPorPiloto = {}; _prevColorContact = false; _ultTxtAnt = "MODO:" + nuevoModo; _ultTxtTs = ahoraSrv();
    var nomM = { TODO: "Modo cualquier paso", GAR: "Modo color garaje", CAR: "Modo color garaje", WARMUP: "Modo firmas Warm-Up", HIBRIDO: "Modo hibrido" };
    if (s.estado !== "RADAR") hablarAnt(nomM[nuevoModo] || "Modo actualizado", true);
    enviarTelemetria();
  }
  cfg.estado = s.estado || "ESPERA"; cfg.verVivo = !!s.verVivo; cfg.orientacion = s.orientacion || "V";
  if (estadoPrevio !== cfg.estado) enviarTelemetria();
  cfg.sensPct = umbralDesdeSensibilidad(s.sensPct);
  cfg.colorPct = Math.max(0.06, Math.min(1.0, (Number(s.colorPct || 25)) / 100));
  cfg.pxDiff = Math.max(20, Math.min(90, Number(s.pxDiff || 45)));
  cfg.antiViento = s.antiViento || "OFF";
  cfg.nColores = Number(s.nColores || 1); cfg.retardoMs = Math.max(0, Math.min(150, Number(s.retardoMs || 25)));
  if (s.perfilLuz) cfg.perfilLuz = s.perfilLuz;
  if (s.roi && s.roi[antId]) cfg.roi = s.roi[antId];
  pintarOverlaysVisor();

  if (s.cmd && s.cmd.antId === antId && s.cmd.ts !== ultCmd) {
    ultCmd = s.cmd.ts;
    if (Math.abs(ahoraSrv() - Number(s.cmd.ts || 0)) < 20000) {
      if (s.cmd.roi) { cfg.roi = s.cmd.roi; pintarOverlaysVisor(); } else if (s.cmd.posX) { cfg.roi.posX = Number(s.cmd.posX); pintarOverlaysVisor(); }
      if (s.cmd.calibrar) calibrarFondo();
    }
  }
  if (s.megafonia && s.megafonia.id && s.megafonia.id !== _ultMegaId) {
    _ultMegaId = s.megafonia.id;
    if (Math.abs(ahoraSrv() - Number(s.megafonia.ts || 0)) < 12000 && s.megafonia.texto) {
      mostrarAvisoAnt("📢 " + s.megafonia.texto);
      if (s.megafonia.beep) mxBeep(940, 110);
      hablarAnt(s.megafonia.texto, !!(s.megafonia.urgente || s.megafonia.texto.indexOf("SALIDA") >= 0 || s.megafonia.texto.indexOf("Velocidad") >= 0));
    }
  }
  if (s.reaccion && s.reaccion.ts && s.reaccion.ts !== _ultReacTs) {
    _ultReacTs = s.reaccion.ts;
    if (Math.abs(ahoraSrv() - Number(s.reaccion.ts)) < 8000 && s.reaccion.texto) {
      var txtR = s.reaccion.autor + (s.reaccion.destinoNom ? (" para " + s.reaccion.destinoNom) : "") + " dice: " + s.reaccion.texto;
      mostrarAvisoAnt("📣 " + txtR); hablarAnt(txtR, false);
    }
  }
  if (s.ovacion && s.ovacion.ts && s.ovacion.ts !== _ultOvaTs) {
    _ultOvaTs = s.ovacion.ts;
    if (Math.abs(ahoraSrv() - Number(s.ovacion.ts)) < 8000) { mostrarAvisoAnt("👏 ¡OVACION DE LA GRADA!"); mxBeep(940, 120); hablarAnt("Ovacion de la grada para los pilotos", false); }
  }
}

function enviarTelemetria() {
  if (!antenaPuedeOperar()) return;
  aplicarBanderaUI(salaCache, "banBanderaAnt");
  if (!antId || _telBusy) return; _telBusy = true;
  fetch(FB + "/antenas/" + antId + ".json", {
    method: "PUT",
    body: JSON.stringify({ ts: ahoraSrv(), nom: antNom, posX: (cfg.roi && cfg.roi.posX) || 50, orientacion: cfg.orientacion, mov: window._movVivo || 0, pasos: pasos, estado: est, calibrada: calibradaOk, camOk: camOk, videoWidth: camOk ? document.getElementById("vid").videoWidth : 0, videoHeight: camOk ? document.getElementById("vid").videoHeight : 0, verVivo: cfg.verVivo, movidaTs: _movidaTs, modoActivo: cfg.modoDet, ultTxt: _ultTxtAnt, ultTxtTs: _ultTxtTs, colorNom: _colorVivoAnt, colorRatio: _ratioColorAnt })
  }).then(function(resp){ return comprobarRespuestaAnt(resp, "Telemetría"); }).catch(function(err){ reportarErrorRedAnt("No se pudo enviar el estado", err); }).finally(function(){ _telBusy = false; });
}

function conectarSseSala() {
  if (_esSala) try { _esSala.close(); } catch (e) {}
  try {
    _esSala = new EventSource(FB + "/sala.json");
    var onSse = function(ev) { try { var msg = JSON.parse(ev.data); if (msg && msg.path) { _salaLastSseTs = Date.now(); if (msg.path === "/" && ev.type === "put") salaCache = msg.data || {}; else applySsePatch(salaCache, msg.path, msg.data, ev.type === "put"); procesarSala(salaCache); } } catch (e) {} };
    _esSala.addEventListener("put", onSse); _esSala.addEventListener("patch", onSse);
    _esSala.onerror = function(){ if (_esSala && _esSala.readyState === 2) setTimeout(conectarSseSala, 2500); };
  } catch (e) {}
}
if (!_antenaBloqueadaRol && !_esAmistosaAnt) conectarSseSala();

setInterval(enviarTelemetria, 1000);
setInterval(function() {
  if (!antenaPuedeOperar()) return;
  if (!antId) return; var v = document.getElementById("vid");
  if ((cfg.verVivo || !calibradaOk || cfg.estado === "TEST" || cfg.estado === "WARMUP" || est === "CAL") && camOk && v && v.videoWidth > 0) {
    if (_imgBusy) return; _imgBusy = true; _imgCleared = false;
    var controlador = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var tiempoLimite = controlador ? setTimeout(function(){ controlador.abort(); }, 3000) : null;
    try {
      _ctxLive.drawImage(v, 0, 0, 384, 216);
      var imagenViva = _cnvLive.toDataURL("image/jpeg", 0.40);
      fetch(FB_IMG + "/" + antId + ".json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: ahoraSrv(), img: imagenViva }),
        signal: controlador ? controlador.signal : undefined
      }).then(function(resp){ return comprobarRespuestaAnt(resp, "Vídeo"); })
      .then(function(){ _imgCleared = false; })
      .catch(function(err){ reportarErrorRedAnt("No se pudo compartir el vídeo", err); })
      .finally(function(){ if (tiempoLimite) clearTimeout(tiempoLimite); _imgBusy = false; });
    } catch (err) {
      if (tiempoLimite) clearTimeout(tiempoLimite);
      _imgBusy = false;
      reportarErrorRedAnt("No se pudo preparar el vídeo", err);
    }
  } else if (!_imgCleared && calibradaOk && !cfg.verVivo && est !== "CAL") {
    _imgCleared = true;
    fetch(FB_IMG + "/" + antId + ".json", { method: "DELETE" })
      .then(function(resp){ return comprobarRespuestaAnt(resp, "Vídeo"); })
      .catch(function(err){ reportarErrorRedAnt("No se pudo limpiar el vídeo", err); });
  }
}, 500);

setInterval(function() {
  if (!antenaPuedeOperar()) return;
  var salaSseDesactualizado = !_salaLastSseTs || Date.now() - _salaLastSseTs > 5000;
  var debeConsultarSala = (!_esSala || _esSala.readyState !== 1 || salaSseDesactualizado) && Date.now() - _salaLastPollTs >= 2500;
  if (debeConsultarSala && !_salaPollBusy) {
    _salaPollBusy = true;
    _salaLastPollTs = Date.now();
    fetch(FB + "/sala.json?t=" + Date.now(), { cache: "no-store" }).then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function(s){ if (s) { salaCache = s; procesarSala(salaCache); } }).catch(function(err){ reportarErrorRedAnt("No se pudo sincronizar el modo de captura", err); }).finally(function(){ _salaPollBusy = false; });
  }
  if (!_garajePollBusy) {
    _garajePollBusy = true;
    fetch(FB + "/garaje.json?t=" + Date.now()).then(function(r){ return r.ok ? r.json() : null; }).then(function(g){ if (g) cfg.garajes = g; }).catch(function(){}).finally(function(){ _garajePollBusy = false; });
  }
}, 2500);

function iniciarCamaraAntena() {
  if (!antenaPuedeOperar()) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById("lblEstado").textContent = "CAMARA NO DISPONIBLE EN ESTE NAVEGADOR";
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60, min: 30 } }, audio: false })
    .catch(function(){ return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, frameRate: { ideal: 60, min: 24 } }, audio: false }); })
    .then(function(st) {
      var v = document.getElementById("vid"); v.srcObject = st;
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
    .catch(function(e){ document.getElementById("lblEstado").textContent = "ERROR CAMARA: " + e.message; });
}
if (_esAmistosaAnt) {
  validarAccesoAntenaAmistosa().then(function() {
    conectarSseSala();
    setInterval(function() {
      if (!antenaPuedeOperar()) return;
      fetch(FB + "/rolesAntena/" + antId + ".json", { method: "PATCH", body: JSON.stringify({ ts: ahoraSrv() }) }).catch(function(){});
      fetch(FB + "/pilotos/" + _amistosaUidAnt + ".json", { method: "PATCH", body: JSON.stringify({ enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
    }, 5000);
    iniciarCamaraAntena();
  }).catch(function(err) {
    console.error("Acceso a antena amistosa denegado:", err);
    document.getElementById("lblEstado").textContent = err.message;
    setTimeout(function() { location.replace("piloto.html"); }, 1800);
  });
} else if (!_antenaBloqueadaRol) {
  conectarSseSala();
  iniciarCamaraAntena();
}