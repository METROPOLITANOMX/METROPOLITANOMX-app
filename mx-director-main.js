var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var FB = FB_ROOT + "/circuitos/" + circId;
var FB_IMG = FB_ROOT + "/antenas_img/" + circId;
var FB_WU = FB_ROOT + "/warmup_capturas/" + circId;
var FB_FF = FB_ROOT + "/foto_finish/" + circId + ".json";

var dirSessionId = sessionStorage.getItem("mxp_dir_sess");
if (!dirSessionId) { dirSessionId = "ds_" + Math.random().toString(36).slice(2, 9); sessionStorage.setItem("mxp_dir_sess", dirSessionId); }

var uid = localStorage.getItem("mxp_uid") || "director";
var miNom = localStorage.getItem("mxp_nom") || "Director MX";
localStorage.setItem("mxp_uid", uid); localStorage.setItem("mxp_nom", miNom);
document.getElementById("txtCircDir").textContent = "🏁 " + circNom;

var esDirOk = (localStorage.getItem("mxp_dir_ok") === "1");
var _directorBloqueadoRol = localStorage.getItem("mxp_inst_role") !== "DIRECCION";
var dirPilotoOn = false;
localStorage.removeItem("mxp_dir_piloto");
var rootCache = { sala: {}, antenas: {}, pilotos: {}, garaje: {}, campeonato: {}, eventos: {} };
var warmupCaps = {}, perfilesCam = {}, circMeta = { metros: 200, factor: 1.0 };
var testOn = false, _slidersLocked = true, _tabDir = "control", _dirIniciado = false;
var _ultEvD = {}, _ultCruceAntD = {}, _lockVtaD = {}, _ultRondaElim = 0, _ultRondaRuleta = 0, _ultMovida = {};
var _tCalAmbas = null, _esRoot = null, _esImg1 = null, _esImg2 = null, _esWu = null;
var _roiInit = false, _recogMicro = null, _escuchandoMicro = false;
var _ultVtasSinc = -1, _ultLapSinc = 0, _bombaExplotada = false, avisoLipoP = false, avisoFinManga = false;
var _ultSecLoc = -999, _ultSecWu = -1, _wuFinAviso = false, _salidaShowHasta = 0, _ultReacTsP = 0, _lastWuSig = "", _lastPilSig = "";

fetch(FB_ROOT + "/circuitos_lista/" + circId + ".json").then(function(r){ return r.ok ? r.json() : null; }).then(function(c){
  if (c) { if (Number(c.metros) > 0) circMeta.metros = Number(c.metros); if (Number(c.factor) > 0) circMeta.factor = Number(c.factor); }
}).catch(function(){});

activarWakeLock();
window.addEventListener("beforeunload", function() {
  if (_dirIniciado && rootCache.sala && rootCache.sala.dirSession === dirSessionId) fetch(FB + "/sala.json", { method: "PATCH", keepalive: true, body: JSON.stringify({ dirSession: "", dirTs: 0 }) }).catch(function(){});
  if (dirPilotoOn) {
    var yo = (rootCache.pilotos || {})[uid];
    if (yo && !(yo.vueltas > 0)) fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
    else fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", keepalive: true, body: JSON.stringify({ enPista: false, tsActivo: 0 }) }).catch(function(){});
  }
});

function toggleAcc(id) {
  var el = document.getElementById(id), ar = document.getElementById("arw_" + id), open = (el.style.display === "none");
  el.style.display = open ? "block" : "none"; if (ar) ar.textContent = open ? "▼" : "▶";
  if (id === "acc_wu" && open) refrescarWarmupManual();
}

function desbloquearAudioD(av) { desbloquearAudioCore(); if (av) { mxBeep(880, 90); mxHablar("Audio activado"); } }
function salirDirector() {
  mxGar.cerrarCamaras(); [_esRoot, _esImg1, _esImg2, _esWu].forEach(function(es){ if (es) try { es.close(); } catch (e) {} });
  var ops = [fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ dirSession: "", dirTs: 0 }) }).catch(function(){})];
  if (dirPilotoOn) {
    var yo = (rootCache.pilotos || {})[uid];
    if (yo && !(yo.vueltas > 0)) ops.push(fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE" }).catch(function(){}));
    else ops.push(fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: false, tsActivo: 0 }) }).catch(function(){}));
  }
  Promise.all(ops).finally(function(){ localStorage.removeItem("mxp_dir_ok"); location.href = "index.html"; });
}
function ayudaDir() {
  alert("DIRECCION PRO:\n1. Revisa la lista de estado antes de empezar: antenas, luz, calibracion, parrilla y firmas.\n2. En el laboratorio puedes ver las dos camaras, ajustar sus areas de paso y calibrarlas; la señal permanece activa durante la calibracion. Pulsa TEST VIVO para activar o detener la imagen cuando quieras.\n3. Sensibilidad, color, contraste, luz y orientacion se ajustan por separado; en interior deja el control de viento en OFF.\n4. WARM-UP dura 3 minutos y al terminar llama a los pilotos a parrilla. VALLA MX es la unica salida de Direccion y baja en un momento aleatorio.\n5. Agrupa banderas y avisos de pista en un solo bloque. La megafonia acepta voz o texto; RADAR mide entre las dos camaras.");
}

function aplicarModoDirPilotoUI(limpiarUid) {
  var b = document.getElementById("btnDirPiloto"), tb = document.getElementById("tabsDirPiloto"), br = document.getElementById("badgeRangoDir");
  if (dirPilotoOn) {
    b.textContent = "🟢 DIR-PILOTO: ON"; b.style.background = "#20c997"; b.style.color = "#000"; tb.style.display = "flex"; br.style.display = "inline-block";
    inscribirDirPiloto(); mxGar.actualizarRango();
  } else {
    b.textContent = "🏍️ DIR-PILOTO: OFF"; b.style.background = "#2b2b2b"; b.style.color = "#ffc107"; tb.style.display = "none"; br.style.display = "none";
    verTabDir("control");
    fetch(FB + "/pilotos/director.json", { method: "DELETE" }).catch(function(){});
    if (rootCache.pilotos && rootCache.pilotos.director) delete rootCache.pilotos.director;
    if (limpiarUid && uid && uid !== "director") {
      fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE" }).catch(function(){});
      if (rootCache.pilotos) delete rootCache.pilotos[uid];
    }
  }
}
function toggleDirPiloto() {
  dirPilotoOn = !dirPilotoOn;
  aplicarModoDirPilotoUI(!dirPilotoOn);
  _lastPilSig = "";
  pintarDirUI();
}
function verTabDir(t) {
  _tabDir = t; if (t !== "garaje") mxGar.cerrarCamaras();
  ["control", "pista", "garaje", "tiempos"].forEach(function(x){ document.getElementById("secDir_" + x).style.display = (x === t) ? "block" : "none"; });
  document.getElementById("tdControl").className = "tab" + (t === "control" ? " act" : "");
  document.getElementById("tdPista").className = "tab" + (t === "pista" ? " act" : "");
  document.getElementById("tdGaraje").className = "tab" + (t === "garaje" ? " act" : "");
  document.getElementById("tdTiempos").className = "tab" + (t === "tiempos" ? " act" : "");
  if (t === "garaje") mxGar.pintarGaraje(); if (t === "tiempos") mxGar.pintarTiempos();
}
function inscribirDirPiloto() {
  if (!dirPilotoOn) return; var dor = mxGar.getDorsal(); mxGar.subirNube();
  fbJson(FB + "/pilotos/" + uid + ".json").then(function(ex) {
    if (!ex) return fetch(FB + "/pilotos/" + uid + ".json", { method: "PUT", body: JSON.stringify({ nombre: miNom, dorsal: dor, vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false, enPista: true, tsActivo: ahoraSrv() }) });
    _ultVtasSinc = Number(ex.vueltas || 0);
    return fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ nombre: miNom, dorsal: dor, enPista: true, tsActivo: ahoraSrv() }) });
  }).catch(function(){});
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

function pintarDirUI() {
  var s = rootCache.sala || {}, pils = ordenarPilotos(rootCache.pilotos, s), gar = rootCache.garaje || {}, ah = ahoraSrv();
  var antsAct = pintarAntenasTel();
  aplicarBanderaUI(s, "banBanderaAmDir");
  if ((s.estado || "ESPERA") === "RADAR") {
    var radarKmh = Number(s.radarLastKmh || 0), radarMax = Number(s.radarMaxKmh || 0);
    document.getElementById("lblEstadoGlobDir").textContent = radarKmh > 0
      ? "📡 RADAR: " + radarKmh.toFixed(1) + " km/h · MÁX " + radarMax.toFixed(1) + " km/h"
      : "📡 RADAR (" + (s.radarDist || 10) + "m) · ESPERANDO CÁMARAS";
  }
  else if ((s.estado || "ESPERA") !== "WARMUP") document.getElementById("lblEstadoGlobDir").textContent = (s.estado || "ESPERA") + " • " + (s.modoDet || "TODO");
  var bRad = document.getElementById("btnRadarDir"), elRD = document.getElementById("inpRadarDist"), elRR = document.getElementById("lblRadarResDir"), esRad = (s.estado === "RADAR");
  if (bRad) {
    bRad.textContent = esRad ? "🔴 PARAR RADAR" : "📡 ACTIVAR RADAR";
    bRad.style.background = esRad ? "linear-gradient(180deg,#ff6b6b,#e03131)" : "linear-gradient(180deg,#3bc9db,#0dcaf0)";
    bRad.style.color = esRad ? "#fff" : "#000";
  }
  if (elRD && document.activeElement !== elRD && Number(s.radarDist) > 0) elRD.value = s.radarDist;
  if (elRR) {
    if (s.radarLastTxt) elRR.textContent = s.radarLastTxt;
    else if (!esRad && elRR.textContent.indexOf("Radar activo") >= 0) elRR.textContent = "Velocidad medida: -- km/h";
  }

  var md = s.modoDet || "TODO";
  [["bModTodo", "TODO"], ["bModGar", "GAR"], ["bModWarm", "WARMUP"], ["bModHib", "HIBRIDO"]].forEach(function(par){
    var b = document.getElementById(par[0]), act = (md === par[1] || (par[1] === "GAR" && md === "CAR"));
    b.style.background = act ? "#ffc107" : "#262626"; b.style.color = act ? "#000" : "#fff";
  });
  var ori = s.orientacion || "V";
  document.getElementById("bOriV").style.background = (ori === "V") ? "#0dcaf0" : "#262626"; document.getElementById("bOriV").style.color = (ori === "V") ? "#000" : "#fff";
  document.getElementById("bOriH").style.background = (ori === "H") ? "#0dcaf0" : "#262626"; document.getElementById("bOriH").style.color = (ori === "H") ? "#000" : "#fff";
  var nc = Number(s.nColores || 1);
  [1, 2, 3].forEach(function(n){ var b = document.getElementById("bNCol" + n); b.style.background = (nc === n) ? "#20c997" : "#262626"; b.style.color = (nc === n) ? "#000" : "#fff"; });

  var syncRng = function(id, lbl, val, suf) { if (val && document.activeElement !== document.getElementById(id)) { document.getElementById(id).value = val; document.getElementById(lbl).textContent = val + suf; } };
  syncRng("rngSens", "lblSensDir", s.sensPct, "%");
  syncRng("rngColorPct", "lblColorPctDir", s.colorPct, "%");
  syncRng("rngPxDiff", "lblPxDiffDir", s.pxDiff, "");
  if (s.antiViento && document.activeElement !== document.getElementById("selAntiViento")) document.getElementById("selAntiViento").value = s.antiViento;
  if (typeof s.retardoMs === "number") syncRng("rngRetardo", "lblRetardoDir", s.retardoMs, "ms");
  if (s.perfilLuz && s.perfilLuz.deltaE) syncRng("rngDeltaE", "lblDeltaEDir", s.perfilLuz.deltaE, "");

  if (!_roiInit && s.roi) {
    _roiInit = true;
    ["ant_1", "ant_2"].forEach(function(aid){ var r = s.roi[aid]; if (!r) return; if (r.posX) document.getElementById("pos_" + aid).value = r.posX; if (typeof r.x === "number") document.getElementById("rx_" + aid).value = r.x; if (typeof r.y === "number") document.getElementById("ry_" + aid).value = r.y; if (typeof r.w === "number") document.getElementById("rw_" + aid).value = r.w; if (typeof r.h === "number") document.getElementById("rh_" + aid).value = r.h; });
  }
  previewRoi("ant_1"); previewRoi("ant_2");
  pintarChecklist(antsAct, pils, s);

  var pilSig = pils.map(function(p){ return p.id + ":" + p.vueltas + ":" + p.mejorMs + ":" + p.activo + ":" + p.eliminado; }).join("|");
  if (pilSig !== _lastPilSig) {
    _lastPilSig = pilSig;
    var hPil = "";
    pils.forEach(function(p, ix) {
      if (dirPilotoOn && p.id === uid) document.getElementById("vivoPosP").textContent = p.eliminado ? "💀 ELIM" : ((ix + 1) + "º / " + pils.length);
      var dot = p.activo ? "🟢" : "⚪", g = gar[p.id] || {}, pl = '<span class="mx-plate' + (g.disc === "SM" ? " sm" : "") + '">#' + esc(p.dorsal || "--") + '</span>', sw = renderSwatches(g);
      hPil += '<div class="fila' + (p.id === uid ? ' yo' : '') + (p.eliminado ? ' elim' : '') + '"><span>' + dot + ' <b>' + (ix + 1) + 'º</b> ' + pl + sw + '<b>' + esc(p.nombre) + '</b> (' + (p.vueltas || 0) + 'v)</span><b class="tv-rp">' + fmt(p.mejorMs) + '</b></div>';
    });
    document.getElementById("listaSalaPiloto").innerHTML = hPil || '<div style="color:#777;font-size:12px">Ningun piloto en sala.</div>';
  }

  if (dirPilotoOn) {
    var lA = document.getElementById("lblAntVivoP");
    lA.textContent = antsAct.length ? ("📡 ANTENAS: " + antsAct.length + " CONECTADA(S) ✓") : "📡 ANTENAS: DESCONECTADAS"; lA.style.color = antsAct.length ? "#00e676" : "#ff4d5e";
    var modTxt = { NORMAL: "CARRERA NORMAL", BOMBA: "💣 BOMBA RELOJ (45s)", ELIM: "💀 ELIMINACION (60s)", REY: "👑 REY DE LA PISTA", SUPERPOLE: "⏱️ SUPERPOLE", RULETA: "🎲 RULETA LOCA MX" };
    document.getElementById("lblModoSalaP").textContent = "MODO: " + (modTxt[s.modoJuego || "NORMAL"] || "NORMAL");
    var brul = document.getElementById("banRuletaP");
    if (s.modoJuego === "RULETA" && s.ruleta && s.ruleta.texto) { brul.style.display = "block"; brul.textContent = "🎲 " + s.ruleta.texto; } else brul.style.display = "none";
    var br = document.getElementById("banReacVivoP");
    if (s.reaccion && (ah - Number(s.reaccion.ts || 0)) < 8000) {
      var rc = s.reaccion, esM = (rc.destinoUid && rc.destinoUid === uid);
      br.style.display = "block"; br.textContent = (esM ? "💌 PARA TI — " : "📣 ") + rc.autor + ": " + rc.texto;
      if (rc.ts !== _ultReacTsP) { _ultReacTsP = rc.ts; if (esM) { mxBeep(980, 130); mxHablar("Mensaje de " + rc.autor + ": " + rc.texto); } }
    } else br.style.display = "none";
  }

  var est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), estTxt = (est === "RADAR") ? ("📡 RADAR (" + (s.radarDist || 10) + "m)") : est;
  if (est === "EN_CURSO" && t0 > 0) {
    var elapsed = ah - t0;
    if (s.modoJuego === "ELIM") {
      var rElim = Math.floor(elapsed / 60000);
      if (rElim > _ultRondaElim && rElim >= 1) { _ultRondaElim = rElim; var act = pils.filter(function(x){ return !x.eliminado; }); if (act.length > 1) { var uP = act[act.length - 1]; fetch(FB + "/pilotos/" + uP.id + ".json", { method: "PATCH", body: JSON.stringify({ eliminado: true }) }).catch(function(){}); hablarYAntenas("Piloto eliminado: " + uP.nombre, true); } }
    }
    if (s.modoJuego === "RULETA") { var rRul = Math.floor(elapsed / 75000); if (rRul > _ultRondaRuleta && rRul >= 1) { _ultRondaRuleta = rRul; lanzarRuletaManual(); } }
    if (Number(s.duracionMin || 0) > 0) {
      var rem = t0 + Number(s.duracionMin) * 60000 - ah;
      if (rem > 0) estTxt = "MANGA " + fmtCuentaRegresivaManga(rem);
      else { estTxt = "FIN MANGA"; if (!avisoFinManga) { avisoFinManga = true; hablarYAntenas("Tiempo de manga cumplido, bandera a cuadros", true); } }
    }
  }
  if (est !== "WARMUP") document.getElementById("lblEstadoSalaP").textContent = estTxt;
  actualizarCronosDir();
}

function conectarSseStreams() {
  if (_esRoot) try { _esRoot.close(); } catch (e) {}
  _esRoot = new EventSource(FB + ".json");
  var onRoot = function(e) {
    try {
      var m = JSON.parse(e.data); if (!m || !m.path) return;
      applySsePatch(rootCache, m.path, m.data, e.type === "put");
      if (m.path.indexOf("/antenas") === 0) { pintarAntenasTel(); return; }
      if (m.path.indexOf("/eventos") === 0 || m.path === "/") Object.keys(rootCache.eventos || {}).forEach(function(aid){ manejarEventoAntena(rootCache.eventos[aid]); });
      pintarDirUI();
      if (m.path.indexOf("/garaje") === 0 || m.path === "/") pintarBandejasWarmup();
      if (_tabDir === "tiempos") mxGar.pintarTiempos();
    } catch (er) {}
  };
  _esRoot.addEventListener("put", onRoot); _esRoot.addEventListener("patch", onRoot);
  _esRoot.onerror = function(){ if (_esRoot && _esRoot.readyState === 2) setTimeout(conectarSseStreams, 2500); };

  if (_esImg1) try { _esImg1.close(); } catch (e) {} if (_esImg2) try { _esImg2.close(); } catch (e) {}
  _esImg1 = bindCamImg("ant_1"); _esImg2 = bindCamImg("ant_2");

  if (_esWu) try { _esWu.close(); } catch (e) {}
  _esWu = new EventSource(FB_WU + ".json");
  var onWu = function(e) {
    try {
      var m = JSON.parse(e.data); if (!m || !m.path) return;
      if (m.path === "/") { if (e.type === "put") warmupCaps = m.data || {}; else Object.assign(warmupCaps, m.data || {}); }
      else { var k = m.path.slice(1).split("/")[0]; if (m.data === null) delete warmupCaps[k]; else warmupCaps[k] = m.data; }
      pintarBandejasWarmup();
    } catch (er) {}
  };
  _esWu.addEventListener("put", onWu); _esWu.addEventListener("patch", onWu);
  _esWu.onerror = function(){ if (_esWu && _esWu.readyState === 2) setTimeout(conectarSseStreams, 2500); };
}

function iniciarDirector() {
  _dirIniciado = true;
  mxGar.init({
    uid: uid, circId: circId, circNom: circNom, fbCirc: FB, allowEditNom: true,
    getNom: function(){ return miNom; }, setNom: function(n){ miNom = n; localStorage.setItem("mxp_nom", n); },
    getRoot: function(){ return rootCache; }, getCircMeta: function(){ return circMeta; },
    isSoloDir: function(){ return !dirPilotoOn; }, isDirSilent: function(){ return true; }, onSpeak: function(t){ mxHablar(t); }
  });
  var elRDInit = document.getElementById("inpRadarDist"), dLoc = localStorage.getItem("mxp_radar_dist");
  if (elRDInit && dLoc) elRDInit.value = dLoc;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ dirSession: dirSessionId, dirTs: ahoraSrv() }) }).catch(function(){});
  aplicarLockSlidersUI(); aplicarModoDirPilotoUI(false); cargarListaPerfiles(); conectarSseStreams();

  setInterval(function() {
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ dirSession: dirSessionId, dirTs: ahoraSrv() }) }).catch(function(){});
    if (dirPilotoOn) fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
  }, 7000);

  setInterval(function() {
    var labAbierto = document.getElementById("acc_lab").style.display !== "none";
    var videoActivo = _calibracionFeed || !!(rootCache.sala && rootCache.sala.verVivo);
    if (testOn || labAbierto || videoActivo) {
      ["ant_1", "ant_2"].forEach(function(aid) {
        var esImg = aid === "ant_1" ? _esImg1 : _esImg2;
        if (esImg && esImg.readyState === 1 && Date.now() - (_camImgLastTs[aid] || 0) < 2500) return;
        if (_camImgPollBusy[aid]) return;
        _camImgPollBusy[aid] = true;
        fbJson(FB_IMG + "/" + aid + ".json?t=" + Date.now()).then(function(d){
          var im = document.getElementById("img_" + aid);
          if (d && d.img) { _camImgLastTs[aid] = Date.now(); im.src = d.img; }
          else if (!d) { _camImgLastTs[aid] = Date.now(); im.removeAttribute("src"); }
        }).catch(function(){}).finally(function(){ _camImgPollBusy[aid] = false; });
      });
    }
    var wuAbierto = document.getElementById("acc_wu").style.display !== "none";
    if ((wuAbierto || (rootCache.sala && rootCache.sala.estado === "WARMUP")) && (!_esWu || _esWu.readyState !== 1)) {
      fbJson(FB_WU + ".json?t=" + Date.now()).then(function(d){ warmupCaps = d || {}; pintarBandejasWarmup(); }).catch(function(){});
    }
  }, 2500);

  setInterval(function() {
    if (_esRoot && _esRoot.readyState === 1) return;
    fbJson(FB + ".json?t=" + Date.now()).then(function(r) {
      if (!r) return;
      rootCache = { sala: r.sala || {}, antenas: r.antenas || {}, pilotos: r.pilotos || {}, garaje: r.garaje || {}, campeonato: r.campeonato || {}, eventos: r.eventos || {} };
      Object.keys(rootCache.eventos).forEach(function(aid){ manejarEventoAntena(rootCache.eventos[aid]); });
      pintarDirUI(); pintarBandejasWarmup(); if (_tabDir === "tiempos") mxGar.pintarTiempos();
    }).catch(function(){});
  }, 5000);

  setInterval(function() {
    actualizarCronosDir();
    if (!dirPilotoOn) return;
    var s = rootCache.sala || {}, yo = (rootCache.pilotos || {})[uid] || {};
    var tIni = Number(s.tsInicio || 0), tPaso = Number(yo.tsUltimoPaso || 0);
    var b = (tPaso && (!tIni || tPaso >= tIni)) ? tPaso : tIni;
    var el = document.getElementById("vivoRelojP"), rb = document.getElementById("relBol");
    var barL = document.getElementById("barLipoP"), lblL = document.getElementById("lblLipoP");
    if (s.tsInicio && s.estado === "EN_CURSO" && barL && lblL) {
      var minL = Math.max(0, (ahoraSrv() - Number(s.tsInicio)) / 60000), pctL = Math.min(100, Math.round((minL / 12) * 100));
      barL.style.width = pctL + "%"; barL.style.background = minL >= 11 ? "#ff4d5e" : (minL >= 8.5 ? "#ffa94d" : "#20c997");
      lblL.textContent = minL.toFixed(1) + "m / 12m";
    } else if (barL && lblL) { barL.style.width = "0%"; lblL.textContent = "0m / 12m"; }
    if (s.estado === "WARMUP" && tIni > 0) return;
    if (s.estado !== "EN_CURSO" || !b || ahoraSrv() < b) { el.textContent = "00.0s"; if (rb) rb.textContent = "EN ESPERA"; return; }
    if (yo.eliminado) { el.textContent = "💀 ELIM"; if (rb) rb.textContent = "💀 ELIM"; return; }
    var d = (ahoraSrv() - b) / 1000, mj = s.modoJuego || "NORMAL";
    if (mj === "BOMBA" && s.estado === "EN_CURSO") {
      var rB = Math.max(0, 45 - d); el.textContent = rB <= 0 ? "💥 ¡BOOM!" : ("💣 " + rB.toFixed(1) + "s"); if (rb) rb.textContent = el.textContent;
      if (rB <= 0 && !_bombaExplotada) { _bombaExplotada = true; mxBeep(280, 450); mxHablar("Bomba explotada, cruza meta"); }
    } else if (mj === "ELIM" && s.estado === "EN_CURSO") {
      el.textContent = "💀 " + (60 - ((ahoraSrv() - Number(s.tsInicio || b)) / 1000) % 60).toFixed(1) + "s"; if (rb) rb.textContent = el.textContent;
    } else { var txtC = fmtCrono(d); el.textContent = txtC; if (rb) rb.textContent = txtC; }
    if (s.tsInicio && (ahoraSrv() - Number(s.tsInicio)) >= 720000 && !avisoLipoP) { avisoLipoP = true; mxHablar("Llevas 12 minutos rodando, revisa bateria LiPo"); }
  }, 120);
}

if (_directorBloqueadoRol) location.replace("index.html");
else if (!esDirOk) document.getElementById("modalAuthDir").style.display = "flex";
else comprobarBloqueoUnicoYArrancar();