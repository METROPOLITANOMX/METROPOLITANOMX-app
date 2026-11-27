var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var FB = FB_ROOT + "/circuitos/" + circId;
var _admData = { sala: {}, pilotos: {} };
var _admTimer = null;

function b64E(s) {
  if (typeof b64Enc === "function") return b64Enc(s);
  try { return btoa(unescape(encodeURIComponent(String(s || "")))); } catch (e) { return ""; }
}
function b64D(s) {
  if (typeof b64Dec === "function") return b64Dec(s);
  try { return decodeURIComponent(escape(atob(String(s || "")))); } catch (e) { return ""; }
}
function safeJs(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function aplicarRestriccionesAdmin() {
  if (typeof mxPerfilCodigo === "function" && mxPerfilCodigo() === "DIRECCION_LIMITADA") {
    ["cardAdmBorrados", "cardAdmPilotos", "cardAdmDescargas", "cardAdmCuentas"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
}

function verificarClaveAdmin(clv) {
  return hashTxt(clv).then(function(h) {
    return fbJson(FB_ROOT + "/config/adminHash.json?t=" + Date.now()).catch(function(){ return null; }).then(function(admHash) {
      if (admHash) return { ok: (h === admHash), sinPropia: false };
      return fbJson(FB_ROOT + "/config/dirHash.json?t=" + Date.now()).catch(function(){ return null; }).then(function(dirHash) {
        var okDef = (clv.split("").map(function(c){ return c.charCodeAt(0) ^ 7; }).join("-") === "53-55-53-49");
        var ok = dirHash ? (h === dirHash) : okDef;
        return { ok: ok, sinPropia: true };
      });
    });
  });
}

function comprobarBannerClaveAdmin() {
  fbJson(FB_ROOT + "/config/adminHash.json?t=" + Date.now()).catch(function(){ return null; }).then(function(admHash) {
    document.getElementById("banSetAdminKey").style.display = admHash ? "none" : "block";
  });
}

function validarAccesoAdmin() {
  var clv = document.getElementById("inpClvAdminAuth").value.trim();
  var msg = document.getElementById("msgAuthAdmin");
  if (!clv) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce la clave"; return; }
  msg.style.color = "#0dcaf0"; msg.textContent = "Verificando...";
  verificarClaveAdmin(clv).then(function(res) {
    if (!res.ok) { msg.style.color = "#ff4d5e"; msg.textContent = "Clave incorrecta"; return; }
    if (document.getElementById("chkRecAdmin").checked) localStorage.setItem("mxp_rec_adm", b64E(clv));
    else localStorage.removeItem("mxp_rec_adm");
    sessionStorage.setItem("mxp_adm_ok", "1");
    document.getElementById("modalAuthAdmin").style.display = "none";
    document.getElementById("wrapAdmin").style.display = "block";
    iniciarAdmin(res.sinPropia);
  });
}

function salirAdmin() {
  if (_admTimer) { clearInterval(_admTimer); _admTimer = null; }
  sessionStorage.removeItem("mxp_adm_ok");
  location.href = "index.html";
}

function cargarCircuitosAdmin() {
  return fbJson(FB_ROOT + "/circuitos_lista.json?t=" + Date.now()).catch(function(){ return null; }).then(function(ls) {
    var sel = document.getElementById("selCircAdmin");
    var h = '<option value="METROPOLITANO">🏁 METROPOLITANO CIRCUIT (MADRID)</option>';
    if (ls) {
      Object.keys(ls).forEach(function(k) {
        if (k !== "METROPOLITANO" && ls[k] && ls[k].nombre) {
          h += '<option value="' + esc(k) + '">🌍 ' + esc(ls[k].nombre) + ' (' + esc(ls[k].pais || "") + ')</option>';
        }
      });
    }
    sel.innerHTML = h;
    sel.value = circId;
    if (sel.selectedIndex < 0) {
      circId = "METROPOLITANO";
      circNom = "METROPOLITANO CIRCUIT";
      sel.value = circId;
    } else {
      circNom = sel.options[sel.selectedIndex].text.replace(/^(🏁|🌍)\s*/, "").trim();
    }
    FB = FB_ROOT + "/circuitos/" + circId;
    document.getElementById("txtCircAdmin").textContent = "🏁 " + circNom;
  });
}

function cambiarCircAdmin(val) {
  var sel = document.getElementById("selCircAdmin");
  circId = val || "METROPOLITANO";
  circNom = (sel && sel.options[sel.selectedIndex]) ? sel.options[sel.selectedIndex].text.replace(/^(🏁|🌍)\s*/, "").trim() : circId;
  FB = FB_ROOT + "/circuitos/" + circId;
  document.getElementById("txtCircAdmin").textContent = "🏁 " + circNom;
  cargarSalaYPilotosAdmin();
}

function eliminarCircuitoAdmin() {
  if (circId === "METROPOLITANO") { alert("El circuito principal METROPOLITANO no se puede borrar."); return; }
  if (!confirm("⚠️ ¿Borrar el circuito local '" + circNom + "' y todos sus datos?")) return;
  Promise.all([
    fetch(FB_ROOT + "/circuitos_lista/" + circId + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/circuitos/" + circId + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/antenas_img/" + circId + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/warmup_capturas/" + circId + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/foto_finish/" + circId + ".json", { method: "DELETE" })
  ]).then(function() {
    circId = "METROPOLITANO";
    localStorage.setItem("mxp_circ_id", "METROPOLITANO");
    localStorage.setItem("mxp_circ_nom", "METROPOLITANO CIRCUIT");
    cargarCircuitosAdmin().then(cargarSalaYPilotosAdmin);
    alert("Circuito borrado ✓");
  }).catch(function(){ alert("Error borrando circuito"); });
}

function cargarSalaYPilotosAdmin() {
  Promise.all([
    fbJson(FB + "/sala.json?t=" + Date.now()).catch(function(){ return {}; }),
    fbJson(FB + "/pilotos.json?t=" + Date.now()).catch(function(){ return {}; })
  ]).then(function(res) {
    _admData.sala = res[0] || {};
    _admData.pilotos = res[1] || {};
    pintarPilotosAdmin();
  });
}

function pintarPilotosAdmin() {
  var pils = ordenarPilotos(_admData.pilotos, _admData.sala);
  var actCnt = pils.filter(function(p){ return p.activo; }).length;
  document.getElementById("lblPistaStatusAdm").textContent = actCnt > 0 ? ("🟢 " + actCnt + " EN PISTA (" + pils.length + " en sala)") : ("⚪ PISTA VACIA (" + pils.length + " en sala)");
  var h = pils.map(function(p, ix) {
    var dot = p.activo ? "🟢" : "⚪";
    var pl = '<span class="mx-plate">#' + esc(p.dorsal || "--") + '</span>';
    return '<div class="fila' + (p.eliminado ? ' elim' : '') + '">' +
      '<span>' + dot + ' <b>' + (ix + 1) + 'º</b> ' + pl + '<b>' + esc(p.nombre) + '</b> (' + (p.vueltas || 0) + 'v)</span>' +
      '<span><b class="tv-rp">' + fmt(p.mejorMs) + '</b>' +
      (p.vueltas > 0 ? ' <button onclick="vibrar();restarVueltaAdmin(\'' + safeJs(p.id) + '\')" style="background:#553300;color:#ffc107;padding:3px 6px;font-size:10px">-1v</button>' : '') +
      ' <button onclick="vibrar();expulsarPilotoAdmin(\'' + safeJs(p.id) + '\')" style="background:#dc3545;color:#fff;padding:3px 6px;font-size:10px">✕</button></span></div>';
  }).join("");
  document.getElementById("listaPilotosAdmin").innerHTML = h || '<div style="color:#777;font-size:12px">Ningun piloto en sala.</div>';
}

function restarVueltaAdmin(pUid) {
  var p = (_admData.pilotos || {})[pUid]; if (!p || !p.vueltas) return;
  var s = _admData.sala || {}, heatTag = Number(s.tsInicio || 0) || "free";
  var oldV = Number(p.vueltas), newV = Math.max(0, oldV - 1), pay = { vueltas: newV, ultimaMs: 0 };
  if (newV === 0) { pay.mejorMs = 0; pay.tsUltimoPaso = 0; }
  fetch(FB + "/pilotos/" + pUid + ".json", { method: "PATCH", body: JSON.stringify(pay) }).then(cargarSalaYPilotosAdmin).catch(function(){});
  fetch(FB + "/pasos_lock/" + pUid + "_" + heatTag + "_v" + oldV + ".json", { method: "DELETE" }).catch(function(){});
  fetch(FB + "/pasos_lock/" + pUid + "_v" + oldV + ".json", { method: "DELETE" }).catch(function(){});
}

function expulsarPilotoAdmin(pUid) {
  if (!confirm("¿Expulsar a este piloto de la sala?")) return;
  fetch(FB + "/pilotos/" + pUid + ".json", { method: "DELETE" }).then(cargarSalaYPilotosAdmin).catch(function(){});
}

function limpiarOfflineAdmin() {
  var pAll = _admData.pilotos || {};
  var ops = Object.keys(pAll).filter(function(k){ return pAll[k] && !esPilotoActivo(pAll[k]); }).map(function(k){
    return fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" });
  });
  Promise.all(ops).then(cargarSalaYPilotosAdmin).catch(function(){});
}

function vaciarSalaAdmin() {
  if (!confirm("¿Expulsar a TODOS los pilotos de la sala de " + circNom + "?")) return;
  fetch(FB + "/pilotos.json", { method: "DELETE" }).then(cargarSalaYPilotosAdmin).catch(function(){ alert("Error vaciando sala"); });
}

function borrarHotlapAdmin() {
  if (!confirm("¿Seguro que quieres borrar el record de Hotlap semanal de " + circNom + "?")) return;
  fbJson(FB + "/sala.json", {
    method: "PATCH",
    body: JSON.stringify({ hotlapMs: null, hotlapTxt: null, ultPasoTs: null, ultPasoTxt: null })
  }).then(function(){ alert("Hotlap semanal borrada ✓"); }).catch(function(){ alert("Error borrando Hotlap"); });
}

function borrarTiemposDiaAdmin() {
  if (!confirm("¿Seguro que quieres borrar todos los tiempos del dia y mangas de " + circNom + "?")) return;
  var pAll = _admData.pilotos || {};
  var ops = [
    fetch(FB + "/campeonato.json", { method: "DELETE" }),
    fetch(FB + "/pasos_lock.json", { method: "DELETE" }),
    fetch(FB + "/eventos.json", { method: "DELETE" }),
    fetch(FB + "/foto_finish/" + circId + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/foto_finish/" + circId + ".json", { method: "DELETE" }),
    fetch(FB + "/sala/porra.json", { method: "DELETE" }),
    fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0, tsCuenta: 0, ruleta: null }) })
  ];
  Object.keys(pAll).forEach(function(k) {
    ops.push(fetch(FB + "/pilotos/" + k + ".json", {
      method: "PATCH",
      body: JSON.stringify({ vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false })
    }));
  });
  Promise.all(ops).then(function(){
    cargarSalaYPilotosAdmin();
    alert("Tiempos del dia borrados ✓");
  }).catch(function(){ alert("Error borrando tiempos del dia"); });
}

function borrarMundialAdmin() {
  if (!confirm("⚠️ ¿Seguro que quieres borrar TODOS los registros del Ranking Mundial Global?")) return;
  if (!confirm("Confirmacion final: se borrara todo el Ranking Mundial de todos los circuitos. ¿Continuar?")) return;
  var url = FB_ROOT + "/mundial.json";
  fetch(url, { method: "DELETE" }).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return fbJson(url + "?shallow=true&t=" + Date.now()).catch(function(){ return null; });
  }).then(function(rest) {
    if (!rest || !Object.keys(rest).length) return true;
    var nulls = {};
    Object.keys(rest).forEach(function(k){ nulls[k] = null; });
    return fetch(url, { method: "PATCH", body: JSON.stringify(nulls) }).then(function(r2) {
      if (r2.ok) return true;
      return Promise.all(Object.keys(rest).map(function(k) {
        return fetch(FB_ROOT + "/mundial/" + encodeURIComponent(k) + ".json", { method: "DELETE" });
      }));
    });
  }).then(function() {
    alert("🌍 Ranking Mundial borrado ✓");
  }).catch(function(err) {
    alert("Error al borrar Ranking Mundial (" + (err && err.message ? err.message : "red") + ")");
  });
}

function cargarAccesoCfgAdmin() {
  fbJson(FB_ROOT + "/config/acceso.json?t=" + Date.now()).then(function(a) {
    if (!a) return;
    if (a.modo) document.getElementById("selModoAcceso").value = a.modo;
    if (typeof a.codigo === "string") document.getElementById("inpCodAcceso").value = a.codigo;
  }).catch(function(){});
}

function guardarAccesoCfg(avisar) {
  var modo = document.getElementById("selModoAcceso").value;
  var cod = document.getElementById("inpCodAcceso").value.trim();
  fbJson(FB_ROOT + "/config/acceso.json", {
    method: "PUT",
    body: JSON.stringify({ modo: modo, codigo: cod, ts: ahoraSrv() })
  }).then(function() {
    if (avisar) alert("Control de descargas actualizado (" + modo + ") ✓");
  }).catch(function(){ alert("Error guardando control de descargas"); });
}

function filaCuentaHtml(k, u) {
  var nom = u.nombre || k;
  return "<div class='fila'><span><b>" + esc(nom) + "</b> (" + esc(u.rol || "PILOTO") + ") " + (u.bloqueado ? "⛔" : "✅") + "</span>" +
    "<div><button onclick=\"vibrar();bloqCta('" + safeJs(k) + "'," + (!u.bloqueado) + ",'" + safeJs(nom) + "')\" style='background:" + (u.bloqueado ? "#20c997" : "#ffc107") + ";color:#000;padding:4px 7px;font-size:10px;margin-right:3px'>" + (u.bloqueado ? "Activar" : "Bloquear") + "</button>" +
    "<button onclick=\"vibrar();delCta('" + safeJs(k) + "','" + safeJs(nom) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>Borrar</button></div></div>";
}

function cargarCuentasAdmin() {
  var lst = document.getElementById("listaCuentasIdx");
  lst.innerHTML = "<div style='color:#888'>Cargando...</div>";
  fbJson(FB_ROOT + "/cuentas_idx.json?t=" + Date.now()).then(function(ct) {
    if (!ct) { lst.innerHTML = "<div style='color:#888;font-size:11px'>Sin cuentas indexadas. Usa el buscador arriba para cuentas antiguas.</div>"; return; }
    lst.innerHTML = Object.keys(ct).map(function(k){ return ct[k] ? filaCuentaHtml(k, ct[k]) : ""; }).join("") || "<div style='color:#888;font-size:11px'>Sin cuentas.</div>";
  }).catch(function(){ lst.innerHTML = "<div style='color:#ff4d5e'>Error cargando cuentas</div>"; });
}

function buscarCuentaAdmin() {
  var nom = document.getElementById("inpBuscarCta").value.trim(), k = nom.toLowerCase().replace(/[^a-z0-9]/g, ""), res = document.getElementById("resBuscarCta");
  if (!k) { res.innerHTML = ""; return; }
  res.innerHTML = "<div style='color:#888'>Buscando...</div>";
  fbJson(FB_ROOT + "/cuentas/" + k + ".json").then(function(u) {
    if (!u) { res.innerHTML = "<div style='color:#ff4d5e;font-size:11px;margin-bottom:6px'>No existe la cuenta '" + esc(nom) + "'</div>"; return; }
    fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", {
      method: "PUT",
      body: JSON.stringify({ nombre: u.nombre || nom, rol: u.rol || "PILOTO", bloqueado: !!u.bloqueado, ultAcceso: u.ultAcceso || 0 })
    }).catch(function(){});
    res.innerHTML = "<div style='color:#0dcaf0;font-size:10px;margin-bottom:3px'>Resultado directo:</div>" + filaCuentaHtml(k, u);
  }).catch(function(){ res.innerHTML = "<div style='color:#ff4d5e'>Error buscando</div>"; });
}

function bloqCta(k, st, nom) {
  if (!confirm("¿Seguro que quieres " + (st ? "BLOQUEAR" : "REACTIVAR") + " la cuenta de " + (nom || k) + "?")) return;
  Promise.all([
    fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) }),
    fetch(FB_ROOT + "/cuentas/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) })
  ]).then(function(){
    cargarCuentasAdmin();
    if (document.getElementById("inpBuscarCta").value.trim()) buscarCuentaAdmin();
  }).catch(function(){});
}

function delCta(k, nom) {
  if (!confirm("⚠️ ¿Seguro que quieres BORRAR DEFINITIVAMENTE la cuenta de " + (nom || k) + "? No podra recuperarla.")) return;
  Promise.all([
    fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "DELETE" }),
    fetch(FB_ROOT + "/cuentas/" + k + ".json", { method: "DELETE" }),
    fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" })
  ]).then(function(){
    document.getElementById("resBuscarCta").innerHTML = "";
    cargarCuentasAdmin();
    cargarSalaYPilotosAdmin();
  }).catch(function(){});
}

function guardarGpsPistaAdmin() {
  if (!("geolocation" in navigator)) { alert("Geolocalizacion no disponible en este dispositivo."); return; }
  navigator.geolocation.getCurrentPosition(function(p) {
    fbJson(FB + "/sala/gps.json", {
      method: "PUT",
      body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude })
    }).then(function(){ alert("📍 GPS guardado para " + circNom + " ✓"); }).catch(function(){ alert("Error guardando GPS"); });
  }, function(){ alert("No se pudo obtener el GPS. Revisa los permisos."); }, { timeout: 6000 });
}

function cargarVisitasAdmin(toggle) {
  var bx = document.getElementById("boxClubAdmin");
  if (toggle) bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  bx.innerHTML = "<div style='color:#888'>Cargando visitas...</div>";
  fbJson(FB_ROOT + "/visitas.json?t=" + Date.now()).then(function(vs) {
    vs = vs || {};
    var ks = Object.keys(vs).sort().reverse().slice(0, 20);
    bx.innerHTML = "<div style='color:#0dcaf0;margin-bottom:6px'>Visitas totales: <b>" + Object.keys(vs).length + "</b></div>" +
      (ks.map(function(vk){ var v = vs[vk]; return "<div style='font-size:10px;color:#aaa;border-bottom:1px solid #222;padding:4px 0'>" + esc(v.fecha) + " — <b>" + esc(v.nom) + "</b> (" + esc(v.rol) + " • " + esc(v.circ || "") + ")</div>"; }).join("") || "<div style='color:#888'>Sin visitas.</div>");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error cargando visitas</div>"; });
}

function verReportesAdmin(toggle) {
  var bx = document.getElementById("boxRepAdmin");
  if (toggle) bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  bx.innerHTML = "<div style='color:#888'>Cargando reportes...</div>";
  fbJson(FB_ROOT + "/reportes.json?t=" + Date.now()).then(function(rp) {
    if (!rp) { bx.innerHTML = "<div style='color:#888'>Sin reportes ✓</div>"; return; }
    bx.innerHTML = Object.keys(rp).reverse().map(function(k) {
      var x = rp[k];
      return "<div class='fila'><div><b style='color:#ffc107'>" + esc(x.autor) + "</b> (" + esc(x.fecha) + ")<br>" + esc(x.texto) + "</div><button onclick=\"vibrar();delRepAdmin('" + safeJs(k) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>OK</button></div>";
    }).join("");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error cargando reportes</div>"; });
}

function delRepAdmin(k) {
  fetch(FB_ROOT + "/reportes/" + k + ".json", { method: "DELETE" }).then(function(){ verReportesAdmin(false); }).catch(function(){});
}

function cambiarClaveAdmin() {
  var nw = document.getElementById("inpNuevaClaveAdmin").value.trim();
  if (nw.length < 4) { alert("Usa al menos 4 caracteres."); return; }
  hashTxt(nw).then(function(h) {
    return fbJson(FB_ROOT + "/config/adminHash.json", { method: "PUT", body: JSON.stringify(h) });
  }).then(function() {
    document.getElementById("inpNuevaClaveAdmin").value = "";
    if (document.getElementById("chkRecAdmin").checked) localStorage.setItem("mxp_rec_adm", b64E(nw));
    document.getElementById("banSetAdminKey").style.display = "none";
    alert("🛡️ Clave Admin actualizada SHA-256 ✓");
  }).catch(function(){ alert("Error guardando clave Admin"); });
}

function cambiarClaveDir() {
  var nw = document.getElementById("inpNuevaClaveDir").value.trim();
  if (nw.length < 4) { alert("Usa al menos 4 caracteres."); return; }
  hashTxt(nw).then(function(h) {
    return fbJson(FB_ROOT + "/config/dirHash.json", { method: "PUT", body: JSON.stringify(h) });
  }).then(function() {
    document.getElementById("inpNuevaClaveDir").value = "";
    alert("👑 Clave de Direccion actualizada SHA-256 ✓");
  }).catch(function(){ alert("Error guardando clave de Direccion"); });
}

function recargarTodoAdmin() {
  cargarCircuitosAdmin().then(cargarSalaYPilotosAdmin);
  cargarAccesoCfgAdmin();
  cargarCuentasAdmin();
  comprobarBannerClaveAdmin();
}

function iniciarAdmin(sinPropia) {
  aplicarRestriccionesAdmin();
  if (sinPropia) document.getElementById("banSetAdminKey").style.display = "block";
  else comprobarBannerClaveAdmin();
  recargarTodoAdmin();
  if (_admTimer) clearInterval(_admTimer);
  _admTimer = setInterval(cargarSalaYPilotosAdmin, 4000);
}

activarWakeLock();
if (sessionStorage.getItem("mxp_adm_ok") === "1") {
  document.getElementById("wrapAdmin").style.display = "block";
  iniciarAdmin(false);
} else {
  var recA = localStorage.getItem("mxp_rec_adm");
  if (recA) {
    document.getElementById("inpClvAdminAuth").value = b64D(recA);
    document.getElementById("chkRecAdmin").checked = true;
  }
  document.getElementById("modalAuthAdmin").style.display = "flex";
}