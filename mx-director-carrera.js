function hablarYAntenas(texto, conBeep, tambienLocal) {
  if (!texto) return; if (tambienLocal !== false) mxHablar(texto);
  fetch(FB + "/sala/megafonia.json", { method: "PUT", body: JSON.stringify({ id: "mg_" + ahoraSrv() + "_" + Math.random().toString(36).slice(2, 5), ts: ahoraSrv(), texto: texto, beep: !!conBeep }) }).catch(function(){});
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
function iniciarUnlockBol() {
  if (_tUnlockBol) return; _pctUnlockBol = 0;
  _tUnlockBol = setInterval(function(){ _pctUnlockBol += 5; document.getElementById("barUnlockBol").style.width = _pctUnlockBol + "%"; if (_pctUnlockBol >= 100) { cancelarUnlockBol(); document.getElementById("bolsillo").style.display = "none"; try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function(){}); } catch (e) {} } }, 90);
}
function cancelarUnlockBol() { if (_tUnlockBol) { clearInterval(_tUnlockBol); _tUnlockBol = null; } _pctUnlockBol = 0; document.getElementById("barUnlockBol").style.width = "0%"; }

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
  var ants = rootCache.antenas || {};
  if (est === "SALIDA_30" || est === "VALLA_MX") {
    var aks = Object.keys(ants).filter(function(k){ return Math.abs(ahoraSrv() - Number(ants[k].ts || 0)) < 15000; });
    if (aks.length && aks.some(function(k){ return !ants[k].calibrada; })) { alert("⚠️ Calibra primero la pista vacia."); return; }
  }
  _ultRondaElim = 0; _ultRondaRuleta = 0; _bombaExplotada = false; avisoLipoP = false; avisoFinManga = false; _ultSecLoc = -999; _ultSecWu = -1; _wuFinAviso = false; _salidaShowHasta = 0;
  var ahCmd = ahoraSrv();
  var pay = { estado: est, tsInicio: 0, tsCuenta: 0, ruleta: null, dirTs: ahCmd, dirSession: dirSessionId, verVivo: false };
  testOn = false; document.getElementById("btnToggleTest").textContent = "🎥 TEST VIVO"; document.getElementById("btnToggleTest").style.background = "linear-gradient(180deg,#845ef7,#5f3dc4)";
  if (est === "WARMUP") {
    pay.tsInicio = ahCmd + 180000;
    hablarYAntenas("Warm-up de 3 minutos iniciado, capturando en meta", true);
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
  _lockVtaD = {}; _ultVtasSinc = 0; _ultLapSinc = 0;
  fetch(FB + "/pasos_lock.json", { method: "DELETE" }).catch(function(){}); fetch(FB + "/eventos.json", { method: "DELETE" }).catch(function(){}); fetch(FB + "/sala/porra.json", { method: "DELETE" }).catch(function(){});
  cmdSala("ESPERA");
}
function guardarMangaCamp() {
  var pils = ordenarPilotos(rootCache.pilotos, rootCache.sala); if (!pils.length) { alert("No hay pilotos"); return; }
  var pts = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  var res = pils.map(function(p, i){ return { id: p.id, nombre: p.nombre, dorsal: p.dorsal || "1", puntos: pts[i] || 1, vtas: p.vueltas || 0, mejorMs: p.mejorMs || 0 }; });
  fbJson(FB + "/campeonato/m_" + ahoraSrv() + ".json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), res: res }) }).then(function(){ hablarYAntenas("Manga guardada en el campeonato", true); alert("Manga guardada ✓"); }).catch(function(){ alert("Error"); });
}
function ponerBandera(col) { fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ bandera: col, dirTs: ahoraSrv(), dirSession: dirSessionId }) }).catch(function(){}); hablarYAntenas("Bandera " + col.toLowerCase() + " en pista", true); }
function enviarMegafonia(texto, beep) { var t = String(texto || "").trim(); if (!t) return; document.getElementById("inpMega").value = ""; hablarYAntenas(t, beep); }

function borrarHotlapDir() {
  if (!confirm("¿Seguro que quieres borrar el record de Hotlap semanal de este circuito?")) return;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ hotlapMs: null, hotlapTxt: null, ultPasoTs: null, ultPasoTxt: null }) }).then(function(){ alert("Hotlap semanal borrada ✓"); }).catch(function(){});
}
function borrarTiemposDiaDir() {
  if (!confirm("¿Seguro que quieres borrar todos los tiempos del dia y mangas de prueba?")) return;
  Promise.all([fetch(FB + "/campeonato.json", { method: "DELETE" }), fetch(FB + "/pasos_lock.json", { method: "DELETE" }), fetch(FB + "/eventos.json", { method: "DELETE" }), fetch(FB + "/foto_finish/" + circId + ".json", { method: "DELETE" })])
    .then(function(){ rootCache.campeonato = {}; rootCache.eventos = {}; nuevaMangaDir(); alert("Tiempos del dia borrados ✓"); }).catch(function(){});
}

function restarVueltaDir(pUid) {
  var p = (rootCache.pilotos || {})[pUid]; if (!p || !p.vueltas) return;
  var s = rootCache.sala || {}, heatTag = Number(s.tsInicio || 0) || "free";
  var oldV = Number(p.vueltas), newV = Math.max(0, oldV - 1), pay = { vueltas: newV, ultimaMs: 0 };
  if (newV === 0) { pay.mejorMs = 0; pay.tsUltimoPaso = 0; }
  fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify(pay) }).catch(function(){});
  fetch(FB + "/pasos_lock/" + pUid + "_" + heatTag + "_v" + oldV + ".json", { method: "DELETE" }).catch(function(){});
  fetch(FB + "/pasos_lock/" + pUid + "_v" + oldV + ".json", { method: "DELETE" }).catch(function(){});
}
function expulsarPilotoDir(pUid) { if (!confirm("¿Expulsar a este piloto de la parrilla?")) return; fetch(FB + "/pilotos/" + pUid + ".json", { method: "DELETE" }).catch(function(){}); if (rootCache.pilotos) delete rootCache.pilotos[pUid]; pintarDirUI(); }
function limpiarOfflineDir() {
  var pAll = rootCache.pilotos || {};
  Object.keys(pAll).forEach(function(k){ if (pAll[k] && !esPilotoActivo(pAll[k])) { fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" }).catch(function(){}); delete pAll[k]; } });
  pintarDirUI();
}
function sumarVueltaManualDir() { desbloquearAudioD(false); if (!dirPilotoOn) toggleDirPiloto(); registrarVueltaDir(uid, ahoraSrv(), true); }

function registrarVueltaDir(pUid, evTs, esManual) {
  var p = (rootCache.pilotos || {})[pUid]; if (!p || p.eliminado) return;
  var s = rootCache.sala || {}, ah = Number(evTs || ahoraSrv()), st = s.estado || "ESPERA", minMs = esManual ? 900 : (Number(s.minLapSec || 5)) * 1000;
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
  var v = (p.vueltas || 0) + 1, mej = (!p.mejorMs || lap < p.mejorMs) ? lap : p.mejorMs;
  var heatTag = Number(s.tsInicio || 0) || "free", lk = pUid + "_" + heatTag + "_v" + v;
  fbJson(FB + "/pasos_lock/" + lk + ".json").then(function(ex) {
    if (ex && ex.ok) return;
    return fbJson(FB + "/pasos_lock/" + lk + ".json", { method: "PUT", body: JSON.stringify({ ok: true, ts: ah }) }).then(function() {
      p.tsUltimoPaso = ah; p.vueltas = v; p.ultimaMs = lap; p.mejorMs = mej;
      if (dirPilotoOn && pUid === uid && _ultLapSinc !== ah) {
        _ultLapSinc = ah; _ultVtasSinc = v; _bombaExplotada = false;
        mxGar.procesarMiVuelta(lap, mej, ordenarPilotos(rootCache.pilotos, s), "lblDeltaVivoP", "deltaBol");
      }
      fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ vueltas: v, ultimaMs: lap, mejorMs: mej, tsUltimoPaso: ah, enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
      var patchS = { ultPasoTs: ah, ultPasoTxt: p.nombre + " #" + (p.dorsal || "1") + " (" + fmt(mej) + ")" };
      if (!s.hotlapMs || lap < Number(s.hotlapMs)) { patchS.hotlapMs = lap; patchS.hotlapTxt = p.nombre + " — " + fmt(lap); }
      fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(patchS) }).catch(function(){});
      pintarDirUI();
    });
  }).catch(function(){});
}
function manejarEventoAntena(ev) {
  if (!ev || !ev.ts || !ev.antId || _ultEvD[ev.antId] === ev.ts) return;
  _ultEvD[ev.antId] = ev.ts;
  if (Math.abs(ahoraSrv() - Number(ev.ts)) < 6000) {
    var s = rootCache.sala || {}, md = s.modoDet || "TODO";
    if (md !== "TODO" && !ev.pilotoUid) return;
    var pils = ordenarPilotos(rootCache.pilotos, s), target = ev.pilotoUid || (pils.length ? pils[0].id : "");
    if (target) registrarVueltaDir(target, Number(ev.ts), false);
  }
}

function renderSwatches(g) {
  var cs = (g && Array.isArray(g.colores)) ? g.colores.slice(0, 3) : [];
  return cs.map(function(c){ return '<span class="mx-sw" style="background:' + esc(c.hex || "#fff") + '"></span>'; }).join("");
}

function actualizarCronosDir() {
  var s = rootCache.sala || {}, est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), ah = ahoraSrv();
  var ov = document.getElementById("overlaySem"), nowLoc = Date.now(), wuBox = document.getElementById("lblWarmupCronoDir");

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

  if (est === "ESPERA" || est === "WARMUP" || est === "TEST") _salidaShowHasta = 0;
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

  if (dirPilotoOn) {
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