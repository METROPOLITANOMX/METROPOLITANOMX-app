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
  if ((st === "SALIDA_30" || st === "VALLA_MX") && (!Number(s.tsInicio || 0) || ah < Number(s.tsInicio))) {
    if (esManual && dirPilotoOn && pUid === uid) document.getElementById("lblDeltaVivoP").innerHTML = "<span style='color:#ffc107'>⏳ Espera a la salida</span>";
    return;
  }
  if (_lockVtaD[pUid] && (ah - _lockVtaD[pUid]) < minMs) return;
  if (st === "WARMUP" || st === "TEST" || st === "ESPERA") {
    _lockVtaD[pUid] = ah; p.sensorOk = true;
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ sensorOk: true }) }).catch(function(){});
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ ultPasoTs: ah, ultPasoTxt: p.nombre + " (Prueba OK)" }) }).catch(function(){});
    pintarDirUI(); return;
  }
  var ult = Number(p.tsUltimoPaso || 0); if (ult && (ah - ult) < minMs) return;
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

function pintarChecklist(antsAct, pils, s) {
  var calOk = antsAct.length > 0 && antsAct.every(function(k){ return rootCache.antenas[k] && rootCache.antenas[k].calibrada; });
  var gar = rootCache.garaje || {}, md = s.modoDet || "TODO";
  var colOk = (md === "TODO") || pils.some(function(p){ var g = gar[p.id]; return g && ((g.colores && g.colores.length) || g.firmasWarmup); });
  var pasos = [
    { ok: antsAct.length > 0, txt: "1. Antenas (Cam1: " + (antsAct.indexOf("ant_1") >= 0 ? "✓" : "No") + " • Cam2: " + (antsAct.indexOf("ant_2") >= 0 ? "✓" : "No") + ")" },
    { ok: !!(s.perfilLuz && s.perfilLuz.nombre), txt: "2. Perfil Luz (" + esc((s.perfilLuz && s.perfilLuz.nombre) || "Normal") + ")" },
    { ok: calOk, txt: "3. Pista vacia calibrada" },
    { ok: pils.some(function(p){ return p.activo; }), txt: "4. Parrilla (" + pils.filter(function(p){ return p.activo; }).length + " activos)" },
    { ok: colOk, txt: "5. Firmas (" + esc(md) + ")" },
    { ok: s.estado === "EN_CURSO" || s.estado === "SALIDA_30" || s.estado === "VALLA_MX", txt: "6. Manga lanzada" }
  ];
  document.getElementById("bodyChecklist").innerHTML = pasos.map(function(st){ return '<div class="chk-item' + (st.ok ? ' chk-ok' : '') + '">' + (st.ok ? '✅' : '⏳') + ' <span>' + st.txt + '</span></div>'; }).join("");
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
  if (df <= 0 && _ultSecLoc !== 0) {
    _ultSecLoc = 0; _salidaShowHasta = nowLoc + 1800; mxBeep(1100, 260); hablarYAntenas("¡SALIDA!", true);
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
    } else if (df <= 0 && df > -4000) {
      ov.style.display = "flex"; ov.style.background = "#00c853";
      document.getElementById("numSem").textContent = "¡SALIDA!"; document.getElementById("txtSem").textContent = (est === "VALLA_MX") ? "¡VALLA ABAJO!" : "A TOPE";
      if (est === "VALLA_MX") document.getElementById("gateBar").classList.add("drop");
      else { var ls2 = document.getElementById("semLeds").children; for (var li2 = 0; li2 < ls2.length; li2++) ls2[li2].className = "sem-led go"; }
    } else if (nowLoc >= _salidaShowHasta) ov.style.display = "none";
  } else ov.style.display = "none";
}