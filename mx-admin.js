var circId = localStorage.getItem("mxp_circ_id") || "METROPOLITANO";
var circNom = localStorage.getItem("mxp_circ_nom") || "METROPOLITANO CIRCUIT";
var FB = FB_ROOT + "/circuitos/" + circId;
var uid = localStorage.getItem("mxp_uid") || "director";
var dirSessionId = "admin_" + Math.random().toString(36).slice(2, 10);
var rootCache = { sala: {}, antenas: {}, pilotos: {}, garaje: {}, campeonato: {}, eventos: {} };

document.getElementById("txtCircAdmin").textContent = "🏁 " + circNom;

function entrarAdmin() {
  var clave = document.getElementById("inpAdminClave").value.trim();
  var msg = document.getElementById("msgAdminAuth");
  if (!clave) { msg.style.color = "#ff4d5e"; msg.textContent = "Introduce la clave de Dirección."; return; }
  msg.style.color = "#0dcaf0"; msg.textContent = "Verificando...";
  verificarClaveDir(clave).then(function(ok) {
    if (!ok) { msg.style.color = "#ff4d5e"; msg.textContent = "Clave incorrecta."; return; }
    document.getElementById("modalAdminAuth").style.display = "none";
    document.getElementById("adminApp").style.display = "block";
    cargarAccesoCfgDir();
    cargarRaizAdmin();
    actualizarEstadoServiciosAdmin();
  }).catch(function(err) {
    msg.style.color = "#ff4d5e";
    msg.textContent = "No se pudo verificar la clave: " + (err && err.message ? err.message : "error de conexión");
  });
}

function cargarRaizAdmin() {
  return fbJson(FB + ".json?t=" + Date.now()).then(function(r) {
    if (!r) throw new Error("No se pudieron cargar los datos del circuito.");
    rootCache = {
      sala: r.sala || {},
      antenas: r.antenas || {},
      pilotos: r.pilotos || {},
      garaje: r.garaje || {},
      campeonato: r.campeonato || {},
      eventos: r.eventos || {}
    };
    pintarPilotosAdmin();
    return rootCache;
  }).catch(function(err) {
    document.getElementById("msgAdminDatos").style.color = "#ff4d5e";
    document.getElementById("msgAdminDatos").textContent = err.message || "Error cargando datos del circuito.";
    return null;
  });
}

function renderSwatchesAdmin(g) {
  var cs = (g && Array.isArray(g.colores)) ? g.colores.slice(0, 3) : [];
  return cs.map(function(c) {
    var nom = c.nom || c.hex || "Color asignado";
    return '<span class="mx-sw" role="img" aria-label="Color de piloto: ' + esc(nom) + '" title="' + esc(nom) + '" style="background:' + esc(c.hex || "#fff") + '"></span>';
  }).join("");
}

function pintarPilotosAdmin() {
  var pils = ordenarPilotos(rootCache.pilotos, rootCache.sala), gar = rootCache.garaje || {};
  var activos = pils.filter(function(p){ return p.activo; }).length;
  document.getElementById("lblPistaStatusDir").textContent = activos ? ("🟢 " + activos + " EN PISTA") : "⚪ PISTA VACIA";
  document.getElementById("listaSalaDir").innerHTML = pils.map(function(p, ix) {
    var dot = p.activo ? "🟢" : "⚪", g = gar[p.id] || {};
    var placa = '<span class="mx-plate' + (g.disc === "SM" ? " sm" : "") + '">#' + esc(p.dorsal || "--") + '</span>';
    return '<div class="fila' + (p.eliminado ? ' elim' : '') + '"><span>' + dot + ' <b>' + (ix + 1) + 'º</b> ' + placa + renderSwatchesAdmin(g) + '<b>' + esc(p.nombre) + '</b> (' + (p.vueltas || 0) + 'v' + (p.sensorOk ? ' ✓' : '') + ')</span><span><b class="tv-rp">' + fmt(p.mejorMs) + '</b>' + (p.vueltas > 0 ? ' <button onclick="vibrar();restarVueltaDir(\'' + esc(p.id) + '\')" style="background:#553300;color:#ffc107;padding:3px 6px;font-size:10px">-1v</button>' : '') + ' <button onclick="vibrar();expulsarPilotoDir(\'' + esc(p.id) + '\')" style="background:#dc3545;color:#fff;padding:3px 6px;font-size:10px">✕</button></span></div>';
  }).join("") || '<div style="color:#777;font-size:12px">Ningun piloto en sala.</div>';
}

function actualizarEstadoServiciosAdmin() {
  document.getElementById("estadoRedAdmin").textContent = navigator.onLine ? "Conectado" : "Sin conexión";
  document.getElementById("estadoRedAdmin").style.color = navigator.onLine ? "#20c997" : "#ff6b6b";
  document.getElementById("estadoDbAdmin").textContent = "Comprobando...";
  document.getElementById("estadoSwAdmin").textContent = "Comprobando...";
  document.getElementById("estadoCacheAdmin").textContent = "Comprobando...";

  fetch(FB + "/sala.json?t=" + Date.now(), { cache: "no-store" }).then(function(res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    document.getElementById("estadoDbAdmin").textContent = "Disponible";
    document.getElementById("estadoDbAdmin").style.color = "#20c997";
  }).catch(function(err) {
    document.getElementById("estadoDbAdmin").textContent = "Sin respuesta (" + (err.message || "red") + ")";
    document.getElementById("estadoDbAdmin").style.color = "#ff6b6b";
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      var el = document.getElementById("estadoSwAdmin");
      el.textContent = reg ? (reg.active ? "Activo" : "Registrado") : "No registrado";
      el.style.color = reg ? "#20c997" : "#ffc107";
    }).catch(function(err) {
      document.getElementById("estadoSwAdmin").textContent = "Error: " + err.message;
      document.getElementById("estadoSwAdmin").style.color = "#ff6b6b";
    });
  } else {
    document.getElementById("estadoSwAdmin").textContent = "No compatible";
    document.getElementById("estadoSwAdmin").style.color = "#ffc107";
  }

  if ("caches" in window) {
    caches.keys().then(function(keys) {
      var appCaches = keys.filter(function(k){ return k.indexOf("mxp-cache-") === 0; });
      var el = document.getElementById("estadoCacheAdmin");
      el.textContent = appCaches.length ? (appCaches.length + " caché(s)") : "Vacía";
      el.style.color = "#20c997";
    }).catch(function(err) {
      document.getElementById("estadoCacheAdmin").textContent = "Error: " + err.message;
      document.getElementById("estadoCacheAdmin").style.color = "#ff6b6b";
    });
  } else {
    document.getElementById("estadoCacheAdmin").textContent = "No compatible";
    document.getElementById("estadoCacheAdmin").style.color = "#ffc107";
  }
}

function limpiarOfflineDir() {
  cargarRaizAdmin().then(function(data) {
    var ids = Object.keys(data.pilotos).filter(function(k) {
      return data.pilotos[k] && !esPilotoActivo(data.pilotos[k]);
    });
    return Promise.all(ids.map(function(k) {
      return fetch(FB + "/pilotos/" + encodeURIComponent(k) + ".json", { method: "DELETE" }).then(function(res) {
        if (!res.ok) throw new Error("No se pudo limpiar el piloto " + k + " (HTTP " + res.status + ").");
      });
    })).then(function() {
      document.getElementById("msgAdminDatos").style.color = "#20c997";
      document.getElementById("msgAdminDatos").textContent = ids.length ? (ids.length + " piloto(s) desconectado(s) limpiados.") : "No hay pilotos desconectados que limpiar.";
      return cargarRaizAdmin();
    });
  }).catch(function(err) {
    document.getElementById("msgAdminDatos").style.color = "#ff4d5e";
    document.getElementById("msgAdminDatos").textContent = err.message || "Error limpiando pilotos desconectados.";
  });
}

function restarVueltaDir(pUid) {
  var p = (rootCache.pilotos || {})[pUid];
  if (!p || !p.vueltas) return;
  var s = rootCache.sala || {}, heatTag = Number(s.tsInicio || 0) || "free";
  var oldV = Number(p.vueltas), newV = Math.max(0, oldV - 1);
  var pay = { vueltas: newV, ultimaMs: 0 };
  if (newV === 0) { pay.mejorMs = 0; pay.tsUltimoPaso = 0; }
  Promise.all([
    fetch(FB + "/pilotos/" + encodeURIComponent(pUid) + ".json", { method: "PATCH", body: JSON.stringify(pay) }),
    fetch(FB + "/pasos_lock/" + encodeURIComponent(pUid + "_" + heatTag + "_v" + oldV) + ".json", { method: "DELETE" }),
    fetch(FB + "/pasos_lock/" + encodeURIComponent(pUid + "_v" + oldV) + ".json", { method: "DELETE" })
  ]).then(function(responses) {
    var failed = responses.filter(function(res){ return !res.ok; });
    if (failed.length) throw new Error("No se pudo ajustar la vuelta (HTTP " + failed[0].status + ").");
    Object.assign(p, pay);
    pintarPilotosAdmin();
  }).catch(function(err) {
    document.getElementById("msgAdminDatos").style.color = "#ff4d5e";
    document.getElementById("msgAdminDatos").textContent = err.message || "No se pudo ajustar la vuelta.";
  });
}

function expulsarPilotoDir(pUid) {
  if (!confirm("¿Expulsar a este piloto de la parrilla?")) return;
  fetch(FB + "/pilotos/" + encodeURIComponent(pUid) + ".json", { method: "DELETE" }).then(function(res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    if (rootCache.pilotos) delete rootCache.pilotos[pUid];
    pintarPilotosAdmin();
  }).catch(function(err) {
    document.getElementById("msgAdminDatos").style.color = "#ff4d5e";
    document.getElementById("msgAdminDatos").textContent = "No se pudo expulsar al piloto: " + err.message;
  });
}

function borrarHotlapDir() {
  if (!confirm("¿Seguro que quieres borrar el record de Hotlap semanal de este circuito?")) return;
  fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ hotlapMs: null, hotlapTxt: null, ultPasoTs: null, ultPasoTxt: null }) })
    .then(function(res) { if (!res.ok) throw new Error("HTTP " + res.status); alert("Hotlap semanal borrada ✓"); })
    .catch(function(err) { alert("Error al borrar Hotlap: " + err.message); });
}

function borrarTiemposDiaDir() {
  if (!confirm("¿Seguro que quieres borrar los tiempos oficiales y amistosos del día y poner el circuito en espera?")) return;
  cargarRaizAdmin().then(function(data) {
    var hoy = new Date(), dia = hoy.getFullYear() + "-" + ("0" + (hoy.getMonth() + 1)).slice(-2) + "-" + ("0" + hoy.getDate()).slice(-2);
    var ops = [
      fetch(FB + "/campeonato.json", { method: "DELETE" }),
      fetch(FB_ROOT + "/resultados_dia_amistosas/" + encodeURIComponent(circId) + "/" + dia + ".json", { method: "DELETE" }),
      fetch(FB + "/pasos_lock.json", { method: "DELETE" }),
      fetch(FB + "/eventos.json", { method: "DELETE" }),
      fetch(FB_ROOT + "/foto_finish/" + encodeURIComponent(circId) + ".json", { method: "DELETE" }),
      fetch(FB + "/sala/porra.json", { method: "DELETE" }),
      fetch(FB + "/sala.json", { method: "PATCH", body: JSON.stringify({ estado: "ESPERA", tsInicio: 0, tsCuenta: 0, ruleta: null, verVivo: false, dirTs: ahoraSrv(), dirSession: dirSessionId }) })
    ];
    Object.keys(data.pilotos).forEach(function(k) {
      ops.push(fetch(FB + "/pilotos/" + encodeURIComponent(k) + ".json", {
        method: "PATCH",
        body: JSON.stringify({ vueltas: 0, ultimaMs: 0, mejorMs: 0, tsUltimoPaso: 0, sensorOk: false, eliminado: false })
      }));
    });
    return Promise.all(ops).then(function(responses) {
      var failed = responses.filter(function(res){ return !res.ok; });
      if (failed.length) throw new Error("No se pudieron completar todas las limpiezas (HTTP " + failed[0].status + ").");
      document.getElementById("msgAdminDatos").style.color = "#20c997";
      document.getElementById("msgAdminDatos").textContent = "Tiempos del día borrados; circuito en espera.";
      return cargarRaizAdmin();
    });
  }).catch(function(err) {
    document.getElementById("msgAdminDatos").style.color = "#ff4d5e";
    document.getElementById("msgAdminDatos").textContent = err.message || "Error al borrar los tiempos del día.";
  });
}

function borrarMundialDir() {
  if (!confirm("¿Seguro que quieres borrar TODO el Ranking Mundial?")) return;
  fetch(FB_ROOT + "/mundial.json", { method: "DELETE" }).then(function(res) {
    if (res.ok) return true;
    return fetch(FB_ROOT + "/mundial.json?shallow=true").then(function(r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(data) {
      if (!data || typeof data !== "object") return true;
      var patch = {};
      Object.keys(data).forEach(function(k){ patch[k] = null; });
      return fetch(FB_ROOT + "/mundial.json", { method: "PATCH", body: JSON.stringify(patch) }).then(function(r) {
        if (r.ok) return true;
        return Promise.all(Object.keys(data).map(function(k) {
          return fetch(FB_ROOT + "/mundial/" + encodeURIComponent(k) + ".json", { method: "DELETE" }).then(function(del) {
            if (!del.ok) throw new Error("HTTP " + del.status);
          });
        }));
      });
    });
  }).then(function() {
    alert("Ranking mundial borrado ✓");
  }).catch(function(err) {
    alert("Error al borrar ranking mundial: " + (err.message || "red"));
  });
}

function generarClaveAdmin() {
  if (!window.crypto || !window.crypto.getRandomValues) {
    document.getElementById("msgClaveAdmin").style.color = "#ff6b6b";
    document.getElementById("msgClaveAdmin").textContent = "Este navegador no permite generar claves seguras.";
    return;
  }
  var bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  var suffix = Array.prototype.map.call(bytes, function(b){ return b.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  var clave = "DIRECCION" + suffix;
  document.getElementById("claveAdmin").value = clave;
  document.getElementById("msgClaveAdmin").style.color = "#20c997";
  document.getElementById("msgClaveAdmin").textContent = "Clave generada. Actívala como código de invitación para usarla.";
}

function validarClaveAdmin() {
  var clave = document.getElementById("claveAdmin").value.trim();
  var msg = document.getElementById("msgClaveAdmin");
  var rol = mxRolClaveInstalacion(clave);
  if (!/^[A-Z0-9_-]+$/i.test(clave)) {
    msg.style.color = "#ff6b6b";
    msg.textContent = "Código no válido: usa solo letras, números, guiones o guiones bajos.";
    return;
  }
  var codigoActivo = document.getElementById("inpCodAcceso").value.trim();
  var estaActiva = document.getElementById("selModoAcceso").value === "CODIGO" && clave === codigoActivo;
  msg.style.color = "#20c997";
  msg.textContent = (estaActiva ? "Clave activa válida. " : "Formato válido; todavía no está activada. ") +
    (rol === "DIRECCION" ? "Habilita Dirección y Antenas." : "Dirección y Antenas permanecerán ocultas.") +
    (estaActiva ? "" : " Pulsa ACTIVAR COMO CLAVE DE INVITACIÓN para usarla.");
}

function usarClaveAdmin() {
  var clave = document.getElementById("claveAdmin").value.trim();
  var rol = mxRolClaveInstalacion(clave);
  var msg = document.getElementById("msgClaveAdmin");
  if (!/^[A-Z0-9_-]+$/i.test(clave)) {
    msg.style.color = "#ff6b6b";
    msg.textContent = "Introduce un código válido (letras, números, guiones o guiones bajos).";
    return;
  }
  document.getElementById("selModoAcceso").value = "CODIGO";
  document.getElementById("inpCodAcceso").value = clave;
  guardarAccesoCfg(true).then(function(ok) {
    msg.style.color = ok ? "#20c997" : "#ff6b6b";
    msg.textContent = ok ? (rol === "DIRECCION" ? "Código aplicado. Habilita Dirección y Antenas." : "Código aplicado. Dirección y Antenas permanecerán ocultas.") : "No se pudo activar la clave.";
  });
}

function habilitarAccesoAdminLocal() {
  localStorage.setItem("mxp_inst_role", "DIRECCION");
  var msg = document.getElementById("msgAccesoAdminLocal");
  msg.style.color = "#20c997";
  msg.textContent = "Acceso habilitado en este dispositivo. Vuelve a la portada: aparecerán Dirección y Antenas.";
}

function limpiarCacheAdmin() {
  if (!confirm("Se borrará la caché offline de esta aplicación en este dispositivo. No se borrarán datos de Firebase.")) return;
  if (prompt("Para confirmar, escribe LIMPIAR CACHE:") !== "LIMPIAR CACHE") return;
  if (!("caches" in window)) {
    document.getElementById("msgCacheAdmin").style.color = "#ff6b6b";
    document.getElementById("msgCacheAdmin").textContent = "Este navegador no admite limpieza de caché.";
    return;
  }
  caches.keys().then(function(keys) {
    var appCaches = keys.filter(function(k){ return k.indexOf("mxp-cache-") === 0; });
    return Promise.all(appCaches.map(function(k){ return caches.delete(k); })).then(function(results) {
      if (results.some(function(ok){ return !ok; })) throw new Error("No se pudieron borrar todas las cachés.");
      document.getElementById("msgCacheAdmin").style.color = "#20c997";
      document.getElementById("msgCacheAdmin").textContent = appCaches.length ? "Caché local borrada. Recarga la página con conexión." : "No había caché local que borrar.";
      actualizarEstadoServiciosAdmin();
    });
  }).catch(function(err) {
    document.getElementById("msgCacheAdmin").style.color = "#ff6b6b";
    document.getElementById("msgCacheAdmin").textContent = err.message || "No se pudo borrar la caché.";
  });
}
