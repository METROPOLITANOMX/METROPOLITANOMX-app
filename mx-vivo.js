var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var nomCorto = circNom.split("(")[0].trim();
var FB = FB_ROOT + "/circuitos/" + circId;
var FB_FF = FB_ROOT + "/foto_finish/" + circId + ".json";
var miNomV = localStorage.getItem("mxp_nom") || "Aficionado";
var votoHecho = false, votoMvpHecho = false, ultReacMs = 0, toquesOva = 0;
var modoMec = false, vozMec = false, _ultVtasMec = {}, _esRoot = null, _lastVivoSig = "", _lastEstTxtV = "";
var rootCache = { sala: {}, pilotos: {}, garaje: {}, campeonato: {} };
var esIngles = !(navigator.language || "es").toLowerCase().startsWith("es");

document.title = (esIngles ? "LIVE — " : "EN VIVO — ") + nomCorto;
document.getElementById("titTopV").textContent = (esIngles ? "🔴 LIVE — " : "🔴 EN VIVO — ") + nomCorto.toUpperCase();
document.getElementById("lblCircV").textContent = "🏁 " + circNom;

if (esIngles) {
  document.documentElement.lang = "en";
  document.getElementById("btnMecV").textContent = "🔧 MECHANIC";
  document.getElementById("btnGuiaV").textContent = "? GUIDE";
  document.getElementById("btnSolV").textContent = "☀️ SUN";
  document.getElementById("btnSalirV").textContent = "Exit";
  document.getElementById("lblEstV").textContent = "CONNECTING TO TRACK...";
  document.getElementById("lblSubV").textContent = "Syncing live timing";
  document.getElementById("btnFfV").textContent = "📸 VIEW LATEST FINISH PHOTO";
  document.getElementById("titFfV").textContent = "📸 FINISH LINE PHOTO";
  document.getElementById("btnCerrarFfV").textContent = "CLOSE";
  document.getElementById("titMecV").textContent = "🔧 PIT-BOARD MECHANIC MODE";
  document.getElementById("titPorraV").textContent = "🎯 PRE-START POLL: WHO SETS FASTEST LAP?";
  document.getElementById("titClasV").textContent = "LIVE STANDINGS & TRACK SETUPS";
  document.getElementById("subClasV").textContent = "Tap a rider to inspect setup";
  document.getElementById("titCampV").textContent = "🏆 TODAY'S CHAMPIONSHIP (HEATS)";
  document.getElementById("titMvpV").textContent = "🏅 VOTE RIDER MVP OF THE DAY";
  document.getElementById("titReacV").textContent = "👏 LIVE FAN STANDS (PA & EARPIECE)";
  document.getElementById("btnCerrarSet").textContent = "CLOSE";
}

function toggleModoMecanico() {
  modoMec = !modoMec;
  document.getElementById("boxMecanico").style.display = modoMec ? "block" : "none";
  document.getElementById("btnMecV").style.background = modoMec ? "#ffc107" : "#2b2b2b";
  document.getElementById("btnMecV").style.color = modoMec ? "#000" : "#ffc107";
  pintarModoMecanico();
}
function toggleVozMec() {
  desbloquearAudioCore(); vozMec = !vozMec;
  var b = document.getElementById("btnVozMec"); b.textContent = vozMec ? "🔊 VOZ ON" : "🔊 VOZ OFF";
  b.style.background = vozMec ? "#20c997" : "#262626"; b.style.color = vozMec ? "#000" : "#20c997";
  if (vozMec) mxHablar(esIngles ? "Mechanic pit board voice enabled" : "Voz de modo mecanico activada", true, esIngles ? "en-US" : "es-ES");
}

function ayudaVivo() {
  alert(esIngles
    ? "LIVE FAN & MECHANIC SCREEN:\n• Green dot 🟢 shows riders live on track.\n• 🔧 MECHANIC mode turns your phone into a dedicated Pit-Board for 1 rider with LiPo bar & lap voice.\n• 👏 OVATION triggers loudspeaker applause every 10 taps.\n• Send cheer blocks directly to any 🟢 rider & vote MVP!"
    : "PANTALLA EN VIVO Y MECANICO:\n• El punto verde 🟢 indica pilotos conectados ahora en pista.\n• 🔧 MECANICO convierte tu movil en un Pit-Board para seguir a 1 piloto desde boxes (crono, vueltas, barra LiPo y voz).\n• 👏 OVACION DE GRADA: cada 10 toques hace sonar una ovacion en las antenas.\n• Manda mensajes por bloques dirigidos a un piloto 🟢 (suenan en megafonia y al oido) y vota al MVP.");
}

function verFotoFinishV() {
  document.getElementById("modalFfV").style.display = "flex";
  document.getElementById("txtFfInfoV").textContent = esIngles ? "Loading Photo-Finish..." : "Cargando ultimo Foto-Finish...";
  document.getElementById("imgFfV").src = "";
  var pObj = rootCache.pilotos || {};
  fbJson(FB_FF).then(function(ff) {
    if (!ff || !ff.img) { document.getElementById("txtFfInfoV").textContent = esIngles ? "No finish photo yet." : "Aun no hay captura de Foto-Finish."; return; }
    document.getElementById("imgFfV").src = ff.img;
    var nomP = (ff.pid && pObj[ff.pid]) ? pObj[ff.pid].nombre : (ff.modo === "TODO" ? (esIngles ? "Any bike" : "Cualquier moto") : (esIngles ? "Crossing" : "Paso en meta"));
    document.getElementById("txtFfInfoV").textContent = (ff.antNom || "Meta") + " • " + nomP + " • " + new Date(ff.ts).toLocaleTimeString(esIngles ? "en-US" : "es-ES");
  }).catch(function(){ document.getElementById("txtFfInfoV").textContent = esIngles ? "Photo unavailable." : "Sin foto disponible."; });
}

function enviarBloqueAnimo(txt) {
  var ah = ahoraSrv(); if ((ah - ultReacMs) < 2500) return; ultReacMs = ah;
  var sel = document.getElementById("selDestinoAnimo"), dUid = sel ? sel.value : "", pObj = rootCache.pilotos || {};
  fetch(FB + "/sala/reaccion.json", {
    method: "PUT", body: JSON.stringify({ ts: ah, autor: miNomV, texto: txt, destinoUid: dUid, destinoNom: (dUid && pObj[dUid]) ? pObj[dUid].nombre : "" })
  }).catch(function(){});
}
function darOvacionGrada() {
  toquesOva++; var resto = toquesOva % 10, b = document.getElementById("btnOvacion");
  if (resto === 0) {
    b.classList.remove("ova-boom"); void b.offsetWidth; b.classList.add("ova-boom");
    b.textContent = "🎉 ¡OVACION ENVIADA! (" + toquesOva + " TOQUES)";
    fetch(FB + "/sala/ovacion.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), total: toquesOva, racha: 10, autor: miNomV }) }).catch(function(){});
  } else b.textContent = "👏 ¡OVACION DE GRADA! (" + resto + " / 10 TOQUES)";
}
function votarFavorito(uidP, nomP) {
  votoHecho = true;
  document.getElementById("txtPorraOk").textContent = esIngles ? ("✅ Voted " + nomP) : ("✅ Has votado por " + nomP + " para la vuelta rapida");
  var keyV = miNomV.toLowerCase().replace(/[^a-z0-9]/g, "_") || ("fan_" + Math.random().toString(36).slice(2, 6));
  fetch(FB + "/sala/porra/" + keyV + ".json", { method: "PUT", body: JSON.stringify({ pilotoUid: uidP, pilotoNom: nomP, ts: ahoraSrv() }) }).catch(function(){});
}
function votarMvp(uidP, nomP) {
  votoMvpHecho = true;
  document.getElementById("txtMvpOk").textContent = esIngles ? ("🏅 MVP Vote: " + nomP) : ("🏅 Voto MVP registrado para " + nomP);
  var keyV = miNomV.toLowerCase().replace(/[^a-z0-9]/g, "_") || ("fan_" + Math.random().toString(36).slice(2, 6));
  fetch(FB + "/sala/mvp/" + keyV + ".json", { method: "PUT", body: JSON.stringify({ pilotoUid: uidP, pilotoNom: nomP, ts: ahoraSrv() }) }).catch(function(){});
}
function verSetupRival(pid) {
  var p = (rootCache.pilotos || {})[pid] || {}, g = (rootCache.garaje || {})[pid] || {};
  document.getElementById("mSetTit").textContent = "🏍️ #" + (p.dorsal || g.dorsal || "--") + " " + (p.nombre || "Piloto");
  document.getElementById("mSetBody").innerHTML = "<b>" + (esIngles ? "Bike:" : "Moto:") + "</b> " + esc(g.modelo || "Losi Promoto-MX") + " (" + esc(g.disc || "MX") + ")<br><b>" + (esIngles ? "Best Lap:" : "Mejor Vuelta:") + "</b> <span class='tv-rp'>" + fmt(p.mejorMs) + "</span> (" + (p.vueltas || 0) + "v)<br><br><b style='color:#0dcaf0'>" + (esIngles ? "🔧 ACTIVE SETUP:" : "🔧 REGLAJE ACTIVO:") + "</b><br>" + esc(g.setupTxt || (esIngles ? "Stock setup" : "Setup de serie"));
  document.getElementById("modalSetupV").style.display = "flex";
}

function pintarModoMecanico() {
  if (!modoMec) return;
  var pObj = rootCache.pilotos || {}, s = rootCache.sala || {}, pid = document.getElementById("selPilotoMec").value, p = pObj[pid];
  var barL = document.getElementById("barLipoMec"), lblL = document.getElementById("lblLipoMec");
  if (!p) {
    document.getElementById("mecPosVtas").textContent = "--"; document.getElementById("mecUlt").textContent = "--"; document.getElementById("mecMejLipo").textContent = "--";
    if (barL && lblL) { barL.style.width = "0%"; lblL.textContent = "0m / 12m"; }
    return;
  }
  var vAct = Number(p.vueltas || 0);
  if (typeof _ultVtasMec[pid] === "number" && vAct > _ultVtasMec[pid] && p.ultimaMs) mxHablar(p.nombre + ", vuelta " + vAct + ", " + fmtVoz(p.ultimaMs), vozMec, esIngles ? "en-US" : "es-ES");
  _ultVtasMec[pid] = vAct;
  document.getElementById("mecPosVtas").textContent = vAct + " vtas"; document.getElementById("mecUlt").textContent = fmt(p.ultimaMs);
  var t0 = Number(s.tsInicio || 0), minLipo = (t0 > 0 && s.estado === "EN_CURSO") ? Math.max(0, (ahoraSrv() - t0) / 60000) : 0;
  document.getElementById("mecMejLipo").innerHTML = "<span class='tv-rp'>" + fmt(p.mejorMs) + "</span> / <span style='" + (minLipo >= 11 ? "color:#ff4d5e" : "color:#ffc107") + "'>" + Math.floor(minLipo) + "m</span>";
  if (barL && lblL) {
    barL.style.width = Math.min(100, Math.round((minLipo / 12) * 100)) + "%";
    barL.style.background = minLipo >= 11 ? "#ff4d5e" : (minLipo >= 8.5 ? "#ffa94d" : "#20c997");
    lblL.textContent = minLipo.toFixed(1) + "m / 12m";
  }
}

function renderSwatches(g) {
  var cs = (g && Array.isArray(g.colores)) ? g.colores.slice(0, 3) : [];
  return cs.map(function(c){ return '<span class="mx-sw" style="background:' + esc(c.hex || "#fff") + '"></span>'; }).join("");
}

function actualizarRelojEstadoV() {
  var s = rootCache.sala || {}, est = s.estado || "ESPERA", ah = ahoraSrv();
  var titEs = { ESPERA: "PISTA EN ESPERA", WARMUP: "🔥 WARM-UP EN CURSO", SALIDA_30: "🚦 PREPARADOS EN PARRILLA (30s)", VALLA_MX: "🚧 VALLA MX LISTA (SALIDA ALEATORIA)", EN_CURSO: "🏁 MANGA EN DIRECTO", TEST: "📡 PRUEBA DE ANTENAS" };
  var titEn = { ESPERA: "TRACK ON STANDBY", WARMUP: "🔥 WARM-UP IN PROGRESS", SALIDA_30: "🚦 STARTING GRID (30s)", VALLA_MX: "🚧 MX GATE READY", EN_CURSO: "🏁 LIVE HEAT", TEST: "📡 ANTENNA TEST" };
  var estTxt = (esIngles ? titEn[est] : titEs[est]) || est;
  if (est === "VALLA_MX" && Number(s.tsInicio || 0) > 0) {
    var tCue = Number(s.tsCuenta || 0) || Number(s.tsInicio);
    var dfDrop = Number(s.tsInicio) - ah, dfCue = tCue - ah, sgCue = Math.ceil(dfCue / 1000);
    if (dfDrop > 0) estTxt += " • " + (sgCue <= 5 ? (esIngles ? "WATCH GATE!" : "¡ATENTOS A LA VALLA!") : (Math.floor(sgCue / 60) + ":" + ((sgCue % 60) < 10 ? "0" : "") + (sgCue % 60)));
  } else if ((est === "SALIDA_30" || est === "WARMUP") && Number(s.tsInicio || 0) > 0) {
    var df = Number(s.tsInicio) - ah;
    if (df > 0) { var sg = Math.ceil(df / 1000); estTxt += " • " + Math.floor(sg / 60) + ":" + ((sg % 60) < 10 ? "0" : "") + (sg % 60); }
  } else if (est === "EN_CURSO" && Number(s.tsInicio || 0) > 0 && Number(s.duracionMin || 0) > 0) {
    var rem = Number(s.tsInicio) + Number(s.duracionMin) * 60000 - ah;
    if (rem > 0) { var sr = Math.ceil(rem / 1000); estTxt += " • " + Math.floor(sr / 60) + ":" + ((sr % 60) < 10 ? "0" : "") + (sr % 60); }
  }
  if (estTxt !== _lastEstTxtV) { _lastEstTxtV = estTxt; document.getElementById("lblEstV").textContent = estTxt; }
}

function pintarVivo() {
  var s = rootCache.sala || {}, pObj = rootCache.pilotos || {}, gObj = rootCache.garaje || {}, cObj = rootCache.campeonato || {};
  document.getElementById("banBanderaAmV").style.display = (s.bandera === "AMARILLA") ? "block" : "none";
  var est = s.estado || "ESPERA";
  actualizarRelojEstadoV();
  document.getElementById("lblSubV").textContent = s.hotlapTxt ? ((esIngles ? "👑 Weekly Hotlap: " : "👑 Hotlap Semana: ") + s.hotlapTxt) : circNom;
  document.getElementById("lblModV").textContent = (s.modoJuego && s.modoJuego !== "NORMAL") ? ("MODO: " + s.modoJuego) : "";
  var brV = document.getElementById("banRuletaV");
  if (s.modoJuego === "RULETA" && s.ruleta && s.ruleta.texto) { brV.style.display = "block"; brV.textContent = "🎲 " + s.ruleta.texto; } else brV.style.display = "none";

  var pils = ordenarPilotos(pObj, s), mj = s.modoJuego || "NORMAL";
  var selM = document.getElementById("selPilotoMec");
  if (selM && document.activeElement !== selM) { var pm = selM.value; selM.innerHTML = pils.length ? pils.map(function(p){ return '<option value="' + esc(p.id) + '">' + (p.activo ? "🟢 " : "⚪ ") + '#' + esc(p.dorsal || "--") + ' ' + esc(p.nombre) + '</option>'; }).join("") : '<option value="">Sin pilotos</option>'; if (pm && pObj[pm]) selM.value = pm; }
  var selD = document.getElementById("selDestinoAnimo");
  if (selD && document.activeElement !== selD) { var pd = selD.value, actP = pils.filter(function(p){ return p.activo; }); selD.innerHTML = '<option value="">📢 A TODOS LOS PILOTOS EN PISTA</option>' + actP.map(function(p){ return '<option value="' + esc(p.id) + '">🟢 #' + esc(p.dorsal || "--") + ' ' + esc(p.nombre) + '</option>'; }).join(""); if (pd && actP.some(function(p){ return p.id === pd; })) selD.value = pd; }

  var bp = document.getElementById("boxPorra");
  bp.style.display = (est === "SALIDA_30" || est === "VALLA_MX" || est === "WARMUP" || est === "ESPERA") && pils.length > 0 ? "block" : "none";
  if (!votoHecho && pils.length) document.getElementById("listaPorra").innerHTML = pils.map(function(p){ return '<button onclick="vibrar();votarFavorito(\'' + esc(p.id) + '\',\'' + esc(p.nombre) + '\')" style="background:#222;color:#ffc107;border:1px solid #444;padding:7px 10px;font-size:11px">#' + esc(p.dorsal || "--") + ' ' + esc(p.nombre) + '</button>'; }).join("");
  var votos = {}; Object.keys(s.porra || {}).forEach(function(k){ var n = s.porra[k] && s.porra[k].pilotoNom; if (n) votos[n] = (votos[n] || 0) + 1; });
  var vRes = Object.keys(votos).sort(function(a, b){ return votos[b] - votos[a]; }).map(function(n){ return esc(n) + " (" + votos[n] + ")"; }).join(" • ");
  document.getElementById("resPorra").textContent = vRes ? ("Votos porra: " + vRes) : "";

  var mvpV = {}; Object.keys(s.mvp || {}).forEach(function(k){ var n = s.mvp[k] && s.mvp[k].pilotoNom; if (n) mvpV[n] = (mvpV[n] || 0) + 1; });
  var mvpOrd = Object.keys(mvpV).sort(function(a, b){ return mvpV[b] - mvpV[a]; }), mvpLeader = mvpOrd[0] || "";
  if (!votoMvpHecho) document.getElementById("listaMvpV").innerHTML = pils.length ? pils.map(function(p){ return '<button onclick="vibrar();votarMvp(\'' + esc(p.id) + '\',\'' + esc(p.nombre) + '\')" style="background:#211936;color:#d0a8ff;border:1px solid #5f3dc4;padding:7px 10px;font-size:11px">🏅 #' + esc(p.dorsal || "--") + ' ' + esc(p.nombre) + '</button>'; }).join("") : '<span style="font-size:11px;color:#777">Esperando pilotos...</span>';
  document.getElementById("resMvpV").textContent = mvpOrd.length ? ("Ranking MVP: " + mvpOrd.map(function(n){ return esc(n) + " (" + mvpV[n] + ")"; }).join(" • ")) : "";

  var vSig = pils.map(function(p){ return p.id + ":" + p.vueltas + ":" + p.mejorMs + ":" + p.activo + ":" + p.eliminado; }).join("|") + "|" + mvpLeader;
  if (vSig !== _lastVivoSig) {
    _lastVivoSig = vSig;
    var p1 = pils[0] || null, actCnt = 0, h = "", bestAll = pils.length ? Math.min.apply(null, pils.map(function(x){ return x.mejorMs || 9e9; })) : 9e9;
    pils.forEach(function(p, ix) {
      if (p.activo) actCnt++;
      var g = gObj[p.id] || {}, dif = "";
      if (ix > 0 && p1) {
        if ((mj === "REY" || mj === "SUPERPOLE") && p.mejorMs && p1.mejorMs) dif = " • +" + ((p.mejorMs - p1.mejorMs) / 1000).toFixed(2) + "s";
        else if ((p1.vueltas || 0) > (p.vueltas || 0)) dif = " • -" + ((p1.vueltas || 0) - (p.vueltas || 0)) + "v";
        else if (p.mejorMs && p1.mejorMs && p.mejorMs > p1.mejorMs) dif = " • +" + ((p.mejorMs - p1.mejorMs) / 1000).toFixed(2) + "s";
      }
      var pl = '<span class="mx-plate' + (g.disc === "SM" ? " sm" : "") + '">#' + esc(p.dorsal || '--') + '</span>', sw = renderSwatches(g);
      var clsT = (p.mejorMs && p.mejorMs === bestAll) ? "tv-vr" : "tv-rp";
      h += '<div class="fila' + (p.eliminado ? ' elim' : '') + '" style="cursor:pointer" onclick="vibrar();verSetupRival(\'' + esc(p.id) + '\')">' +
        '<div>' + (p.activo ? "🟢" : "⚪") + ' <b>' + (ix + 1) + 'º</b> ' + pl + sw + '<b>' + esc(p.nombre) + '</b>' + (mvpLeader && p.nombre === mvpLeader ? ' <span style="background:#5f3dc4;color:#fff;font-size:9px;padding:1px 5px;border-radius:4px">🏅 MVP</span>' : '') + ' <span style="font-size:11px;color:#0dcaf0">(' + (p.vueltas || 0) + 'v' + (p.sensorOk ? ' ✓' : '') + esc(dif) + ')</span><div style="font-size:10px;color:#888">🏍️ ' + esc(g.modelo || "Losi Promoto-MX") + ' (' + esc(g.disc || "MX") + ') • Toca para setup</div></div>' +
        '<div style="text-align:right"><b class="' + clsT + '" style="font-size:14px">' + fmt(p.mejorMs) + '</b><div style="font-size:10px;color:#aaa">Ult: ' + fmt(p.ultimaMs) + '</div></div></div>';
    });
    var lpv = document.getElementById("lblPistaVivo");
    lpv.style.color = actCnt > 0 ? "#20c997" : "#888";
    lpv.textContent = actCnt > 0 ? ("🟢 " + actCnt + (esIngles ? " RIDER(S) ON TRACK" : " PILOTO(S) EN PISTA")) : (esIngles ? "⚪ TRACK EMPTY" : "⚪ PISTA VACIA (0 PILOTOS)");
    document.getElementById("listaVivo").innerHTML = h || '<div style="color:#777;font-size:12px">Ningun piloto rodando ahora mismo.</div>';
  }

  var cInfo = calcularCampeonato(cObj), bc = document.getElementById("boxCampVivo");
  if (cInfo.tabla.length) { bc.style.display = "block"; document.getElementById("listaCampV").innerHTML = cInfo.tabla.map(function(x, i){ return '<div class="fila"><span><b>' + (i + 1) + 'º #' + esc(x.dorsal) + ' ' + esc(x.nombre) + '</b></span><b style="color:#ffc107">' + x.pts + ' pts</b></div>'; }).join(""); }
  else bc.style.display = "none";

  var mr = document.getElementById("muroReac");
  if (mr && s.reaccion && s.reaccion.texto) mr.innerHTML = "Ultimo animo: <b style='color:#ffc107'>" + esc(s.reaccion.autor) + "</b>" + (s.reaccion.destinoNom ? (' <span style="color:#0dcaf0">➔ ' + esc(s.reaccion.destinoNom) + '</span>') : '') + ": " + esc(s.reaccion.texto);
  pintarModoMecanico();
}

function conectarSseVivo() {
  if (_esRoot) try { _esRoot.close(); } catch (e) {}
  try {
    _esRoot = new EventSource(FB + ".json");
    var onSse = function(e) {
      try {
        var m = JSON.parse(e.data); if (!m || !m.path) return;
        if (m.path.indexOf("/antenas") === 0 || m.path.indexOf("/eventos") === 0) return;
        applySsePatch(rootCache, m.path, m.data, e.type === "put");
        pintarVivo();
      } catch (er) {}
    };
    _esRoot.addEventListener("put", onSse); _esRoot.addEventListener("patch", onSse);
    _esRoot.onerror = function(){ if (_esRoot && _esRoot.readyState === 2) setTimeout(conectarSseVivo, 2500); };
  } catch (e) {}
}
function refrescarVivo() {
  fbJson(FB + ".json?t=" + Date.now()).then(function(r){
    if (r) { rootCache = { sala: r.sala || {}, pilotos: r.pilotos || {}, garaje: r.garaje || {}, campeonato: r.campeonato || {} }; pintarVivo(); }
  }).catch(function(){});
}
conectarSseVivo(); refrescarVivo(); setInterval(refrescarVivo, 4500);

setInterval(function() {
  var s = rootCache.sala || {}, est = s.estado || "ESPERA";
  if (est === "SALIDA_30" || est === "VALLA_MX" || est === "WARMUP" || est === "EN_CURSO") actualizarRelojEstadoV();
  if (!modoMec) return;
  var pid = document.getElementById("selPilotoMec").value, p = (rootCache.pilotos || {})[pid], el = document.getElementById("mecCrono");
  var tIni = Number(s.tsInicio || 0), tPaso = p ? Number(p.tsUltimoPaso || 0) : 0;
  var b = (tPaso && (!tIni || tPaso >= tIni)) ? tPaso : tIni;
  if (!p || est !== "EN_CURSO" || !b || ahoraSrv() < b) { el.textContent = "00.0s"; return; }
  el.textContent = fmtCrono((ahoraSrv() - b) / 1000);
}, 150);