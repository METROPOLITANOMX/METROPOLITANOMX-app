var _FB_ROOT = (typeof FB_ROOT !== "undefined") ? FB_ROOT : "https://metropolitano-mx-circuit-default-rtdb.firebaseio.com/mx_pro";
var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var FB = _FB_ROOT + "/circuitos/" + circId;
var circListaCache = {};

function _admFetchJson(url, opt) {
  if (typeof fbJson === "function") return fbJson(url, opt);
  return fetch(url, opt).then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}

function _admHash(txt) {
  if (typeof hashTxt === "function") return hashTxt(txt);
  var s = "MXPRO_2026_SALT_" + String(txt || "");
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function(buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("00" + b.toString(16)).slice(-2); }).join("");
    });
  }
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return Promise.resolve("fb_" + h.toString(16));
}

function escAdmJs(s) {
  return (typeof escJs === "function") ? escJs(s) : String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function aplicarRestriccionesAdmin() {
  if (typeof mxPerfilCodigo === "function" && mxPerfilCodigo() === "DIRECCION_LIMITADA") {
    ["cardAdmBorrados", "cardAdmPilotos", "cardAdmDescargas", "cardAdmCuentas"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
}

function verificarClaveAdm(clv) {
  return _admHash(clv).then(function(h) {
    return _admFetchJson(_FB_ROOT + "/config/dirHash.json?t=" + Date.now()).catch(function(){ return null; }).then(function(srvHash) {
      if (srvHash) {
        if (h === srvHash) return { ok: true };
        if (String(srvHash).length === 64 && String(h).indexOf("fb_") === 0) return { ok: false, motivo: "HTTP" };
        return { ok: false, motivo: "CLAVE" };
      }
      var legOk = (clv.split("").map(function(c){ return c.charCodeAt(0) ^ 7; }).join("-") === "53-55-53-49");
      return { ok: legOk, motivo: legOk ? "" : "CLAVE" };
    });
  });
}

function validarAccesoAdm() {
  var msg = document.getElementById("msgAuthAdm");
  try {
    var inp = document.getElementById("inpClvAdm");
    var clv = inp ? inp.value.trim() : "";
    if (!clv) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce la clave"; return; }
    msg.style.color = "#0dcaf0"; msg.textContent = "Verificando...";
    verificarClaveAdm(clv).then(function(res) {
      if (!res || !res.ok) {
        msg.style.color = "#ff4d5e";
        msg.textContent = (res && res.motivo === "HTTP")
          ? "⚠️ Abre la web con HTTPS para validar la clave SHA-256."
          : "❌ Clave incorrecta (usa la clave actual de Direccion).";
        return;
      }
      localStorage.setItem("mxp_adm_ok", "1");
      msg.textContent = "";
      arrancarAdmin();
    }).catch(function(err){
      msg.style.color = "#ff4d5e";
      msg.textContent = "Error de red: " + ((err && err.message) || "sin conexion");
    });
  } catch (e) {
    if (msg) { msg.style.color = "#ff4d5e"; msg.textContent = "Error: " + e.message; }
  }
}

function salirAdm() {
  localStorage.removeItem("mxp_adm_ok");
  location.href = "index.html";
}

function arrancarAdmin() {
  document.getElementById("modalAuthAdm").style.display = "none";
  document.getElementById("admWrap").style.display = "block";
  aplicarRestriccionesAdmin();
  cargarTodoAdm();
}

function cargarTodoAdm() {
  aplicarRestriccionesAdmin();
  cargarCircuitosAdm();
  cargarAccesoCfgAdm();
  cargarPilotosAdm();
  cargarCuentasAdm(false);
}

function actualizarCircHeaderAdm() {
  FB = _FB_ROOT + "/circuitos/" + circId;
  document.getElementById("txtCircAdm").textContent = "🏁 " + circNom + " (" + circId + ")";
}

function cambiarCircAdm(id) {
  if (!id) return;
  circId = id;
  circNom = (circListaCache[id] && circListaCache[id].nombre) ? circListaCache[id].nombre : id;
  localStorage.setItem("mxp_circ_id", circId);
  localStorage.setItem("mxp_circ_nom", circNom);
  actualizarCircHeaderAdm();
  cargarPilotosAdm();
}

function cargarCircuitosAdm() {
  actualizarCircHeaderAdm();
  _admFetchJson(_FB_ROOT + "/circuitos_lista.json?t=" + Date.now()).then(function(cs) {
    circListaCache = cs || {};
    if (!circListaCache.METROPOLITANO) circListaCache.METROPOLITANO = { nombre: "METROPOLITANO CIRCUIT", metros: 200 };
    var keys = Object.keys(circListaCache);
    var sel = document.getElementById("selCircAdm");
    sel.innerHTML = keys.map(function(k) {
      var nom = (circListaCache[k] && circListaCache[k].nombre) || k;
      return "<option value='" + esc(k) + "'" + (k === circId ? " selected" : "") + ">" + esc(nom) + " (" + esc(k) + ")</option>";
    }).join("");
    if (circListaCache[circId] && circListaCache[circId].nombre) {
      circNom = circListaCache[circId].nombre;
      actualizarCircHeaderAdm();
    }
    var lst = document.getElementById("listaCircsAdm");
    lst.innerHTML = keys.map(function(k) {
      var c = circListaCache[k] || {}, nom = c.nombre || k;
      var btnDel = (k === "METROPOLITANO")
        ? "<span style='font-size:10px;color:#20c997'>Principal</span>"
        : "<button onclick=\"vibrar();borrarCircuitoAdm('" + escAdmJs(k) + "','" + escAdmJs(nom) + "')\" style='background:#dc3545;color:#fff;padding:4px 8px;font-size:10px'>Borrar</button>";
      return "<div class='fila'><span><b>" + esc(nom) + "</b> <small style='color:#888'>(" + esc(k) + ")</small></span>" + btnDel + "</div>";
    }).join("") || "<div style='color:#777;font-size:11px'>Sin circuitos registrados.</div>";
  }).catch(function(){});
}

function borrarCircuitoAdm(id, nom) {
  if (id === "METROPOLITANO") { alert("El circuito principal no se puede borrar."); return; }
  if (!confirm("⚠️ ¿Seguro que quieres BORRAR el circuito '" + (nom || id) + "' y todos sus datos?")) return;
  Promise.all([
    fetch(_FB_ROOT + "/circuitos_lista/" + id + ".json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/circuitos/" + id + ".json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/warmup_capturas/" + id + ".json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/antenas_img/" + id + ".json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/foto_finish/" + id + ".json", { method: "DELETE" })
  ]).then(function() {
    if (circId === id) { circId = "METROPOLITANO"; circNom = "METROPOLITANO CIRCUIT"; localStorage.setItem("mxp_circ_id", circId); localStorage.setItem("mxp_circ_nom", circNom); }
    cargarCircuitosAdm(); cargarPilotosAdm();
    alert("Circuito borrado ✓");
  }).catch(function(){ alert("Error borrando circuito"); });
}

function cargarAccesoCfgAdm() {
  _admFetchJson(_FB_ROOT + "/config/acceso.json?t=" + Date.now()).then(function(a) {
    if (!a) return;
    if (a.modo) document.getElementById("selModoAcceso").value = a.modo;
    if (typeof a.codigo === "string") document.getElementById("inpCodAcceso").value = a.codigo;
  }).catch(function(){});
}

function guardarAccesoCfg(avisar) {
  var modo = document.getElementById("selModoAcceso").value, cod = document.getElementById("inpCodAcceso").value.trim();
  _admFetchJson(_FB_ROOT + "/config/acceso.json", { method: "PUT", body: JSON.stringify({ modo: modo, codigo: cod, ts: ahoraSrv() }) })
    .then(function(){ if (avisar) alert("Control de descargas actualizado (" + modo + ") ✓"); })
    .catch(function(){ alert("Error guardando configuracion"); });
}

function borrarHotlapAdm() {
  if (!confirm("¿Seguro que quieres borrar el record de Hotlap semanal de " + circNom + "?")) return;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ hotlapMs: null, hotlapTxt: null, ultPasoTs: null, ultPasoTxt: null }) })
    .then(function(){ alert("Hotlap semanal borrada ✓"); }).catch(function(){ alert("Error"); });
}

function borrarTiemposDiaAdm() {
  if (!confirm("¿Seguro que quieres borrar todos los tiempos del dia, mangas y eventos de " + circNom + "?")) return;
  Promise.all([
    fetch(FB + "/campeonato.json", { method: "DELETE" }),
    fetch(FB + "/pasos_lock.json", { method: "DELETE" }),
    fetch(FB + "/eventos.json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/foto_finish/" + circId + ".json", { method: "DELETE" }),
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0, tsCuenta: 0 }) })
  ]).then(function() {
    return _admFetchJson(FB + "/pilotos.json").catch(function(){ return null; }).then(function(ps) {
      if (!ps) return;
      return Promise.all(Object.keys(ps).map(function(k) {
        return fetch(FB + "/pilotos/" + k + ".json", { method: "PATCH", body: JSON.stringify({ vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false }) }).catch(function(){});
      }));
    });
  }).then(function(){ cargarPilotosAdm(); alert("Tiempos del dia borrados ✓"); }).catch(function(){ alert("Error"); });
}

function verRankingAdm(toggle) {
  var bx = document.getElementById("boxRankingAdm");
  if (toggle) bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  bx.innerHTML = "<div style='color:#888;font-size:11px'>Cargando ranking mundial...</div>";
  _admFetchJson(_FB_ROOT + "/mundial.json?t=" + Date.now()).then(function(m) {
    if (!m) { bx.innerHTML = "<div style='color:#888;font-size:11px'>Ranking mundial vacio ✓</div>"; return; }
    var ks = Object.keys(m).sort(function(a, b) {
      return ((m[a] && m[a].teorico200Ms) || 9e9) - ((m[b] && m[b].teorico200Ms) || 9e9);
    });
    bx.innerHTML = ks.map(function(k, ix) {
      var r = m[k]; if (!r) return "";
      return "<div class='fila'><span><b>" + (ix + 1) + "º</b> " + esc(r.nombre || k) + " <small style='color:#888'>(" + esc(r.circuito || "") + " • " + fmt(r.teorico200Ms || r.mejorMs) + ")</small></span>" +
        "<button onclick=\"vibrar();borrarItemRankingAdm('" + escAdmJs(k) + "')\" style='background:#dc3545;color:#fff;padding:4px 8px;font-size:10px'>Borrar</button></div>";
    }).join("") || "<div style='color:#888;font-size:11px'>Ranking vacio ✓</div>";
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error cargando ranking</div>"; });
}

function borrarItemRankingAdm(k) {
  if (!confirm("¿Borrar este registro del Ranking Mundial?")) return;
  fetch(_FB_ROOT + "/mundial/" + k + ".json", { method: "DELETE" }).then(function(){ verRankingAdm(false); }).catch(function(){});
}

function borrarRankingAdm() {
  if (!confirm("⚠️ ¿Seguro que quieres VACIAR POR COMPLETO el Ranking Mundial de todos los pilotos?")) return;
  fetch(_FB_ROOT + "/mundial.json", { method: "DELETE" }).then(function() {
    var bx = document.getElementById("boxRankingAdm");
    if (bx.style.display === "block") bx.innerHTML = "<div style='color:#888;font-size:11px'>Ranking mundial vacio ✓</div>";
    alert("Ranking Mundial vaciado ✓");
  }).catch(function(){ alert("Error"); });
}

function cargarPilotosAdm() {
  var lst = document.getElementById("listaPilotosAdm"), st = document.getElementById("lblPistaStatusAdm");
  Promise.all([
    _admFetchJson(FB + "/sala.json?t=" + Date.now()).catch(function(){ return {}; }),
    _admFetchJson(FB + "/pilotos.json?t=" + Date.now()).catch(function(){ return {}; })
  ]).then(function(res) {
    var s = res[0] || {}, pAll = res[1] || {}, pils = ordenarPilotos(pAll, s), actCnt = 0;
    st.textContent = pils.length + " en sala";
    lst.innerHTML = pils.map(function(p, ix) {
      if (p.activo) actCnt++;
      var dot = p.activo ? "🟢" : "⚪";
      return "<div class='fila'><span>" + dot + " <b>" + (ix + 1) + "º #" + esc(p.dorsal || "--") + " " + esc(p.nombre) + "</b> (" + (p.vueltas || 0) + "v • " + fmt(p.mejorMs) + ")</span>" +
        "<span>" + (p.vueltas > 0 ? "<button onclick=\"vibrar();restarVueltaAdm('" + escAdmJs(p.id) + "'," + Number(p.vueltas) + "," + Number(s.tsInicio || 0) + ")\" style='background:#553300;color:#ffc107;padding:3px 6px;font-size:10px;margin-right:3px'>-1v</button>" : "") +
        "<button onclick=\"vibrar();expulsarPilotoAdm('" + escAdmJs(p.id) + "')\" style='background:#dc3545;color:#fff;padding:3px 6px;font-size:10px'>✕</button></span></div>";
    }).join("") || "<div style='color:#777;font-size:11px'>Ningun piloto en sala.</div>";
    st.textContent = actCnt > 0 ? ("🟢 " + actCnt + " activos / " + pils.length) : ("⚪ " + pils.length + " en lista");
  }).catch(function(){ lst.innerHTML = "<div style='color:#ff4d5e'>Error cargando pilotos</div>"; });
}

function restarVueltaAdm(pUid, oldV, tsIni) {
  var newV = Math.max(0, Number(oldV || 0) - 1), pay = { vueltas: newV, ultimaMs: 0 };
  if (newV === 0) { pay.mejorMs = 0; pay.tsUltimoPaso = 0; }
  var heatTag = Number(tsIni || 0) || "free";
  Promise.all([
    fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify(pay) }),
    fetch(FB + "/pasos_lock/" + pUid + "_" + heatTag + "_v" + oldV + ".json", { method: "DELETE" }),
    fetch(FB + "/pasos_lock/" + pUid + "_v" + oldV + ".json", { method: "DELETE" })
  ]).then(cargarPilotosAdm).catch(function(){});
}

function expulsarPilotoAdm(pUid) {
  if (!confirm("¿Expulsar a este piloto de la parrilla?")) return;
  fetch(FB + "/pilotos/" + pUid + ".json", { method: "DELETE" }).then(cargarPilotosAdm).catch(function(){});
}

function limpiarOfflineAdm() {
  _admFetchJson(FB + "/pilotos.json?t=" + Date.now()).then(function(pAll) {
    if (!pAll) return;
    return Promise.all(Object.keys(pAll).map(function(k) {
      if (pAll[k] && !esPilotoActivo(pAll[k])) return fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" }).catch(function(){});
    }));
  }).then(cargarPilotosAdm).catch(function(){});
}

function filaCuentaAdmHtml(k, u) {
  var nom = u.nombre || k;
  return "<div class='fila'><span><b>" + esc(nom) + "</b> (" + esc(u.rol || "PILOTO") + ") " + (u.bloqueado ? "⛔" : "✅") + "</span>" +
    "<div><button onclick=\"vibrar();bloqCtaAdm('" + escAdmJs(k) + "'," + (!u.bloqueado) + ",'" + escAdmJs(nom) + "')\" style='background:" + (u.bloqueado ? "#20c997" : "#ffc107") + ";color:#000;padding:4px 7px;font-size:10px;margin-right:3px'>" + (u.bloqueado ? "Activar" : "Bloquear") + "</button>" +
    "<button onclick=\"vibrar();delCtaAdm('" + escAdmJs(k) + "','" + escAdmJs(nom) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>Borrar</button></div></div>";
}

function cargarCuentasAdm(forceMsg) {
  var lst = document.getElementById("listaCuentasIdx");
  if (forceMsg) lst.innerHTML = "<div style='color:#888;font-size:11px'>Cargando cuentas...</div>";
  _admFetchJson(_FB_ROOT + "/cuentas_idx.json?t=" + Date.now()).then(function(ct) {
    if (!ct) { lst.innerHTML = "<div style='color:#888;font-size:11px'>Sin cuentas indexadas. Usa el buscador arriba.</div>"; return; }
    lst.innerHTML = Object.keys(ct).map(function(k){ return ct[k] ? filaCuentaAdmHtml(k, ct[k]) : ""; }).join("");
  }).catch(function(){ lst.innerHTML = "<div style='color:#ff4d5e'>Error cargando cuentas</div>"; });
}

function buscarCuentaAdm() {
  var nom = document.getElementById("inpBuscarCta").value.trim(), k = nom.toLowerCase().replace(/[^a-z0-9]/g, ""), res = document.getElementById("resBuscarCta");
  if (!k) { res.innerHTML = ""; return; }
  res.innerHTML = "<div style='color:#888;font-size:11px'>Buscando...</div>";
  _admFetchJson(_FB_ROOT + "/cuentas/" + k + ".json").then(function(u) {
    if (!u) { res.innerHTML = "<div style='color:#ff4d5e;font-size:11px'>No existe la cuenta '" + esc(nom) + "'</div>"; return; }
    fetch(_FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "PUT", body: JSON.stringify({ nombre: u.nombre || nom, rol: u.rol || "PILOTO", bloqueado: !!u.bloqueado, ultAcceso: u.ultAcceso || 0 }) }).catch(function(){});
    res.innerHTML = "<div style='color:#0dcaf0;font-size:10px;margin-bottom:3px'>Resultado directo:</div>" + filaCuentaAdmHtml(k, u);
  }).catch(function(){ res.innerHTML = "<div style='color:#ff4d5e'>Error buscando</div>"; });
}

function bloqCtaAdm(k, st, nom) {
  if (!confirm("¿Seguro que quieres " + (st ? "BLOQUEAR" : "REACTIVAR") + " la cuenta de " + (nom || k) + "?")) return;
  Promise.all([
    fetch(_FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) }),
    fetch(_FB_ROOT + "/cuentas/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) })
  ]).then(function(){ cargarCuentasAdm(false); if (document.getElementById("inpBuscarCta").value) buscarCuentaAdm(); }).catch(function(){});
}

function delCtaAdm(k, nom) {
  if (!confirm("⚠️ ¿Seguro que quieres BORRAR DEFINITIVAMENTE la cuenta de " + (nom || k) + "?")) return;
  Promise.all([
    fetch(_FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "DELETE" }),
    fetch(_FB_ROOT + "/cuentas/" + k + ".json", { method: "DELETE" }),
    fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" })
  ]).then(function(){ document.getElementById("resBuscarCta").innerHTML = ""; cargarCuentasAdm(false); }).catch(function(){});
}

function cargarVisitasAdm() {
  var bx = document.getElementById("boxClubAdm"); bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  _admFetchJson(_FB_ROOT + "/visitas.json").then(function(vs) {
    vs = vs || {}; var ks = Object.keys(vs).sort().reverse().slice(0, 20);
    bx.innerHTML = "<div style='color:#0dcaf0;margin-bottom:6px;font-size:11px'>Visitas totales: <b>" + Object.keys(vs).length + "</b></div>" +
      ks.map(function(vk){ var v = vs[vk]; return "<div style='font-size:10px;color:#aaa;border-bottom:1px solid #222;padding:4px 0'>" + esc(v.fecha) + " — <b>" + esc(v.nom) + "</b> (" + esc(v.rol) + ")</div>"; }).join("");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error</div>"; });
}

function verReportesAdm() {
  var bx = document.getElementById("boxRepAdm"); bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  _admFetchJson(_FB_ROOT + "/reportes.json").then(function(rp) {
    if (!rp) { bx.innerHTML = "<div style='color:#888;font-size:11px'>Sin reportes ✓</div>"; return; }
    bx.innerHTML = Object.keys(rp).reverse().map(function(k) {
      var x = rp[k];
      return "<div class='fila'><div><b style='color:#ffc107'>" + esc(x.autor) + "</b> (" + esc(x.fecha) + ")<br>" + esc(x.texto) + "</div>" +
        "<button onclick=\"vibrar();delRepAdm('" + escAdmJs(k) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>OK</button></div>";
    }).join("");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error</div>"; });
}

function delRepAdm(k) {
  fetch(_FB_ROOT + "/reportes/" + k + ".json", { method: "DELETE" }).then(function() {
    document.getElementById("boxRepAdm").style.display = "none";
    verReportesAdm();
  }).catch(function(){});
}

function guardarGpsPistaAdm() {
  if (!navigator.geolocation) { alert("Geolocalizacion no soportada."); return; }
  navigator.geolocation.getCurrentPosition(function(p) {
    _admFetchJson(FB + "/sala/gps.json", { method: "PUT", body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude }) })
      .then(function(){ alert("GPS de " + circNom + " guardado ✓"); }).catch(function(){ alert("Error"); });
  }, function(){ alert("No se pudo obtener GPS."); });
}

function cambiarClaveDirAdm() {
  var nw = document.getElementById("inpNuevaClaveDir").value.trim();
  if (nw.length < 4) { alert("Usa al menos 4 caracteres."); return; }
  _admHash(nw).then(function(h){ return _admFetchJson(_FB_ROOT + "/config/dirHash.json", { method: "PUT", body: JSON.stringify(h) }); })
    .then(function(){ document.getElementById("inpNuevaClaveDir").value = ""; alert("🔐 Clave actualizada SHA-256 ✓"); })
    .catch(function(){ alert("Error"); });
}

window.validarAccesoAdmin = validarAccesoAdm;
window.salirAdmin = salirAdm;
window.cargarTodoAdmin = cargarTodoAdm;

aplicarRestriccionesAdmin();
if (localStorage.getItem("mxp_adm_ok") === "1") arrancarAdmin();