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