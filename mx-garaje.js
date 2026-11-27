var mxGar = (function() {
  var _s = { cfg: {}, motos: [], idx: 0, cols: [], hist: [] };
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
    var st = document.getElementById(_s.cfg.tiemposId || "slotTiempos");
    if (st) {
      st.innerHTML =
        '<div class="card tiempos-card">' +
          '<div class="tiempos-heading"><div><b>⏱️ TIEMPOS Y PROGRESO</b><div class="tiempos-subtitle">Tus vueltas y resultados del circuito</div></div></div>' +
          '<div class="grid4 tiempos-metrics">' +
            '<div class="stat"><div>MEJOR VUELTA</div><b id="stMejor" class="tiempos-value">--</b></div>' +
            '<div class="stat"><div>REGULARIDAD</div><b id="stReg" class="tiempos-value">--%</b></div>' +
            '<div class="stat"><div>VUELTAS</div><b id="stVtas" class="tiempos-value">0</b></div>' +
            '<div class="stat"><div>RANGO</div><b id="stRango" class="tiempos-value">ROOKIE</b></div>' +
          '</div>' +
          '<section class="tiempos-section">' +
            '<h3>🏆 CAMPEONATO DEL DÍA</h3>' +
            '<div id="boxCampDia" class="tiempos-list"></div>' +
          '</section>' +
          '<section class="tiempos-section">' +
            '<h3>⚔️ COMPARAR CON OTRO PILOTO</h3>' +
            '<select id="selRivalDuelo" aria-label="Elegir piloto para comparar" onchange="mxGar.pintarDuelo()"></select>' +
            '<div id="boxDuelo" class="tiempos-duelo"></div>' +
          '</section>' +
          '<section class="tiempos-section">' +
            '<h3>📅 HISTORIAL DE VUELTAS</h3>' +
            '<div id="listaDiasHist" class="tiempos-list"></div>' +
          '</section>' +
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
      if (this._initColor) this._initColor();
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