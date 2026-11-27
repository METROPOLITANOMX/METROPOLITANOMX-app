var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var FB = FB_ROOT + "/circuitos/" + circId;
var FB_FF = FB_ROOT + "/foto_finish/" + circId + ".json";
var uid = localStorage.getItem("mxp_uid"), miNom = localStorage.getItem("mxp_nom") || "Piloto";
if (!uid) location.href = "index.html";

document.getElementById("txtNomTop").textContent = miNom.toUpperCase();
document.getElementById("txtCircTop").textContent = "🏁 " + circNom;

var vozP = true, _tabAct = "sala", rootCache = { sala: {}, antenas: {}, pilotos: {}, garaje: {}, campeonato: {}, eventos: {} };
var circMeta = { metros: 200, factor: 1.0 }, _ultEvP = {}, _lockVtaLocal = {}, ultSegSemP = -99, _ultSecWuP = -1, _wuFinAvisoP = false, _salidaShowHasta = 0;
var avisoLipoP = false, avisoFinManga = false, _ultVtasSinc = -1, _ultLapSinc = 0, _tCal10 = null;
var _tUnlockBol = null, _pctUnlockBol = 0, _unlockBolStart = 0, _unlockBolPointerId = null, _unlockBolKey = "", _bombaExplotada = false, _ultRondaElim = 0, _ultRondaRuleta = 0;
var _ultMegaIdP = "", _ultReacTsP = 0, _esRoot = null, _lastSalaSig = "";

fbJson(FB_ROOT + "/cuentas_idx/" + uid + ".json").then(function(ix){
  if (ix && ix.bloqueado) { alert("⛔ Tu cuenta ha sido bloqueada por Direccion."); salirPiloto(); return; }
  if (!ix) {
    fetch(FB_ROOT + "/cuentas_idx/" + uid + ".json", {
      method: "PUT", body: JSON.stringify({ nombre: miNom.slice(0, 40), rol: "PILOTO", bloqueado: false, ultAcceso: ahoraSrv() })
    }).catch(function(){});
  }
}).catch(function(){});

fetch(FB_ROOT + "/circuitos_lista/" + circId + ".json").then(function(r){ return r.ok ? r.json() : null; }).then(function(c){
  if (c) { if (Number(c.metros) > 0) circMeta.metros = Number(c.metros); if (Number(c.factor) > 0) circMeta.factor = Number(c.factor); }
}).catch(function(){});

activarWakeLock();
window.addEventListener("beforeunload", function() {
  if (_esRoot) try { _esRoot.close(); } catch (e) {}
  var yo = (rootCache.pilotos || {})[uid];
  if (yo && !(yo.vueltas > 0)) fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
  else fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", keepalive: true, body: JSON.stringify({ enPista: false, tsActivo: 0 }) }).catch(function(){});
});

function desbloquearAudioP(av) { desbloquearAudioCore(); var b = document.getElementById("btnUnlockAudioP"); if (b) b.style.display = "none"; if (av) { mxBeep(880, 90); mxHablar("Audio de pista y delta al oido activados", vozP); } }
function toggleVozP() { desbloquearAudioP(false); vozP = !vozP; var b = document.getElementById("btnVozP"); b.textContent = vozP ? "Voz ON" : "Voz OFF"; b.style.background = vozP ? "#20c997" : "#444"; }
function abrirBolsillo() { desbloquearAudioP(false); document.getElementById("bolsillo").style.display = "flex"; try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){}); } catch (e) {} }
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

function salirPiloto() {
  mxGar.cerrarCamaras(); if (_esRoot) try { _esRoot.close(); } catch (e) {}
  var yo = (rootCache.pilotos || {})[uid];
  var op = (yo && yo.vueltas > 0) ? fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: false, tsActivo: 0 }) }) : fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE" });
  op.catch(function(){}).finally(function(){ localStorage.removeItem("mxp_uid"); location.href = "index.html"; });
}

function ayudaTab() {
  var g = {
    sala: "SALA PISTA:\n1. Toca el boton amarillo para activar audio, Delta al oido y aviso LiPo (12 min).\n2. SOPORTE EN EMISORA: si no tienes mecanico, coloca tu movil en un soporte sobre la emisora para ver tiempos, placa dorsal, destellos de record y banderas (☀️ al sol).\n3. 🔒 BOLSILLO: bloquea la pantalla 2s para rodar con el movil guardado.\n4. MODO AMISTOSO: si ruedas sin Direccion en pista local puedes calibrar o lanzar Warm-Up / Salida 30s / Valla MX.",
    garaje: "GARAJE PRO (MS6X):\n1. Elige MX Tierra o SM Supermoto y guarda tu reglaje completo (incluido MS6X).\n2. Haz 4 fotos en directo con la camara.\n3. Captura de Colores: tonos reales + Recorte automatico + 🪄 Varita Magica.\n4. Pulsa 🌍 PUBLICAR EN PADDOCK MUNDIAL.",
    tiempos: "TIEMPOS Y BACKUP:\n1. Estadisticas globales, Campeonato MXGP del dia y Podio PNG.\n2. Duelos 1 vs 1 viendo moto y reglaje rival.\n3. Tarjeta PNG diaria con foto de tu moto y 📤/📥 BACKUP."
  };
  alert(g[_tabAct] || g.sala);
}
function verTab(t) {
  _tabAct = t; if (t !== "garaje") mxGar.cerrarCamaras();
  ["sala", "garaje", "tiempos"].forEach(function(x){ document.getElementById("sec_" + x).style.display = (x === t) ? "block" : "none"; });
  document.getElementById("tSala").className = "tab" + (t === "sala" ? " act" : "");
  document.getElementById("tGar").className = "tab" + (t === "garaje" ? " act" : "");
  document.getElementById("tTmp").className = "tab" + (t === "tiempos" ? " act" : "");
  if (t === "garaje") mxGar.pintarGaraje();
  if (t === "tiempos") mxGar.pintarTiempos();
}

function verFotoFinish() {
  document.getElementById("modalFf").style.display = "flex"; document.getElementById("txtFfInfo").textContent = "Cargando ultimo Foto-Finish..."; document.getElementById("imgFf").src = "";
  var pils = rootCache.pilotos || {};
  fbJson(FB_FF).then(function(ff) {
    if (!ff || !ff.img) { document.getElementById("txtFfInfo").textContent = "Aun no hay Foto-Finish."; return; }
    document.getElementById("imgFf").src = ff.img;
    var nomP = (ff.pid && pils[ff.pid]) ? pils[ff.pid].nombre : (ff.modo === "TODO" ? "Cualquier moto" : "Paso en meta");
    document.getElementById("txtFfInfo").textContent = (ff.antNom || "Meta") + " • " + nomP + " • " + new Date(ff.ts).toLocaleTimeString("es-ES");
  }).catch(function(){ document.getElementById("txtFfInfo").textContent = "Sin foto."; });
}

function asegurarPilotoLocal(ah) {
  if (!rootCache.pilotos) rootCache.pilotos = {};
  if (!rootCache.pilotos[uid]) {
    var dor = mxGar.getDorsal();
    rootCache.pilotos[uid] = { nombre: miNom, dorsal: dor, vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false, enPista: true, tsActivo: ah || ahoraSrv() };
    fetch(FB + "/pilotos/" + uid + ".json", { method: "PUT", body: JSON.stringify(rootCache.pilotos[uid]) }).catch(function(){});
  }
  return rootCache.pilotos[uid];
}

function inscribirPilotoAuto() {
  var dor = mxGar.getDorsal(); mxGar.subirNube();
  fbJson(FB + "/pilotos/" + uid + ".json").then(function(ex) {
    if (!ex) {
      var nw = { nombre: miNom, dorsal: dor, vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false, enPista: true, tsActivo: ahoraSrv() };
      if (!rootCache.pilotos) rootCache.pilotos = {}; rootCache.pilotos[uid] = nw;
      return fetch(FB + "/pilotos/" + uid + ".json", { method: "PUT", body: JSON.stringify(nw) });
    }
    _ultVtasSinc = Number(ex.vueltas || 0);
    if (!rootCache.pilotos) rootCache.pilotos = {}; rootCache.pilotos[uid] = Object.assign({}, ex, { nombre: miNom, dorsal: dor, enPista: true, tsActivo: ahoraSrv() });
    return fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ nombre: miNom, dorsal: dor, enPista: true, tsActivo: ahoraSrv() }) });
  }).catch(function(){});
}

function cmdSalaAmistosa(est) {
  desbloquearAudioP(false);
  var ants = rootCache.antenas || {}, aks = Object.keys(ants).filter(function(k){ return Math.abs(ahoraSrv() - Number(ants[k].ts || 0)) < 15000; });
  if (est === "WARMUP" && (!aks.length || aks.some(function(k){ return !ants[k].calibrada; }))) {
    mxHablar("Calibra primero la pista vacia antes de iniciar el warm up", vozP);
    alert(!aks.length ? "⚠️ Conecta y calibra primero una antena antes de iniciar el Warm-Up." : "⚠️ Calibra primero la pista vacia antes de iniciar el Warm-Up.");
    return;
  }
  if ((est === "SALIDA_30" || est === "VALLA_MX") && aks.length && aks.some(function(k){ return !ants[k].calibrada; })) { alert("⚠️ Calibra primero la pista vacia."); return; }
  avisoFinManga = false; avisoLipoP = false; _bombaExplotada = false; _ultRondaElim = 0; _ultRondaRuleta = 0; ultSegSemP = -99; _ultSecWuP = -1; _wuFinAvisoP = false; _salidaShowHasta = 0;
  var ahCmd = ahoraSrv();
  var pay = { estado: est, tsInicio: 0, tsCuenta: 0, ruleta: null };
  if (est === "WARMUP") { pay.tsInicio = ahCmd + 180000; mxHablar("Atencion pilotos, llamada a pista, comienza el warm up de 3 minutos", vozP); }
  if (est === "SALIDA_30") {
    pay.tsCuenta = ahCmd + 30000; pay.tsInicio = pay.tsCuenta;
    mxHablar("Atencion pilotos, llamada a parrilla, treinta segundos para la salida", vozP);
  }
  if (est === "VALLA_MX") {
    pay.tsCuenta = ahCmd + 30000;
    pay.tsInicio = pay.tsCuenta - 4000 + Math.floor(Math.random() * 5000);
    mxHablar("Atencion pilotos, llamada a parrilla, treinta segundos para la salida", vozP);
  }
  if (est === "SALIDA_30" || est === "VALLA_MX") {
    Object.keys(rootCache.pilotos || {}).forEach(function(k){ rootCache.pilotos[k].tsUltimoPaso = 0; });
  }
  if (est === "ESPERA") { pay.tsInicio = 0; mxHablar("Manga detenida", vozP); }
  if (!rootCache.sala) rootCache.sala = {};
  Object.assign(rootCache.sala, pay);
  actualizarSemaforoP();
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(pay) }).catch(function(){});
}
function calibrarConCuenta10() {
  desbloquearAudioP(false); if (_tCal10) return;
  var s = 10, b = document.getElementById("btnCalAmistosa"), ants = rootCache.antenas || {};
  mxHablar("Coloca el movil en meta y retirate, calibrando en 10 segundos", vozP);
  _tCal10 = setInterval(function() {
    if (b) b.textContent = "⏳ CALIBRANDO EN " + s + "s..."; if (s <= 5 && s >= 1) mxHablar(String(s), vozP);
    if (s <= 0) {
      clearInterval(_tCal10); _tCal10 = null;
      var aks = Object.keys(ants).filter(function(k){ return Math.abs(ahoraSrv() - Number(ants[k].ts || 0)) < 15000; }); if (!aks.length) aks = ["ant_1"];
      aks.forEach(function(aid, ix){ setTimeout(function(){ fetch(FB + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: aid, calibrar: true }) }).catch(function(){}); }, ix * 800); });
      if (b) { b.textContent = "✅ PISTA CALIBRADA OK"; b.style.background = "#20c997"; }
      mxHablar("Pista vacia calibrada", vozP);
    }
    s--;
  }, 1000);
}

function registrarVuelta(pUid, evTs, esManual) {
  var ah = Number(evTs || ahoraSrv());
  var p = (pUid === uid) ? asegurarPilotoLocal(ah) : (rootCache.pilotos || {})[pUid];
  if (!p) return;
  if (p.eliminado) {
    if (esManual) document.getElementById("lblDeltaVivo").innerHTML = "<span style='color:#ff4d5e'>💀 Eliminado en esta manga</span>";
    return;
  }
  var s = rootCache.sala || {}, st = s.estado || "ESPERA", dirOn = (s.dirTs && Math.abs(ah - Number(s.dirTs)) < 30000);
  if (st === "RADAR") return;
  var minMs = esManual ? 900 : (Number(s.minLapSec || 5)) * 1000;
  if (_lockVtaLocal[pUid] && (ah - _lockVtaLocal[pUid]) < minMs) return;

  var enCuentaSalida = (st === "SALIDA_30" || st === "VALLA_MX") && (!Number(s.tsInicio || 0) || ah < Number(s.tsInicio));
  if (st === "WARMUP" || st === "TEST" || enCuentaSalida || (st === "ESPERA" && !esManual)) {
    if (esManual && enCuentaSalida) {
      document.getElementById("lblDeltaVivo").innerHTML = "<span style='color:#ffc107'>⏳ Espera a que se de la salida</span>";
      mxHablar("Espera a que se de la salida", vozP);
      return;
    }
    _lockVtaLocal[pUid] = ah; p.sensorOk = true;
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ sensorOk: true }) }).catch(function(){});
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ ultPasoTs: ah, ultPasoTxt: p.nombre + " (Prueba OK)" }) }).catch(function(){});
    if (pUid === uid) mxHablar("Paso de prueba detectado", vozP);
    pintarSalaUI(); return;
  }

  if (st === "ESPERA" && esManual) {
    if (dirOn) {
      document.getElementById("lblDeltaVivo").innerHTML = "<span style='color:#ffc107'>⏳ Espera a que Direccion lance la salida</span>";
      mxHablar("Espera a que Direccion lance la salida", vozP);
      return;
    }
    _lockVtaLocal[pUid] = ah;
    s.estado = "EN_CURSO"; s.tsInicio = ah; p.tsUltimoPaso = ah;
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO", tsInicio: ah }) }).catch(function(){});
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ tsUltimoPaso: ah, enPista: true, tsActivo: ah }) }).catch(function(){});
    document.getElementById("lblDeltaVivo").innerHTML = "<span style='color:#20c997'>⏱️ Crono iniciado — ¡A rodar!</span>";
    mxBeep(940, 110); mxHablar("Crono iniciado", vozP);
    pintarSalaUI(); return;
  }

  var ult = Number(p.tsUltimoPaso || 0);
  if (ult && s.tsInicio && ult < Number(s.tsInicio)) ult = 0;
  if (ult && (ah - ult) < minMs) return;
  _lockVtaLocal[pUid] = ah;

  var baseT = ult || Number(s.tsInicio || 0) || ah, lap = ah - baseT;
  if (lap < (esManual ? 900 : 1500)) {
    p.tsUltimoPaso = ah;
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ tsUltimoPaso: ah, enPista: true, tsActivo: ah }) }).catch(function(){});
    if (esManual) {
      document.getElementById("lblDeltaVivo").innerHTML = "<span style='color:#20c997'>⏱️ Crono en marcha</span>";
      mxBeep(940, 90);
    }
    return;
  }

  var v = (p.vueltas || 0) + 1, mej = (!p.mejorMs || lap < p.mejorMs) ? lap : p.mejorMs;
  var heatTag = Number(s.tsInicio || 0) || "free", lk = pUid + "_" + heatTag + "_v" + v;

  var aplicarPaso = function() {
    p.tsUltimoPaso = ah; p.vueltas = v; p.ultimaMs = lap; p.mejorMs = mej;
    if (pUid === uid && _ultLapSinc !== ah) {
      _ultLapSinc = ah; _ultVtasSinc = v; _bombaExplotada = false;
      mxGar.procesarMiVuelta(lap, mej, ordenarPilotos(rootCache.pilotos, s), "lblDeltaVivo", "deltaBol");
    }
    _lastSalaSig = "";
    pintarSalaUI();
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify({ vueltas: v, ultimaMs: lap, mejorMs: mej, tsUltimoPaso: ah, enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
    var patchS = { ultPasoTs: ah, ultPasoTxt: p.nombre + " #" + (p.dorsal || "1") + " (" + fmt(mej) + ")" };
    if (!s.hotlapMs || lap < Number(s.hotlapMs)) { patchS.hotlapMs = lap; patchS.hotlapTxt = p.nombre + " — " + fmt(lap); }
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify(patchS) }).catch(function(){});
  };

  if (esManual) {
    aplicarPaso();
    fetch(FB + "/pasos_lock/" + lk + ".json", { method: "PUT", body: JSON.stringify({ ok: true, ts: ah }) }).catch(function(){});
  } else {
    fbJson(FB + "/pasos_lock/" + lk + ".json").then(function(ex) {
      if (ex && ex.ok) return;
      return fbJson(FB + "/pasos_lock/" + lk + ".json", { method: "PUT", body: JSON.stringify({ ok: true, ts: ah }) }).then(aplicarPaso);
    }).catch(function(){});
  }
}
function sumarVueltaManual() { desbloquearAudioP(false); registrarVuelta(uid, ahoraSrv(), true); }

function manejarEventoAntena(ev) {
  if (!ev || !ev.ts || !ev.antId || _ultEvP[ev.antId] === ev.ts) return;
  _ultEvP[ev.antId] = ev.ts;
  if (Math.abs(ahoraSrv() - Number(ev.ts)) < 6000) {
    var s = rootCache.sala || {};
    if (s.estado === "RADAR") return;
    var md = s.modoDet || "TODO";
    if (md !== "TODO" && !ev.pilotoUid) return;
    var dirOn = (s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 30000);
    var pils = ordenarPilotos(rootCache.pilotos, s), target = ev.pilotoUid || (pils.length ? pils[0].id : uid);
    if (target === uid || !dirOn) registrarVuelta(target, Number(ev.ts), false);
  }
}

function pintarAntStatusP() {
  var ants = rootCache.antenas || {}, ah = ahoraSrv();
  var aks = Object.keys(ants).filter(function(k){ return Math.abs(ah - Number(ants[k].ts || 0)) < 15000; });
  var lA = document.getElementById("lblAntVivo");
  lA.textContent = aks.length ? ("📡 ANTENAS: " + aks.length + " CONECTADA(S) ✓") : "📡 ANTENAS: DESCONECTADAS";
  lA.style.color = aks.length ? "#00e676" : "#ff4d5e";
}

function renderSwatches(g) {
  var cs = (g && Array.isArray(g.colores)) ? g.colores.slice(0, 3) : [];
  return cs.map(function(c){ return '<span class="mx-sw" style="background:' + esc(c.hex || "#fff") + '"></span>'; }).join("");
}

function actualizarSemaforoP() {
  var s = rootCache.sala || {}, est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), ah = ahoraSrv();
  aplicarBanderaUI(s, "banBanderaAmP");
  var ov = document.getElementById("overlaySem"), nowLoc = Date.now(), dirOn = (s.dirTs && Math.abs(ah - Number(s.dirTs)) < 30000);

  if (est === "WARMUP" && t0 > 0) {
    var dfW = t0 - ah, sgW = Math.max(0, Math.ceil(dfW / 1000));
    if (dfW > 0 && sgW !== _ultSecWuP) {
      _ultSecWuP = sgW; _wuFinAvisoP = false;
      var mW = Math.floor(sgW / 60), sW = sgW % 60, mmss = (mW < 10 ? "0" : "") + mW + ":" + (sW < 10 ? "0" : "") + sW;
      document.getElementById("lblEstadoSala").textContent = "WARM-UP " + mmss;
      document.getElementById("vivoReloj").textContent = "🔥 " + mmss;
      var rbW = document.getElementById("relBol"); if (rbW) rbW.textContent = "🔥 " + mmss;
      if (!dirOn) {
        if (sgW === 60) mxHablar("Ultimo minuto de warm-up", vozP);
        else if (sgW === 30) mxHablar("Treinta segundos de warm-up", vozP);
        else if (sgW === 10) mxHablar("Diez segundos para fin de warm-up", vozP);
      }
    } else if (dfW <= 0 && !_wuFinAvisoP) {
      _wuFinAvisoP = true; _ultSecWuP = 0;
      if (!dirOn) {
        mxBeep(980, 220);
        mxHablar("Fin de warm-up. Atencion pilotos, llamada a parrilla de salida", vozP);
        s.estado = "ESPERA"; s.tsInicio = 0;
        fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0 }) }).catch(function(){});
      }
    }
  } else {
    _ultSecWuP = -1;
  }

  if (est === "ESPERA" || est === "WARMUP" || est === "TEST" || est === "RADAR") { _salidaShowHasta = 0; ultSegSemP = -99; }

  if ((est === "SALIDA_30" || est === "VALLA_MX") && t0 > 0) {
    var df = t0 - ah, tCue = Number(s.tsCuenta || 0) || t0, dfCue = tCue - ah, sgCue = Math.ceil(dfCue / 1000);
    var leds = document.getElementById("semLeds"), gBox = document.getElementById("gateBox"), gBar = document.getElementById("gateBar");
    if (df > 0 && dfCue <= 31000) {
      ov.style.display = "flex";
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
      if (sgCue !== ultSegSemP) {
        ultSegSemP = sgCue;
        if (!dirOn) {
          if (est === "VALLA_MX") {
            if (sgCue === 20) mxHablar("Quedan veinte segundos", vozP);
            else if (sgCue <= 10 && sgCue >= 5) mxHablar(String(sgCue), vozP);
          } else {
            if (sgCue === 20) mxHablar("Quedan veinte segundos", vozP);
            else if (sgCue === 10) mxHablar("Diez segundos", vozP);
            else if (sgCue <= 5 && sgCue >= 1) mxHablar(String(sgCue), vozP);
          }
        }
      }
    } else if (df <= 0 && (ultSegSemP !== -999 || nowLoc < _salidaShowHasta)) {
      if (ultSegSemP !== -999) {
        ultSegSemP = -999; _salidaShowHasta = (df > -4000) ? (nowLoc + 1800) : 0;
        if (_salidaShowHasta) { mxBeep(1100, 260); if (!dirOn) mxHablar("¡SALIDA!", vozP); }
        if (!dirOn) { s.estado = "EN_CURSO"; fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO" }) }).catch(function(){}); }
      }
      if (nowLoc < _salidaShowHasta) {
        ov.style.display = "flex"; ov.style.background = "#00c853";
        document.getElementById("numSem").textContent = "¡SALIDA!"; document.getElementById("txtSem").textContent = (est === "VALLA_MX") ? "¡VALLA ABAJO!" : "A TOPE";
        if (est === "VALLA_MX") gBar.classList.add("drop");
        else { var ls2 = leds.children; for (var li2 = 0; li2 < ls2.length; li2++) ls2[li2].className = "sem-led go"; }
      } else if (ov.style.display !== "none") {
        ov.style.display = "none";
      }
    } else if (nowLoc >= _salidaShowHasta) {
      if (ov.style.display !== "none") ov.style.display = "none";
    }
  } else if (est === "EN_CURSO" && ultSegSemP >= -5 && ultSegSemP !== -999 && t0 > 0 && ah >= t0 && (ah - t0) < 2500) {
    ultSegSemP = -999; _salidaShowHasta = nowLoc + 1800; mxBeep(1100, 260);
    ov.style.display = "flex"; ov.style.background = "#00c853";
    document.getElementById("numSem").textContent = "¡SALIDA!"; document.getElementById("txtSem").textContent = "A TOPE";
  } else if (nowLoc >= _salidaShowHasta) {
    if (ov.style.display !== "none") ov.style.display = "none";
  }
}

function actualizarCuentaMangaP() {
  var s = rootCache.sala || {}, inicio = Number(s.tsInicio || 0), duracion = Number(s.duracionMin || 0);
  if (s.estado !== "EN_CURSO" || inicio <= 0 || duracion <= 0) return;
  var restante = inicio + duracion * 60000 - ahoraSrv(), texto = restante > 0 ? ("MANGA " + fmtCuentaRegresivaManga(restante)) : "FIN MANGA";
  var lbl = document.getElementById("lblEstadoSala");
  if (lbl.textContent !== texto) lbl.textContent = texto;
  if (restante <= 0 && !avisoFinManga) {
    avisoFinManga = true;
    var dirOn = s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 30000;
    if (!dirOn) mxHablar("Tiempo de manga cumplido, bandera a cuadros", vozP);
  }
}

function pintarSalaUI() {
  var s = rootCache.sala || {}, pObj = rootCache.pilotos || {}, gar = rootCache.garaje || {}, ah = ahoraSrv();
  pintarAntStatusP();
  if (pObj[uid]) {
    var vAct = Number(pObj[uid].vueltas || 0), lAct = Number(pObj[uid].ultimaMs || 0), tsP = Number(pObj[uid].tsUltimoPaso || 0);
    if (_ultVtasSinc >= 0 && vAct > _ultVtasSinc && lAct > 0 && tsP !== _ultLapSinc) {
      _ultLapSinc = tsP; _bombaExplotada = false;
      mxGar.procesarMiVuelta(lAct, Number(pObj[uid].mejorMs || lAct), ordenarPilotos(pObj, s), "lblDeltaVivo", "deltaBol");
    }
    _ultVtasSinc = vAct;
  }

  var dirOn = (s.dirTs && Math.abs(ah - Number(s.dirTs)) < 30000);
  document.getElementById("boxAmistosa").style.display = (!dirOn) ? "block" : "none";
  aplicarBanderaUI(s, "banBanderaAmP");

  var modTxt = { NORMAL: "CARRERA NORMAL", BOMBA: "💣 BOMBA RELOJ (45s)", ELIM: "💀 ELIMINACION (60s)", REY: "👑 REY DE LA PISTA", SUPERPOLE: "⏱️ SUPERPOLE (1 VUELTA)", RULETA: "🎲 RULETA LOCA MX" };
  document.getElementById("lblModoSala").textContent = "MODO: " + (modTxt[s.modoJuego || "NORMAL"] || "NORMAL");

  var brul = document.getElementById("banRuleta");
  if ((s.modoJuego === "RULETA") && s.ruleta && s.ruleta.texto) {
    brul.style.display = "block"; brul.textContent = "🎲 " + s.ruleta.texto;
    if (s.ruleta.ronda && s.ruleta.ronda !== _ultRondaRuleta) { _ultRondaRuleta = s.ruleta.ronda; mxBeep(660, 200); mxHablar(s.ruleta.voz || s.ruleta.texto, vozP); }
  } else brul.style.display = "none";

  if (s.megafonia && s.megafonia.id && s.megafonia.id !== _ultMegaIdP) {
    _ultMegaIdP = s.megafonia.id;
    if (Math.abs(ah - Number(s.megafonia.ts || 0)) < 10000 && (!s.megafonia.destinoUid || s.megafonia.destinoUid === uid)) {
      if (s.megafonia.beep) mxBeep(900, 140); if (s.megafonia.texto) mxHablar(s.megafonia.texto, vozP);
    }
  }
  var br = document.getElementById("banReacVivo");
  if (s.reaccion && (ah - Number(s.reaccion.ts || 0)) < 8000) {
    var rc = s.reaccion, esM = (rc.destinoUid && rc.destinoUid === uid);
    br.style.display = "block"; br.textContent = (esM ? "💌 PARA TI — " : "📣 ") + rc.autor + (rc.destinoNom ? (" ➔ " + rc.destinoNom) : "") + ": " + rc.texto;
    if (rc.ts !== _ultReacTsP) { _ultReacTsP = rc.ts; if (esM) { mxBeep(980, 130); mxHablar("Mensaje del publico de " + rc.autor + ": " + rc.texto, vozP); } }
  } else br.style.display = "none";

  var pils = ordenarPilotos(pObj, s);
  var sig = pils.map(function(p){ return p.id + ":" + p.vueltas + ":" + p.mejorMs + ":" + p.activo + ":" + p.eliminado; }).join("|");
  if (sig !== _lastSalaSig) {
    _lastSalaSig = sig;
    var actCnt = 0, h = "", bestAll = pils.length ? Math.min.apply(null, pils.map(function(x){ return x.mejorMs || 9e9; })) : 9e9;
    pils.forEach(function(p, ix) {
      if (p.activo) actCnt++;
      if (p.id === uid) document.getElementById("vivoPos").textContent = p.eliminado ? "💀 ELIM" : ((ix + 1) + "º / " + pils.length);
      var g = gar[p.id] || {}, pl = '<span class="mx-plate' + (g.disc === "SM" ? " sm" : "") + '">#' + esc(p.dorsal || '--') + '</span>', sw = renderSwatches(g);
      var clsTime = (p.mejorMs && p.mejorMs === bestAll) ? "tv-vr" : "tv-rp";
      h += '<div class="fila' + (p.id === uid ? ' yo' : '') + (p.eliminado ? ' elim' : '') + '"><span>' + (p.activo ? "🟢" : "⚪") + ' <b>' + (ix + 1) + 'º</b> ' + pl + sw + '<b>' + esc(p.nombre) + '</b> (' + (p.vueltas || 0) + 'v' + (p.sensorOk ? ' ✓' : '') + (p.eliminado ? ' 💀' : '') + ')</span><b class="' + clsTime + '">' + fmt(p.mejorMs) + '</b></div>';
    });
    var lStat = document.getElementById("lblPistaStatus");
    lStat.style.color = actCnt > 0 ? "#20c997" : "#888";
    lStat.textContent = actCnt > 0 ? ("🟢 " + actCnt + (actCnt === 1 ? " PILOTO EN PISTA" : " PILOTOS EN PISTA")) : "⚪ PISTA VACIA (0 PILOTOS)";
    document.getElementById("listaSala").innerHTML = h || "No hay pilotos rodando ahora mismo.";
  }

  var est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), estTxt = (est === "RADAR") ? ("📡 RADAR (" + (s.radarDist || 10) + "m)") : est;
  if (est === "EN_CURSO" && t0 > 0) {
    var elapsed = ah - t0;
    if (s.modoJuego === "ELIM" && !dirOn) {
      var rE = Math.floor(elapsed / 60000);
      if (rE > _ultRondaElim && rE >= 1) { _ultRondaElim = rE; var act = pils.filter(function(x){ return !x.eliminado; }); if (act.length > 1) { var uP = act[act.length - 1]; fetch(FB + "/pilotos/" + uP.id + ".json", { method: "PATCH", body: JSON.stringify({ eliminado: true }) }).catch(function(){}); mxHablar("Eliminado: " + uP.nombre, vozP); } }
    }
    if (Number(s.duracionMin || 0) > 0) {
      var rem = t0 + Number(s.duracionMin) * 60000 - ah;
      if (rem > 0) estTxt = "MANGA " + fmtCuentaRegresivaManga(rem);
      else { estTxt = "FIN MANGA"; if (!avisoFinManga) { avisoFinManga = true; if (!dirOn) mxHablar("Tiempo de manga cumplido, bandera a cuadros", vozP); } }
    }
  }
  if (est !== "WARMUP") document.getElementById("lblEstadoSala").textContent = estTxt;
  actualizarSemaforoP();
}

function conectarSseUnico() {
  if (_esRoot) try { _esRoot.close(); } catch (e) {}
  try {
    _esRoot = new EventSource(FB + ".json");
    var onSse = function(e) {
      try {
        var m = JSON.parse(e.data); if (!m || !m.path) return;
        applySsePatch(rootCache, m.path, m.data, e.type === "put");
        if (m.path.indexOf("/antenas") === 0) { pintarAntStatusP(); return; }
        Object.keys(rootCache.eventos || {}).forEach(function(aid){ manejarEventoAntena(rootCache.eventos[aid]); });
        pintarSalaUI(); if (_tabAct === "tiempos") mxGar.pintarTiempos();
      } catch (er) {}
    };
    _esRoot.addEventListener("put", onSse); _esRoot.addEventListener("patch", onSse);
    _esRoot.onerror = function(){ if (_esRoot && _esRoot.readyState === 2) setTimeout(conectarSseUnico, 2500); };
  } catch (e) {}
}

mxGar.init({
  uid: uid, circId: circId, circNom: circNom, fbCirc: FB, allowEditNom: false,
  getNom: function(){ return miNom; }, getRoot: function(){ return rootCache; },
  isDirSilent: function(){ var s = rootCache.sala || {}; return !!(s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 30000); },
  getCircMeta: function(){ return circMeta; }, onSpeak: function(t){ mxHablar(t, vozP); }
});
inscribirPilotoAuto();
conectarSseUnico();

setInterval(function(){ fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){}); }, 7000);
setInterval(function() {
  fbJson(FB + ".json?t=" + Date.now()).then(function(r) {
    if (!r) return;
    rootCache = { sala: r.sala || {}, antenas: r.antenas || {}, pilotos: r.pilotos || {}, garaje: r.garaje || {}, campeonato: r.campeonato || {}, eventos: r.eventos || {} };
    Object.keys(rootCache.eventos).forEach(function(aid){ manejarEventoAntena(rootCache.eventos[aid]); });
    pintarSalaUI(); if (_tabAct === "tiempos") mxGar.pintarTiempos();
  }).catch(function(){});
}, 4500);

setInterval(function() {
  actualizarSemaforoP();
  actualizarCuentaMangaP();
  var s = rootCache.sala || {}, yo = (rootCache.pilotos || {})[uid] || {};
  var tIni = Number(s.tsInicio || 0), tPaso = Number(yo.tsUltimoPaso || 0);
  var b = (tPaso && (!tIni || tPaso >= tIni)) ? tPaso : tIni;
  var el = document.getElementById("vivoReloj"), rb = document.getElementById("relBol"), barL = document.getElementById("barLipoP"), lblL = document.getElementById("lblLipoP");
  if (s.tsInicio && s.estado === "EN_CURSO" && barL && lblL) {
    var minL = Math.max(0, (ahoraSrv() - Number(s.tsInicio)) / 60000), pctL = Math.min(100, Math.round((minL / 12) * 100));
    barL.style.width = pctL + "%"; barL.style.background = minL >= 11 ? "#ff4d5e" : (minL >= 8.5 ? "#ffa94d" : "#20c997");
    lblL.textContent = minL.toFixed(1) + "m / 12m";
  } else if (barL && lblL) { barL.style.width = "0%"; lblL.textContent = "0m / 12m"; }
  if (s.estado === "WARMUP" && tIni > 0) return;
  if (s.estado !== "EN_CURSO" || !b || ahoraSrv() < b) { el.textContent = "00.0s"; if (rb) rb.textContent = "EN ESPERA"; return; }
  if (yo.eliminado) { el.textContent = "💀 ELIMINADO"; if (rb) rb.textContent = "💀 ELIM"; return; }
  var d = (ahoraSrv() - b) / 1000, mj = s.modoJuego || "NORMAL";
  if (mj === "BOMBA" && s.estado === "EN_CURSO") {
    var rB = Math.max(0, 45 - d); el.textContent = rB <= 0 ? "💥 ¡BOOM!" : ("💣 " + rB.toFixed(1) + "s"); if (rb) rb.textContent = el.textContent;
    if (rB <= 0 && !_bombaExplotada) { _bombaExplotada = true; mxBeep(280, 450); mxHablar("Bomba explotada, cruza meta", vozP); }
  } else if (mj === "ELIM" && s.estado === "EN_CURSO") {
    el.textContent = "💀 " + (60 - ((ahoraSrv() - Number(s.tsInicio || b)) / 1000) % 60).toFixed(1) + "s"; if (rb) rb.textContent = el.textContent;
  } else { var txtC = fmtCrono(d); el.textContent = txtC; if (rb) rb.textContent = txtC; }
  if (s.tsInicio && (ahoraSrv() - Number(s.tsInicio)) >= 720000 && !avisoLipoP) { avisoLipoP = true; mxHablar("Llevas 12 minutos rodando, revisa bateria LiPo", vozP); }
}, 120);