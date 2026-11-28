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
var _bombaExplotada = false, _ultRondaElim = 0, _ultRondaRuleta = 0;
var _ultMegaIdP = "", _ultReacTsP = 0, _esRoot = null, _lastSalaSig = "";
var amistosaId = "", amistosaCache = {}, _esAmistosa = null, _amEventosVistos = {}, _amLockVta = {}, _amUltFin = "";

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
  if (_esAmistosa) try { _esAmistosa.close(); } catch (e) {}
  if (amistosaId && amistosaCache.pilotos && amistosaCache.pilotos[uid]) {
    fetch(rutaSalaAmistosa() + "/pilotos/" + uid + ".json", { method: "PATCH", keepalive: true, body: JSON.stringify({ enPista: false, tsActivo: 0 }) }).catch(function(){});
  }
  var yo = (rootCache.pilotos || {})[uid];
  if (yo && !(yo.vueltas > 0)) fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE", keepalive: true }).catch(function(){});
  else fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", keepalive: true, body: JSON.stringify({ enPista: false, tsActivo: 0 }) }).catch(function(){});
});

function desbloquearAudioP(av) { desbloquearAudioCore(); var b = document.getElementById("btnUnlockAudioP"); if (b) b.style.display = "none"; if (av) { mxBeep(880, 90); mxHablar("Audio de pista y delta al oido activados", vozP); } }
function toggleVozP() { desbloquearAudioP(false); vozP = !vozP; var b = document.getElementById("btnVozP"); b.textContent = vozP ? "Voz ON" : "Voz OFF"; b.style.background = vozP ? "#20c997" : "#444"; }
function abrirBolsillo() { mxAbrirBolsillo(function(){ desbloquearAudioP(false); }); }
function iniciarUnlockBol(ev) { mxIniciarUnlockBolsillo(ev); }
function cancelarUnlockBol(ev) { mxCancelarUnlockBolsillo(ev); }

function salirPiloto() {
  mxGar.cerrarCamaras(); if (_esRoot) try { _esRoot.close(); } catch (e) {}
  var yo = (rootCache.pilotos || {})[uid];
  var op = (yo && yo.vueltas > 0) ? fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: false, tsActivo: 0 }) }) : fetch(FB + "/pilotos/" + uid + ".json", { method: "DELETE" });
  op.catch(function(){}).finally(function(){ localStorage.removeItem("mxp_uid"); location.href = "index.html"; });
}

function ayudaTab() {
  var g = {
    sala: "SALA PISTA:\n1. Activa el audio para escuchar vueltas, diferencias y avisos; la bateria se recuerda a los 12 minutos.\n2. Consulta posicion, vuelta en curso, clasificacion, colores asignados y estado de antenas.\n3. Usa BOLSILLO para oscurecer la pantalla: manten pulsado 2 segundos para volver.\n4. FOTO-FINISH muestra la ultima captura de meta; + VUELTA permite anotar una pasada manual.\n5. Sin Direccion, crea una Manga Amistosa o unete a una activa. Con GPS se limita a 3 km; sin ubicación, se pide el código de cuatro cifras.\n6. El organizador mantiene abierta esta pantalla para elegir modo y duración, iniciar Warm-Up y dar la salida con Valla MX; otros pilotos pueden ceder sus teléfonos como Meta o Refuerzo.\n7. Los resultados amistosos se guardan aparte y no suman puntos oficiales ni afectan al Ranking Mundial.",
    garaje: "GARAJE PRO:\n1. Elige MX Tierra o Supermoto y completa modelo, dorsal y reglaje.\n2. Guarda cuatro fotos, captura los colores visibles de casco y moto, limpia el fondo y guarda la firma.\n3. Comparte el reglaje por WhatsApp o publica moto, foto y configuracion en el Paddock Mundial.",
    tiempos: "TIEMPOS:\nConsulta tu mejor vuelta, regularidad, vueltas acumuladas, rango, campeonato del dia, comparacion con otros pilotos e historial diario."
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
  var usaAmistosa = usarSalaAmistosa(), pils = usaAmistosa ? (amistosaCache.pilotos || {}) : (rootCache.pilotos || {});
  fbJson(usaAmistosa ? (rutaSalaAmistosa() + "/foto_finish.json") : FB_FF).then(function(ff) {
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

function rutaSalaAmistosa() { return FB_ROOT + "/amistosas/" + circId + "/" + amistosaId; }
function direccionOficialActiva() {
  var s = rootCache.sala || {};
  return !!(s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 30000);
}
function usarSalaAmistosa() {
  return !!(amistosaId && amistosaCache && amistosaCache.status === "ACTIVE" && !direccionOficialActiva());
}
function pedirPosicionAmistosa() {
  return new Promise(function(resolve) {
    if (!navigator.geolocation || location.protocol === "file:") { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(function(pos) {
      resolve({ lat: Math.round(pos.coords.latitude * 1000) / 1000, lon: Math.round(pos.coords.longitude * 1000) / 1000 });
    }, function(){ resolve(null); }, { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
  });
}
function distanciaAmistosaMetros(a, b) {
  var rad = Math.PI / 180, lat1 = Number(a.lat) * rad, lat2 = Number(b.lat) * rad;
  var dLat = (Number(b.lat) - Number(a.lat)) * rad, dLon = (Number(b.lon) - Number(a.lon)) * rad;
  var h = Math.min(1, Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2));
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function escribirSalaAmistosa(url, method, data) {
  return fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status + " al guardar la sala amistosa");
    return r;
  });
}
function claveDiaAmistosa(ts) {
  var d = new Date(Number(ts) || Date.now());
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
function perfilColorAmistoso(g) {
  g = g || {};
  return {
    disc: g.disc || "MX", dorsal: g.dorsal || "1", modelo: g.modelo || "",
    colores: Array.isArray(g.colores) ? g.colores.map(function(c) { c = c || {}; return { hex: c.hex || "", nom: c.nom || "", tipo: c.tipo || "" }; }) : [],
    firmasWarmup: g.firmasWarmup || {}, firmasVivo: g.firmasVivo || {}
  };
}
function obtenerPerfilColorAmistoso() {
  return fbJson(FB + "/garaje/" + uid + ".json").then(function(g) {
    if (g) {
      if (!rootCache.garaje) rootCache.garaje = {};
      rootCache.garaje[uid] = g;
    }
    return perfilColorAmistoso(g || (rootCache.garaje || {})[uid]);
  });
}
function perfilPilotoAmistoso(p) {
  p = p || {};
  return {
    nombre: p.nombre || miNom, dorsal: p.dorsal || mxGar.getDorsal(),
    vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false,
    enPista: true, tsActivo: ahoraSrv()
  };
}
function mostrarErrorSalaAmistosa(err) {
  console.error("Sala amistosa:", err);
  alert("No se pudo completar la acción de la sala amistosa. " + (err && err.message ? err.message : "Comprueba la conexión e inténtalo de nuevo."));
}

function mostrarErrorCargaSalasAmistosas(err) {
  console.error("No se pudieron cargar las salas amistosas:", err);
  var lista = document.getElementById("listaSalasAmistosas");
  if (!lista) return;
  var detalle = err && err.message ? err.message : "";
  lista.style.color = "#ff6b6b";
  lista.textContent = /HTTP 401|HTTP 403/.test(detalle)
    ? "El servicio de salas amistosas no tiene permiso de lectura en Firebase (" + detalle + ")."
    : "No se pudieron cargar las salas amistosas. Comprueba la conexión e inténtalo de nuevo.";
}

function refrescarSalasAmistosas() {
  var lista = document.getElementById("listaSalasAmistosas");
  if (lista) lista.textContent = "Buscando salas activas...";
  fbJson(FB_ROOT + "/amistosas/" + circId + ".json?t=" + Date.now()).then(function(rooms) {
    var activas = Object.keys(rooms || {}).map(function(id) { return { id: id, room: rooms[id] || {} }; })
      .filter(function(x) { return x.room.status === "ACTIVE" && /^\d{4}$/.test(x.id); })
      .sort(function(a, b) { return Number(b.room.createdAt || 0) - Number(a.room.createdAt || 0); });
    if (!lista) return;
    lista.innerHTML = activas.length ? activas.map(function(x) {
      var r = x.room, n = Object.keys(r.pilotos || {}).length;
      return '<div class="box-sub" style="margin-top:5px"><b style="color:#ffc107">' + esc(r.hostName || "Organizador") + '</b> · ' + n + ' piloto(s) · ' +
        esc((r.sala && r.sala.modoJuego) || "NORMAL") + '<button onclick="vibrar();unirseSalaAmistosa(\'' + esc(x.id) + '\',false)" style="width:100%;margin-top:5px;background:#25303b;color:#20c997;padding:8px">UNIRSE A ESTA SALA</button></div>';
    }).join("") : '<div style="font-size:11px;color:#999;margin-top:6px">No hay salas activas en este circuito. Puedes crear una o unirte con el código de cuatro cifras.</div>';
  }).catch(mostrarErrorCargaSalasAmistosas);
}

function crearSalaAmistosa() {
  if (amistosaId) { alert("Ya estás dentro de una sala amistosa."); return; }
  var crear = function(pos) {
    var codigo = String(Math.floor(1000 + Math.random() * 9000));
    fbJson(FB_ROOT + "/amistosas/" + circId + "/" + codigo + ".json").then(function(existing) {
      if (existing) { crear(pos); return; }
      return obtenerPerfilColorAmistoso().then(function(gar) {
        var ah = ahoraSrv(), yo = perfilPilotoAmistoso((rootCache.pilotos || {})[uid]);
        var room = {
          status: "ACTIVE", code: codigo, circuitId: circId, circuitName: circNom,
          hostUid: uid, hostName: miNom, createdAt: ah, updatedAt: ah, location: pos,
          sala: { estado: "ESPERA", modoJuego: "NORMAL", modoDet: "GAR", duracionMin: 10, minLapSec: 5, tsInicio: 0, tsCuenta: 0 },
          pilotos: {}, garaje: {}, antenas: {}, rolesAntena: {}, eventos: {}, resultados: {}
        };
        room.pilotos[uid] = yo; room.garaje[uid] = gar;
        return escribirSalaAmistosa(FB_ROOT + "/amistosas/" + circId + "/" + codigo + ".json", "PUT", room).then(function() {
          entrarSalaAmistosaLocal(codigo, room);
          document.getElementById("inpCodigoAmistosa").value = "";
          if (!gar.colores.length) alert("Sala creada. Añade y guarda tu firma de color en el Garaje para que las cámaras puedan reconocerte. Código: " + codigo);
          else if (!pos) alert("Sala creada. Comparte en voz alta el código " + codigo + " para que puedan unirse sin GPS.");
          else alert("Sala creada. Los pilotos a menos de 3 km podrán encontrarla; comparte también el código " + codigo + " como alternativa.");
        });
      });
    }).catch(mostrarErrorSalaAmistosa);
  };
  pedirPosicionAmistosa().then(crear);
}

function unirseSalaAmistosa(codigo, codigoManual) {
  var input = document.getElementById("inpCodigoAmistosa");
  if (typeof codigoManual === "undefined") codigoManual = !codigo && !!(input && input.value.trim());
  var code = String(codigo || (input && input.value) || "").replace(/\D/g, "").slice(0, 4);
  var entrar = function(pos, room) {
    var local = room.location;
    if (local && pos && distanciaAmistosaMetros(local, pos) > 3000) {
      alert("Esta sala está a más de 3 km. Solo puedes unirte desde el circuito.");
      return;
    }
    if ((!local || !pos) && !codigoManual) {
      var confirmado = prompt("No se pudo comprobar la ubicación. Introduce el código de 4 cifras que se comparte en el paddock:");
      if (String(confirmado || "").replace(/\D/g, "") !== code) { alert("Código de sala incorrecto."); return; }
    }
    if (room.circuitId !== circId || room.status !== "ACTIVE") { alert("La sala ya no está activa en este circuito."); return; }
    obtenerPerfilColorAmistoso().then(function(garage) {
      var existing = (room.pilotos || {})[uid], source = existing || (rootCache.pilotos || {})[uid] || {};
      var member = existing ? Object.assign({}, existing, { enPista: true, tsActivo: ahoraSrv() }) : perfilPilotoAmistoso(source);
      var path = FB_ROOT + "/amistosas/" + circId + "/" + code;
      return Promise.all([
        escribirSalaAmistosa(path + "/pilotos/" + uid + ".json", "PUT", member),
        escribirSalaAmistosa(path + "/garaje/" + uid + ".json", "PUT", garage)
      ]).then(function() {
        room.pilotos = room.pilotos || {}; room.pilotos[uid] = member;
        room.garaje = room.garaje || {}; room.garaje[uid] = garage;
        entrarSalaAmistosaLocal(code, room);
        if (input) input.value = "";
        if (!garage.colores.length) alert("Te has unido, pero las cámaras no podrán reconocerte hasta que guardes una firma de color en el Garaje.");
      });
    }).catch(mostrarErrorSalaAmistosa);
  };
  if (!/^\d{4}$/.test(code)) { alert("Introduce un código válido de cuatro cifras."); return; }
  fbJson(FB_ROOT + "/amistosas/" + circId + "/" + code + ".json").then(function(room) {
    if (!room || room.status !== "ACTIVE" || room.circuitId !== circId) { alert("No existe una sala activa con ese código en este circuito."); return; }
    pedirPosicionAmistosa().then(function(pos) { entrar(pos, room); });
  }).catch(mostrarErrorSalaAmistosa);
}

function entrarSalaAmistosaLocal(code, room) {
  amistosaId = code; amistosaCache = room || {};
  localStorage.setItem("mxp_sala_amistosa_" + circId, code);
  conectarSseAmistosa(); renderSalaAmistosa(); pintarSalaUI();
}
function recuperarSalaAmistosa() {
  var code = localStorage.getItem("mxp_sala_amistosa_" + circId) || "";
  if (!/^\d{4}$/.test(code)) { refrescarSalasAmistosas(); return; }
  fbJson(FB_ROOT + "/amistosas/" + circId + "/" + code + ".json").then(function(room) {
    if (!room || room.status === "CLOSED" || room.status === "DELETED") {
      localStorage.removeItem("mxp_sala_amistosa_" + circId);
      refrescarSalasAmistosas(); return;
    }
    amistosaId = code; amistosaCache = room;
    if (room.status === "ACTIVE") conectarSseAmistosa();
    renderSalaAmistosa(); pintarSalaUI();
  }).catch(mostrarErrorCargaSalasAmistosas);
}
function conectarSseAmistosa() {
  if (_esAmistosa) try { _esAmistosa.close(); } catch (e) {}
  if (!amistosaId) return;
  _esAmistosa = null;
  try {
    _esAmistosa = new EventSource(rutaSalaAmistosa() + ".json");
    var onSse = function(e) {
      try {
        var m = JSON.parse(e.data); if (!m || !m.path) return;
        if (m.path === "/") amistosaCache = m.data || {};
        else applySsePatch(amistosaCache, m.path, m.data, e.type === "put");
        if (uid === amistosaCache.hostUid) {
          Object.keys(amistosaCache.eventos || {}).forEach(function(aid) { manejarEventoSalaAmistosa(amistosaCache.eventos[aid]); });
        }
        renderSalaAmistosa(); pintarSalaUI();
      } catch (e2) { console.error("Actualización de sala amistosa inválida:", e2); }
    };
    _esAmistosa.addEventListener("put", onSse); _esAmistosa.addEventListener("patch", onSse);
    _esAmistosa.onerror = function() { if (_esAmistosa && _esAmistosa.readyState === 2) setTimeout(conectarSseAmistosa, 2500); };
  } catch (err) { mostrarErrorSalaAmistosa(err); }
}

function manejarEventoSalaAmistosa(ev) {
  if (!usarSalaAmistosa() || uid !== amistosaCache.hostUid || !ev || !ev.ts || !ev.antId) return;
  var key = ev.antId + ":" + ev.ts;
  if (_amEventosVistos[key]) return;
  _amEventosVistos[key] = true;
  if (Math.abs(ahoraSrv() - Number(ev.ts)) > 8000) return;
  if (ev.pilotoUid && amistosaCache.pilotos && amistosaCache.pilotos[ev.pilotoUid]) registrarVueltaAmistosa(ev.pilotoUid, Number(ev.ts), false);
}

function renderSalaAmistosa() {
  var entry = document.getElementById("amRoomEntry"), panel = document.getElementById("amRoomPanel");
  var sub = document.getElementById("amLegacyControls");
  if (!entry || !panel) return;
  var joined = !!amistosaId;
  entry.style.display = joined ? "none" : "block";
  panel.style.display = joined ? "block" : "none";
  if (sub) sub.style.display = joined ? "none" : "block";
  if (!joined) return;
  var room = amistosaCache || {}, sala = room.sala || {}, host = uid === room.hostUid;
  document.getElementById("lblSalaAmistosa").textContent = "🏁 SALA " + amistosaId + " · " + (host ? "ERES EL ORGANIZADOR" : ("ORGANIZA " + (room.hostName || "PILOTO")));
  var status = sala.estado || "ESPERA";
  document.getElementById("lblEstadoAmistosa").textContent = "Estado: " + status + " · " + (sala.modoJuego || "NORMAL") +
    (Number(sala.duracionMin) ? " · " + sala.duracionMin + " min" : " · libre");
  var pilots = room.pilotos || {}, gar = room.garaje || {};
  var roster = Object.keys(pilots).map(function(id) {
    var p = pilots[id], g = gar[id] || {}, active = p.enPista !== false && Math.abs(ahoraSrv() - Number(p.tsActivo || 0)) < 25000;
    return (active ? "🟢 " : "⚪ ") + (Number(p.vueltas || 0) ? (p.vueltas + "v ") : "") + "#" + esc(p.dorsal || g.dorsal || "--") + " " + esc(p.nombre || "Piloto") + renderSwatches(g);
  });
  document.getElementById("listaPilotosAmistosa").innerHTML = roster.length ? roster.join("<br>") : "Esperando pilotos...";
  var controls = document.getElementById("amOrganizerControls");
  controls.style.display = host && room.status === "ACTIVE" ? "block" : "none";
  if (host) {
    var mode = document.getElementById("selModoAmistosa"), duration = document.getElementById("selDuracionAmistosa");
    if (document.activeElement !== mode) mode.value = sala.modoJuego || "NORMAL";
    if (document.activeElement !== duration) duration.value = String(Number(sala.duracionMin) || 0);
  }
  var roles = room.rolesAntena || {};
  document.getElementById("amUltimoResultado").innerHTML =
    "Meta: " + (roles.ant_1 && Math.abs(ahoraSrv() - Number(roles.ant_1.ts || 0)) < 15000 ? "🟢 conectada" : "⚪ libre") +
    " · Refuerzo: " + (roles.ant_2 && Math.abs(ahoraSrv() - Number(roles.ant_2.ts || 0)) < 15000 ? "🟢 conectada" : "⚪ libre");
  if (sala.estado === "FINISHED" && sala.resultadoId && room.resultados && room.resultados[sala.resultadoId]) {
    var result = room.resultados[sala.resultadoId];
    document.getElementById("amUltimoResultado").innerHTML += "<br><b style='color:#ffc107'>🏁 RESULTADO AMISTOSO GUARDADO</b><br>" +
      (result.res || []).map(function(r, i) { return (i + 1) + "º " + esc(r.nombre) + " · " + (r.vueltas || 0) + "v · " + fmt(r.mejorMs); }).join("<br>");
  }
}

function asegurarOrganizadorAmistoso() {
  if (!usarSalaAmistosa()) { alert("La sala amistosa no está activa o Dirección ha tomado el control del circuito."); return false; }
  if (uid !== amistosaCache.hostUid) { alert("Solo el organizador puede cambiar la manga."); return false; }
  return true;
}
function guardarConfigSalaAmistosa() {
  if (!asegurarOrganizadorAmistoso()) return;
  var sala = amistosaCache.sala || {}, mode = document.getElementById("selModoAmistosa").value;
  if (sala.estado === "EN_CURSO" || sala.estado === "WARMUP" || sala.estado === "VALLA_MX") { alert("Espera a que termine la salida o la manga antes de cambiar el modo."); return; }
  var duration = Number(document.getElementById("selDuracionAmistosa").value);
  escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", { modoJuego: mode, duracionMin: duration, modoDet: "GAR", minLapSec: 5 })
    .then(function() { amistosaCache.sala = Object.assign({}, sala, { modoJuego: mode, duracionMin: duration, modoDet: "GAR", minLapSec: 5 }); renderSalaAmistosa(); pintarSalaUI(); })
    .catch(mostrarErrorSalaAmistosa);
}
function reiniciarDatosMangaAmistosa() {
  var pilots = Object.assign({}, amistosaCache.pilotos || {}), ah = ahoraSrv();
  Object.keys(pilots).forEach(function(id) {
    pilots[id] = Object.assign({}, pilots[id], { vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false, enPista: true, tsActivo: ah });
  });
  return escribirSalaAmistosa(rutaSalaAmistosa() + "/pilotos.json", "PUT", pilots).then(function() {
    amistosaCache.pilotos = pilots;
  });
}
function iniciarWarmupAmistosa() {
  if (!asegurarOrganizadorAmistoso()) return;
  var ants = amistosaCache.antenas || {}, now = ahoraSrv();
  var online = Object.keys(ants).filter(function(k) { return Math.abs(now - Number(ants[k].ts || 0)) < 15000; });
  if (!online.length || online.some(function(k) { return !ants[k].calibrada; })) {
    alert("Conecta y calibra al menos una antena compartida antes del Warm-Up.");
    return;
  }
  reiniciarDatosMangaAmistosa().then(function() {
    var ah = ahoraSrv(), sala = Object.assign({}, amistosaCache.sala || {});
    sala.estado = "WARMUP"; sala.tsInicio = ah + 180000; sala.tsCuenta = 0;
    sala.heatId = String(ah); sala.diaKey = claveDiaAmistosa(ah); sala.resultadoId = "";
    sala.ultPasoTs = 0; sala.ultPasoTxt = ""; sala.ruleta = null;
    avisoFinManga = false; _wuFinAvisoP = false; _ultSecWuP = -1; _amUltFin = "";
    _ultRondaElim = 0; _ultRondaRuleta = 0; _bombaExplotada = false; avisoLipoP = false;
    return escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PUT", sala).then(function() {
      amistosaCache.sala = sala;
    });
  }).then(function() {
    mxHablar("Atencion pilotos, comienza el Warm-Up amistoso de tres minutos", vozP);
    renderSalaAmistosa(); pintarSalaUI();
  }).catch(mostrarErrorSalaAmistosa);
}
function salidaVallaAmistosa() {
  if (!asegurarOrganizadorAmistoso()) return;
  var sala = amistosaCache.sala || {};
  if (sala.estado === "WARMUP") { alert("Espera a que termine el Warm-Up y llame a los pilotos a parrilla."); return; }
  var ah = ahoraSrv(), tsCuenta = ah + 30000, tsInicio = tsCuenta - 4000 + Math.floor(Math.random() * 5000);
  var patch = { estado: "VALLA_MX", tsCuenta: tsCuenta, tsInicio: tsInicio, heatId: sala.heatId || String(ah), diaKey: sala.diaKey || claveDiaAmistosa(ah), resultadoId: "", ruleta: null };
  if ((sala.modoJuego || "NORMAL") === "RULETA" && typeof RULETA_RETOS !== "undefined" && RULETA_RETOS.length) {
    var reto = RULETA_RETOS[Math.floor(Math.random() * RULETA_RETOS.length)];
    patch.ruleta = { ronda: ah, texto: reto.tit, voz: reto.voz };
  }
  var pilots = {};
  Object.keys(amistosaCache.pilotos || {}).forEach(function(id) {
    pilots[id] = Object.assign({}, amistosaCache.pilotos[id], { tsUltimoPaso: 0 });
  });
  Promise.all([
    escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", patch),
    escribirSalaAmistosa(rutaSalaAmistosa() + "/pilotos.json", "PUT", pilots)
  ]).then(function() {
    Object.assign(sala, patch); amistosaCache.sala = sala; amistosaCache.pilotos = pilots;
    ultSegSemP = -99; mxHablar("Atencion pilotos, treinta segundos para la Valla MX amistosa", vozP); renderSalaAmistosa(); pintarSalaUI();
  })
    .catch(mostrarErrorSalaAmistosa);
}
function construirResultadoAmistoso(motivo) {
  var sala = amistosaCache.sala || {}, pilots = ordenarPilotos(amistosaCache.pilotos || {}, sala);
  return {
    id: amistosaId + "_" + String(sala.heatId || sala.tsInicio || ahoraSrv()),
    etiqueta: "Amistosa", circuitoId: circId, circuito: circNom, sala: amistosaId,
    modo: sala.modoJuego || "NORMAL", duracionMin: Number(sala.duracionMin) || 0,
    inicio: Number(sala.tsInicio) || 0, final: ahoraSrv(), motivo: motivo || "Finalizada",
    res: pilots.map(function(p, i) {
      return { id: p.id, nombre: p.nombre || "Piloto", dorsal: p.dorsal || "1", posicion: i + 1, vueltas: Number(p.vueltas) || 0, ultimaMs: Number(p.ultimaMs) || 0, mejorMs: Number(p.mejorMs) || 0, eliminado: !!p.eliminado };
    })
  };
}
function finalizarMangaAmistosa(motivo) {
  if (!asegurarOrganizadorAmistoso()) return Promise.resolve(false);
  var sala = amistosaCache.sala || {}, heatId = String(sala.heatId || sala.tsInicio || "");
  if (!heatId || sala.resultadoId === heatId || _amUltFin === heatId) return Promise.resolve(false);
  _amUltFin = heatId;
  var result = construirResultadoAmistoso(motivo), day = sala.diaKey || claveDiaAmistosa(result.final);
  var resultKey = amistosaId + "_" + heatId;
  var resultPath = FB_ROOT + "/resultados_dia_amistosas/" + circId + "/" + day + "/" + resultKey + ".json";
  return Promise.all([
    escribirSalaAmistosa(resultPath, "PUT", result),
    escribirSalaAmistosa(rutaSalaAmistosa() + "/resultados/" + heatId + ".json", "PUT", result),
    escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", { estado: "FINISHED", finTs: result.final, resultadoId: heatId, resultadoGuardado: heatId, motivoFin: motivo || "Finalizada" })
  ]).then(function() {
    amistosaCache.resultados = amistosaCache.resultados || {}; amistosaCache.resultados[heatId] = result;
    Object.assign(sala, { estado: "FINISHED", finTs: result.final, resultadoId: heatId, resultadoGuardado: heatId, motivoFin: motivo || "Finalizada" });
    avisoFinManga = true; _lastSalaSig = ""; renderSalaAmistosa(); pintarSalaUI();
    return true;
  }).catch(function(err) { _amUltFin = ""; mostrarErrorSalaAmistosa(err); return false; });
}
function detenerMangaAmistosa() {
  if (!asegurarOrganizadorAmistoso()) return;
  if ((amistosaCache.sala || {}).estado === "EN_CURSO") { finalizarMangaAmistosa("Parada por el organizador"); return; }
  var sala = amistosaCache.sala || {};
  escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", { estado: "ESPERA", tsInicio: 0, tsCuenta: 0 })
    .then(function() { Object.assign(sala, { estado: "ESPERA", tsInicio: 0, tsCuenta: 0 }); renderSalaAmistosa(); pintarSalaUI(); })
    .catch(mostrarErrorSalaAmistosa);
}
function cerrarSalaAmistosa() {
  if (!asegurarOrganizadorAmistoso()) return;
  if (!confirm("¿Cerrar esta sala amistosa? La clasificación de la manga actual se guardará sin puntos oficiales.")) return;
  var sala = amistosaCache.sala || {}, finalizar = sala.estado === "EN_CURSO" ? finalizarMangaAmistosa("Sala cerrada") : Promise.resolve(true);
  finalizar.then(function(ok) {
    if (ok === false) return;
    return escribirSalaAmistosa(rutaSalaAmistosa() + ".json", "PATCH", { status: "FINISHED", closedAt: ahoraSrv() });
  }).then(function() {
    amistosaCache.status = "FINISHED"; renderSalaAmistosa(); pintarSalaUI();
  }).catch(mostrarErrorSalaAmistosa);
}
function salirSalaAmistosa() {
  if (!amistosaId) return;
  if (uid === amistosaCache.hostUid && amistosaCache.status === "ACTIVE") {
    alert("Como organizador, cierra la sala antes de salir para guardar el resultado.");
    return;
  }
  var path = rutaSalaAmistosa();
  escribirSalaAmistosa(path + "/pilotos/" + uid + ".json", "PATCH", { enPista: false, tsActivo: 0, salidaTs: ahoraSrv() })
    .then(function() {
      if (_esAmistosa) try { _esAmistosa.close(); } catch (e) {}
      localStorage.removeItem("mxp_sala_amistosa_" + circId);
      amistosaId = ""; amistosaCache = {}; _esAmistosa = null; renderSalaAmistosa(); pintarSalaUI(); refrescarSalasAmistosas();
    }).catch(mostrarErrorSalaAmistosa);
}
function ofrecerAntenaAmistosa(tipo) {
  if (!usarSalaAmistosa()) { alert("Únete a una sala activa antes de ofrecer el teléfono como antena."); return; }
  if (uid === amistosaCache.hostUid) { alert("Mantén abierto el móvil del organizador para controlar la salida y registrar la manga. Pide a otro piloto que ceda su teléfono como antena."); return; }
  var aid = tipo === "META" ? "ant_1" : "ant_2", path = rutaSalaAmistosa() + "/rolesAntena/" + aid;
  fbJson(path + ".json").then(function(claim) {
    if (claim && claim.uid !== uid && Math.abs(ahoraSrv() - Number(claim.ts || 0)) < 15000) { alert("Ese puesto ya está ocupado por otro teléfono."); return; }
    var data = { uid: uid, nombre: miNom, tipo: tipo, ts: ahoraSrv() };
    return escribirSalaAmistosa(path + ".json", "PUT", data).then(function() {
      var url = "antena.html?amistosa=" + encodeURIComponent(amistosaId) + "&puesto=" + encodeURIComponent(aid);
      location.href = url;
    });
  }).catch(mostrarErrorSalaAmistosa);
}

function registrarVueltaAmistosa(pUid, evTs, esManual) {
  if (!usarSalaAmistosa()) return;
  var roomPilots = amistosaCache.pilotos || {}, p = roomPilots[pUid], sala = amistosaCache.sala || {}, ah = Number(evTs || ahoraSrv());
  if (!p || (p.eliminado && esManual)) return;
  if (uid !== amistosaCache.hostUid && !esManual) return;
  var state = sala.estado || "ESPERA", minMs = esManual ? 900 : Math.max(900, (Number(sala.minLapSec) || 5) * 1000);
  if (state === "WARMUP" || state === "ESPERA" || state === "TEST" || state === "VALLA_MX" && ah < Number(sala.tsInicio || 0)) {
    if (!esManual) {
      p.sensorOk = true;
      escribirSalaAmistosa(rutaSalaAmistosa() + "/pilotos/" + pUid + ".json", "PATCH", { sensorOk: true, tsActivo: ahoraSrv() }).catch(mostrarErrorSalaAmistosa);
      Object.assign(sala, { ultPasoTs: ah, ultPasoTxt: (p.nombre || "Piloto") + " (Prueba amistosa OK)" });
      escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", { ultPasoTs: ah, ultPasoTxt: sala.ultPasoTxt }).catch(mostrarErrorSalaAmistosa);
    } else {
      document.getElementById("lblDeltaVivo").textContent = "⏳ Espera a que comience la manga amistosa.";
    }
    return;
  }
  if (state !== "EN_CURSO" && !(state === "VALLA_MX" && ah >= Number(sala.tsInicio || 0))) {
    if (esManual) alert("La manga amistosa todavía no está en curso.");
    return;
  }
  if (state === "VALLA_MX") {
    sala.estado = "EN_CURSO";
    escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", { estado: "EN_CURSO" }).catch(mostrarErrorSalaAmistosa);
  }
  if (uid !== amistosaCache.hostUid && !esManual) return;
  var ult = Number(p.tsUltimoPaso || 0), heat = String(sala.heatId || sala.tsInicio || "libre");
  if (ult && ah - ult < minMs) return;
  var lap = ah - (ult || Number(sala.tsInicio || 0) || ah);
  if (lap < (esManual ? 900 : 1500)) return;
  var vueltas = Number(p.vueltas || 0) + 1, mejor = (!p.mejorMs || lap < Number(p.mejorMs)) ? lap : Number(p.mejorMs);
  var lockKey = pUid + "_" + heat + "_v" + vueltas;
  if (_amLockVta[lockKey]) return;
  _amLockVta[lockKey] = true;
  var pAnterior = Object.assign({}, p), salaAnterior = Object.assign({}, sala);
  Object.assign(p, { vueltas: vueltas, ultimaMs: lap, mejorMs: mejor, tsUltimoPaso: ah, enPista: true, tsActivo: ahoraSrv(), sensorOk: true });
  var patchS = { ultPasoTs: ah, ultPasoTxt: (p.nombre || "Piloto") + " #" + (p.dorsal || "1") + " (" + fmt(mejor) + ")" };
  if (!sala.hotlapMs || lap < Number(sala.hotlapMs)) { patchS.hotlapMs = lap; patchS.hotlapTxt = (p.nombre || "Piloto") + " — " + fmt(lap); }
  Object.assign(sala, patchS); _lastSalaSig = "";
  Promise.all([
    escribirSalaAmistosa(rutaSalaAmistosa() + "/pilotos/" + pUid + ".json", "PATCH", p),
    escribirSalaAmistosa(rutaSalaAmistosa() + "/sala.json", "PATCH", patchS)
  ]).then(function() {
    if (esManual) document.getElementById("lblDeltaVivo").textContent = "✅ Vuelta amistosa " + vueltas + " · " + fmt(lap);
    pintarSalaUI(); renderSalaAmistosa();
  }).catch(function(err) {
    Object.assign(p, pAnterior);
    Object.keys(patchS).forEach(function(k) { if (typeof salaAnterior[k] === "undefined") delete sala[k]; });
    Object.assign(sala, salaAnterior);
    delete _amLockVta[lockKey]; mostrarErrorSalaAmistosa(err);
  });
}

function cmdSalaAmistosa(est) {
  desbloquearAudioP(false);
  if (usarSalaAmistosa()) {
    alert("Esta sala tiene controles propios. Usa Warm-Up, Valla MX y Parar dentro del panel de la sala amistosa.");
    return;
  }
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
  var s = 10, b = document.getElementById("btnCalAmistosa"), ants = usarSalaAmistosa() ? (amistosaCache.antenas || {}) : (rootCache.antenas || {});
  var fbActiva = usarSalaAmistosa() ? rutaSalaAmistosa() : FB;
  mxHablar("Coloca el movil en meta y retirate, calibrando en 10 segundos", vozP);
  _tCal10 = setInterval(function() {
    if (b) b.textContent = "⏳ CALIBRANDO EN " + s + "s..."; if (s <= 5 && s >= 1) mxHablar(String(s), vozP);
    if (s <= 0) {
      clearInterval(_tCal10); _tCal10 = null;
      var aks = Object.keys(ants).filter(function(k){ return Math.abs(ahoraSrv() - Number(ants[k].ts || 0)) < 15000; }); if (!aks.length) aks = ["ant_1"];
      aks.forEach(function(aid, ix){ setTimeout(function(){ fetch(fbActiva + "/sala/cmd.json", { method: "PUT", body: JSON.stringify({ ts: ahoraSrv(), antId: aid, calibrar: true }) }).catch(function(){}); }, ix * 800); });
      if (b) { b.textContent = "✅ PISTA CALIBRADA OK"; b.style.background = "#20c997"; }
      mxHablar("Pista vacia calibrada", vozP);
    }
    s--;
  }, 1000);
}

function registrarVuelta(pUid, evTs, esManual) {
  if (usarSalaAmistosa()) { registrarVueltaAmistosa(pUid, evTs, esManual); return; }
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
  if (usarSalaAmistosa()) return;
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
  var ants = usarSalaAmistosa() ? (amistosaCache.antenas || {}) : (rootCache.antenas || {}), ah = ahoraSrv();
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
  var usaAmistosa = usarSalaAmistosa(), base = usaAmistosa ? rutaSalaAmistosa() : FB;
  var s = usaAmistosa ? (amistosaCache.sala || {}) : (rootCache.sala || {}), est = s.estado || "ESPERA", t0 = Number(s.tsInicio || 0), ah = ahoraSrv();
  aplicarBanderaUI(s, "banBanderaAmP");
  var ov = document.getElementById("overlaySem"), nowLoc = Date.now(), dirOn = usaAmistosa ? false : (s.dirTs && Math.abs(ah - Number(s.dirTs)) < 30000);

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
        fetch(base + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0 }) }).catch(function(){});
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
        if (!dirOn) { s.estado = "EN_CURSO"; fetch(base + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "EN_CURSO" }) }).catch(function(){}); }
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
  var usaAmistosa = usarSalaAmistosa(), s = usaAmistosa ? (amistosaCache.sala || {}) : (rootCache.sala || {});
  var inicio = Number(s.tsInicio || 0), duracion = Number(s.duracionMin || 0);
  if (s.estado !== "EN_CURSO" || inicio <= 0 || duracion <= 0) return;
  var restante = inicio + duracion * 60000 - ahoraSrv(), texto = restante > 0 ? ("MANGA " + fmtCuentaRegresivaManga(restante)) : "FIN MANGA";
  var lbl = document.getElementById("lblEstadoSala");
  if (lbl.textContent !== texto) lbl.textContent = texto;
  if (restante <= 0) {
    if (!avisoFinManga) {
      avisoFinManga = true;
      var dirOn = s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 30000;
      if (!dirOn) mxHablar("Tiempo de manga cumplido, bandera a cuadros", vozP);
    }
    if (usaAmistosa && uid === amistosaCache.hostUid && s.resultadoGuardado !== String(s.heatId || s.tsInicio || "")) {
      finalizarMangaAmistosa("Tiempo cumplido");
    }
  }
}

function pintarSalaUI() {
  var usaAmistosa = usarSalaAmistosa();
  var s = usaAmistosa ? (amistosaCache.sala || {}) : (rootCache.sala || {});
  var pObj = usaAmistosa ? (amistosaCache.pilotos || {}) : (rootCache.pilotos || {});
  var gar = usaAmistosa ? (amistosaCache.garaje || {}) : (rootCache.garaje || {}), ah = ahoraSrv();
  pintarAntStatusP();
  if (!usaAmistosa && pObj[uid]) {
    var vAct = Number(pObj[uid].vueltas || 0), lAct = Number(pObj[uid].ultimaMs || 0), tsP = Number(pObj[uid].tsUltimoPaso || 0);
    if (_ultVtasSinc >= 0 && vAct > _ultVtasSinc && lAct > 0 && tsP !== _ultLapSinc) {
      _ultLapSinc = tsP; _bombaExplotada = false;
      mxGar.procesarMiVuelta(lAct, Number(pObj[uid].mejorMs || lAct), ordenarPilotos(pObj, s), "lblDeltaVivo", "deltaBol");
    }
    _ultVtasSinc = vAct;
  }

  var dirOn = usaAmistosa ? false : (s.dirTs && Math.abs(ah - Number(s.dirTs)) < 30000);
  document.getElementById("boxAmistosa").style.display = (!dirOn) ? "block" : "none";
  renderSalaAmistosa();
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
    if (s.modoJuego === "ELIM" && !dirOn && (!usaAmistosa || uid === amistosaCache.hostUid)) {
      var rE = Math.floor(elapsed / 60000);
      if (rE > _ultRondaElim && rE >= 1) {
        _ultRondaElim = rE; var act = pils.filter(function(x){ return !x.eliminado; });
        if (act.length > 1) {
          var uP = act[act.length - 1], base = usaAmistosa ? rutaSalaAmistosa() : FB;
          fetch(base + "/pilotos/" + uP.id + ".json", { method: "PATCH", body: JSON.stringify({ eliminado: true }) }).catch(function(){});
          uP.eliminado = true; mxHablar("Eliminado: " + uP.nombre, vozP);
        }
      }
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
recuperarSalaAmistosa();

setInterval(function(){
  fetch(FB + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
  if (usarSalaAmistosa()) fetch(rutaSalaAmistosa() + "/pilotos/" + uid + ".json", { method: "PATCH", body: JSON.stringify({ enPista: true, tsActivo: ahoraSrv() }) }).catch(function(){});
}, 7000);
setInterval(function() {
  if (!_esRoot || _esRoot.readyState !== 1) {
    fbJson(FB + ".json?t=" + Date.now()).then(function(r) {
      if (!r) return;
      rootCache = { sala: r.sala || {}, antenas: r.antenas || {}, pilotos: r.pilotos || {}, garaje: r.garaje || {}, campeonato: r.campeonato || {}, eventos: r.eventos || {} };
      Object.keys(rootCache.eventos).forEach(function(aid){ manejarEventoAntena(rootCache.eventos[aid]); });
      pintarSalaUI(); if (_tabAct === "tiempos") mxGar.pintarTiempos();
    }).catch(function(){});
  }
  if (amistosaId && (!_esAmistosa || _esAmistosa.readyState !== 1)) {
    fbJson(rutaSalaAmistosa() + ".json?t=" + Date.now()).then(function(room) {
      if (room) { amistosaCache = room; renderSalaAmistosa(); pintarSalaUI(); }
    }).catch(mostrarErrorCargaSalasAmistosas);
  }
}, 4500);

setInterval(function() {
  actualizarSemaforoP();
  actualizarCuentaMangaP();
  var usaAmistosa = usarSalaAmistosa();
  var s = usaAmistosa ? (amistosaCache.sala || {}) : (rootCache.sala || {});
  var yo = usaAmistosa ? ((amistosaCache.pilotos || {})[uid] || {}) : ((rootCache.pilotos || {})[uid] || {});
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