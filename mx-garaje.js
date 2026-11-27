var mxGar = (function() {
  var _s = { cfg: {}, motos: [], idx: 0, cols: [], hist: [], CW: 240, CH: 160, undo: [], raw: null, mask: null, lado: 1, stCol: null };
  var _stFoto = null, _slotFoto = 0;

  function loadLocal() {
    try { _s.motos = JSON.parse(localStorage.getItem("mxp_gar_" + _s.cfg.uid) || "[]"); } catch (e) { _s.motos = []; }
    try { _s.hist = JSON.parse(localStorage.getItem("mxp_hist_" + _s.cfg.uid) || "[]"); } catch (e) { _s.hist = []; }
    if (!_s.motos.length) _s.motos = [{ modelo: "Losi Promoto-MX", dorsal: "1", disc: "MX", colores: [], fotos: ["", "", "", ""], vtas: 0, setup: {} }];
  }
  function saveMotos() {
    try { localStorage.setItem("mxp_gar_" + _s.cfg.uid, JSON.stringify(_s.motos)); return true; }
    catch (e) { alert("Memoria del movil llena. Borra alguna foto para poder guardar."); return false; }
  }
  function saveHist() {
    try { localStorage.setItem("mxp_hist_" + _s.cfg.uid, JSON.stringify(_s.hist)); } catch (e) {}
  }

  function injectUI() {
    var sg = document.getElementById(_s.cfg.garId || "slotGaraje");
    if (sg) {
      sg.innerHTML =
        '<div class="card" style="border-color:#20c997">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<b style="color:#ffc107;font-size:13px">🏍️ MI MOTO ACTIVA EN PISTA</b>' +
            '<button onclick="vibrar();mxGar.nuevaMoto()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;padding:6px 9px;font-size:10px">+ NUEVA MOTO</button>' +
          '</div>' +
          (_s.cfg.allowEditNom ? '<div><label style="font-size:10px;color:#0dcaf0">NOMBRE EN PARRILLA</label><input id="gNomPil" placeholder="Nombre Piloto"></div>' : '') +
          '<select id="selMotoGar" onchange="mxGar.cambiarMoto(this.value)"></select>' +
          '<select id="gDisc" style="color:#0dcaf0;font-weight:bold"><option value="MX">🏍️ DISCIPLINA: MX TIERRA (MOTOCROSS)</option><option value="SM">🏁 DISCIPLINA: SM SUPERMOTO (ASFALTO)</option></select>' +
          '<div class="grid2"><div><label style="font-size:10px;color:#aaa">MODELO</label><input id="gMod" placeholder="Losi Promoto-MX"></div><div><label style="font-size:10px;color:#aaa">DORSAL</label><input id="gDor" placeholder="46"></div></div>' +
          '<div style="font-size:11px;color:#0dcaf0;font-weight:bold;margin:4px 0 6px">📸 GALERIA DE TU MOTO (4 FOTOS EN DIRECTO)</div>' +
          '<div id="gridFotosGar" class="grid4"></div>' +
          '<div class="box-sub" style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
            '<div style="font-size:11px">Firma Antena: <b id="lblFirmaGar" style="color:#ff4d5e">PENDIENTE</b><div id="muestrasGar" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"></div></div>' +
            '<button onclick="vibrar();mxGar.abrirCapColor()" style="background:linear-gradient(180deg,#339af0,#1c7ed6);color:#fff;font-size:10px;white-space:nowrap">📷 CAPTURAR COLORES</button>' +
          '</div>' +
          '<div id="boxCapGar" style="display:none;background:#1a1d24;border:2px solid #0dcaf0;border-radius:10px;padding:10px;margin-bottom:10px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span id="txtPasoCap" style="font-size:11px;color:#ffc107;font-weight:bold">PASO 1 DE 2: ENFOCA TU MOTO EN DIRECTO</span><button onclick="vibrar();mxGar.cerrarCapColor()" style="background:#333;color:#fff;padding:4px 8px;font-size:10px">✕</button></div>' +
            '<div style="font-size:10px;color:#0dcaf0;background:#101820;border:1px solid #1c3b57;border-radius:6px;padding:6px;margin-bottom:6px">💡 <b>Consejo:</b> Buena luz y colores vivos en casco/carenado ofrecen la maxima precision frente al suelo y sombras.</div>' +
            '<div id="visorVivoCol" class="cam-visor" style="height:195px"><video id="vidGarCol" autoplay playsinline muted></video><div class="cam-guia"></div><div class="cam-div"></div></div>' +
            '<div id="boxRecorteMagico" style="display:none;margin-bottom:8px">' +
              '<div id="lblCalidadFrame" style="font-size:11px;font-weight:bold;margin-bottom:4px"></div>' +
              '<div style="font-size:10px;color:#ffc107;margin-bottom:4px">🪄 <b>VARITA MÁGICA:</b> Toca el fondo sobrante para borrarlo</div>' +
              '<canvas id="cnvCapEdit" width="240" height="160" class="checker" style="width:100%;max-width:300px;border-radius:8px;border:2px solid #ffc107;cursor:crosshair;touch-action:none"></canvas>' +
              '<div style="display:flex;align-items:center;gap:5px;margin-top:6px"><span style="font-size:10px;color:#aaa">Fondo:</span><button class="btn-step" onclick="mxGar.stepBgTol(-4)">-</button><input id="rngBgTol" type="range" min="15" max="75" value="38" oninput="mxGar.reaplicarRecorte()" style="margin:0;flex:1"><button class="btn-step" onclick="mxGar.stepBgTol(4)">+</button><button onclick="vibrar();mxGar.deshacer()" style="background:#333;color:#fff;padding:5px 8px;font-size:10px">↩️</button></div>' +
              '<div class="grid2" style="margin-top:6px"><button onclick="vibrar(25);mxGar.extraerColores()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;font-size:11px">✅ EXTRAER COLORES</button><button onclick="vibrar();mxGar.volverCam()" style="background:#2b2b2b;color:#fff;font-size:11px">📷 REPETIR</button></div>' +
            '</div>' +
            '<button id="btnSnapCol" onclick="vibrar(25);mxGar.capturarYRecortar()" style="width:100%;background:linear-gradient(180deg,#3bc9db,#0dcaf0);color:#000;margin-bottom:8px">📸 CAPTURAR Y RECORTAR FONDO</button>' +
            '<div style="font-size:10px;color:#aaa;margin-bottom:4px">Paleta rapida colores MX vivos (SUP casco / INF moto):</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;align-items:center">' +
              '<button onclick="vibrar();mxGar.addCol(235,25,25,\'INF\')" title="Rojo" style="background:#eb1919;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(255,115,0,\'INF\')" title="Naranja" style="background:#ff7300;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(255,230,0,\'SUP\')" title="Amarillo" style="background:#ffe600;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(0,210,85,\'INF\')" title="Verde" style="background:#00d255;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(20,110,255,\'INF\')" title="Azul" style="background:#146eff;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(255,20,147,\'SUP\')" title="Magenta Fluor" style="background:#ff1493;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.addCol(0,229,255,\'SUP\')" title="Cian" style="background:#00e5ff;width:28px;height:26px;padding:0"></button>' +
              '<button onclick="vibrar();mxGar.limpiarCols()" style="background:#dc3545;color:#fff;padding:5px 8px;font-size:10px">Limpiar</button>' +
            '</div>' +
            '<button onclick="vibrar(25);mxGar.guardarFirma()" style="width:100%;background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;font-size:11px">💾 GUARDAR FIRMA EN NUBE</button>' +
          '</div>' +
          '<b style="color:#0dcaf0;font-size:11px">🔧 SETUP Y REGLAJE ACTIVO (MS6X)</b>' +
          '<div class="grid2" style="margin-top:4px">' +
            '<input id="gTerr" placeholder="Terreno (Seco / Agarre)"><input id="gHorq" placeholder="Horquilla (ej. 50wt)">' +
            '<input id="gAmort" placeholder="Amortiguador (ej. 35wt)"><input id="gDes" placeholder="Piñon/Corona (12T/40T)">' +
            '<input id="gNeum" placeholder="Neumaticos (MX53)"><input id="gGyro" placeholder="MS6X (ej. 60% / Dirt)">' +
          '</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:6px">' +
            '<button onclick="vibrar(25);mxGar.guardarMoto()" style="flex:2;background:linear-gradient(180deg,#ffe066,#f59f00);color:#000">💾 GUARDAR MOTO</button>' +
            '<button onclick="vibrar();mxGar.compartirWa()" style="flex:1;background:linear-gradient(180deg,#40c057,#25D366);color:#000;font-size:10px">💬 WA</button>' +
          '</div>' +
          '<button onclick="vibrar(25);mxGar.publicarPaddock()" style="width:100%;background:linear-gradient(180deg,#845ef7,#5f3dc4);color:#fff;font-size:11px">🌍 PUBLICAR EN PADDOCK MUNDIAL</button>' +
          '<div id="infoDesgasteGar" style="margin-top:8px;font-size:11px;color:#aaa;background:#101218;padding:7px;border-radius:7px"></div>' +
        '</div>';
    }
    if (!document.getElementById("modalCamFoto")) {
      var wrap = document.createElement("div");
      wrap.innerHTML = '<div id="modalCamFoto" class="cam-modal"><div class="cam-box" style="text-align:center"><div id="titCamFoto" style="font-size:13px;font-weight:bold;color:#0dcaf0;margin-bottom:8px">📷 FOTO DE TU MOTO</div><div class="cam-visor"><video id="vidGarFoto" autoplay playsinline muted></video></div><div class="grid2"><button onclick="vibrar(25);mxGar.capturarFoto()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000">📸 HACER FOTO</button><button onclick="vibrar();mxGar.cerrarCamFoto()" style="background:linear-gradient(180deg,#ff6b6b,#e03131);color:#fff">CANCELAR</button></div></div></div>';
      document.body.appendChild(wrap);
    }
  }

  function pintarFotos() {
    var m = _s.motos[_s.idx] || _s.motos[0], fts = Array.isArray(m.fotos) ? m.fotos : ["", "", "", ""], nom = ["LADO IZQ", "LADO DER", "FRONTAL", "DETALLE"];
    document.getElementById("gridFotosGar").innerHTML = [0, 1, 2, 3].map(function(i) {
      if (fts[i]) return '<div class="foto-slot" onclick="vibrar();mxGar.abrirCamFoto(' + i + ')"><img src="' + fts[i] + '" alt="Foto"><button class="foto-del" onclick="event.stopPropagation();vibrar();mxGar.borrarFoto(' + i + ')">✕</button><div class="foto-lbl">' + nom[i] + '</div></div>';
      return '<div class="foto-slot" onclick="vibrar();mxGar.abrirCamFoto(' + i + ')"><div style="font-size:22px">📷</div><div>FOTO ' + (i + 1) + ' (' + nom[i] + ')</div></div>';
    }).join("");
  }

  function pintarMuestras() {
    var ok = _s.cols.length > 0, lbl = document.getElementById("lblFirmaGar");
    lbl.textContent = ok ? ("OK ✓ (" + _s.cols.length + " tonos)") : "PENDIENTE";
    lbl.style.color = ok ? "#20c997" : "#ff4d5e";
    document.getElementById("muestrasGar").innerHTML = _s.cols.map(function(c) {
      return '<span title="' + esc(c.zona || "CAR") + '" style="width:20px;height:20px;border-radius:4px;border:1px solid #fff;background:' + c.hex + '"></span>';
    }).join("");
  }

  function setupTxt(m) {
    var st = (m && m.setup) || {};
    return [st.terr, st.horq, st.amort, st.des, st.neum, st.gyro ? ("MS6X " + st.gyro) : ""].filter(Boolean).join(" • ") || "Setup de serie";
  }

  return {
    _s: _s, _setupTxt: setupTxt, _pintarMuestras: pintarMuestras, _saveMotos: saveMotos, _saveHist: saveHist,
    init: function(cfg) {
      _s.cfg = cfg || {};
      loadLocal();
      injectUI();
      if (this._bindCanvasColor) this._bindCanvasColor();
      if (this._initTiempos) this._initTiempos();
      this.actualizarRango();
      this.pintarGaraje();
    },
    getDorsal: function() { return (_s.motos[_s.idx] && _s.motos[_s.idx].dorsal) || "1"; },
    actualizarRango: function() {
      var tot = _s.hist.reduce(function(s, d){ return s + (d.vtas ? d.vtas.length : 0); }, 0);
      var rng = tot >= 400 ? "LEYENDA MX" : (tot >= 150 ? "PRO RIDER" : (tot >= 50 ? "AMATEUR" : "ROOKIE"));
      ["badgeRango", "badgeRangoDir"].forEach(function(id){ var el = document.getElementById(id); if (el) el.textContent = rng; });
      return { tot: tot, rng: rng };
    },
    pintarGaraje: function() {
      var s = document.getElementById("selMotoGar"); if (!s) return;
      s.innerHTML = _s.motos.map(function(m, i){ return '<option value="' + i + '"' + (i === _s.idx ? ' selected' : '') + '>' + esc(m.modelo) + ' (#' + esc(m.dorsal || '--') + ')</option>'; }).join("");
      var m = _s.motos[_s.idx] || _s.motos[0], st = m.setup || {};
      if (!Array.isArray(m.fotos)) m.fotos = ["", "", "", ""];
      var gn = document.getElementById("gNomPil"); if (gn) gn.value = _s.cfg.getNom();
      document.getElementById("gDisc").value = m.disc || "MX";
      document.getElementById("gMod").value = m.modelo || "";
      document.getElementById("gDor").value = m.dorsal || "";
      var bd = document.getElementById("badgeDor"); if (bd) { bd.textContent = "#" + (m.dorsal || "--"); bd.className = "mx-plate" + (m.disc === "SM" ? " sm" : ""); }
      document.getElementById("gTerr").value = st.terr || "";
      document.getElementById("gHorq").value = st.horq || "";
      document.getElementById("gAmort").value = st.amort || "";
      document.getElementById("gDes").value = st.des || "";
      document.getElementById("gNeum").value = st.neum || "";
      document.getElementById("gGyro").value = st.gyro || "";
      _s.cols = Array.isArray(m.colores) ? m.colores.slice() : [];
      pintarFotos(); pintarMuestras();
      var vt = m.vtas || 0;
      document.getElementById("infoDesgasteGar").innerHTML = "Uso acumulado: <b>" + vt + " vueltas</b> (~" + (vt * 0.45 / 60).toFixed(1) + "h) • Cadena: " + vt + "/40v • MS6X: " + vt + "/100v";
    },
    cambiarMoto: function(ix) { _s.idx = Number(ix) || 0; this.pintarGaraje(); this.subirNube(); },
    nuevaMoto: function() {
      var mod = prompt("Modelo de la moto:", "Losi Promoto-MX"); if (!mod) return;
      var dor = prompt("Numero de dorsal:", "46") || "1";
      _s.motos.push({ modelo: mod.trim(), dorsal: dor.trim(), disc: "MX", colores: [], fotos: ["", "", "", ""], vtas: 0, setup: {} });
      _s.idx = _s.motos.length - 1; this.guardarMoto();
    },
    guardarMoto: function() {
      var gn = document.getElementById("gNomPil");
      if (gn && gn.value.trim() && _s.cfg.setNom) _s.cfg.setNom(gn.value.trim());
      var m = _s.motos[_s.idx];
      m.disc = document.getElementById("gDisc").value || "MX";
      m.modelo = document.getElementById("gMod").value.trim() || "Losi Promoto-MX";
      m.dorsal = document.getElementById("gDor").value.trim() || "1";
      m.setup = {
        terr: document.getElementById("gTerr").value.trim(), horq: document.getElementById("gHorq").value.trim(),
        amort: document.getElementById("gAmort").value.trim(), des: document.getElementById("gDes").value.trim(),
        neum: document.getElementById("gNeum").value.trim(), gyro: document.getElementById("gGyro").value.trim()
      };
      if (!saveMotos()) return;
      this.pintarGaraje(); this.subirNube();
      alert("Moto y reglaje guardados ✓");
    },
    subirNube: function() {
      var m = _s.motos[_s.idx] || _s.motos[0];
      fetch(_s.cfg.fbCirc + "/garaje/" + _s.cfg.uid + ".json", {
        method: "PATCH",
        body: JSON.stringify({ modelo: m.modelo, dorsal: m.dorsal || "1", disc: m.disc || "MX", colores: m.colores || [], setupTxt: setupTxt(m).slice(0, 290), ts: ahoraSrv() })
      }).catch(function(){});
      if (!_s.cfg.isSoloDir || !_s.cfg.isSoloDir()) {
        fetch(_s.cfg.fbCirc + "/pilotos/" + _s.cfg.uid + ".json", {
          method: "PATCH", body: JSON.stringify({ nombre: _s.cfg.getNom(), dorsal: m.dorsal || "1" })
        }).catch(function(){});
      }
    },
    abrirCamFoto: function(slot) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert("Tu navegador no permite camara."); return; }
      _slotFoto = slot;
      var nom = ["LADO IZQ", "LADO DER", "FRONTAL", "DETALLE"];
      document.getElementById("titCamFoto").textContent = "📷 FOTO " + (slot + 1) + " (" + nom[slot] + ")";
      document.getElementById("modalCamFoto").style.display = "flex";
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function(st){ _stFoto = st; var v = document.getElementById("vidGarFoto"); v.srcObject = st; return v.play(); })
        .catch(function(e){ mxGar.cerrarCamFoto(); alert("Error camara: " + e.message); });
    },
    capturarFoto: function() {
      var v = document.getElementById("vidGarFoto"); if (!v || v.videoWidth <= 0) return;
      var cv = document.createElement("canvas"); cv.width = 480; cv.height = 320;
      cv.getContext("2d").drawImage(v, 0, 0, 480, 320);
      var m = _s.motos[_s.idx]; if (!Array.isArray(m.fotos)) m.fotos = ["", "", "", ""];
      m.fotos[_slotFoto] = cv.toDataURL("image/jpeg", 0.64);
      saveMotos();
      this.cerrarCamFoto(); pintarFotos();
    },
    borrarFoto: function(slot) {
      var m = _s.motos[_s.idx]; if (!Array.isArray(m.fotos)) return;
      m.fotos[slot] = ""; saveMotos(); pintarFotos();
    },
    cerrarCamFoto: function() {
      if (_stFoto) { _stFoto.getTracks().forEach(function(t){ t.stop(); }); _stFoto = null; }
      var m = document.getElementById("modalCamFoto"); if (m) m.style.display = "none";
    },
    cerrarCamaras: function() {
      this.cerrarCamFoto();
      if (this.cerrarCapColor) this.cerrarCapColor();
    },
    compartirWa: function() {
      var m = _s.motos[_s.idx], st = m.setup || {};
      var t = "*SETUP " + (m.disc === "SM" ? "SUPERMOTO" : "MX PROMOTO") + "*\nPiloto: " + _s.cfg.getNom() + " (#" + m.dorsal + ")\nMoto: " + m.modelo + "\nTerreno: " + (st.terr || "-") + "\nHorquilla: " + (st.horq || "-") + "\nAmortiguador: " + (st.amort || "-") + "\nPiñon/Corona: " + (st.des || "-") + "\nNeumaticos: " + (st.neum || "-") + "\nMS6X: " + (st.gyro || "-");
      window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
    },
    publicarPaddock: function() {
      var m = _s.motos[_s.idx] || _s.motos[0], pid = _s.cfg.uid + "_" + _s.idx, foto = (Array.isArray(m.fotos) ? m.fotos.find(Boolean) : "") || "", rng = this.actualizarRango().rng;
      fbJson(FB_ROOT + "/paddock/" + pid + ".json", {
        method: "PATCH",
        body: JSON.stringify({ modelo: (m.modelo || "Losi Promoto-MX").slice(0, 60), dorsal: m.dorsal || "1", piloto: _s.cfg.getNom(), circuito: _s.cfg.circNom, disc: m.disc || "MX", mvp: rng, setupTxt: setupTxt(m).slice(0, 290), ts: ahoraSrv() })
      }).then(function() {
        if (foto) return fetch(FB_ROOT + "/paddock_fotos/" + pid + ".json", { method: "PUT", body: JSON.stringify({ img: foto, ts: ahoraSrv() }) });
      }).then(function() {
        if (_s.cfg.onSpeak) _s.cfg.onSpeak("Moto publicada en el Paddock Mundial");
        alert("🌍 ¡Moto publicada en el Paddock Mundial ✓!");
      }).catch(function(){ alert("Error publicando en Paddock."); });
    }
  };
})();
(function() {
  var _s = mxGar._s;

  function pintarCanvasRecorte() {
    if (!_s.raw || !_s.mask) return;
    var CW = _s.CW, CH = _s.CH;
    var cv = document.getElementById("cnvCapEdit"), cx = cv.getContext("2d"), img = cx.createImageData(CW, CH), od = img.data;
    for (var p = 0; p < CW * CH; p++) {
      var k = p * 4;
      if (_s.mask[p]) { od[k] = _s.raw[k]; od[k + 1] = _s.raw[k + 1]; od[k + 2] = _s.raw[k + 2]; od[k + 3] = 255; }
      else od[k + 3] = 0;
    }
    cx.putImageData(img, 0, 0);
    cx.strokeStyle = "rgba(13,202,240,0.7)"; cx.setLineDash([4, 4]);
    cx.beginPath(); cx.moveTo(0, Math.round(CH * 0.48)); cx.lineTo(CW, Math.round(CH * 0.48)); cx.stroke();
    cx.setLineDash([]);
  }

  Object.assign(mxGar, {
    _bindCanvasColor: function() {
      var cv = document.getElementById("cnvCapEdit");
      if (!cv) return;
      var CW = _s.CW, CH = _s.CH;
      cv.addEventListener("pointerdown", function(ev) {
        if (!_s.raw || !_s.mask) return;
        vibrar(12);
        var rect = cv.getBoundingClientRect();
        var sx = Math.max(0, Math.min(CW - 1, Math.floor((ev.clientX - rect.left) * (CW / rect.width))));
        var sy = Math.max(0, Math.min(CH - 1, Math.floor((ev.clientY - rect.top) * (CH / rect.height))));
        var sp = sy * CW + sx, sk = sp * 4, tr = _s.raw[sk], tg = _s.raw[sk + 1], tb = _s.raw[sk + 2];
        _s.undo.push(new Uint8Array(_s.mask));
        if (_s.undo.length > 8) _s.undo.shift();
        var vis = new Uint8Array(CW * CH), q = [sp]; vis[sp] = 1;
        while (q.length) {
          var p = q.pop(), k = p * 4;
          if (Math.abs(_s.raw[k] - tr) + Math.abs(_s.raw[k + 1] - tg) + Math.abs(_s.raw[k + 2] - tb) <= 72) {
            _s.mask[p] = 0;
            var x = p % CW, y = (p - x) / CW;
            if (x > 0 && !vis[p - 1]) { vis[p - 1] = 1; q.push(p - 1); }
            if (x < CW - 1 && !vis[p + 1]) { vis[p + 1] = 1; q.push(p + 1); }
            if (y > 0 && !vis[p - CW]) { vis[p - CW] = 1; q.push(p - CW); }
            if (y < CH - 1 && !vis[p + CW]) { vis[p + CW] = 1; q.push(p + CW); }
          }
        }
        pintarCanvasRecorte();
      });
    },
    abrirCapColor: function() {
      _s.lado = 1; document.getElementById("boxCapGar").style.display = "block"; this.volverCam();
      document.getElementById("txtPasoCap").textContent = "PASO 1 DE 2: ENFOCA LADO 1 EN DIRECTO";
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
          .then(function(st){ _s.stCol = st; var v = document.getElementById("vidGarCol"); v.srcObject = st; return v.play(); })
          .catch(function(){ document.getElementById("txtPasoCap").textContent = "SIN CAMARA — USA PALETA VIVA O WARM-UP"; });
      }
    },
    cerrarCapColor: function() {
      if (_s.stCol) { _s.stCol.getTracks().forEach(function(t){ t.stop(); }); _s.stCol = null; }
      var b = document.getElementById("boxCapGar"); if (b) b.style.display = "none";
    },
    volverCam: function() {
      document.getElementById("visorVivoCol").style.display = "block";
      document.getElementById("btnSnapCol").style.display = "block";
      document.getElementById("boxRecorteMagico").style.display = "none";
    },
    stepBgTol: function(d) {
      vibrar(12); var el = document.getElementById("rngBgTol");
      el.value = Math.max(15, Math.min(75, Number(el.value) + d));
      this.reaplicarRecorte();
    },
    capturarYRecortar: function() {
      var v = document.getElementById("vidGarCol"); if (!v || v.videoWidth <= 0) { alert("Camara aun no disponible."); return; }
      var CW = _s.CW, CH = _s.CH;
      var tmp = document.createElement("canvas"); tmp.width = CW; tmp.height = CH;
      var tctx = tmp.getContext("2d", { willReadFrequently: true }); tctx.drawImage(v, 0, 0, CW, CH);
      _s.raw = tctx.getImageData(0, 0, CW, CH).data; _s.undo = [];
      var sumL = 0, sat = 0, tot = CW * CH;
      for (var i = 0; i < _s.raw.length; i += 4) {
        var r = _s.raw[i], g = _s.raw[i + 1], b = _s.raw[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        sumL += (r + g + b) / 3; if ((mx - mn) > 36 && mx > 45) sat++;
      }
      var avgL = sumL / tot, satP = (sat / tot) * 100, qEl = document.getElementById("lblCalidadFrame");
      if (avgL < 55) { qEl.style.color = "#ff4d5e"; qEl.textContent = "⚠️ Poca luz — Acerca a zona iluminada"; }
      else if (avgL > 220) { qEl.style.color = "#ffc107"; qEl.textContent = "⚠️ Demasiado brillo — Evita reflejo"; }
      else if (satP < 4) { qEl.style.color = "#ffc107"; qEl.textContent = "⚠️ Poco color vivo — Usa tonos fuertes si puedes"; }
      else { qEl.style.color = "#20c997"; qEl.textContent = "✅ Calidad Optima (" + Math.round(satP) + "% color vivo)"; }
      document.getElementById("visorVivoCol").style.display = "none";
      document.getElementById("btnSnapCol").style.display = "none";
      document.getElementById("boxRecorteMagico").style.display = "block";
      this.reaplicarRecorte();
    },
    reaplicarRecorte: function() {
      if (!_s.raw) return;
      var CW = _s.CW, CH = _s.CH;
      var tol = Number(document.getElementById("rngBgTol").value) || 38;
      _s.mask = new Uint8Array(CW * CH); _s.undo = [];
      var bg = [];
      for (var x = 0; x < CW; x += 4) [2, CH - 3].forEach(function(y){ var i = (y * CW + x) * 4; bg.push([_s.raw[i], _s.raw[i + 1], _s.raw[i + 2]]); });
      for (var y = 0; y < CH; y += 4) [2, CW - 3].forEach(function(x){ var i = (y * CW + x) * 4; bg.push([_s.raw[i], _s.raw[i + 1], _s.raw[i + 2]]); });
      for (var py = 0; py < CH; py++) {
        for (var px = 0; px < CW; px++) {
          var p = py * CW + px, k = p * 4, r = _s.raw[k], g = _s.raw[k + 1], b = _s.raw[k + 2];
          var esF = (px < 16 || px > CW - 16 || py < 12 || py > CH - 12);
          if (!esF) {
            for (var s = 0; s < bg.length; s += 2) {
              if (Math.abs(r - bg[s][0]) + Math.abs(g - bg[s][1]) + Math.abs(b - bg[s][2]) < tol * 2.1) { esF = true; break; }
            }
          }
          _s.mask[p] = esF ? 0 : 1;
        }
      }
      pintarCanvasRecorte();
    },
    deshacer: function() { if (_s.undo.length) { _s.mask = _s.undo.pop(); pintarCanvasRecorte(); } },
    extraerColores: function() {
      if (!_s.raw || !_s.mask) return;
      var CW = _s.CW, CH = _s.CH;
      var midY = Math.round(CH * 0.48), bS = {}, bI = {}, visCnt = 0;
      for (var py = 0; py < CH; py++) {
        for (var px = 0; px < CW; px++) {
          var p = py * CW + px; if (!_s.mask[p]) continue;
          var k = p * 4, r = _s.raw[k], g = _s.raw[k + 1], b = _s.raw[k + 2];
          var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx < 55 || (mx < 78 && (mx - mn) < 18)) continue;
          visCnt++;
          var zn = (py < midY) ? "SUP" : "INF", key = Math.round(r / 32) + "_" + Math.round(g / 32) + "_" + Math.round(b / 32), dst = (zn === "SUP") ? bS : bI;
          if (!dst[key]) dst[key] = { cnt: 0, r: 0, g: 0, b: 0, zn: zn };
          dst[key].cnt++; dst[key].r += r; dst[key].g += g; dst[key].b += b;
        }
      }
      if (!visCnt) { alert("Solo se detecta negro o quedo todo borrado. Pulsa 'Repetir' y deja un color visible."); return; }
      var minVivo = Math.max(8, Math.round(visCnt * 0.006));
      var top = function(mp) {
        var arr = Object.keys(mp).map(function(key) {
          var o = mp[key], n = o.cnt, rr = Math.round(o.r / n), gg = Math.round(o.g / n), bb = Math.round(o.b / n), lb = rgbLab(rr, gg, bb);
          return { cnt: n, r: rr, g: gg, b: bb, zona: o.zn, hex: "rgb(" + rr + "," + gg + "," + bb + ")", lab: lb, ch: Math.sqrt(lb.a * lb.a + lb.b * lb.b) };
        }).filter(function(c) { return !(c.ch < 16 && c.lab.L <= 30); });
        arr.sort(function(a, b) {
          var aV = (a.ch >= 18 && a.cnt >= minVivo) ? 1 : 0;
          var bV = (b.ch >= 18 && b.cnt >= minVivo) ? 1 : 0;
          if (aV !== bV) return bV - aV;
          return b.cnt - a.cnt;
        });
        return arr.slice(0, 2).map(function(c) { delete c.ch; return c; });
      };
      var res = top(bS).concat(top(bI));
      if (!res.length) { alert("Solo se detecta negro/oscuro. Pulsa 'Repetir' y deja visible un color de la moto."); return; }
      if (_s.lado === 1) { _s.cols = res; _s.lado = 2; document.getElementById("txtPasoCap").textContent = "✓ LADO 1 OK — CAPTURA LADO 2 O PULSA GUARDAR"; }
      else { _s.cols = _s.cols.concat(res).slice(-6); document.getElementById("txtPasoCap").textContent = "✅ 2 LADOS LISTOS — PULSA GUARDAR FIRMA"; }
      mxGar._pintarMuestras(); this.volverCam();
    },
    addCol: function(r, g, b, zn) {
      if (_s.cols.length >= 6) _s.cols.shift();
      _s.cols.push({ r: r, g: g, b: b, zona: zn, hex: "rgb(" + r + "," + g + "," + b + ")", lab: rgbLab(r, g, b) });
      mxGar._pintarMuestras();
    },
    limpiarCols: function() { _s.cols = []; mxGar._pintarMuestras(); },
    guardarFirma: function() {
      if (!_s.cols.length) { alert("Captura o añade colores primero."); return; }
      _s.motos[_s.idx].colores = _s.cols.slice();
      this.cerrarCapColor(); this.guardarMoto();
      if (_s.cfg.onSpeak) _s.cfg.onSpeak("Colores guardados en la nube");
    }
  });
})();