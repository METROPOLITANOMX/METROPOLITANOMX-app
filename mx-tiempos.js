(function() {
  function drawCheckered(cx, y, h) {
    var sz = 16;
    for (var x = 0; x < 720; x += sz) {
      cx.fillStyle = ((x / sz) % 2 === 0) ? "#ffc107" : "#181a20";
      cx.fillRect(x, y, sz, h);
    }
  }

  Object.assign(mxGar, {
    _initTiempos: function() {
      var st = document.getElementById(mxGar._s.cfg.tmpId || "slotTiempos");
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
      if (!document.getElementById("modalBackup")) {
        var wrap = document.createElement("div");
        wrap.innerHTML =
          '<div id="modalBackup" class="cam-modal" onclick="if(event.target===this)this.style.display=\'none\'"><div class="cam-box" style="border-color:#20c997"><div style="font-size:14px;font-weight:bold;color:#20c997;margin-bottom:6px;text-align:center">💾 BACKUP DE GARAJE E HISTORIAL</div><div id="subBackup" style="font-size:11px;color:#aaa;margin-bottom:8px"></div><textarea id="txtBackupJson" rows="7" style="font-family:monospace;font-size:11px" placeholder="Pega aqui el JSON de backup..."></textarea><div class="grid2" style="margin-bottom:6px"><button onclick="vibrar();mxGar.copiarBackup()" style="background:linear-gradient(180deg,#3bc9db,#0dcaf0);color:#000;font-size:11px">📋 COPIAR</button><button onclick="vibrar();mxGar.descargarBackup()" style="background:linear-gradient(180deg,#ffe066,#f59f00);color:#000;font-size:11px">⬇️ DESCARGAR .JSON</button></div><div class="grid2"><button onclick="vibrar(25);mxGar.restaurarBackup()" style="background:linear-gradient(180deg,#4be5b6,#12b886);color:#000;font-size:11px">📥 RESTAURAR</button><button onclick="vibrar();document.getElementById(\'modalBackup\').style.display=\'none\'" style="background:#333;color:#fff;font-size:11px">CERRAR</button></div><div id="msgBackup" style="font-size:11px;margin-top:6px;text-align:center;font-weight:bold"></div></div></div>' +
          '<canvas id="cnvPng" width="720" height="720" style="display:none"></canvas>';
        document.body.appendChild(wrap);
      }
    },
    procesarMiVuelta: function(lap, mej, pils, lblDeltaId, deltaBolId) {
      var s = mxGar._s, fmtDeltaVoz = function(ms) {
        var dTot = Math.max(1, Math.round(ms / 100));
        if (dTot < 10) return dTot + (dTot === 1 ? " decima" : " decimas");
        var sg = Math.floor(dTot / 10), dc = dTot % 10;
        return sg + (sg === 1 ? " segundo" : " segundos") + (dc > 0 ? (" y " + dc + (dc === 1 ? " decima" : " decimas")) : "");
      };
      var todas = []; s.hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mejorHist = todas.length ? Math.min.apply(null, todas) : 0, esRP = (!mejorHist || lap < mejorHist);
      var p1 = pils[0], root = s.cfg.getRoot(), v = ((root.pilotos || {})[s.cfg.uid] || {}).vueltas || 1;
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
      if (s.cfg.onSpeak) s.cfg.onSpeak(voz);

      var hoy = new Date().toLocaleDateString("es-ES");
      if (!s.hist.length || s.hist[s.hist.length - 1].fecha !== hoy) s.hist.push({ fecha: hoy, vtas: [] });
      s.hist[s.hist.length - 1].vtas.push(lap);
      mxGar._saveHist();
      s.motos[s.idx].vtas = (s.motos[s.idx].vtas || 0) + 1;
      mxGar._saveMotos();
      this.actualizarRango();

      var mAct = s.motos[s.idx] || s.motos[0], cm = s.cfg.getCircMeta ? s.cfg.getCircMeta() : { metros: 200, factor: 1 };
      var totM = s.hist.reduce(function(ac, d){ return ac + (d.vtas ? d.vtas.length : 0); }, 0);
      var medM = totM ? (s.hist.reduce(function(ac, d){ return ac + d.vtas.reduce(function(a, b){ return a + b; }, 0); }, 0) / totM) : lap;
      var regM = medM > 0 ? Math.max(50, Math.min(100, Math.round((mej / medM) * 100))) : 100;
      fetch(FB_ROOT + "/mundial/" + s.cfg.uid + "_" + s.cfg.circId + ".json", {
        method: "PUT",
        body: JSON.stringify({
          nombre: s.cfg.getNom(), circuito: s.cfg.circNom, disc: mAct.disc || "MX",
          sup: (mAct.disc === "SM" ? "SM Asfalto" : "MX Tierra"),
          mejorMs: mej, teorico200Ms: Math.round(mej * (200 / (cm.metros || 200)) / (cm.factor || 1)),
          velKmh: Number((((cm.metros || 200) / (mej / 1000)) * 3.6).toFixed(1)),
          regPct: regM, setupTxt: mxGar._setupTxt(mAct), ts: ahoraSrv()
        })
      }).catch(function(){});
    },
    pintarTiempos: function() {
      var stM = document.getElementById("stMejor"); if (!stM) return;
      var s = mxGar._s, infoR = this.actualizarRango(), todas = [];
      s.hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mej = todas.length ? Math.min.apply(null, todas) : 0, med = todas.length ? (todas.reduce(function(a, b){ return a + b; }, 0) / todas.length) : 0;
      stM.textContent = fmt(mej);
      document.getElementById("stReg").textContent = med > 0 ? Math.max(50, Math.min(100, Math.round((mej / med) * 100))) + "%" : "--%";
      document.getElementById("stVtas").textContent = infoR.tot;
      document.getElementById("stRango").textContent = infoR.rng;

      var root = s.cfg.getRoot(), cInfo = calcularCampeonato(root.campeonato || {});
      document.getElementById("boxCampDia").innerHTML = cInfo.tabla.length
        ? ("<div style='font-size:10px;color:#0dcaf0;margin-bottom:4px'>Mangas puntuadas: <b>" + cInfo.nMangas + "</b></div>" +
          cInfo.tabla.map(function(x, i){ return "<div class='fila'><span><b>" + (i + 1) + "º #" + esc(x.dorsal) + " " + esc(x.nombre) + "</b> (" + x.mangas + "m)</span><b style='color:#ffc107'>" + x.pts + " pts</b></div>"; }).join(""))
        : "Aun no hay mangas guardadas hoy.";

      var pAll = root.pilotos || {}, sRiv = document.getElementById("selRivalDuelo");
      var rivs = Object.keys(pAll).filter(function(k){ return k !== s.cfg.uid && pAll[k] && pAll[k].nombre; });
      var prevR = sRiv.value;
      sRiv.innerHTML = rivs.length ? rivs.map(function(k){ return '<option value="' + esc(k) + '">' + esc(pAll[k].nombre) + ' (#' + esc(pAll[k].dorsal || '--') + ')</option>'; }).join("") : '<option value="">Sin rivales en sala hoy</option>';
      if (prevR && rivs.indexOf(prevR) >= 0) sRiv.value = prevR;
      this.pintarDuelo();

      document.getElementById("listaDiasHist").innerHTML = s.hist.slice().reverse().map(function(d, ix) {
        var rIx = s.hist.length - 1 - ix, bestD = d.vtas.length ? Math.min.apply(null, d.vtas) : 0;
        return '<div class="fila"><div><b>' + esc(d.fecha) + '</b> • ' + d.vtas.length + ' vueltas<div style="font-size:11px;color:#20c997">Mejor: ' + fmt(bestD) + '</div></div><button onclick="vibrar();mxGar.pngDia(' + rIx + ')" style="background:#ffc107;color:#000;padding:5px 8px;font-size:10px">PNG</button></div>';
      }).join("") || '<div style="color:#777;font-size:12px">Aun no tienes dias rodados guardados.</div>';
    },
    pintarDuelo: function() {
      var s = mxGar._s, root = s.cfg.getRoot(), pAll = root.pilotos || {}, gAll = root.garaje || {};
      var rk = document.getElementById("selRivalDuelo").value, bx = document.getElementById("boxDuelo");
      if (!rk || !pAll[rk]) { bx.textContent = "Entra en Sala Pista con amigos para comparar tiempos y setups."; return; }
      var rv = pAll[rk], gR = gAll[rk] || {}, yo = pAll[s.cfg.uid] || {}, difHtml = "";
      if (yo.mejorMs && rv.mejorMs) {
        var df = (yo.mejorMs - rv.mejorMs) / 1000;
        difHtml = df <= 0 ? "<span class='tv-rp'> (" + df.toFixed(2) + "s por delante)</span>" : "<span style='color:#ff4d5e'> (+" + df.toFixed(2) + "s detras)</span>";
      }
      bx.innerHTML = "<div style='background:#101218;padding:9px;border-radius:8px;margin-top:6px'><b>" + esc(s.cfg.getNom()) + ":</b> " + fmt(yo.mejorMs) + " vs <b>" + esc(rv.nombre) + ":</b> " + fmt(rv.mejorMs) + difHtml +
        "<br><span style='color:#0dcaf0;font-size:11px'>Moto rival (" + esc(gR.disc || "MX") + "): " + esc(gR.modelo || "Losi Promoto-MX") + "<br>Setup: " + esc(gR.setupTxt || "Serie") + "</span></div>";
    },
    podioPng: function() {
      var c = mxGar._s.cfg;
      descargarPodioPngCore("cnvPng", c.circNom, c.circId, (c.getRoot().campeonato || {}));
    },
    pngDia: function(ix) {
      var s = mxGar._s, d = s.hist[ix]; if (!d || !d.vtas.length) return;
      var m = s.motos[s.idx] || s.motos[0], foto = (Array.isArray(m.fotos) ? m.fotos.find(Boolean) : "") || "";
      var best = Math.min.apply(null, d.vtas), med = d.vtas.reduce(function(a, b){ return a + b; }, 0) / d.vtas.length;
      var reg = Math.max(50, Math.min(100, Math.round((best / med) * 100))), rng = this.actualizarRango().rng;

      var render = function(imgObj) {
        var cv = document.getElementById("cnvPng"), cx = cv.getContext("2d");
        cx.fillStyle = "#0b0c10"; cx.fillRect(0, 0, 720, 720);
        drawCheckered(cx, 0, 18); drawCheckered(cx, 702, 18);
        cx.textAlign = "center";
        cx.fillStyle = "#ffc107"; cx.font = "bold 30px Arial"; cx.fillText(s.cfg.circNom.toUpperCase(), 360, 68);
        cx.fillStyle = "#0dcaf0"; cx.font = "bold 19px Arial"; cx.fillText((m.disc === "SM" ? "SUPERMOTO" : "MOTOCROSS 1/4 RC") + " • " + rng, 360, 100);
        cx.fillStyle = "#fff"; cx.font = "bold 34px Arial"; cx.fillText(s.cfg.getNom().toUpperCase() + " (#" + (m.dorsal || "1") + ")", 360, 148);

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
        cx.fillStyle = "#0dcaf0"; cx.font = "17px Arial"; cx.fillText("Setup: " + mxGar._setupTxt(m).slice(0, 56), 360, yBox + 232);
        cx.fillStyle = "#666"; cx.font = "bold 17px Arial"; cx.fillText("METROPOLITANO MX PRO", 360, 680);
        var a = document.createElement("a"); a.download = "MetroMX_" + d.fecha.replace(/\//g, "-") + ".png"; a.href = cv.toDataURL("image/png"); a.click();
      };
      if (foto) { var im = new Image(); im.onload = function(){ render(im); }; im.onerror = function(){ render(null); }; im.src = foto; }
      else render(null);
    },
    abrirBackup: function(modo) {
      var s = mxGar._s;
      document.getElementById("modalBackup").style.display = "flex";
      document.getElementById("msgBackup").textContent = "";
      var ta = document.getElementById("txtBackupJson");
      if (modo === "EXPORT") {
        ta.value = JSON.stringify({ v: 1, uid: s.cfg.uid, nombre: s.cfg.getNom(), fecha: new Date().toISOString(), motosGar: s.motos, histDias: s.hist });
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
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = "Backup_MX_" + mxGar._s.cfg.uid + ".json"; a.click();
    },
    restaurarBackup: function() {
      var s = mxGar._s, txt = document.getElementById("txtBackupJson").value.trim(), msg = document.getElementById("msgBackup");
      if (!txt) { msg.style.color = "#ff4d5e"; msg.textContent = "Pega el JSON primero"; return; }
      try {
        var obj = JSON.parse(txt);
        if (!Array.isArray(obj.motosGar) && !Array.isArray(obj.histDias)) throw new Error("Formato invalido");
        if (Array.isArray(obj.motosGar) && obj.motosGar.length) { s.motos = obj.motosGar; s.idx = 0; mxGar._saveMotos(); this.subirNube(); }
        if (Array.isArray(obj.histDias)) { s.hist = obj.histDias; mxGar._saveHist(); }
        this.pintarGaraje(); this.pintarTiempos();
        msg.style.color = "#20c997"; msg.textContent = "✅ ¡Backup restaurado!";
      } catch (e) { msg.style.color = "#ff4d5e"; msg.textContent = "JSON no valido: " + e.message; }
    }
  });
})();