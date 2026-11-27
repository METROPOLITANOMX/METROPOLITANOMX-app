var circAct = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
localStorage.setItem("mxp_circ_id", circAct);
localStorage.setItem("mxp_circ_nom", circNom);

function FB_CIRC() { return FB_ROOT + "/circuitos/" + circAct; }

var rolSel = "PILOTO", modA = "LOGIN", gpsCirc = null, _ultRepTs = 0;
var accesoCfg = { modo: "ABIERTO", codigo: "" };
var esIngles = !(navigator.language || "es").toLowerCase().startsWith("es");

function registrarPreparacionRedOficial() {
  localStorage.setItem("mxp_red_oficial_preparada", "1");
  var installId = localStorage.getItem("mxp_inst_id");
  if (installId && localStorage.getItem("mxp_red_oficial_reg") === installId) return;
  if (!installId) {
    installId = "inst_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("mxp_inst_id", installId);
  }
  if (localStorage.getItem("mxp_red_oficial_pending") === installId) return;
  localStorage.setItem("mxp_red_oficial_pending", installId);
  fetch(FB_ROOT + "/instalaciones_preparadas/" + installId + ".json", {
    method: "PUT",
    body: JSON.stringify({ preparadaRedOficial: true, rol: "DIRECCION", circuito: circAct, ts: ahoraSrv() })
  }).then(function(res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    localStorage.setItem("mxp_red_oficial_reg", installId);
    localStorage.removeItem("mxp_red_oficial_pending");
  }).catch(function(err) {
    localStorage.removeItem("mxp_red_oficial_pending");
    console.error("No se pudo registrar la instalación para la Red de Circuitos Oficiales:", err);
    var msg = document.getElementById("msgCodInst");
    if (msg) { msg.style.color = "#ffc107"; msg.textContent = "Instalación marcada localmente; no se pudo registrar en línea."; }
  });
}

function aplicarClaveInstalacion(clave) {
  var rol = mxRolClaveInstalacion(clave);
  if (!rol) return "";
  localStorage.setItem("mxp_inst_role", rol);
  if (rol === "DIRECCION") registrarPreparacionRedOficial();
  return rol;
}

function aplicarRestriccionesInstalacion() {
  var soloPiloto = localStorage.getItem("mxp_inst_role") === "PILOTO";
  ["btnTopDir", "btnTopAnt"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = soloPiloto ? "none" : "";
  });
}

function activarPwaSiPermitido() {
  var m = accesoCfg.modo || "ABIERTO";
  var codOk = (localStorage.getItem("mxp_inv_ok") === accesoCfg.codigo && accesoCfg.codigo);
  var permitido = (m === "ABIERTO") || (m === "CODIGO" && codOk);
  var ban = document.getElementById("banAcceso");
  var boxCod = document.getElementById("boxCodInst");

  if (codOk) aplicarClaveInstalacion(accesoCfg.codigo);
  aplicarRestriccionesInstalacion();

  if (m === "PAUSADO") {
    ban.style.display = "block";
    ban.textContent = esIngles ? "🔒 New downloads & sign-ups paused by Race Direction" : "🔒 Altas e instalaciones nuevas pausadas por Direccion";
    boxCod.style.display = "none";
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }).catch(function(){});
  } else if (m === "CODIGO" && !codOk) {
    ban.style.display = "block";
    ban.textContent = esIngles ? "🔑 Invite code required from Race Direction for new accounts/install" : "🔑 Nuevas cuentas e instalacion requieren codigo de Direccion";
    boxCod.style.display = "block";
  } else {
    ban.style.display = "none";
    boxCod.style.display = "none";
  }

  if (permitido) {
    if (!document.querySelector('link[rel="manifest"]')) {
      var lk = document.createElement("link"); lk.rel = "manifest"; lk.href = "manifest.json"; document.head.appendChild(lk);
    }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function(){});
  }
}

function desbloquearInstalacion() {
  var c = document.getElementById("inpCodInst").value.trim(), msg = document.getElementById("msgCodInst");
  if (!c || c !== accesoCfg.codigo) { msg.style.color = "#ff4d5e"; msg.textContent = "Codigo incorrecto"; return; }
  localStorage.setItem("mxp_inv_ok", c);
  var rol = aplicarClaveInstalacion(c);
  aplicarRestriccionesInstalacion();
  msg.style.color = "#20c997";
  msg.textContent = rol === "PILOTO" ? "✅ Activación PILOTO completada." : (rol === "DIRECCION" ? "✅ Instalación DIRECCION preparada para la Red de Circuitos Oficiales." : "✅ Instalacion y alta desbloqueada ✓");
  activarPwaSiPermitido();
}

function cargarAccesoConfig() {
  return fbJson(FB_ROOT + "/config/acceso.json?t=" + Date.now()).then(function(a) {
    if (a && a.modo) accesoCfg = a;
    activarPwaSiPermitido();
  }).catch(function(){ activarPwaSiPermitido(); });
}

function aplicarIdioma() {
  if (!esIngles) return;
  document.documentElement.lang = "en";
  document.getElementById("btnTopDir").textContent = "🏁 RACE DIR";
  document.getElementById("btnTopAnt").textContent = "📡 ANTENNAS";
  document.getElementById("lblCircTit").textContent = "TRACK:";
  document.getElementById("banHotlap").textContent = "👑 WEEKLY HOTLAP: Loading...";
  document.getElementById("btnPiloto").textContent = "🏍️ I AM A RIDER";
  document.getElementById("btnAfi").textContent = "🎟️ FAN CLUB (LIVE)";
  document.getElementById("btnGlobal").textContent = "🌍 WORLD RANKING & PADDOCK";
  document.getElementById("btnGuia").textContent = "📲 GUIDE";
  document.getElementById("btnInvitar").textContent = "💬 INVITE";
  document.getElementById("btnReportar").textContent = "🛠️ REPORT";
  document.getElementById("tLog").textContent = "SIGN IN";
  document.getElementById("tReg").textContent = "SIGN UP";
  document.getElementById("aNom").placeholder = "Rider name";
  document.getElementById("aClv").placeholder = "Password";
  document.getElementById("aPin").placeholder = "Recovery PIN (4 digits)";
  document.getElementById("aCodInv").placeholder = "Invite code from Direction";
  document.getElementById("lblRecClv").textContent = "Remember user & password";
  document.getElementById("lblRecDir").textContent = "Remember password on this phone";
  document.getElementById("bEntrar").textContent = "SIGN IN";
  document.getElementById("lnkOlv").textContent = "Forgot password?";
  document.getElementById("lnkOtraPista").textContent = "🌍 Create local track";
  document.getElementById("titDir").textContent = "RACE DIRECTION";
  document.getElementById("dClv").placeholder = "Direction Password";
  document.getElementById("btnDirOk").textContent = "ENTER CONTROL";
  document.getElementById("tabGMun").textContent = "🌍 WORLD RANKING";
  document.getElementById("tabGPad").textContent = "🏍️ PADDOCK";
  document.getElementById("btnMapaCirc").textContent = "📍 VIEW TRACK LOCATION";
  document.getElementById("btnGuiaCer").textContent = "CLOSE";
  var bvs = document.querySelectorAll(".btn-volver"); for (var i = 0; i < bvs.length; i++) bvs[i].textContent = "BACK";
}

function abrir(id) {
  ["menu", "pAuth", "pRec", "pDir", "pGuia", "pCirc", "pGlobal", "pRep"].forEach(function(x) {
    var el = document.getElementById(x); if (el) el.style.display = (x === id) ? (x === "menu" ? "flex" : "block") : "none";
  });
}

function irAntenas() {
  if (localStorage.getItem("mxp_inst_role") === "PILOTO") return;
  localStorage.setItem("mxp_circ_id", circAct); localStorage.setItem("mxp_circ_nom", circNom); location.href = "antena.html";
}

function abrirDirModal() {
  if (localStorage.getItem("mxp_inst_role") === "PILOTO") return;
  var recD = localStorage.getItem("mxp_rec_dir");
  if (recD) { document.getElementById("dClv").value = b64Dec(recD); document.getElementById("chkRecDir").checked = true; }
  else { document.getElementById("dClv").value = ""; document.getElementById("chkRecDir").checked = false; }
  abrir("pDir");
}

function abrirAuth(rol) {
  rolSel = rol;
  document.getElementById("titAuth").textContent = esIngles ? (rol === "PILOTO" ? "RIDER ACCESS" : "MX FAN CLUB") : (rol === "PILOTO" ? "ACCESO PILOTO PROMOTO" : "CLUB AFICIONADOS MX");
  document.getElementById("aNom").value = localStorage.getItem("mxp_rec_nom") || "";
  var recC = localStorage.getItem("mxp_rec_clv_b64");
  if (recC) { document.getElementById("aClv").value = b64Dec(recC); document.getElementById("chkRecClv").checked = true; }
  else { document.getElementById("aClv").value = ""; document.getElementById("chkRecClv").checked = false; }
  document.getElementById("lnkOtraPista").style.display = (rol === "PILOTO") ? "inline" : "none";
  modoAuth("LOGIN"); abrir("pAuth");
}

function modoAuth(m) {
  modA = m;
  document.getElementById("tLog").className = "tab" + (m === "LOGIN" ? " act" : "");
  document.getElementById("tReg").className = "tab" + (m === "REG" ? " act" : "");
  document.getElementById("aPin").style.display = (m === "REG") ? "block" : "none";
  var needCod = (m === "REG" && accesoCfg.modo === "CODIGO" && localStorage.getItem("mxp_inv_ok") !== accesoCfg.codigo);
  document.getElementById("aCodInv").style.display = needCod ? "block" : "none";
  document.getElementById("bEntrar").textContent = esIngles ? (m === "LOGIN" ? "SIGN IN" : "CREATE MY ACCOUNT") : (m === "LOGIN" ? "ENTRAR" : "CREAR MI CUENTA");
  document.getElementById("mAuth").textContent = "";
}

function registrarVisita(rol, nom) {
  try { if (rol === "PORTADA" && sessionStorage.getItem("mxp_vis_ok")) return; if (rol === "PORTADA") sessionStorage.setItem("mxp_vis_ok", "1"); } catch (e) {}
  var ts = ahoraSrv(), idV = "v_" + ts + "_" + Math.random().toString(36).slice(2, 5);
  fetch(FB_ROOT + "/visitas/" + idV + ".json", { method: "PUT", body: JSON.stringify({ ts: ts, fecha: new Date(ts).toLocaleString(esIngles ? "en-US" : "es-ES"), rol: rol, circ: circAct, nom: String(nom || "Visitante").slice(0, 40) }) }).catch(function(){});
}
registrarVisita("PORTADA", localStorage.getItem("mxp_nom") || "Visitante");

function syncCuentaIdx(uid, nombre, rol, bloqueado, ts) {
  fetch(FB_ROOT + "/cuentas_idx/" + uid + ".json", {
    method: "PUT", body: JSON.stringify({ nombre: nombre.slice(0, 40), rol: rol || "PILOTO", bloqueado: !!bloqueado, ultAcceso: ts })
  }).catch(function(){});
}

function procesarAuth() {
  var nom = document.getElementById("aNom").value.trim().slice(0, 40), uid = nom.toLowerCase().replace(/[^a-z0-9]/g, "");
  var clv = document.getElementById("aClv").value.trim(), pin = document.getElementById("aPin").value.trim();
  var cod = document.getElementById("aCodInv").value.trim(), msg = document.getElementById("mAuth");

  if (!uid || !clv) { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Enter name & password" : "Rellena nombre y clave"; return; }
  if (modA === "REG") {
    if (accesoCfg.modo === "PAUSADO") { msg.style.color = "#ff4d5e"; msg.textContent = "Altas nuevas pausadas por Direccion"; return; }
    if (accesoCfg.modo === "CODIGO" && localStorage.getItem("mxp_inv_ok") !== accesoCfg.codigo) {
      if (!cod || cod !== accesoCfg.codigo) { msg.style.color = "#ff4d5e"; msg.textContent = "Codigo de invitacion incorrecto"; return; }
      localStorage.setItem("mxp_inv_ok", cod); activarPwaSiPermitido();
      aplicarClaveInstalacion(cod); aplicarRestriccionesInstalacion();
    }
    if (!/^\d{4}$/.test(pin)) { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Enter 4-digit PIN" : "Pon un PIN de 4 numeros"; return; }
  }
  msg.style.color = "#0dcaf0"; msg.textContent = esIngles ? "Connecting..." : "Conectando...";

  if (document.getElementById("chkRecClv").checked) localStorage.setItem("mxp_rec_clv_b64", b64Enc(clv));
  else localStorage.removeItem("mxp_rec_clv_b64");

  var locCtas = {}; try { locCtas = JSON.parse(localStorage.getItem("mxp_cuentas_loc") || "{}"); } catch (e) {}

  Promise.all([hashTxt(clv), hashTxt(pin)]).then(function(hs) {
    var clvHash = hs[0], pinHash = hs[1];
    return Promise.all([fbJson(FB_ROOT + "/cuentas/" + uid + ".json"), fbJson(FB_ROOT + "/cuentas_idx/" + uid + ".json").catch(function(){ return null; })]).then(function(res) {
      var u = res[0], idxU = res[1], ts = ahoraSrv();
      if (modA === "REG") {
        if (u) { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Name exists, SIGN IN" : "Ese nombre ya existe, pulsa ENTRAR"; return; }
        var nw = { nombre: nom, claveHash: clvHash, pinHash: pinHash, rol: rolSel, bloqueado: false, ultAcceso: ts };
        return fbJson(FB_ROOT + "/cuentas/" + uid + ".json", { method: "PUT", body: JSON.stringify(nw) }).then(function() {
          syncCuentaIdx(uid, nom, rolSel, false, ts);
          locCtas[uid] = nw; localStorage.setItem("mxp_cuentas_loc", JSON.stringify(locCtas)); finalizarAcceso(uid, nw);
        });
      }
      var acc = u || locCtas[uid];
      if (!u && locCtas[uid]) { msg.style.color = "#ff4d5e"; msg.textContent = "Cuenta eliminada por Direccion o no encontrada"; return; }
      var passOk = acc && ((acc.claveHash && acc.claveHash === clvHash) || (acc.clave && acc.clave === clv));
      if (!passOk) { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Wrong user or password" : "Usuario o clave incorrectos"; return; }
      if (acc.bloqueado || (idxU && idxU.bloqueado)) { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Account blocked by Direction" : "⛔ Cuenta bloqueada por Direccion"; return; }
      var patchAcc = { ultAcceso: ts, rol: rolSel };
      if (!acc.claveHash) { patchAcc.claveHash = clvHash; patchAcc.clave = null; acc.claveHash = clvHash; delete acc.clave; }
      locCtas[uid] = acc; localStorage.setItem("mxp_cuentas_loc", JSON.stringify(locCtas));
      fetch(FB_ROOT + "/cuentas/" + uid + ".json", { method: "PATCH", body: JSON.stringify(patchAcc) }).catch(function(){});
      syncCuentaIdx(uid, acc.nombre || nom, rolSel, false, ts);
      finalizarAcceso(uid, acc);
    }).catch(function(err) {
      if (err && String(err.message).indexOf("HTTP 401") >= 0) { msg.style.color = "#ff4d5e"; msg.textContent = "Permiso denegado (401)"; return; }
      if (modA === "LOGIN" && locCtas[uid] && ((locCtas[uid].claveHash && locCtas[uid].claveHash === clvHash) || locCtas[uid].clave === clv)) {
        if (locCtas[uid].bloqueado) { msg.style.color = "#ff4d5e"; msg.textContent = "Cuenta bloqueada"; return; }
        finalizarAcceso(uid, locCtas[uid]);
      } else { msg.style.color = "#ff4d5e"; msg.textContent = esIngles ? "Offline or account not found" : "Sin red o cuenta no encontrada"; }
    });
  });
}

function finalizarAcceso(uid, u) {
  localStorage.setItem("mxp_rec_nom", u.nombre);
  localStorage.setItem("mxp_uid", uid);
  localStorage.setItem("mxp_nom", u.nombre);
  registrarVisita(rolSel, u.nombre);
  if (rolSel !== "PILOTO") { location.href = "vivo.html"; return; }
  if (circAct !== "METROPOLITANO" || (u && u.invitadoMetro)) { location.href = "piloto.html"; return; }

  var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  if (tz && tz !== "Europe/Madrid") {
    alert(esIngles ? "🌍 Outside Madrid. Create or select your local track!" : "🌍 Estas fuera de Madrid (Metropolitano). Crea o elige tu circuito local.");
    abrir("pCirc"); return;
  }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(p) {
      fbJson(FB_ROOT + "/circuitos/METROPOLITANO/sala/gps.json").then(function(g) {
        var rLat = (g && g.lat) ? Number(g.lat) : 40.4168, rLng = (g && g.lng) ? Number(g.lng) : -3.7038, maxK = (g && g.lat) ? 65 : 150;
        if (Math.sqrt(Math.pow((p.coords.latitude - rLat) * 111, 2) + Math.pow((p.coords.longitude - rLng) * 85, 2)) > maxK) {
          alert(esIngles ? "🌍 Outside Madrid area. Create your local track!" : "🌍 Estas lejos de Metropolitano (Madrid). Crea tu circuito local.");
          abrir("pCirc"); return;
        }
        location.href = "piloto.html";
      }).catch(function(){ location.href = "piloto.html"; });
    }, function(){ location.href = "piloto.html"; }, { timeout: 3500 });
  } else location.href = "piloto.html";
}

function recuperarClave() {
  var nom = document.getElementById("rNom").value.trim(), uidR = nom.toLowerCase().replace(/[^a-z0-9]/g, "");
  var pin = document.getElementById("rPin").value.trim(), ncl = document.getElementById("rClv").value.trim(), msg = document.getElementById("mRec");
  if (!uidR || !/^\d{4}$/.test(pin) || !ncl) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce nombre, PIN de 4 numeros y nueva clave"; return; }
  msg.style.color = "#0dcaf0"; msg.textContent = "Verificando...";
  Promise.all([hashTxt(pin), hashTxt(ncl)]).then(function(hs) {
    return fbJson(FB_ROOT + "/cuentas/" + uidR + ".json").then(function(u) {
      if (!u) { msg.style.color = "#ff4d5e"; msg.textContent = "Piloto no encontrado"; return; }
      if (!((u.pinHash && u.pinHash === hs[0]) || (u.pin && String(u.pin) === pin))) { msg.style.color = "#ff4d5e"; msg.textContent = "PIN incorrecto"; return; }
      if (u.bloqueado) { msg.style.color = "#ff4d5e"; msg.textContent = "Cuenta bloqueada"; return; }
      return fbJson(FB_ROOT + "/cuentas/" + uidR + ".json", { method: "PATCH", body: JSON.stringify({ claveHash: hs[1], pinHash: hs[0], clave: null, pin: null, ultAcceso: ahoraSrv() }) }).then(function() {
        var uAct = Object.assign({}, u, { claveHash: hs[1], pinHash: hs[0] }); delete uAct.clave; delete uAct.pin;
        try { var lc = JSON.parse(localStorage.getItem("mxp_cuentas_loc") || "{}"); lc[uidR] = uAct; localStorage.setItem("mxp_cuentas_loc", JSON.stringify(lc)); } catch (e) {}
        msg.style.color = "#20c997"; msg.textContent = "✓ Clave actualizada";
        setTimeout(function(){ finalizarAcceso(uidR, uAct); }, 700);
      });
    });
  }).catch(function(){ msg.style.color = "#ff4d5e"; msg.textContent = "Error de red"; });
}

function entrarDir() {
  var clv = document.getElementById("dClv").value.trim(), md = document.getElementById("mDir");
  if (!clv) { md.style.color = "#ff4d5e"; md.textContent = "Introduce la clave"; return; }
  if (document.getElementById("chkRecDir").checked) localStorage.setItem("mxp_rec_dir", b64Enc(clv));
  else localStorage.removeItem("mxp_rec_dir");
  md.style.color = "#0dcaf0"; md.textContent = "Verificando...";
  hashTxt(clv).then(function(h) {
    return fbJson(FB_ROOT + "/config/dirHash.json").catch(function(){ return null; }).then(function(srvHash) {
      var ok = srvHash ? (h === srvHash) : (clv.split("").map(function(c){ return c.charCodeAt(0) ^ 7; }).join("-") === "53-55-53-49");
      if (!srvHash && ok) fetch(FB_ROOT + "/config/dirHash.json", { method: "PUT", body: JSON.stringify(h) }).catch(function(){});
      if (!ok) { md.style.color = "#ff4d5e"; md.textContent = "Clave incorrecta"; return; }
      localStorage.setItem("mxp_dir_ok", "1");
      if (!localStorage.getItem("mxp_uid")) { localStorage.setItem("mxp_uid", "director"); localStorage.setItem("mxp_nom", "Director MX"); }
      location.href = "director.html";
    });
  });
}

function enviarReporte() {
  var tx = document.getElementById("repTxt").value.trim(), msg = document.getElementById("mRep");
  if (!tx) { msg.style.color = "#ff4d5e"; msg.textContent = "Escribe primero el problema"; return; }
  if ((Date.now() - _ultRepTs) < 20000) { msg.style.color = "#ffc107"; msg.textContent = "Espera 20s"; return; }
  _ultRepTs = Date.now();
  var ts = ahoraSrv(), idR = "r_" + ts + "_" + Math.random().toString(36).slice(2, 5);
  fbJson(FB_ROOT + "/reportes/" + idR + ".json", {
    method: "PUT", body: JSON.stringify({ ts: ts, fecha: new Date(ts).toLocaleString("es-ES"), autor: (localStorage.getItem("mxp_nom") || "Usuario").slice(0, 40), circ: circAct, texto: tx.slice(0, 350) })
  }).then(function(){ document.getElementById("repTxt").value = ""; msg.style.color = "#20c997"; msg.textContent = "¡Aviso enviado ✓!"; })
    .catch(function(){ msg.style.color = "#ff4d5e"; msg.textContent = "Error al enviar"; });
}

function invitarAmigo() {
  var u = location.href.split("?")[0];
  var t = "🏍️ *" + circNom + " (1/4 RC)*\n¡Cronometra tus vueltas, lleva el mantenimiento de tu Promoto y compite!\n" + u;
  window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
}
function verMapaCircuito() {
  if (gpsCirc && gpsCirc.lat) window.open("https://www.google.com/maps?q=" + gpsCirc.lat + "," + gpsCirc.lng, "_blank");
  else alert("Ubicacion GPS aun no fijada por Direccion.");
}
function limpiarIcono(t) { return String(t || "").replace(/^(🏁|🌍)\s*/, "").trim(); }

function cambiarCircuitoIdx(val) {
  var s = document.getElementById("selCircuitoIdx"); circAct = val || "METROPOLITANO";
  circNom = (s && s.options[s.selectedIndex]) ? limpiarIcono(s.options[s.selectedIndex].text) : circAct;
  localStorage.setItem("mxp_circ_id", circAct); localStorage.setItem("mxp_circ_nom", circNom);
  gpsCirc = null; document.getElementById("banGps").style.display = "none"; actualizarEstadoSala(); comprobarGpsCercano();
}

function cargarListaCircuitos() {
  fbJson(FB_ROOT + "/circuitos_lista.json?t=" + Date.now()).then(function(ls) {
    var s = document.getElementById("selCircuitoIdx"); if (!s) return;
    var h = '<option value="METROPOLITANO">🏁 METROPOLITANO CIRCUIT (MADRID)</option>';
    if (ls) Object.keys(ls).forEach(function(k){ if (k !== "METROPOLITANO" && ls[k] && ls[k].nombre) h += '<option value="' + esc(k) + '">🌍 ' + esc(ls[k].nombre) + ' (' + esc(ls[k].pais || "") + ')</option>'; });
    s.innerHTML = h; if (circAct) s.value = circAct;
    if (s.selectedIndex < 0) { circAct = "METROPOLITANO"; circNom = "METROPOLITANO CIRCUIT"; localStorage.setItem("mxp_circ_id", circAct); localStorage.setItem("mxp_circ_nom", circNom); s.value = circAct; }
    else { circNom = limpiarIcono(s.options[s.selectedIndex].text); localStorage.setItem("mxp_circ_nom", circNom); }
  }).catch(function(){});
}

function guardarNuevoCircuito() {
  var nom = document.getElementById("cNom").value.trim().slice(0, 50), pais = document.getElementById("cPais").value.trim().slice(0, 50);
  var sup = document.getElementById("cSup").value, fac = Number(document.getElementById("cTrazado").value) || 1, mts = Number(document.getElementById("cMetros").value) || 0, msg = document.getElementById("mCirc");
  if (!nom || !pais) { msg.style.color = "#ff4d5e"; msg.textContent = "Escribe nombre y pais"; return; }
  var cid = nom.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 22) + "_" + Math.floor(10 + Math.random() * 89);
  fbJson(FB_ROOT + "/circuitos_lista/" + cid + ".json", { method: "PUT", body: JSON.stringify({ nombre: nom, pais: pais, sup: sup, metros: mts, factor: fac, ts: ahoraSrv() }) })
    .then(function(){ circAct = cid; circNom = nom; localStorage.setItem("mxp_circ_id", cid); localStorage.setItem("mxp_circ_nom", nom); msg.textContent = ""; cargarListaCircuitos(); actualizarEstadoSala(); if (localStorage.getItem("mxp_uid")) location.href = "piloto.html"; else abrir("menu"); })
    .catch(function(){ msg.style.color = "#ff4d5e"; msg.textContent = "Error al guardar"; });
}

function actualizarEstadoSala() {
  var t = Date.now();
  Promise.all([fbJson(FB_CIRC() + "/sala.json?t=" + t).catch(function(){ return null; }), fbJson(FB_CIRC() + "/antenas.json?t=" + t).catch(function(){ return null; }), fbJson(FB_CIRC() + "/pilotos.json?t=" + t).catch(function(){ return null; })]).then(function(res) {
    var s = res[0] || {}, ants = res[1] || {}, pils = res[2] || {}, bv = document.getElementById("btnVivo"), bh = document.getElementById("banHotlap"), ah = ahoraSrv();
    gpsCirc = s.gps || null;
    var antOk = Object.keys(ants).some(function(k){ return ants[k] && Math.abs(ah - Number(ants[k].ts || 0)) < 15000; });
    var pilAct = Object.keys(pils).filter(function(k){ var p = pils[k]; return p && (p.enPista !== false) && p.tsActivo && Math.abs(ah - Number(p.tsActivo)) < 25000; }).length;
    var pasoRec = !!(s.ultPasoTs && (ah - Number(s.ultPasoTs)) < 600000);
    var sesAct = (s.estado === "EN_CURSO" || s.estado === "WARMUP" || s.estado === "SALIDA_30" || s.estado === "VALLA_MX" || pasoRec);
    var show = antOk && (pilAct > 0 || sesAct);
    bv.style.display = show ? "block" : "none";
    var nomC = circNom.split("(")[0].trim();
    if (show) bv.textContent = "🔴 EN VIVO (" + nomC + ")" + (pilAct > 0 ? (" — " + pilAct + " EN PISTA") : "");
    if (bh) bh.textContent = s.hotlapTxt ? ("👑 HOTLAP (" + nomC + "): " + s.hotlapTxt) : ("👑 HOTLAP (" + nomC + "): ¡Se el primero!");
  }).catch(function(){});
}

function comprobarGpsCercano() {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(function(p) {
    fbJson(FB_CIRC() + "/sala/gps.json").then(function(g) {
      var bg = document.getElementById("banGps"); if (!g || !g.lat) { bg.style.display = "none"; return; } gpsCirc = g;
      if (Math.sqrt(Math.pow((p.coords.latitude - g.lat) * 111000, 2) + Math.pow((p.coords.longitude - g.lng) * 85000, 2)) < 550) {
        bg.style.display = "block"; bg.textContent = "📍 ¡Estas en " + circNom + "! Pulsa SOY PILOTO.";
      } else bg.style.display = "none";
    }).catch(function(){});
  }, function(){}, { timeout: 5000 });
}

function abrirGlobal(sub) { abrir("pGlobal"); verSubGlobal(sub || "MUN"); }
function verSubGlobal(sub) {
  document.getElementById("subGMun").style.display = (sub === "MUN") ? "block" : "none";
  document.getElementById("subGPad").style.display = (sub === "PAD") ? "block" : "none";
  document.getElementById("tabGMun").className = "tab" + (sub === "MUN" ? " act" : "");
  document.getElementById("tabGPad").className = "tab" + (sub === "PAD" ? " act" : "");
  if (sub === "MUN") cargarMundial(); else cargarPaddock();
}

function cargarMundial() {
  var fil = document.getElementById("filSupMun").value, ord = document.getElementById("ordMun").value, bx = document.getElementById("listaMundial");
  bx.innerHTML = "<div style='padding:10px;color:#888'>Cargando...</div>";
  fbJson(FB_ROOT + "/mundial.json?t=" + Date.now()).then(function(m) {
    if (!m) { bx.innerHTML = "<div style='color:#888;padding:10px'>Sin tiempos mundiales aun.</div>"; return; }
    var arr = Object.keys(m).map(function(k){ return m[k]; }).filter(function(x){ return x && x.mejorMs && (fil === "TODOS" || ((x.sup || "") + " " + (x.disc || "")).toUpperCase().indexOf(fil) >= 0); });
    if (ord === "TEO") arr.sort(function(a, b){ return (a.teorico200Ms || 9e9) - (b.teorico200Ms || 9e9) || ((b.regPct || 0) - (a.regPct || 0)) || (a.mejorMs - b.mejorMs); });
    else arr.sort(function(a, b){ return (b.regPct || 0) - (a.regPct || 0) || (a.mejorMs - b.mejorMs); });
    bx.innerHTML = arr.slice(0, 30).map(function(x, i) {
      var teoTxt = x.teorico200Ms ? (" • 🏁 <b>200m Teo: " + (x.teorico200Ms / 1000).toFixed(2) + "s</b> (" + (x.velKmh || "--") + " km/h)") : "";
      return "<div class='fila-mun'><b>" + (i + 1) + "º " + esc(x.nombre) + "</b> <span style='color:#0dcaf0'>(" + esc(x.circuito || "Global") + ")</span><br><span style='color:#20c997'>VR: " + (x.mejorMs / 1000).toFixed(2) + "s</span> • Reg: <b>" + (x.regPct || 100) + "%</b> • " + esc(x.disc || "MX") + teoTxt + "<div style='font-size:10px;color:#aaa'>Setup: " + esc(x.setupTxt || "Serie") + "</div></div>";
    }).join("") || "<div style='color:#888;padding:10px'>Sin registros.</div>";
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e;padding:10px'>Error cargando ranking</div>"; });
}

function darLikePaddock(id) {
  vibrar(25); if (localStorage.getItem("mxp_like_" + id)) return; localStorage.setItem("mxp_like_" + id, "1");
  fbJson(FB_ROOT + "/paddock/" + id + ".json").then(function(p){ if (p) return fetch(FB_ROOT + "/paddock/" + id + ".json", { method: "PATCH", body: JSON.stringify({ likes: Number(p.likes || 0) + 1 }) }); }).then(cargarPaddock).catch(function(){});
}
function cargarPaddock() {
  var fil = document.getElementById("filSupPad").value, bx = document.getElementById("listaPaddock");
  bx.innerHTML = "<div style='padding:10px;color:#888'>Cargando motos...</div>";
  Promise.all([fbJson(FB_ROOT + "/paddock.json?t=" + Date.now()).catch(function(){ return null; }), fbJson(FB_ROOT + "/paddock_fotos.json?t=" + Date.now()).catch(function(){ return null; })]).then(function(res) {
    var pd = res[0], fts = res[1] || {};
    if (!pd) { bx.innerHTML = "<div style='color:#888;padding:10px'>Aun no hay motos en el Paddock.</div>"; return; }
    var arr = Object.keys(pd).map(function(k){ return Object.assign({ id: k }, pd[k]); }).filter(function(x){ return x && x.modelo && (fil === "TODOS" || (x.disc || "MX") === fil); });
    arr.sort(function(a, b){ return (Number(b.likes || 0) - Number(a.likes || 0)) || (Number(b.ts || 0) - Number(a.ts || 0)); });
    bx.innerHTML = arr.slice(0, 30).map(function(x) {
      var img = fts[x.id] && fts[x.id].img ? '<img src="' + fts[x.id].img + '" alt="Moto">' : '';
      var liked = !!localStorage.getItem("mxp_like_" + x.id);
      return "<div class='pad-card'>" + img + "<div style='display:flex;justify-content:space-between;align-items:center'><b>#" + esc(x.dorsal || "1") + " " + esc(x.modelo) + "</b><button onclick=\"darLikePaddock('" + escJs(x.id) + "')\" style='width:auto;padding:5px 9px;font-size:11px;background:" + (liked ? "#20c997" : "#262626") + ";color:" + (liked ? "#000" : "#ffc107") + "'>👍 " + (x.likes || 0) + "</button></div>" +
        "<div style='font-size:11px;color:#0dcaf0'>" + esc(x.piloto) + " • " + esc(x.circuito || "Global") + " • " + esc(x.disc || "MX") + (x.mvp ? (" • 🏆 " + x.mvp) : "") + "</div><div style='font-size:10px;color:#aaa;margin-top:3px'>Setup: " + esc(x.setupTxt || "Serie") + "</div></div>";
    }).join("") || "<div style='color:#888;padding:10px'>Sin motos.</div>";
  }).catch(function(){ bx.innerHTML = "<div style='color:#ff4d5e;padding:10px'>Error cargando Paddock</div>"; });
}

aplicarIdioma();
aplicarRestriccionesInstalacion();
cargarAccesoConfig();
cargarListaCircuitos();
actualizarEstadoSala();
comprobarGpsCercano();
setInterval(actualizarEstadoSala, 2500);