function verificarClaveDir(clv) {
  return hashTxt(clv).then(function(h) { return fbJson(FB_ROOT + "/config/dirHash.json").catch(function(){ return null; }).then(function(srvHash){ return srvHash ? (h === srvHash) : (clv.split("").map(function(c){ return c.charCodeAt(0) ^ 7; }).join("-") === "53-55-53-49"); }); });
}
function comprobarBloqueoUnicoYArrancar() {
  fbJson(FB + "/sala.json").catch(function(){ return {}; }).then(function(s) {
    s = s || {};
    if (s.dirSession && s.dirSession !== dirSessionId && s.dirTs && Math.abs(ahoraSrv() - Number(s.dirTs)) < 20000) document.getElementById("modalDirOcupado").style.display = "flex";
    else iniciarDirector();
  });
}
function validarAccesoDirModal() {
  var clv = document.getElementById("inpClvDirAuth").value.trim(), msg = document.getElementById("msgAuthDir");
  if (!clv) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce la clave"; return; }
  verificarClaveDir(clv).then(function(ok) {
    if (!ok) { msg.style.color = "#ff4d5e"; msg.textContent = "Clave incorrecta"; return; }
    localStorage.setItem("mxp_dir_ok", "1"); esDirOk = true; document.getElementById("modalAuthDir").style.display = "none"; comprobarBloqueoUnicoYArrancar();
  });
}
function forzarRelevoDir() {
  var clv = document.getElementById("inpClvRelevo").value.trim(), msg = document.getElementById("msgRelevoDir");
  if (!clv) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce la clave"; return; }
  verificarClaveDir(clv).then(function(ok) { if (!ok) { msg.style.color = "#ff4d5e"; msg.textContent = "Clave incorrecta"; return; } document.getElementById("modalDirOcupado").style.display = "none"; iniciarDirector(); });
}

function cargarAccesoCfgDir() {
  fbJson(FB_ROOT + "/config/acceso.json?t=" + Date.now()).then(function(a) {
    if (!a) return; if (a.modo) document.getElementById("selModoAcceso").value = a.modo; if (a.codigo) document.getElementById("inpCodAcceso").value = a.codigo;
  }).catch(function(){});
}
function guardarAccesoCfg(avisar) {
  var modo = document.getElementById("selModoAcceso").value, cod = document.getElementById("inpCodAcceso").value.trim();
  fbJson(FB_ROOT + "/config/acceso.json", { method: "PUT", body: JSON.stringify({ modo: modo, codigo: cod, ts: ahoraSrv() }) })
    .then(function(){ if (avisar) alert("Control de descargas actualizado (" + modo + ") ✓"); }).catch(function(){ alert("Error"); });
}

function filaCuentaHtml(k, u) {
  var nom = u.nombre || k;
  return "<div class='fila'><span><b>" + esc(nom) + "</b> (" + esc(u.rol || "PILOTO") + ") " + (u.bloqueado ? "⛔" : "✅") + "</span>" +
    "<div><button onclick=\"vibrar();bloqCta('" + esc(k) + "'," + (!u.bloqueado) + ",'" + esc(nom) + "')\" style='background:" + (u.bloqueado ? "#20c997" : "#ffc107") + ";color:#000;padding:4px 7px;font-size:10px;margin-right:3px'>" + (u.bloqueado ? "Activar" : "Bloquear") + "</button>" +
    "<button onclick=\"vibrar();delCta('" + esc(k) + "','" + esc(nom) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>Borrar</button></div></div>";
}
function cargarCuentasDir(toggle) {
  var bx = document.getElementById("boxCuentasDir");
  if (toggle) bx.style.display = (bx.style.display === "block") ? "none" : "block";
  if (bx.style.display === "none") return;
  var lst = document.getElementById("listaCuentasIdx"); lst.innerHTML = "<div style='color:#888'>Cargando...</div>";
  fbJson(FB_ROOT + "/cuentas_idx.json?t=" + Date.now()).then(function(ct) {
    if (!ct) { lst.innerHTML = "<div style='color:#888'>Sin cuentas indexadas. Usa el buscador arriba para cuentas antiguas.</div>"; return; }
    lst.innerHTML = Object.keys(ct).map(function(k){ return ct[k] ? filaCuentaHtml(k, ct[k]) : ""; }).join("");
  }).catch(function(){ lst.innerHTML = "<div style='color:#ff4d5e'>Error cargando cuentas</div>"; });
}
function buscarCuentaDir() {
  var nom = document.getElementById("inpBuscarCta").value.trim(), k = nom.toLowerCase().replace(/[^a-z0-9]/g, ""), res = document.getElementById("resBuscarCta");
  if (!k) { res.innerHTML = ""; return; }
  res.innerHTML = "<div style='color:#888'>Buscando...</div>";
  fbJson(FB_ROOT + "/cuentas/" + k + ".json").then(function(u) {
    if (!u) { res.innerHTML = "<div style='color:#ff4d5e;font-size:11px'>No existe la cuenta '" + esc(nom) + "'</div>"; return; }
    fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "PUT", body: JSON.stringify({ nombre: u.nombre || nom, rol: u.rol || "PILOTO", bloqueado: !!u.bloqueado, ultAcceso: u.ultAcceso || 0 }) }).catch(function(){});
    res.innerHTML = "<div style='color:#0dcaf0;font-size:10px;margin-bottom:3px'>Resultado directo:</div>" + filaCuentaHtml(k, u);
  }).catch(function(){ res.innerHTML = "<div style='color:#ff4d5e'>Error buscando</div>"; });
}
function bloqCta(k, st, nom) {
  if (!confirm("¿Seguro que quieres " + (st ? "BLOQUEAR" : "REACTIVAR") + " la cuenta de " + (nom || k) + "?")) return;
  Promise.all([fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) }), fetch(FB_ROOT + "/cuentas/" + k + ".json", { method: "PATCH", body: JSON.stringify({ bloqueado: st }) })])
    .then(function(){ cargarCuentasDir(false); if (document.getElementById("inpBuscarCta").value) buscarCuentaDir(); }).catch(function(){});
}
function delCta(k, nom) {
  if (!confirm("⚠️ ¿Seguro que quieres BORRAR DEFINITIVAMENTE la cuenta de " + (nom || k) + "? No podra recuperarla.")) return;
  Promise.all([fetch(FB_ROOT + "/cuentas_idx/" + k + ".json", { method: "DELETE" }), fetch(FB_ROOT + "/cuentas/" + k + ".json", { method: "DELETE" }), fetch(FB + "/pilotos/" + k + ".json", { method: "DELETE" })])
    .then(function(){ document.getElementById("resBuscarCta").innerHTML = ""; cargarCuentasDir(false); }).catch(function(){});
}

function guardarGpsPista() { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function(p){ fbJson(FB + "/sala/gps.json", { method: "PUT", body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude }) }).then(function(){ alert("GPS guardado ✓"); }); }); }
function verReportesDir() {
  var bx = document.getElementById("boxRepDir"); bx.style.display = (bx.style.display === "block") ? "none" : "block"; if (bx.style.display === "none") return;
  fbJson(FB_ROOT + "/reportes.json").then(function(rp) {
    if (!rp) { bx.innerHTML = "<div style='color:#888'>Sin reportes ✓</div>"; return; }
    bx.innerHTML = Object.keys(rp).reverse().map(function(k){ var x = rp[k]; return "<div class='fila'><div><b style='color:#ffc107'>" + esc(x.autor) + "</b> (" + esc(x.fecha) + ")<br>" + esc(x.texto) + "</div><button onclick=\"vibrar();delRepDir('" + esc(k) + "')\" style='background:#dc3545;color:#fff;padding:4px 7px;font-size:10px'>OK</button></div>"; }).join("");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error</div>"; });
}
function delRepDir(k) { fetch(FB_ROOT + "/reportes/" + k + ".json", { method: "DELETE" }).then(verReportesDir).catch(function(){}); }
function cargarVisitasDir() {
  var bx = document.getElementById("boxClubDir"); bx.style.display = (bx.style.display === "block") ? "none" : "block"; if (bx.style.display === "none") return;
  fbJson(FB_ROOT + "/visitas.json").then(function(vs) {
    vs = vs || {}; var ks = Object.keys(vs).sort().reverse().slice(0, 15);
    bx.innerHTML = "<div style='color:#0dcaf0;margin-bottom:6px'>Visitas: <b>" + Object.keys(vs).length + "</b></div>" + ks.map(function(vk){ var v = vs[vk]; return "<div style='font-size:10px;color:#aaa;border-bottom:1px solid #222;padding:4px 0'>" + esc(v.fecha) + " — <b>" + esc(v.nom) + "</b> (" + esc(v.rol) + ")</div>"; }).join("");
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e'>Error</div>"; });
}
function cambiarClaveDir() {
  var nw = document.getElementById("inpNuevaClaveDir").value.trim(); if (nw.length < 4) { alert("Usa al menos 4 caracteres."); return; }
  hashTxt(nw).then(function(h){ return fbJson(FB_ROOT + "/config/dirHash.json", { method: "PUT", body: JSON.stringify(h) }); })
    .then(function(){ document.getElementById("inpNuevaClaveDir").value = ""; alert("🔐 Clave actualizada SHA-256 ✓"); }).catch(function(){ alert("Error"); });
}