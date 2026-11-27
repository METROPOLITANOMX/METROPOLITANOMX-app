var _radarArm = null, _radarMaxKmh = 0, _radarPrevModo = "";

function hablarYAntenas(texto, conBeep, tambienLocal, urgente) {
  if (!texto) return; if (tambienLocal !== false) mxHablar(texto);
  fetch(FB + "/sala/megafonia.json", { method: "PUT", body: JSON.stringify({ id: "mg_" + ahoraSrv() + "_" + Math.random().toString(36).slice(2, 5), ts: ahoraSrv(), texto: texto, beep: !!conBeep, urgente: !!(urgente || conBeep) }) }).catch(function(){});
}

function toggleDictadoMicro() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, lbl = document.getElementById("lblMicroEst"), btn = document.getElementById("btnMicroDir");
  if (!SR) { lbl.style.color = "#ff6b6b"; lbl.textContent = "Tu navegador no soporta dictado directo."; return; }
  if (_escuchandoMicro && _recogMicro) { try { _recogMicro.stop(); } catch (e) {} return; }
  _recogMicro = new SR(); _recogMicro.lang = "es-ES"; _recogMicro.interimResults = false; _recogMicro.maxAlternatives = 1;
  _escuchandoMicro = true; btn.textContent = "🔴 ESCUCHANDO..."; btn.style.background = "#ffc107"; btn.style.color = "#000";
  lbl.style.color = "#20c997"; lbl.textContent = "🎙️ Habla ahora...";
  _recogMicro.onresult = function(ev) {
    var txt = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
    if (txt) { document.getElementById("inpMega").value = txt; enviarMegafonia(txt, true); lbl.style.color = "#20c997"; lbl.textContent = "📢 Enviado: \"" + txt + "\""; }
  };
  _recogMicro.onerror = function(e) { lbl.style.color = "#ff6b6b"; lbl.textContent = "Error microfono (" + (e.error || "permiso") + ")"; };
  _recogMicro.onend = function() { _escuchandoMicro = false; btn.textContent = "🎙️ HABLAR"; btn.style.background = "linear-gradient(180deg,#ff6b6b,#e03131)"; btn.style.color = "#fff"; };
  try { _recogMicro.start(); } catch (e) { _escuchandoMicro = false; }
}

function abrirBolsillo() { desbloquearAudioD(false); document.getElementById("bolsillo").style.display = "flex"; try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){}); } catch (e) {} }
function iniciarUnlockBol(ev) {
  if (_tUnlockBol) return;
  if (ev && ev.pointerId !== undefined) {
    _unlockBolPointerId = ev.pointerId;
    try { if (ev.currentTarget.setPointerCapture) ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
  } else _unlockBolKey = ev && ev.key ? ev.key : "";
  if (ev && ev.preventDefault) ev.preventDefault();
  _unlockBolStart = Date.now(); _pctUnlockBol = 0;
  _tUnlockBol = setInterval(function() {
    _pctUnlockBol = Math.min(100, Math.round(((Date.now() - _unlockBolStart) / 2000) * 100));
    document.getElementById("barUnlockBol").style.width = _pctUnlockBol + "%";
    if (_pctUnlockBol >= 100) {
      clearInterval(_tUnlockBol); _tUnlockBol = null; _unlockBolPointerId = null; _unlockBolKey = "";
      document.getElementById("bolsillo").style.display = "none";
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){}); } catch (e) {}
    }
  }, 40);
}
function cancelarUnlockBol(ev) {
  if (ev && ev.pointerId !== undefined && _unlockBolPointerId !== null && ev.pointerId !== _unlockBolPointerId) return;
  if (ev && ev.type === "keyup" && _unlockBolKey && ev.key !== _unlockBolKey) return;
  if (ev && ev.type === "keyup" && _unlockBolPointerId !== null) return;
  if (_tUnlockBol) { clearInterval(_tUnlockBol); _tUnlockBol = null; }
  _unlockBolPointerId = null; _unlockBolKey = ""; _pctUnlockBol = 0;
  document.getElementById("barUnlockBol").style.width = "0%";
}

function verFotoFinish() {
  document.getElementById("modalFf").style.display = "flex"; document.getElementById("txtFfInfo").textContent = "Cargando Foto-Finish..."; document.getElementById("imgFf").src = "";
  var pils = rootCache.pilotos || {};
  fbJson(FB_FF).then(function(ff) {
    if (!ff || !ff.img) { document.getElementById("txtFfInfo").textContent = "Aun no hay Foto-Finish."; return; }
    document.getElementById("imgFf").src = ff.img;
    var nomP = (ff.pid && pils[ff.pid]) ? pils[ff.pid].nombre : (ff.modo === "TODO" ? "Cualquier moto" : "Paso en meta");
    document.getElementById("txtFfInfo").textContent = (ff.antNom || "Meta") + " • " + nomP + " • " + new Date(ff.ts).toLocaleTimeString("es-ES");
  }).catch(function(){ document.getElementById("txtFfInfo").textContent = "Sin foto."; });
}

function cmdSala(est) {
  desbloquearAudioD(false);
  var ants = rootCache.antenas || {}, aks = Object.keys(ants).filter(function(k){ return Math.abs(ahoraSrv() - Number(ants[k].ts || 0)) < 15000; });
  if (est === "WARMUP" && (!aks.length || aks.some(function(k){ return !ants[k].calibrada; }))) {
    mxHablar("Calibra primero la pista vacia antes de iniciar el warm up");
    alert(!aks.length ? "⚠️ Conecta y calibra primero una antena antes de iniciar el Warm-Up." : "⚠️ Calibra primero la pista vacia antes de iniciar el Warm-Up.");
    return;
  }
  if ((est === "SALIDA_30" || est === "VALLA_MX") && aks.length && aks.some(function(k){ return !ants[k].calibrada; })) {
    alert("⚠️ Calibra primero la pista vacia."); return;
  }
  _radarArm = null;
  _ultRondaElim = 0; _ultRondaRuleta = 0; _bombaExplotada = false; avisoLipoP = false; avisoFinManga = false; _ultSecLoc = -999; _ultSecWu = -1; _wuFinAviso = false; _salidaShowHasta = 0;
  var ahCmd = ahoraSrv();
  var pay = { estado: est, tsInicio: 0, tsCuenta: 0, ruleta: null, dirTs: ahCmd, dirSession: dirSessionId, verVivo: false };
  if (rootCache.sala && rootCache.sala.estado === "RADAR" && _radarPrevModo) { pay.modoDet = _radarPrevModo; _radarPrevModo = ""; }
  testOn = false; _calibracionFeed = false; document.getElementById("btnToggleTest").textContent = "🎥 TEST VIVO"; document.getElementById("btnToggleTest").style.background = "linear-gradient(180deg,#845ef7,#5f3dc4)";
  if (est === "WARMUP") {
    pay.tsInicio = ahCmd + 180000;
    hablarYAntenas("Atencion pilotos, llamada a pista, comienza el warm up de 3 minutos", true, true, true);
    document.getElementById("acc_wu").style.display = "block";
    document.getElementById("arw_acc_wu").textContent = "▼";
    refrescarWarmupManual();
  }
  if (est === "SALIDA_30") {
    pay.tsCuenta = ahCmd + 30000; pay.tsInicio = pay.tsCuenta;
    hablarYAntenas("Atencion pilotos, llamada a parrilla, treinta segundos para la salida", true);
  }
  if (est === "VALLA_MX") {
    pay.tsCuenta = ahCmd + 30000;
    pay.tsInicio = pay.tsCuenta - 4000 + Math.floor(Math.random() * 5000);
    hablarYAntenas("Atencion pilotos, llamada a parrilla, treinta segundos para la salida", true);
  }
  if (est === "ESPERA") { pay.tsInicio = 0; hablarYAntenas("Manga detenida", false); }
  if (est === "SALIDA_30" || est === "VALLA_MX") {
    Object.keys(rootCache.pilotos || {}).forEach(function(k){ if (rootCache.pilotos[k]) rootCache.pilotos[k].tsUltimoPaso = 0; });
  }
  if (!rootCache.sala) rootCache.sala = {};
  Object.assign(rootCache.sala, pay);
  actualizarCronosDir();
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(pay) }).catch(function(){});
}
function lanzarRuletaManual() {
  var pils = ordenarPilotos(rootCache.pilotos, rootCache.sala), pool = (pils.length <= 1) ? RULETA_RETOS.filter(function(r){ return r.solo; }) : RULETA_RETOS;
  var ret = pool[Math.floor(Math.random() * pool.length)], rnd = Math.floor(ahoraSrv() / 1000);
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ modoJuego: "RULETA", ruleta: { ronda: rnd, titulo: ret.tit, texto: ret.tit + ": " + ret.txt, voz: ret.voz, ts: ahoraSrv() }, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){});
  hablarYAntenas(ret.voz, true);
}
function nuevaMangaDir() {
  Object.keys(rootCache.pilotos || {}).forEach(function(k){ fetch(FB + "/pilotos/" + k + ".json", { method: "PATCH", body: JSON.stringify({ vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false }) }).catch(function(){}); });
  _lockVtaD = {}; _ultCruceAntD = {}; _ultVtasSinc = 0; _ultLapSinc = 0;
  fetch(FB + "/pasos_lock.json", { method: "DELETE" }).catch(function(){}); fetch(FB + "/eventos.json", { method: "DELETE" }).catch(function(){}); fetch(FB + "/sala/porra.json", { method: "DELETE" }).catch(function(){});
  cmdSala("ESPERA");
}
function guardarMangaCamp() {
  var pils = ordenarPilotos(rootCache.pilotos, rootCache.sala); if (!pils.length) { alert("No hay pilotos"); return; }
  var pts = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  var res = pils.map(function(p, i){ return { id: p.id, nombre: p.nombre, dorsal: p.dorsal || "1", puntos: pts[i] || 1, vtas: p.vueltas || 0, mejorMs: p.mejorMs || 0 }; });
  fbJson(FB + "/campeonato/m_" + ahoraSrv() + ".json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), res: res }) }).then(function(){ hablarYAntenas("Manga guardada en el campeonato", true); alert("Manga guardada ✓"); }).catch(function(){ alert("Error"); });
}

function guardarDistRadar() {
  var el = document.getElementById("inpRadarDist");
  var d = Number((el && el.value) || localStorage.getItem("mxp_radar_dist") || 10);
  if (!d || d < 1) d = 1; if (d > 500) d = 500;
  if (el) el.value = d;
  localStorage.setItem("mxp_radar_dist", String(d));
  if (rootCache.sala && rootCache.sala.estado === "RADAR") {
    rootCache.sala.radarDist = d;
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ radarDist: d, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){});
  }
}

function toggleRadarDir() {
  desbloquearAudioD(false);
  var s = rootCache.sala || {}, lbl = document.getElementById("lblRadarResDir");
  if (s.estado === "RADAR") {
    _radarArm = null; _radarMaxKmh = 0;
    var restModo = _radarPrevModo || "TODO"; _radarPrevModo = "";
    var payOff = { estado: "ESPERA", modoDet: restModo, radarLastTxt: "", dirTs: ahoraSrv(), dirSession: dirSessionId };
    Object.assign(s, payOff);
    if (lbl) lbl.textContent = "Velocidad medida: -- km/h";
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(payOff) }).catch(function(){});
    pintarDirUI(); hablarYAntenas("Modo radar desactivado", false);
    return;
  }
  var elD = document.getElementById("inpRadarDist");
  var d = Number((elD && elD.value) || localStorage.getItem("mxp_radar_dist") || 10);
  if (!d || d < 1) d = 10; if (d > 500) d = 500;
  if (elD) elD.value = d;
  localStorage.setItem("mxp_radar_dist", String(d));
  _radarPrevModo = s.modoDet || "TODO";
  _radarArm = null; _radarMaxKmh = 0;
  _ultRondaElim = 0; _ultRondaRuleta = 0; _salidaShowHasta = 0;
  var txtW = "📡 Radar activo (" + d + " m) — Esperando paso por ambas camaras...";
  var payOn = { estado: "RADAR", modoDet: "TODO", tsInicio: 0, tsCuenta: 0, ruleta: null, radarDist: d, radarMaxKmh: 0, radarLastKmh: 0, radarLastTxt: txtW, verVivo: false, dirTs: ahoraSrv(), dirSession: dirSessionId };
  if (!rootCache.sala) rootCache.sala = {};
  Object.assign(rootCache.sala, payOn);
  if (lbl) lbl.textContent = txtW;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(payOn) }).catch(function(){});
  pintarDirUI();
  hablarYAntenas("Modo radar activado a " + d + " metros", true, true, true);
}

function procesarPasoRadar(ev) {
  if (!ev || !ev.antId || !ev.ts) return;
  var ts = Number(ev.ts), ant = ev.antId, lbl = document.getElementById("lblRadarResDir");
  if (!_radarArm || _radarArm.antId === ant || Math.abs(ts - _radarArm.ts) > 15000) {
    _radarArm = { antId: ant, ts: ts };
    if (lbl) lbl.textContent = "⏱️ " + (ant === "ant_1" ? "Camara 1" : (ant === "ant_2" ? "Camara 2" : ant)) + " detectada — Esperando 2ª camara...";
    return;
  }
  var dt = Math.abs(ts - _radarArm.ts);
  if (dt < 60) return;
  _radarArm = null;
  var s = rootCache.sala || {}, elD = document.getElementById("inpRadarDist");
  var dist = Number((elD && elD.value) || s.radarDist || localStorage.getItem("mxp_radar_dist") || 10);
  if (!dist || dist <= 0) dist = 10;
  var kmh = (dist / (dt / 1000)) * 3.6;
  var esMax = kmh > _radarMaxKmh;
  if (esMax) _radarMaxKmh = kmh;
  var kmhFix = Number(kmh.toFixed(1)), maxFix = Number(_radarMaxKmh.toFixed(1));
  var txt = "📡 " + kmhFix.toFixed(1) + " km/h (" + (dt / 1000).toFixed(2) + "s / " + dist + "m • Max: " + maxFix.toFixed(1) + " km/h)";
  if (lbl) lbl.textContent = txt;
  s.radarLastKmh = kmhFix; s.radarMaxKmh = maxFix; s.radarLastTxt = txt;
  var status = document.getElementById("lblEstadoGlobDir");
  if (status) status.textContent = "📡 RADAR: " + kmhFix.toFixed(1) + " km/h · MÁX " + maxFix.toFixed(1) + " km/h";
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ radarLastKmh: kmhFix, radarMaxKmh: maxFix, radarLastTxt: txt, ultPasoTs: ts, ultPasoTxt: kmhFix.toFixed(1) + " km/h (Radar)" }) }).catch(function(){});
  mxBeep(1040, 120);
  hablarYAntenas("Radar. Velocidad medida: " + kmhFix.toFixed(1).replace(".", " punto ") + " kilometros por hora" + (esMax ? ", nuevo record de velocidad" : ""), true, true, true);
}

function ponerBandera(col) {
  var ahB = ahoraSrv();
  if (!rootCache.sala) rootCache.sala = {};
  rootCache.sala.bandera = col; rootCache.sala.banderaTs = ahB;
  aplicarBanderaUI(rootCache.sala, "banBanderaAmDir");
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ bandera: col, banderaTs: ahB, dirTs: ahB, dirSession: dirSessionId }) }).catch(function(){});
  hablarYAntenas("Bandera " + col.toLowerCase() + " en pista", true, true, true);
}
function enviarMegafonia(texto, beep) { var t = String(texto || "").trim(); if (!t) return; document.getElementById("inpMega").value = ""; hablarYAntenas(t, beep); }

function sumarVueltaManualDir() { desbloquearAudioD(false); if (!dirPilotoOn) toggleDirPiloto(); registrarVueltaDir(uid, ahoraSrv(), true); }

function registrarVueltaDir(pUid, evTs, esManual) {
  var p = (rootCache.pilotos || {})[pUid]; if (!p || p.eliminado) return;
  var s = rootCache.sala || {}, ah = Number(evTs || ahoraSrv()), st = s.estado || "ESPERA", minMs = esManual ? 900 : (Number(s.minLapSec || 5)) * 1000;
  if (st === "RADAR") return;
  if (_lockVtaD[pUid] && (ah - _lockVtaD[pUid]) < minMs) return;
  if (st === "WARMUP" || st === "TEST" || st === "ESPERA" || st === "SALIDA_30" || st === "VALLA_MX") {
    _lockVtaD[pUid] = ah; p.sensorOk = true;
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ sensorOk: true }) }).catch(function(){});
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ ultPasoTs: ah, ultPasoTxt: p.nombre + " (Prueba OK)" }) }).catch(function(){});
    pintarDirUI(); return;
  }
  var ult = Number(p.tsUltimoPaso || 0);
  if (ult && s.tsInicio && ult < Number(s.tsInicio)) ult = 0;
  if (ult && (ah - ult) < minMs) return;
  _lockVtaD[pUid] = ah;
  var baseT = ult || Number(s.tsInicio || 0) || ah, lap = ah - baseT;
  if (lap < (esManual ? 900 : 1500)) { p.tsUltimoPaso = ah; fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ tsUltimoPaso: ah }) }).catch(function(){}); return; }
  var oldMej = Number(p.mejorMs || 0), vrMangaPrev = 0;
  Object.keys(rootCache.pilotos || {}).forEach(function(k){ var px = rootCache.pilotos[k]; if (px && Number(px.mejorMs) > 0 && (!vrMangaPrev || Number(px.mejorMs) < vrMangaPrev)) vrMangaPrev = Number(px.mejorMs); });
  var v = (p.vueltas || 0) + 1, mej = (!oldMej || lap < oldMej) ? lap : oldMej;
  var esVr = (lap > 0) && (!vrMangaPrev || lap < vrMangaPrev), esRp = (v > 1 && oldMej > 0 && lap < oldMej);
  var heatTag = Number(s.tsInicio || 0) || "free", lk = pUid + "_" + heatTag + "_v" + v;
  fbJson(FB + "/pasos_lock/" + lk + ".json").then(function(ex) {
    if (ex && ex.ok) return;
    return fbJson(FB + "/pasos_lock/" + lk + ".json", { method: "PUT", body: JSON.stringify({ ok: true, ts: ah }) }).then(function() {
      p.tsUltimoPaso = ah; p.vueltas = v; p.ultimaMs = lap; p.mejorMs = mej;
      var pilsOrd = ordenarPilotos(rootCache.pilotos, s), myIdx = -1;
      for (var pi = 0; pi < pilsOrd.length; pi++) { if (pilsOrd[pi].id === pUid) { myIdx = pi; break; } }
      var difTxt = "";
      if (pilsOrd.length > 1 && myIdx >= 0) {
        var ref = (myIdx === 0) ? pilsOrd[1] : pilsOrd[myIdx - 1];
        if (ref) {
          var mj = s.modoJuego || "NORMAL";
          if (mj === "REY" || mj === "SUPERPOLE") {
            if (ref.mejorMs && p.mejorMs) {
              var dMej = Math.abs(Number(p.mejorMs) - Number(ref.mejorMs));
              if (dMej > 0) difTxt = (myIdx === 0) ? (", primero, ventaja de " + fmtVoz(dMej) + " sobre " + ref.nombre) : (", a " + fmtVoz(dMej) + " de " + ref.nombre);
            }
          } else if (myIdx === 0) {
            if (Number(ref.vueltas || 0) === v && Number(ref.tsUltimoPaso || 0) > 0) {
              difTxt = ", primero, ventaja de " + fmtVoz(Math.abs(ah - Number(ref.tsUltimoPaso))) + " sobre " + ref.nombre;
            } else if (Number(ref.vueltas || 0) === (v - 1) && ult > 0 && Number(ref.tsUltimoPaso || 0) > ult) {
              difTxt = ", primero, ventaja de " + fmtVoz(Number(ref.tsUltimoPaso) - ult) + " sobre " + ref.nombre;
            } else if (Number(ref.vueltas || 0) < (v - 1)) {
              difTxt = ", primero con " + (v - Number(ref.vueltas || 0) - 1) + " vuelta de ventaja sobre " + ref.nombre;
            } else difTxt = ", en primera posicion";
          } else {
            if (Number(ref.vueltas || 0) === v && Number(ref.tsUltimoPaso || 0) > 0 && ah >= Number(ref.tsUltimoPaso)) {
              difTxt = ", a " + fmtVoz(ah - Number(ref.tsUltimoPaso)) + " de " + ref.nombre;
            } else if (Number(ref.vueltas || 0) > v) {
              var dv = Number(ref.vueltas || 0) - v;
              difTxt = ", a " + dv + (dv === 1 ? " vuelta" : " vueltas") + " de " + ref.nombre;
            }
          }
        }
      }
      var recTxt = (esVr && esRp) ? ", vuelta rapida de la manga y personal" : (esVr ? ", vuelta rapida de la manga" : (esRp ? ", vuelta rapida personal" : ""));
      hablarYAntenas(p.nombre + ", " + fmtVoz(lap) + difTxt + recTxt, esVr || esRp, true, true);
      if (dirPilotoOn && pUid === uid && _ultLapSinc !== ah) {
        _ultLapSinc = ah; _ultVtasSinc = v; _bombaExplotada = false;
        mxGar.procesarMiVuelta(lap, mej, pilsOrd, "lblDeltaVivoP", "deltaBol");
      }
      fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ vueltas: v, ultimaMs: lap, mejorMs: mej, tsUltimoPaso: ah, enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
      var patchS = { ultPasoTs: ah, ultPasoTxt: p.nombre + " #" + (p.dorsal || "1") + " (" + fmt(mej) + ")" };
      if (!s.hotlapMs || lap < Number(s.hotlapMs)) { patchS.hotlapMs = lap; patchS.hotlapTxt = p.nombre + " — " + fmt(lap); }
      fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(patchS) }).catch(function(){});
      pintarDirUI();
    });
  }).catch(function(){});
}
function calidadColorEvento(ev) {
  var sat = Number(ev && ev.colorSaturation) || 0, area = Number(ev && ev.colorArea) || 0;
  return Number(ev && ev.colorQuality) || (sat * area);
}
function fusionarEventoAntena(ev, pUid) {
  var ts = Number(ev.ts), previo = _ultCruceAntD[pUid];
  if (!previo || Math.abs(ts - previo.ts) > 1500 || previo.antIds.indexOf(ev.antId) >= 0) {
    _ultCruceAntD[pUid] = {
      ts: ts, antIds: [ev.antId], tsByAnt: {},
      lectura: {
        colorNom: ev.colorNom || "",
        colorRatio: Number(ev.colorRatio) || 0,
        colorSaturation: Number(ev.colorSaturation) || 0,
        colorArea: Number(ev.colorArea) || 0,
        colorQuality: calidadColorEvento(ev)
      }
    };
    _ultCruceAntD[pUid].tsByAnt[ev.antId] = ts;
    return false;
  }

  previo.antIds.push(ev.antId);
  previo.tsByAnt[ev.antId] = ts;
  var lecturaNueva = {
    colorNom: ev.colorNom || "",
    colorRatio: Number(ev.colorRatio) || 0,
    colorSaturation: Number(ev.colorSaturation) || 0,
    colorArea: Number(ev.colorArea) || 0,
    colorQuality: calidadColorEvento(ev)
  };
  if (lecturaNueva.colorQuality > previo.lectura.colorQuality) previo.lectura = lecturaNueva;
  previo.lectura.confirmaciones = previo.antIds.length;
  var fusionColor = {
    confirmada: true, pilotoUid: pUid, ts: Math.max(ts, previo.ts), antIds: previo.antIds.slice(),
    colorNom: previo.lectura.colorNom, colorRatio: previo.lectura.colorRatio,
    colorSaturation: previo.lectura.colorSaturation, colorArea: previo.lectura.colorArea,
    colorQuality: previo.lectura.colorQuality
  };
  previo.antIds.forEach(function(aid) {
    var actual = (rootCache.eventos || {})[aid];
    if (actual && Number(actual.ts) === Number(previo.tsByAnt[aid])) actual.fusionColor = fusionColor;
    fetch(FB + "/eventos/" + aid + ".json", { method: "PATCH", body: JSON.stringify({ fusionColor: fusionColor }) }).catch(function(){});
  });
  return true;
}
function manejarEventoAntena(ev) {
  if (!ev || !ev.ts || !ev.antId || _ultEvD[ev.antId] === ev.ts) return;
  _ultEvD[ev.antId] = ev.ts;
  if (Math.abs(ahoraSrv() - Number(ev.ts)) < 6000) {
    var s = rootCache.sala || {};
    if (s.estado === "RADAR") { procesarPasoRadar(ev); return; }
    var md = s.modoDet || "TODO";
    if (md !== "TODO" && !ev.pilotoUid) return;
    var pils = ordenarPilotos(rootCache.pilotos, s), target = ev.pilotoUid || (pils.length ? pils[0].id : "");
    if (target && !fusionarEventoAntena(ev, target)) registrarVueltaDir(target, Number(ev.ts), false);
  }
}

function renderSwatches(g) {
  var cs = (g && Array.isArray(g.colores)) ? g.colores.slice(0, 3) : [];
  return cs.map(function(c){
    var nom = c.nom || c.hex || "Color asignado";
    return '<span class="mx-sw" role="img" aria-label="Color de piloto: ' + esc(nom) + '" title="' + esc(nom) + '" style="background:' + esc(c.hex || "#fff") + '"></span>';
  }).join("");
}

function actualizarCronosDir() {
  var s = rootCache.sala || {}, est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), ah = ahoraSrv();
  aplicarBanderaUI(s, "banBanderaAmDir");
  var ov = document.getElementById("overlaySem"), nowLoc = Date.now(), wuBox = document.getElementById("lblWarmupCronoDir");
  var mostrarSemaforoDir = dirPilotoOn || window.innerWidth <= 768 || (!!window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  if (est === "EN_CURSO" && t0 > 0 && Number(s.duracionMin || 0) > 0) {
    var remManga = t0 + Number(s.duracionMin) * 60000 - ah;
    var lblManga = document.getElementById("lblEstadoSalaP");
    var txtManga = remManga > 0 ? ("MANGA " + fmtCuentaRegresivaManga(remManga)) : "FIN MANGA";
    if (lblManga.textContent !== txtManga) lblManga.textContent = txtManga;
    if (remManga <= 0 && !avisoFinManga) {
      avisoFinManga = true; hablarYAntenas("Tiempo de manga cumplido, bandera a cuadros", true);
    }
  }

  if (est === "WARMUP" && t0 > 0) {
    var dfW = t0 - ah, sgW = Math.max(0, Math.ceil(dfW / 1000));
    if (dfW > 0 && sgW !== _ultSecWu) {
      _ultSecWu = sgW;
      var mW = Math.floor(sgW / 60), sW = sgW % 60, mmss = (mW < 10 ? "0" : "") + mW + ":" + (sW < 10 ? "0" : "") + sW;
      wuBox.style.display = "block"; wuBox.style.borderColor = "#fd7e14"; wuBox.style.color = "#ffa94d";
      wuBox.textContent = "🔥 WARM-UP: " + mmss + " — Capturando en meta";
      document.getElementById("lblEstadoGlobDir").textContent = "WARM-UP " + mmss + " • " + (s.modoDet || "TODO");
      document.getElementById("lblEstadoSalaP").textContent = "WARM-UP " + mmss;
      if (sgW === 60) hablarYAntenas("Ultimo minuto de warm-up", false);
      else if (sgW === 30) hablarYAntenas("Treinta segundos de warm-up", false);
      else if (sgW === 10) hablarYAntenas("Diez segundos para fin de warm-up", false);
    } else if (dfW <= 0 && !_wuFinAviso) {
      _wuFinAviso = true; _ultSecWu = 0;
      mxBeep(980, 220);
      hablarYAntenas("Fin de warm-up. Atencion pilotos, llamada a parrilla de salida", true);
      wuBox.style.display = "block"; wuBox.style.borderColor = "#20c997"; wuBox.style.color = "#20c997";
      wuBox.textContent = "🏁 FIN WARM-UP — ¡PILOTOS A PARRILLA!";
      s.estado = "ESPERA"; s.tsInicio = 0;
      fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0 }) }).catch(function(){});
    }
  } else if (est !== "ESPERA" || !_wuFinAviso) {
    if (wuBox.style.display !== "none") wuBox.style.display = "none";
  }

  if (est === "ESPERA" || est === "WARMUP" || est === "TEST" || est === "RADAR") _salidaShowHasta = 0;
  if ((est !== "SALIDA_30" && est !== "VALLA_MX") || t0 <= 0) {
    if (nowLoc >= _salidaShowHasta && ov.style.display !== "none") ov.style.display = "none";
    return;
  }

  var df = t0 - ah, tCue = Number(s.tsCuenta || 0) || t0, dfCue = tCue - ah, sgCue = Math.ceil(dfCue / 1000);
  if (df > 0 && sgCue !== _ultSecLoc) {
    _ultSecLoc = sgCue;
    if (est === "VALLA_MX") {
      if (sgCue === 20) hablarYAntenas("Quedan veinte segundos", false);
      else if (sgCue <= 10 && sgCue >= 5) hablarYAntenas(String(sgCue), false);
    } else {
      if (sgCue === 20) hablarYAntenas("Quedan veinte segundos", false);
      else if (sgCue === 10) hablarYAntenas("Diez segundos", false);
      else if (sgCue <= 5 && sgCue >= 1) hablarYAntenas(String(sgCue), false);
    }
  }
  if (df <= 0 && _ultSecLoc !== -999) {
    _ultSecLoc = -999; _salidaShowHasta = (df > -1500) ? (nowLoc + 1800) : 0;
    if (df > -1500) { mxBeep(1100, 260); hablarYAntenas("¡SALIDA!", true); }
    s.estado = "EN_CURSO";
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO" }) }).catch(function(){});
  }

  if (mostrarSemaforoDir) {
    if (df > 0 && dfCue <= 31000) {
      ov.style.display = "flex";
      var leds = document.getElementById("semLeds"), gBox = document.getElementById("gateBox"), gBar = document.getElementById("gateBar");
      if (est === "VALLA_MX") {
        leds.style.display = "none"; gBox.style.display = "block"; gBar.classList.remove("drop");
        if (sgCue <= 5) { document.getElementById("numSem").textContent = "5s"; document.getElementById("txtSem").textContent = "¡ATENTOS A LA VALLA!"; ov.style.background = (Math.floor(df / 220) % 2 === 0) ? "#c9182b" : "#ffc107"; }
        else { document.getElementById("numSem").textContent = "00:" + (sgCue < 10 ? "0" : "") + sgCue; document.getElementById("txtSem").textContent = "CARTEL EN PARRILLA"; ov.style.background = "#c9182b"; }
      } else {
        gBox.style.display = "none"; leds.style.display = "flex";
        var nOn = sgCue <= 5 ? (6 - sgCue) : 0, ls = leds.children;
        for (var li = 0; li < ls.length; li++) ls[li].className = "sem-led" + (li < nOn ? " on" : "");
        document.getElementById("numSem").textContent = "00:" + (sgCue < 10 ? "0" : "") + sgCue;
        document.getElementById("txtSem").textContent = "PREPARADOS"; ov.style.background = (sgCue > 10) ? "#1f080c" : (sgCue > 5 ? "#332200" : "#2b0509");
      }
    } else if (df <= 0 && nowLoc < _salidaShowHasta) {
      ov.style.display = "flex"; ov.style.background = "#00c853";
      document.getElementById("numSem").textContent = "¡SALIDA!"; document.getElementById("txtSem").textContent = (est === "VALLA_MX") ? "¡VALLA ABAJO!" : "A TOPE";
      if (est === "VALLA_MX") document.getElementById("gateBar").classList.add("drop");
      else { var ls2 = document.getElementById("semLeds").children; for (var li2 = 0; li2 < ls2.length; li2++) ls2[li2].className = "sem-led go"; }
    } else if (nowLoc >= _salidaShowHasta) ov.style.display = "none";
  } else ov.style.display = "none";
}