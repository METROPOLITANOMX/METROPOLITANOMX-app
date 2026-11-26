var FB_BASE = "https://metropolitano-mx-circuit-default-rtdb.firebaseio.com/";
var FB_ROOT = FB_BASE + "mx_pro";
var _offSrv = 0;

fetch(FB_BASE + ".info/serverTimeOffset.json")
  .then(function(r){ return r.ok ? r.json() : 0; })
  .then(function(o){ if (typeof o === "number") _offSrv = o; })
  .catch(function(){});

function ahoraSrv() { return Math.round(Date.now() + _offSrv); }
function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 18); } catch (e) {} }
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
  });
}
function escJs(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/'/g, "\\x27").replace(/"/g, "\\x22").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/</g, "\\x3c").replace(/>/g, "\\x3e");
}
function b64Enc(str) {
  try { return btoa(unescape(encodeURIComponent(String(str || "")))); } catch (e) { return ""; }
}
function b64Dec(str) {
  try { return decodeURIComponent(escape(atob(String(str || "")))); }
  catch (e) { try { return atob(String(str || "")); } catch (e2) { return ""; } }
}
function fbJson(url, opt) {
  return fetch(url, opt).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });
}
function fmt(ms) {
  if (!ms || ms <= 0) return "--";
  var csTot = Math.round(ms / 10);
  if (csTot < 6000) return (csTot / 100).toFixed(2) + "s";
  var m = Math.floor(csTot / 6000), rem = csTot % 6000, s = Math.floor(rem / 100), cs = rem % 100;
  return m + ":" + (s < 10 ? "0" : "") + s + "." + (cs < 10 ? "0" : "") + cs;
}
function fmtCrono(seg) {
  var dsTot = Math.max(0, Math.floor((Number(seg) || 0) * 10));
  if (dsTot < 600) {
    var s = Math.floor(dsTot / 10), d = dsTot % 10;
    return (s < 10 ? "0" : "") + s + "." + d + "s";
  }
  var m = Math.floor(dsTot / 600), rem = dsTot % 600, s2 = Math.floor(rem / 10), d2 = rem % 10;
  return (m < 10 ? "0" : "") + m + ":" + (s2 < 10 ? "0" : "") + s2 + "." + d2;
}
function fmtVoz(ms) {
  if (!ms || ms <= 0) return "";
  var csTot = Math.round(ms / 10);
  if (csTot < 6000) return (csTot / 100).toFixed(2).replace(".", " punto ") + " segundos";
  var m = Math.floor(csTot / 6000), rem = csTot % 6000, s = Math.floor(rem / 100), cs = rem % 100;
  var dec = (s + cs / 100).toFixed(2).replace(".", " punto ");
  return m + (m === 1 ? " minuto " : " minutos ") + dec + " segundos";
}

function hashTxt(txt) {
  var s = "MXPRO_2026_SALT_" + String(txt || "");
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function(buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function(b) {
        return ("00" + b.toString(16)).slice(-2);
      }).join("");
    });
  }
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return Promise.resolve("fb_" + h.toString(16));
}

function rgbLab(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  var x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = (r * 0.2126 + g * 0.7152 + b * 0.0722), z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}
function parseRgb(c) {
  if (typeof c.r === "number") return { r: c.r, g: c.g, b: c.b };
  var m = String(c.hex || "").match(/\d+/g);
  return (m && m.length >= 3) ? { r: +m[0], g: +m[1], b: +m[2] } : { r: 0, g: 0, b: 0 };
}

function activarWakeLock() {
  if ("wakeLock" in navigator) navigator.wakeLock.request("screen").catch(function(){});
}
document.addEventListener("visibilitychange", function(){
  if (document.visibilityState === "visible") activarWakeLock();
});

var _mxAudioCtx = null;
function desbloquearAudioCore() {
  try {
    if (!_mxAudioCtx) _mxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_mxAudioCtx && _mxAudioCtx.state === "suspended") _mxAudioCtx.resume();
  } catch (e) {}
}
function mxBeep(freq, ms) {
  try {
    desbloquearAudioCore();
    if (!_mxAudioCtx) return;
    var o = _mxAudioCtx.createOscillator(), g = _mxAudioCtx.createGain();
    o.frequency.value = freq || 840; g.gain.value = 0.22; o.connect(g); g.connect(_mxAudioCtx.destination);
    o.start(); setTimeout(function(){ o.stop(); }, ms || 140);
  } catch (e) {}
}
function mxHablar(t, activo, lang) {
  if (activo === false || !t || !("speechSynthesis" in window)) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t);
    u.lang = lang || "es-ES"; u.rate = 1.06;
    speechSynthesis.speak(u);
  } catch (e) {}
}

function flashRecord(tipo) {
  document.body.classList.remove("rec-rp", "rec-vr");
  void document.body.offsetWidth;
  document.body.classList.add(tipo === "VR" ? "rec-vr" : "rec-rp");
  setTimeout(function(){ document.body.classList.remove("rec-rp", "rec-vr"); }, 2500);
}

function applySsePatch(rootObj, path, data, isPut) {
  if (path === "/") {
    if (isPut) {
      var d = data || {};
      Object.keys(rootObj).forEach(function(k){ rootObj[k] = d[k] || {}; });
    } else if (data && typeof data === "object") {
      Object.assign(rootObj, data);
    }
    return;
  }
  var parts = path.slice(1).split("/"), cur = rootObj;
  for (var i = 0; i < parts.length - 1; i++) {
    var k = parts[i];
    if (typeof cur[k] !== "object" || !cur[k]) cur[k] = {};
    cur = cur[k];
  }
  var last = parts[parts.length - 1];
  if (data === null) delete cur[last];
  else if (isPut || typeof data !== "object" || Array.isArray(data)) cur[last] = data;
  else {
    if (typeof cur[last] !== "object" || !cur[last]) cur[last] = {};
    Object.assign(cur[last], data);
  }
}

function esPilotoActivo(p) {
  return p && (p.enPista !== false) && p.tsActivo && Math.abs(ahoraSrv() - Number(p.tsActivo)) < 25000;
}

function ordenarPilotos(pAll, salaObj) {
  pAll = pAll || {}; salaObj = salaObj || {};
  var pils = Object.keys(pAll).filter(function(k){
    var p = pAll[k];
    if (!p || !p.nombre) return false;
    return esPilotoActivo(p) || (Number(p.vueltas || 0) > 0);
  }).map(function(k){ return Object.assign({ id: k, activo: esPilotoActivo(pAll[k]) }, pAll[k]); });
  var mj = salaObj.modoJuego || "NORMAL";
  if (mj === "REY" || mj === "SUPERPOLE") pils.sort(function(a, b){ return (a.mejorMs || 9e9) - (b.mejorMs || 9e9); });
  else pils.sort(function(a, b){ return ((a.eliminado ? 1 : 0) - (b.eliminado ? 1 : 0)) || ((b.vueltas || 0) - (a.vueltas || 0)) || ((a.mejorMs || 9e9) - (b.mejorMs || 9e9)); });
  return pils;
}

function calcularCampeonato(campObj) {
  var mp = {}, mKeys = Object.keys(campObj || {}).sort();
  mKeys.forEach(function(mk) {
    var m = campObj[mk];
    if (!m || !Array.isArray(m.res)) return;
    m.res.forEach(function(r) {
      if (!mp[r.id]) mp[r.id] = { nombre: r.nombre, dorsal: r.dorsal || "1", pts: 0, mangas: 0, mejorMs: 0 };
      mp[r.id].pts += Number(r.puntos || 0);
      mp[r.id].mangas++;
      if (r.mejorMs && (!mp[r.id].mejorMs || r.mejorMs < mp[r.id].mejorMs)) mp[r.id].mejorMs = r.mejorMs;
    });
  });
  return {
    nMangas: mKeys.length,
    tabla: Object.keys(mp).map(function(k){ return mp[k]; }).sort(function(a, b){ return (b.pts - a.pts) || ((a.mejorMs || 9e9) - (b.mejorMs || 9e9)); })
  };
}

function descargarPodioPngCore(cnvId, circNom, circId, campObj) {
  var cInfo = calcularCampeonato(campObj);
  if (!cInfo.tabla.length) { alert("Aun no hay mangas guardadas en el campeonato."); return; }
  var cv = document.getElementById(cnvId), cx = cv.getContext("2d");
  cx.fillStyle = "#0b0b0b"; cx.fillRect(0, 0, 720, 720);
  cx.fillStyle = "#ffc107"; cx.fillRect(0, 0, 720, 18); cx.fillRect(0, 702, 720, 18);
  cx.textAlign = "center";
  cx.fillStyle = "#ffc107"; cx.font = "bold 30px Arial"; cx.fillText("PODIO OFICIAL — " + circNom.toUpperCase(), 360, 74);
  cx.fillStyle = "#0dcaf0"; cx.font = "bold 20px Arial"; cx.fillText("CAMPEONATO (" + cInfo.nMangas + " MANGAS) • " + new Date().toLocaleDateString("es-ES"), 360, 112);

  var t = cInfo.tabla;
  var drawCol = function(ix, x, hBox, col, medalla) {
    if (!t[ix]) return;
    var yTop = 430 - hBox;
    cx.fillStyle = "#181818"; cx.fillRect(x - 95, yTop, 190, hBox);
    cx.strokeStyle = col; cx.lineWidth = 4; cx.strokeRect(x - 95, yTop, 190, hBox);
    cx.fillStyle = col; cx.font = "bold 40px Arial"; cx.fillText(medalla, x, yTop - 48);
    cx.fillStyle = "#fff"; cx.font = "bold 22px Arial"; cx.fillText(t[ix].nombre.slice(0, 12).toUpperCase(), x, yTop - 16);
    cx.fillStyle = col; cx.font = "bold 32px Arial"; cx.fillText(t[ix].pts + " PTS", x, yTop + 48);
    cx.fillStyle = "#aaa"; cx.font = "16px Arial"; cx.fillText("VR: " + fmt(t[ix].mejorMs), x, yTop + 82);
  };
  drawCol(1, 145, 130, "#c0c0c0", "2º");
  drawCol(0, 360, 180, "#ffc107", "1º 👑");
  drawCol(2, 575, 110, "#cd7f32", "3º");

  cx.textAlign = "left"; cx.fillStyle = "#ccc"; cx.font = "18px Arial";
  t.slice(3, 8).forEach(function(r, k){
    cx.fillText((k + 4) + "º #" + r.dorsal + " " + r.nombre + " — " + r.pts + " pts (VR " + fmt(r.mejorMs) + ")", 80, 490 + k * 34);
  });
  var a = document.createElement("a");
  a.download = "Podio_" + circId + ".png";
  a.href = cv.toDataURL("image/png");
  a.click();
}

var RULETA_RETOS = [
  { solo: true,  tit: "🎯 CLAVA EL CRONO", txt: "Haz 2 vueltas seguidas con menos de 0.30s de diferencia entre ellas.", voz: "Reto Clava el Crono: haz dos vueltas seguidas con menos de tres decimas de diferencia." },
  { solo: true,  tit: "🔥 VUELTA DOBLE", txt: "Tu proxima vuelta limpia vale por 2 en puntuacion y ritmo.", voz: "Reto Vuelta Doble: la proxima vuelta limpia vale por dos." },
  { solo: true,  tit: "💣 BOMBA 35 SEGUNDOS", txt: "Tienes 35 segundos para completar la vuelta actual antes de que estalle la bomba.", voz: "Reto Bomba treinta y cinco segundos: completa esta vuelta antes de treinta y cinco segundos." },
  { solo: true,  tit: "⚡ DESAFIO PERSONAL", txt: "Baja al menos 1 decima tu mejor vuelta anterior en tus proximas 2 pasadas.", voz: "Reto Desafio Personal: intenta bajar una decima tu mejor tiempo en las proximas dos vueltas." },
  { solo: true,  tit: "⚖️ VUELTA CONTROL", txt: "Prioriza fluidez total: cero errores, cero salidas de pista y trazada limpia.", voz: "Reto Vuelta Control: trazada limpia, sin errores ni salidas de pista." },
  { solo: true,  tit: "🔧 PIT-STOP 2 SEGUNDOS", txt: "Al pasar por linea de meta frena 2 segundos completos y vuelve a dar gas.", voz: "Reto Pit Stop: al pasar por meta frena dos segundos completos y vuelve a acelerar." },
  { solo: false, tit: "🟨 PRECAUCION 10s", txt: "Diez segundos manteniendo posiciones sin adelantamientos en pista.", voz: "Reto Precaucion: diez segundos sin adelantar manteniendo posiciones." }
];