var mxGar = (function() {
  var _cfg = {}, _motos = [], _idx = 0, _cols = [], _lado = 1, _hist = [];
  var _stFoto = null, _stCol = null, _slotFoto = 0;
  var _raw = null, _mask = null, _undo = [], CW = 240, CH = 160;

  function loadLocal() {
    try { _motos = JSON.parse(localStorage.getItem("mxp_gar_" + _cfg.uid) || "[]"); } catch (e) { _motos = []; }
    try { _hist = JSON.parse(localStorage.getItem("mxp_hist_" + _cfg.uid) || "[]"); } catch (e) { _hist = []; }
    if (!_motos.length) _motos = [{ modelo: "Losi Promoto-MX", dorsal: "1", disc: "MX", colores: [], fotos: ["", "", "", ""], vtas: 0, setup: {} }];
  }

  function injectUI() {
    var sg = document.getElementById(_cfg.garId || "slotGaraje");
    var st = document.getElementById(_cfg.tmpId || "slotTiempos");
    if (sg) {
      sg.innerHTML =
        '<div class="card" style="border-color:#20c997">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<b style="color:#ffc107;font-size:13px">🏍️ MI MOTO ACTIVA EN PISTA</b>' +
            '<button onclick="vibrar();mxGar.nuevaMoto()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;padding:6px 9px;font-size:10px">+ NUEVA MOTO</button>' +
          '</div>' +
          (_cfg.allowEditNom ? '<div><label style="font-size:10px;color:#0dcaf0">NOMBRE EN PARRILLA</label><input id="gNomPil" placeholder="Nombre Piloto"></div>' : '') +
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
    if (st) {
      st.innerHTML =
        '<div class="card" style="border-color:#ffc107">' +
          '<b style="color:#ffc107;font-size:12px">📊 ESTADISTICAS GLOBALES</b>' +
          '<div class="grid2" style="margin-top:6px">' +
            '<div class="stat"><div style="font-size:10px;color:#888">MEJOR VUELTA</div><div id="stMejor" style="font-size:18px;font-weight:bold;color:#20c997">--</div></div>' +
            '<div class="stat"><div style="font-size:10px;color:#888">REGULARIDAD</div><div id="stReg" style="font-size:18px;font-weight:bold;color:#0dcaf0">--%</div></div>' +
            '<div class="stat"><div style="font-size:10px;color:#888">TOTAL VUELTAS</div><div id="stVtas" style="font-size:18px;font-weight:bold">0</div></div>' +
            '<div class="stat"><div style="font-size:10px;color:#888">RANGO ACTUAL</div><div id="stRango" style="font-size:16px;font-weight:bold;color:#ffc107">ROOKIE</div></div>' +
          '</div>' +
          '<div class="grid2" style="margin-top:8px"><button onclick="vibrar();mxGar.abrirBackup(\'EXPORT\')" style="background:#1c2530;color:#0dcaf0;font-size:10px">📤 EXPORTAR BACKUP</button><button onclick="vibrar();mxGar.abrirBackup(\'IMPORT\')" style="background:#1d2b24;color:#20c997;font-size:10px">📥 RESTAURAR BACKUP</button></div>' +
        '</div>' +
        '<div class="card" style="border-color:#20c997"><div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#20c997;font-size:12px">🏆 CAMPEONATO DEL DIA (MANGAS MXGP)</b><button onclick="vibrar();mxGar.podioPng()" style="background:linear-gradient(180deg,#ffe066,#f59f00);color:#000;padding:5px 8px;font-size:10px">🖼️ PODIO PNG</button></div><div id="boxCampDia" style="margin-top:6px;font-size:12px;color:#ccc">Aun no hay mangas guardadas hoy.</div></div>' +
        '<div class="card" style="border-color:#0dcaf0"><b style="color:#0dcaf0;font-size:12px">⚔️ DUELO 1 VS 1 Y SETUPS RIVALES</b><select id="selRivalDuelo" onchange="mxGar.pintarDuelo()" style="margin-top:6px"></select><div id="boxDuelo" style="font-size:12px;color:#ddd"></div></div>' +
        '<div class="card"><b style="color:#ffc107;font-size:12px">📅 HISTORIAL POR DIAS RODADOS</b><div id="listaDiasHist" style="margin-top:6px"></div></div>';
    }
    if (!document.getElementById("modalCamFoto")) {
      var wrap = document.createElement("div");
      wrap.innerHTML =
        '<div id="modalCamFoto" class="cam-modal"><div class="cam-box" style="text-align:center"><div id="titCamFoto" style="font-size:13px;font-weight:bold;color:#0dcaf0;margin-bottom:8px">📷 FOTO DE TU MOTO</div><div class="cam-visor"><video id="vidGarFoto" autoplay playsinline muted></video></div><div class="grid2"><button onclick="vibrar(25);mxGar.capturarFoto()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000">📸 HACER FOTO</button><button onclick="vibrar();mxGar.cerrarCamFoto()" style="background:linear-gradient(180deg,#ff6b6b,#e03131);color:#fff">CANCELAR</button></div></div></div>' +
        '<div id="modalBackup" class="cam-modal" onclick="if(event.target===this)this.style.display=\'none\'"><div class="cam-box" style="border-color:#20c997"><div style="font-size:14px;font-weight:bold;color:#20c997;margin-bottom:6px;text-align:center">💾 BACKUP DE GARAJE E HISTORIAL</div><div id="subBackup" style="font-size:11px;color:#aaa;margin-bottom:8px"></div><textarea id="txtBackupJson" rows="7" style="font-family:monospace;font-size:11px" placeholder="Pega aqui el JSON de backup..."></textarea><div class="grid2" style="margin-bottom:6px"><button onclick="vibrar();mxGar.copiarBackup()" style="background:linear-gradient(180deg,#3bc9db,#0dcaf0);color:#000;font-size:11px">📋 COPIAR</button><button onclick="vibrar();mxGar.descargarBackup()" style="background:linear-gradient(180deg,#ffe066,#f59f00);color:#000;font-size:11px">⬇️ DESCARGAR .JSON</button></div><div class="grid2"><button onclick="vibrar(25);mxGar.restaurarBackup()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;font-size:11px">📥 RESTAURAR</button><button onclick="vibrar();document.getElementById(\'modalBackup\').style.display=\'none\'" style="background:#333;color:#fff;font-size:11px">CERRAR</button></div><div id="msgBackup" style="font-size:11px;margin-top:6px;text-align:center;font-weight:bold"></div></div></div>' +
        '<canvas id="cnvPng" width="720" height="720" style="display:none"></canvas>';
      document.body.appendChild(wrap);
    }
    var cv = document.getElementById("cnvCapEdit");
    if (cv) {
      cv.addEventListener("pointerdown", function(ev) {
        if (!_raw || !_mask) return;
        vibrar(12);
        var rect = cv.getBoundingClientRect();
        var sx = Math.max(0, Math.min(CW - 1, Math.floor((ev.clientX - rect.left) * (CW / rect.width))));
        var sy = Math.max(0, Math.min(CH - 1, Math.floor((ev.clientY - rect.top) * (CH / rect.height))));
        var sp = sy * CW + sx, sk = sp * 4, tr = _raw[sk], tg = _raw[sk + 1], tb = _raw[sk + 2];
        _undo.push(new Uint8Array(_mask));
        if (_undo.length > 8) _undo.shift();
        var vis = new Uint8Array(CW * CH), q = [sp]; vis[sp] = 1;
        while (q.length) {
          var p = q.pop(), k = p * 4;
          if (Math.abs(_raw[k] - tr) + Math.abs(_raw[k + 1] - tg) + Math.abs(_raw[k + 2] - tb) <= 72) {
            _mask[p] = 0;
            var x = p % CW, y = (p - x) / CW;
            if (x > 0 && !vis[p - 1]) { vis[p - 1] = 1; q.push(p - 1); }
            if (x < CW - 1 && !vis[p + 1]) { vis[p + 1] = 1; q.push(p + 1); }
            if (y > 0 && !vis[p - CW]) { vis[p - CW] = 1; q.push(p - CW); }
            if (y < CH - 1 && !vis[p + CW]) { vis[p + CW] = 1; q.push(p + CW); }
          }
        }
        pintarCanvasRecorte();
      });
    }
  }

  function pintarCanvasRecorte() {
    if (!_raw || !_mask) return;
    var cv = document.getElementById("cnvCapEdit"), cx = cv.getContext("2d"), img = cx.createImageData(CW, CH), od = img.data;
    for (var p = 0; p < CW * CH; p++) {
      var k = p * 4;
      if (_mask[p]) { od[k] = _raw[k]; od[k + 1] = _raw[k + 1]; od[k + 2] = _raw[k + 2]; od[k + 3] = 255; }
      else od[k + 3] = 0;
    }
    cx.putImageData(img, 0, 0);
    cx.strokeStyle = "rgba(13,202,240,0.7)"; cx.setLineDash([4, 4]);
    cx.beginPath(); cx.moveTo(0, Math.round(CH * 0.48)); cx.lineTo(CW, Math.round(CH * 0.48)); cx.stroke();
    cx.setLineDash([]);
  }

  function pintarFotos() {
    var m = _motos[_idx] || _motos[0], fts = Array.isArray(m.fotos) ? m.fotos : ["", "", "", ""], nom = ["LADO IZQ", "LADO DER", "FRONTAL", "DETALLE"];
    document.getElementById("gridFotosGar").innerHTML = [0, 1, 2, 3].map(function(i) {
      if (fts[i]) return '<div class="foto-slot" onclick="vibrar();mxGar.abrirCamFoto(' + i + ')"><img src="' + fts[i] + '" alt="Foto"><button class="foto-del" onclick="event.stopPropagation();vibrar();mxGar.borrarFoto(' + i + ')">✕</button><div class="foto-lbl">' + nom[i] + '</div></div>';
      return '<div class="foto-slot" onclick="vibrar();mxGar.abrirCamFoto(' + i + ')"><div style="font-size:22px">📷</div><div>FOTO ' + (i + 1) + ' (' + nom[i] + ')</div></div>';
    }).join("");
  }

  function pintarMuestras() {
    var ok = _cols.length > 0, lbl = document.getElementById("lblFirmaGar");
    lbl.textContent = ok ? ("OK ✓ (" + _cols.length + " tonos)") : "PENDIENTE";
    lbl.style.color = ok ? "#20c997" : "#ff4d5e";
    document.getElementById("muestrasGar").innerHTML = _cols.map(function(c) {
      return '<span title="' + esc(c.zona || "CAR") + '" style="width:20px;height:20px;border-radius:4px;border:1px solid #fff;background:' + c.hex + '"></span>';
    }).join("");
  }

  function setupTxt(m) {
    var st = (m && m.setup) || {};
    return [st.terr, st.horq, st.amort, st.des, st.neum, st.gyro ? ("MS6X " + st.gyro) : ""].filter(Boolean).join(" • ") || "Setup de serie";
  }

  function drawCheckered(cx, y, h) {
    var sz = 16;
    for (var x = 0; x < 720; x += sz) {
      cx.fillStyle = ((x / sz) % 2 === 0) ? "#ffc107" : "#181a20";
      cx.fillRect(x, y, sz, h);
    }
  }

  return {
    init: function(cfg) {
      _cfg = cfg || {};
      loadLocal();
      injectUI();
      this.actualizarRango();
      this.pintarGaraje();
    },
    getDorsal: function() { return (_motos[_idx] && _motos[_idx].dorsal) || "1"; },
    actualizarRango: function() {
      var tot = _hist.reduce(function(s, d){ return s + (d.vtas ? d.vtas.length : 0); }, 0);
      var rng = tot >= 400 ? "LEYENDA MX" : (tot >= 150 ? "PRO RIDER" : (tot >= 50 ? "AMATEUR" : "ROOKIE"));
      ["badgeRango", "badgeRangoDir"].forEach(function(id){ var el = document.getElementById(id); if (el) el.textContent = rng; });
      return { tot: tot, rng: rng };
    },
    pintarGaraje: function() {
      var s = document.getElementById("selMotoGar"); if (!s) return;
      s.innerHTML = _motos.map(function(m, i){ return '<option value="' + i + '"' + (i === _idx ? ' selected' : '') + '>' + esc(m.modelo) + ' (#' + esc(m.dorsal || '--') + ')</option>'; }).join("");
      var m = _motos[_idx] || _motos[0], st = m.setup || {};
      if (!Array.isArray(m.fotos)) m.fotos = ["", "", "", ""];
      var gn = document.getElementById("gNomPil"); if (gn) gn.value = _cfg.getNom();
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
      _cols = Array.isArray(m.colores) ? m.colores.slice() : [];
      pintarFotos(); pintarMuestras();
      var vt = m.vtas || 0;
      document.getElementById("infoDesgasteGar").innerHTML = "Uso acumulado: <b>" + vt + " vueltas</b> (~" + (vt * 0.45 / 60).toFixed(1) + "h) • Cadena: " + vt + "/40v • MS6X: " + vt + "/100v";
    },
    cambiarMoto: function(ix) { _idx = Number(ix) || 0; this.pintarGaraje(); this.subirNube(); },
    nuevaMoto: function() {
      var mod = prompt("Modelo de la moto:", "Losi Promoto-MX"); if (!mod) return;
      var dor = prompt("Numero de dorsal:", "46") || "1";
      _motos.push({ modelo: mod.trim(), dorsal: dor.trim(), disc: "MX", colores: [], fotos: ["", "", "", ""], vtas: 0, setup: {} });
      _idx = _motos.length - 1; this.guardarMoto();
    },
    guardarMoto: function() {
      var gn = document.getElementById("gNomPil");
      if (gn && gn.value.trim() && _cfg.setNom) _cfg.setNom(gn.value.trim());
      var m = _motos[_idx];
      m.disc = document.getElementById("gDisc").value || "MX";
      m.modelo = document.getElementById("gMod").value.trim() || "Losi Promoto-MX";
      m.dorsal = document.getElementById("gDor").value.trim() || "1";
      m.setup = {
        terr: document.getElementById("gTerr").value.trim(), horq: document.getElementById("gHorq").value.trim(),
        amort: document.getElementById("gAmort").value.trim(), des: document.getElementById("gDes").value.trim(),
        neum: document.getElementById("gNeum").value.trim(), gyro: document.getElementById("gGyro").value.trim()
      };
      localStorage.setItem("mxp_gar_" + _cfg.uid, JSON.stringify(_motos));
      this.pintarGaraje(); this.subirNube();
      alert("Moto y reglaje guardados ✓");
    },
    subirNube: function() {
      var m = _motos[_idx] || _motos[0];
      fetch(_cfg.fbCirc + "/garaje/" + _cfg.uid + ".json", {
        method: "PATCH",
        body: JSON.stringify({ modelo: m.modelo, dorsal: m.dorsal || "1", disc: m.disc || "MX", colores: m.colores || [], setupTxt: setupTxt(m).slice(0, 290), ts: ahoraSrv() })
      }).catch(function(){});
      if (!_cfg.isSoloDir || !_cfg.isSoloDir()) {
        fetch(_cfg.fbCirc + "/pilotos/" + _cfg.uid + ".json", {
          method: "PATCH", body: JSON.stringify({ nombre: _cfg.getNom(), dorsal: m.dorsal || "1" })
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
      var m = _motos[_idx]; if (!Array.isArray(m.fotos)) m.fotos = ["", "", "", ""];
      m.fotos[_slotFoto] = cv.toDataURL("image/jpeg", 0.64);
      try { localStorage.setItem("mxp_gar_" + _cfg.uid, JSON.stringify(_motos)); } catch (e) { alert("Memoria llena."); }
      this.cerrarCamFoto(); pintarFotos();
    },
    borrarFoto: function(slot) {
      var m = _motos[_idx]; if (!Array.isArray(m.fotos)) return;
      m.fotos[slot] = ""; localStorage.setItem("mxp_gar_" + _cfg.uid, JSON.stringify(_motos)); pintarFotos();
    },
    cerrarCamFoto: function() {
      if (_stFoto) { _stFoto.getTracks().forEach(function(t){ t.stop(); }); _stFoto = null; }
      var m = document.getElementById("modalCamFoto"); if (m) m.style.display = "none";
    },
    abrirCapColor: function() {
      _lado = 1; document.getElementById("boxCapGar").style.display = "block"; this.volverCam();
      document.getElementById("txtPasoCap").textContent = "PASO 1 DE 2: ENFOCA LADO 1 EN DIRECTO";
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
          .then(function(st){ _stCol = st; var v = document.getElementById("vidGarCol"); v.srcObject = st; return v.play(); })
          .catch(function(){ document.getElementById("txtPasoCap").textContent = "SIN CAMARA — USA PALETA VIVA O WARM-UP"; });
      }
    },
    cerrarCapColor: function() {
      if (_stCol) { _stCol.getTracks().forEach(function(t){ t.stop(); }); _stCol = null; }
      var b = document.getElementById("boxCapGar"); if (b) b.style.display = "none";
    },
    cerrarCamaras: function() { this.cerrarCamFoto(); this.cerrarCapColor(); },
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
      var tmp = document.createElement("canvas"); tmp.width = CW; tmp.height = CH;
      var tctx = tmp.getContext("2d", { willReadFrequently: true }); tctx.drawImage(v, 0, 0, CW, CH);
      _raw = tctx.getImageData(0, 0, CW, CH).data; _undo = [];
      var sumL = 0, sat = 0, tot = CW * CH;
      for (var i = 0; i < _raw.length; i += 4) {
        var r = _raw[i], g = _raw[i + 1], b = _raw[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
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
      if (!_raw) return;
      var tol = Number(document.getElementById("rngBgTol").value) || 38;
      _mask = new Uint8Array(CW * CH); _undo = [];
      var bg = [];
      for (var x = 0; x < CW; x += 4) [2, CH - 3].forEach(function(y){ var i = (y * CW + x) * 4; bg.push([_raw[i], _raw[i + 1], _raw[i + 2]]); });
      for (var y = 0; y < CH; y += 4) [2, CW - 3].forEach(function(x){ var i = (y * CW + x) * 4; bg.push([_raw[i], _raw[i + 1], _raw[i + 2]]); });
      for (var py = 0; py < CH; py++) {
        for (var px = 0; px < CW; px++) {
          var p = py * CW + px, k = p * 4, r = _raw[k], g = _raw[k + 1], b = _raw[k + 2];
          var esF = (px < 16 || px > CW - 16 || py < 12 || py > CH - 12);
          if (!esF) {
            for (var s = 0; s < bg.length; s += 2) {
              if (Math.abs(r - bg[s][0]) + Math.abs(g - bg[s][1]) + Math.abs(b - bg[s][2]) < tol * 2.1) { esF = true; break; }
            }
          }
          _mask[p] = esF ? 0 : 1;
        }
      }
      pintarCanvasRecorte();
    },
    deshacer: function() { if (_undo.length) { _mask = _undo.pop(); pintarCanvasRecorte(); } },
    extraerColores: function() {
      if (!_raw || !_mask) return;
      var midY = Math.round(CH * 0.48), bS = {}, bI = {}, visCnt = 0;
      for (var py = 0; py < CH; py++) {
        for (var px = 0; px < CW; px++) {
          var p = py * CW + px; if (!_mask[p]) continue;
          var k = p * 4, r = _raw[k], g = _raw[k + 1], b = _raw[k + 2];
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
      if (_lado === 1) { _cols = res; _lado = 2; document.getElementById("txtPasoCap").textContent = "✓ LADO 1 OK — CAPTURA LADO 2 O PULSA GUARDAR"; }
      else { _cols = _cols.concat(res).slice(-6); document.getElementById("txtPasoCap").textContent = "✅ 2 LADOS LISTOS — PULSA GUARDAR FIRMA"; }
      pintarMuestras(); this.volverCam();
    },
    addCol: function(r, g, b, zn) {
      if (_cols.length >= 6) _cols.shift();
      _cols.push({ r: r, g: g, b: b, zona: zn, hex: "rgb(" + r + "," + g + "," + b + ")", lab: rgbLab(r, g, b) });
      pintarMuestras();
    },
    limpiarCols: function() { _cols = []; pintarMuestras(); },
    guardarFirma: function() {
      if (!_cols.length) { alert("Captura o añade colores primero."); return; }
      _motos[_idx].colores = _cols.slice();
      this.cerrarCapColor(); this.guardarMoto();
      if (_cfg.onSpeak) _cfg.onSpeak("Colores guardados en la nube");
    },
    compartirWa: function() {
      var m = _motos[_idx], st = m.setup || {};
      var t = "*SETUP " + (m.disc === "SM" ? "SUPERMOTO" : "MX PROMOTO") + "*\nPiloto: " + _cfg.getNom() + " (#" + m.dorsal + ")\nMoto: " + m.modelo + "\nTerreno: " + (st.terr || "-") + "\nHorquilla: " + (st.horq || "-") + "\nAmortiguador: " + (st.amort || "-") + "\nPiñon/Corona: " + (st.des || "-") + "\nNeumaticos: " + (st.neum || "-") + "\nMS6X: " + (st.gyro || "-");
      window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
    },
    publicarPaddock: function() {
      var m = _motos[_idx] || _motos[0], pid = _cfg.uid + "_" + _idx, foto = (Array.isArray(m.fotos) ? m.fotos.find(Boolean) : "") || "", rng = this.actualizarRango().rng;
      fbJson(FB_ROOT + "/paddock/" + pid + ".json", {
        method: "PATCH",
        body: JSON.stringify({ modelo: (m.modelo || "Losi Promoto-MX").slice(0, 60), dorsal: m.dorsal || "1", piloto: _cfg.getNom(), circuito: _cfg.circNom, disc: m.disc || "MX", mvp: rng, setupTxt: setupTxt(m).slice(0, 290), ts: ahoraSrv() })
      }).then(function() {
        if (foto) return fetch(FB_ROOT + "/paddock_fotos/" + pid + ".json", { method: "PUT", body: JSON.stringify({ img: foto, ts: ahoraSrv() }) });
      }).then(function() {
        if (_cfg.onSpeak) _cfg.onSpeak("Moto publicada en el Paddock Mundial");
        alert("🌍 ¡Moto publicada en el Paddock Mundial ✓!");
      }).catch(function(){ alert("Error publicando en Paddock."); });
    },
    procesarMiVuelta: function(lap, mej, pils, lblDeltaId, deltaBolId) {
      var fmtDeltaVoz = function(ms) {
        var dTot = Math.max(1, Math.round(ms / 100));
        if (dTot < 10) return dTot + (dTot === 1 ? " decima" : " decimas");
        var sg = Math.floor(dTot / 10), dc = dTot % 10;
        return sg + (sg === 1 ? " segundo" : " segundos") + (dc > 0 ? (" y " + dc + (dc === 1 ? " decima" : " decimas")) : "");
      };
      var todas = []; _hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mejorHist = todas.length ? Math.min.apply(null, todas) : 0, esRP = (!mejorHist || lap < mejorHist);
      var p1 = pils[0], root = _cfg.getRoot(), v = ((root.pilotos || {})[_cfg.uid] || {}).vueltas || 1;
      var difH = "Ultima: " + fmt(lap), difB = fmt(lap), voz = "Vuelta " + v + ", " + (lap / 1000).toFixed(2).replace(".", " punto ") + " segundos";
      if (esRP && v > 1 && mejorHist > 0) {
        voz += ", record personal, " + fmtDeltaVoz(mejorHist - lap) + " menos";
        difH = "Ultima: <span class='tv-rp'>" + fmt(lap) + " (-" + ((mejorHist - lap) / 1000).toFixed(2) + "s 🟢 RP)</span>";
        difB = "-" + ((mejorHist - lap) / 1000).toFixed(2) + "s 🟢";
        mxBeep(1150, 140); flashRecord("RP");
      } else if (p1 && p1.mejorMs) {
        var dL = lap - Number(p1.mejorMs);
        if (dL <= 0) {
          voz += ", vuelta rapida de pista";
          difH = "Ultima: <span class='tv-vr'>" + fmt(lap) + " (VUELTA RAPIDA 👑)</span>";
          difB = "LIDER 👑"; mxBeep(1280, 180); flashRecord("VR");
        } else {
          voz += ", a " + fmtDeltaVoz(dL) + " del mejor";
          difH = "Ultima: <span class='tv-lag'>" + fmt(lap) + " (+" + (dL / 1000).toFixed(2) + "s)</span>";
          difB = "+" + (dL / 1000).toFixed(2) + "s";
        }
      }
      var elD = document.getElementById(lblDeltaId), elB = document.getElementById(deltaBolId);
      if (elD) elD.innerHTML = difH;
      if (elB) elB.textContent = difB;
      if (_cfg.onSpeak) _cfg.onSpeak(voz);

      var hoy = new Date().toLocaleDateString("es-ES");
      if (!_hist.length || _hist[_hist.length - 1].fecha !== hoy) _hist.push({ fecha: hoy, vtas: [] });
      _hist[_hist.length - 1].vtas.push(lap);
      localStorage.setItem("mxp_hist_" + _cfg.uid, JSON.stringify(_hist));
      _motos[_idx].vtas = (_motos[_idx].vtas || 0) + 1;
      localStorage.setItem("mxp_gar_" + _cfg.uid, JSON.stringify(_motos));
      this.actualizarRango();

      var mAct = _motos[_idx] || _motos[0], cm = _cfg.getCircMeta ? _cfg.getCircMeta() : { metros: 200, factor: 1 };
      var totM = _hist.reduce(function(s, d){ return s + (d.vtas ? d.vtas.length : 0); }, 0);
      var medM = totM ? (_hist.reduce(function(s, d){ return s + d.vtas.reduce(function(a, b){ return a + b; }, 0); }, 0) / totM) : lap;
      var regM = medM > 0 ? Math.max(50, Math.min(100, Math.round((mej / medM) * 100))) : 100;
      fetch(FB_ROOT + "/mundial/" + _cfg.uid + "_" + _cfg.circId + ".json", {
        method: "PUT",
        body: JSON.stringify({
          nombre: _cfg.getNom(), circuito: _cfg.circNom, disc: mAct.disc || "MX",
          sup: (mAct.disc === "SM" ? "SM Asfalto" : "MX Tierra"),
          mejorMs: mej, teorico200Ms: Math.round(mej * (200 / (cm.metros || 200)) / (cm.factor || 1)),
          velKmh: Number((((cm.metros || 200) / (mej / 1000)) * 3.6).toFixed(1)),
          regPct: regM, setupTxt: setupTxt(mAct), ts: ahoraSrv()
        })
      }).catch(function(){});
    },
    pintarTiempos: function() {
      var stM = document.getElementById("stMejor"); if (!stM) return;
      var infoR = this.actualizarRango(), todas = [];
      _hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mej = todas.length ? Math.min.apply(null, todas) : 0, med = todas.length ? (todas.reduce(function(a, b){ return a + b; }, 0) / todas.length) : 0;
      stM.textContent = fmt(mej);
      document.getElementById("stReg").textContent = med > 0 ? Math.max(50, Math.min(100, Math.round((mej / med) * 100))) + "%" : "--%";
      document.getElementById("stVtas").textContent = infoR.tot;
      document.getElementById("stRango").textContent = infoR.rng;

      var root = _cfg.getRoot(), cInfo = calcularCampeonato(root.campeonato || {});
      document.getElementById("boxCampDia").innerHTML = cInfo.tabla.length
        ? ("<div style='font-size:10px;color:#0dcaf0;margin-bottom:4px'>Mangas puntuadas: <b>" + cInfo.nMangas + "</b></div>" +
          cInfo.tabla.map(function(x, i){ return "<div class='fila'><span><b>" + (i + 1) + "º #" + esc(x.dorsal) + " " + esc(x.nombre) + "</b> (" + x.mangas + "m)</span><b style='color:#ffc107'>" + x.pts + " pts</b></div>"; }).join(""))
        : "Aun no hay mangas guardadas hoy.";

      var pAll = root.pilotos || {}, sRiv = document.getElementById("selRivalDuelo");
      var rivs = Object.keys(pAll).filter(function(k){ return k !== _cfg.uid && pAll[k] && pAll[k].nombre; });
      var prevR = sRiv.value;
      sRiv.innerHTML = rivs.length ? rivs.map(function(k){ return '<option value="' + esc(k) + '">' + esc(pAll[k].nombre) + ' (#' + esc(pAll[k].dorsal || '--') + ')</option>'; }).join("") : '<option value="">Sin rivales en sala hoy</option>';
      if (prevR && rivs.indexOf(prevR) >= 0) sRiv.value = prevR;
      this.pintarDuelo();

      document.getElementById("listaDiasHist").innerHTML = _hist.slice().reverse().map(function(d, ix) {
        var rIx = _hist.length - 1 - ix, bestD = d.vtas.length ? Math.min.apply(null, d.vtas) : 0;
        return '<div class="fila"><div><b>' + esc(d.fecha) + '</b> • ' + d.vtas.length + ' vueltas<div style="font-size:11px;color:#20c997">Mejor: ' + fmt(bestD) + '</div></div><button onclick="vibrar();mxGar.pngDia(' + rIx + ')" style="background:#ffc107;color:#000;padding:5px 8px;font-size:10px">PNG</button></div>';
      }).join("") || '<div style="color:#777;font-size:12px">Aun no tienes dias rodados guardados.</div>';
    },
    pintarDuelo: function() {
      var root = _cfg.getRoot(), pAll = root.pilotos || {}, gAll = root.garaje || {};
      var rk = document.getElementById("selRivalDuelo").value, bx = document.getElementById("boxDuelo");
      if (!rk || !pAll[rk]) { bx.textContent = "Entra en Sala Pista con amigos para comparar tiempos y setups."; return; }
      var rv = pAll[rk], gR = gAll[rk] || {}, yo = pAll[_cfg.uid] || {}, difHtml = "";
      if (yo.mejorMs && rv.mejorMs) {
        var df = (yo.mejorMs - rv.mejorMs) / 1000;
        difHtml = df <= 0 ? "<span class='tv-rp'> (" + df.toFixed(2) + "s por delante)</span>" : "<span style='color:#ff4d5e'> (+" + df.toFixed(2) + "s detras)</span>";
      }
      bx.innerHTML = "<div style='background:#101218;padding:9px;border-radius:8px;margin-top:6px'><b>" + esc(_cfg.getNom()) + ":</b> " + fmt(yo.mejorMs) + " vs <b>" + esc(rv.nombre) + ":</b> " + fmt(rv.mejorMs) + difHtml +
        "<br><span style='color:#0dcaf0;font-size:11px'>Moto rival (" + esc(gR.disc || "MX") + "): " + esc(gR.modelo || "Losi Promoto-MX") + "<br>Setup: " + esc(gR.setupTxt || "Serie") + "</span></div>";
    },
    podioPng: function() {
      descargarPodioPngCore("cnvPng", _cfg.circNom, _cfg.circId, (_cfg.getRoot().campeonato || {}));
    },
    pngDia: function(ix) {
      var d = _hist[ix]; if (!d || !d.vtas.length) return;
      var m = _motos[_idx] || _motos[0], foto = (Array.isArray(m.fotos) ? m.fotos.find(Boolean) : "") || "";
      var best = Math.min.apply(null, d.vtas), med = d.vtas.reduce(function(a, b){ return a + b; }, 0) / d.vtas.length;
      var reg = Math.max(50, Math.min(100, Math.round((best / med) * 100))), rng = this.actualizarRango().rng;

      var render = function(imgObj) {
        var cv = document.getElementById("cnvPng"), cx = cv.getContext("2d");
        cx.fillStyle = "#0b0c10"; cx.fillRect(0, 0, 720, 720);
        drawCheckered(cx, 0, 18); drawCheckered(cx, 702, 18);
        cx.textAlign = "center";
        cx.fillStyle = "#ffc107"; cx.font = "bold 30px Arial"; cx.fillText(_cfg.circNom.toUpperCase(), 360, 68);
        cx.fillStyle = "#0dcaf0"; cx.font = "bold 19px Arial"; cx.fillText((m.disc === "SM" ? "SUPERMOTO" : "MOTOCROSS 1/4 RC") + " • " + rng, 360, 100);
        cx.fillStyle = "#fff"; cx.font = "bold 34px Arial"; cx.fillText(_cfg.getNom().toUpperCase() + " (#" + (m.dorsal || "1") + ")", 360, 148);

        if (imgObj) {
          cx.fillStyle = "#161922"; cx.fillRect(150, 168, 420, 220);
          cx.strokeStyle = "#ffc107"; cx.lineWidth = 3; cx.strokeRect(150, 168, 420, 220);
          cx.drawImage(imgObj, 154, 172, 412, 212);
        }
        var yBox = imgObj ? 410 : 210;
        cx.fillStyle = "#151821"; cx.fillRect(60, yBox, 600, 155);
        cx.strokeStyle = "#20c997"; cx.lineWidth = 3; cx.strokeRect(60, yBox, 600, 155);
        cx.fillStyle = "#20c997"; cx.font = "bold 50px Arial"; cx.fillText("MEJOR: " + fmt(best), 360, yBox + 72);
        cx.fillStyle = "#ddd"; cx.font = "bold 22px Arial"; cx.fillText("Vueltas: " + d.vtas.length + "   |   Regularidad: " + reg + "%", 360, yBox + 124);
        cx.fillStyle = "#aaa"; cx.font = "19px Arial"; cx.fillText("Moto: " + m.modelo + "   •   " + d.fecha, 360, yBox + 195);
        cx.fillStyle = "#0dcaf0"; cx.font = "17px Arial"; cx.fillText("Setup: " + setupTxt(m).slice(0, 56), 360, yBox + 232);
        cx.fillStyle = "#666"; cx.font = "bold 17px Arial"; cx.fillText("METROPOLITANO MX PRO", 360, 680);
        var a = document.createElement("a"); a.download = "MetroMX_" + d.fecha.replace(/\//g, "-") + ".png"; a.href = cv.toDataURL("image/png"); a.click();
      };
      if (foto) { var im = new Image(); im.onload = function(){ render(im); }; im.onerror = function(){ render(null); }; im.src = foto; }
      else render(null);
    },
    abrirBackup: function(modo) {
      document.getElementById("modalBackup").style.display = "flex";
      document.getElementById("msgBackup").textContent = "";
      var ta = document.getElementById("txtBackupJson");
      if (modo === "EXPORT") {
        ta.value = JSON.stringify({ v: 1, uid: _cfg.uid, nombre: _cfg.getNom(), fecha: new Date().toISOString(), motosGar: _motos, histDias: _hist });
        document.getElementById("subBackup").textContent = "Copia este texto o descarga el archivo .JSON:";
      } else { ta.value = ""; document.getElementById("subBackup").textContent = "Pega aqui el texto JSON de tu backup y pulsa RESTAURAR:"; }
    },
    copiarBackup: function() {
      var ta = document.getElementById("txtBackupJson"); if (!ta.value.trim()) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(function(){ document.getElementById("msgBackup").style.color = "#20c997"; document.getElementById("msgBackup").textContent = "✓ Copiado al portapapeles"; }).catch(function(){ ta.select(); document.execCommand("copy"); });
      } else { ta.select(); document.execCommand("copy"); }
    },
    descargarBackup: function() {
      var txt = document.getElementById("txtBackupJson").value.trim(); if (!txt) return;
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = "Backup_MX_" + _cfg.uid + ".json"; a.click();
    },
    restaurarBackup: function() {
      var txt = document.getElementById("txtBackupJson").value.trim(), msg = document.getElementById("msgBackup");
      if (!txt) { msg.style.color = "#ff4d5e"; msg.textContent = "Pega el JSON primero"; return; }
      try {
        var obj = JSON.parse(txt);
        if (!Array.isArray(obj.motosGar) && !Array.isArray(obj.histDias)) throw new Error("Formato invalido");
        if (Array.isArray(obj.motosGar) && obj.motosGar.length) { _motos = obj.motosGar; _idx = 0; localStorage.setItem("mxp_gar_" + _cfg.uid, JSON.stringify(_motos)); this.subirNube(); }
        if (Array.isArray(obj.histDias)) { _hist = obj.histDias; localStorage.setItem("mxp_hist_" + _cfg.uid, JSON.stringify(_hist)); }
        this.pintarGaraje(); this.pintarTiempos();
        msg.style.color = "#20c997"; msg.textContent = "✅ ¡Backup restaurado!";
      } catch (e) { msg.style.color = "#ff4d5e"; msg.textContent = "JSON no valido: " + e.message; }
    }
  };
})();