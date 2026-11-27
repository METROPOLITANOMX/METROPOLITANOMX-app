(function() {
  var _s = mxGar._s;

  function drawCheckered(cx, y, h) {
    var sz = 16;
    for (var x = 0; x < 720; x += sz) {
      cx.fillStyle = ((x / sz) % 2 === 0) ? "#ffc107" : "#181a20";
      cx.fillRect(x, y, sz, h);
    }
  }

  Object.assign(mxGar, {
    actualizarRango: function() {
      var tot = _s.hist.reduce(function(s, d){ return s + (d.vtas ? d.vtas.length : 0); }, 0);
      var rng = tot >= 400 ? "LEYENDA MX" : (tot >= 150 ? "PRO RIDER" : (tot >= 50 ? "AMATEUR" : "ROOKIE"));
      ["badgeRango", "badgeRangoDir"].forEach(function(id){ var el = document.getElementById(id); if (el) el.textContent = rng; });
      return { tot: tot, rng: rng };
    },
    procesarMiVuelta: function(lap, mej, pils, lblDeltaId, deltaBolId) {
      var fmtDeltaVoz = function(ms) {
        var dTot = Math.max(1, Math.round(ms / 100));
        if (dTot < 10) return dTot + (dTot === 1 ? " decima" : " decimas");
        var sg = Math.floor(dTot / 10), dc = dTot % 10;
        return sg + (sg === 1 ? " segundo" : " segundos") + (dc > 0 ? (" y " + dc + (dc === 1 ? " decima" : " decimas")) : "");
      };
      var todas = []; _s.hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mejorHist = todas.length ? Math.min.apply(null, todas) : 0, esRP = (!mejorHist || lap < mejorHist);
      var p1 = pils[0], root = _s.cfg.getRoot(), v = ((root.pilotos || {})[_s.cfg.uid] || {}).vueltas || 1;
      var difH = "Ultima: " + fmt(lap), difB = fmt(lap), voz = "Vuelta " + v + ", " + fmtVoz(lap);
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
      if (_s.cfg.onSpeak && (!_s.cfg.isDirSilent || !_s.cfg.isDirSilent())) _s.cfg.onSpeak(voz);

      var hoy = new Date().toLocaleDateString("es-ES");
      if (!_s.hist.length || _s.hist[_s.hist.length - 1].fecha !== hoy) _s.hist.push({ fecha: hoy, vtas: [] });
      _s.hist[_s.hist.length - 1].vtas.push(lap);
      localStorage.setItem("mxp_hist_" + _s.cfg.uid, JSON.stringify(_s.hist));
      _s.motos[_s.idx].vtas = (_s.motos[_s.idx].vtas || 0) + 1;
      localStorage.setItem("mxp_gar_" + _s.cfg.uid, JSON.stringify(_s.motos));
      this.actualizarRango();

      var mAct = _s.motos[_s.idx] || _s.motos[0], cm = _s.cfg.getCircMeta ? _s.cfg.getCircMeta() : { metros: 200, factor: 1 };
      var totM = _s.hist.reduce(function(s, d){ return s + (d.vtas ? d.vtas.length : 0); }, 0);
      var medM = totM ? (_s.hist.reduce(function(s, d){ return s + d.vtas.reduce(function(a, b){ return a + b; }, 0); }, 0) / totM) : lap;
      var regM = medM > 0 ? Math.max(50, Math.min(100, Math.round((mej / medM) * 100))) : 100;
      fetch(FB_ROOT + "/mundial/" + _s.cfg.uid + "_" + _s.cfg.circId + ".json", {
        method: "PUT",
        body: JSON.stringify({
          nombre: _s.cfg.getNom(), circuito: _s.cfg.circNom, disc: mAct.disc || "MX",
          sup: (mAct.disc === "SM" ? "SM Asfalto" : "MX Tierra"),
          mejorMs: mej, teorico200Ms: Math.round(mej * (200 / (cm.metros || 200)) / (cm.factor || 1)),
          velKmh: Number((((cm.metros || 200) / (mej / 1000)) * 3.6).toFixed(1)),
          regPct: regM, setupTxt: mxGar._setupTxt(mAct), ts: ahoraSrv()
        })
      }).catch(function(){});
    },
    pintarTiempos: function() {
      var stM = document.getElementById("stMejor"); if (!stM) return;
      var infoR = this.actualizarRango(), todas = [];
      _s.hist.forEach(function(d){ if (Array.isArray(d.vtas)) todas = todas.concat(d.vtas); });
      var mej = todas.length ? Math.min.apply(null, todas) : 0, med = todas.length ? (todas.reduce(function(a, b){ return a + b; }, 0) / todas.length) : 0;
      stM.textContent = fmt(mej);
      document.getElementById("stReg").textContent = med > 0 ? Math.max(50, Math.min(100, Math.round((mej / med) * 100))) + "%" : "--%";
      document.getElementById("stVtas").textContent = infoR.tot;
      document.getElementById("stRango").textContent = infoR.rng;

      var root = _s.cfg.getRoot(), cInfo = calcularCampeonato(root.campeonato || {});
      document.getElementById("boxCampDia").innerHTML = cInfo.tabla.length
        ? ("<div style='font-size:10px;color:#0dcaf0;margin-bottom:4px'>Mangas puntuadas: <b>" + cInfo.nMangas + "</b></div>" +
          cInfo.tabla.map(function(x, i){ return "<div class='fila'><span><b>" + (i + 1) + "º #" + esc(x.dorsal) + " " + esc(x.nombre) + "</b> (" + x.mangas + "m)</span><b style='color:#ffc107'>" + x.pts + " pts</b></div>"; }).join(""))
        : "Aun no hay mangas guardadas hoy.";

      var pAll = root.pilotos || {}, sRiv = document.getElementById("selRivalDuelo");
      var rivs = Object.keys(pAll).filter(function(k){ return k !== _s.cfg.uid && pAll[k] && pAll[k].nombre; });
      var prevR = sRiv.value;
      sRiv.innerHTML = rivs.length ? rivs.map(function(k){ return '<option value="' + esc(k) + '">' + esc(pAll[k].nombre) + ' (#' + esc(pAll[k].dorsal || '--') + ')</option>'; }).join("") : '<option value="">Sin rivales en sala hoy</option>';
      if (prevR && rivs.indexOf(prevR) >= 0) sRiv.value = prevR;
      this.pintarDuelo();

      document.getElementById("listaDiasHist").innerHTML = _s.hist.slice().reverse().map(function(d, ix) {
        var rIx = _s.hist.length - 1 - ix, bestD = d.vtas.length ? Math.min.apply(null, d.vtas) : 0;
        return '<div class="fila"><div><b>' + esc(d.fecha) + '</b> • ' + d.vtas.length + ' vueltas<div style="font-size:11px;color:#20c997">Mejor: ' + fmt(bestD) + '</div></div><button onclick="vibrar();mxGar.pngDia(' + rIx + ')" style="background:#ffc107;color:#000;padding:5px 8px;font-size:10px">PNG</button></div>';
      }).join("") || '<div style="color:#777;font-size:12px">Aun no tienes dias rodados guardados.</div>';
    },
    pintarDuelo: function() {
      var root = _s.cfg.getRoot(), pAll = root.pilotos || {}, gAll = root.garaje || {};
      var rk = document.getElementById("selRivalDuelo").value, bx = document.getElementById("boxDuelo");
      if (!rk || !pAll[rk]) { bx.textContent = "Entra en Sala Pista con amigos para comparar tiempos y setups."; return; }
      var rv = pAll[rk], gR = gAll[rk] || {}, yo = pAll[_s.cfg.uid] || {}, difHtml = "";
      if (yo.mejorMs && rv.mejorMs) {
        var df = (yo.mejorMs - rv.mejorMs) / 1000;
        difHtml = df <= 0 ? "<span class='tv-rp'> (" + df.toFixed(2) + "s por delante)</span>" : "<span style='color:#ff4d5e'> (+" + df.toFixed(2) + "s detras)</span>";
      }
      bx.innerHTML = "<div style='background:#101218;padding:9px;border-radius:8px;margin-top:6px'><b>" + esc(_s.cfg.getNom()) + ":</b> " + fmt(yo.mejorMs) + " vs <b>" + esc(rv.nombre) + ":</b> " + fmt(rv.mejorMs) + difHtml +
        "<br><span style='color:#0dcaf0;font-size:11px'>Moto rival (" + esc(gR.disc || "MX") + "): " + esc(gR.modelo || "Losi Promoto-MX") + "<br>Setup: " + esc(gR.setupTxt || "Serie") + "</span></div>";
    },
    podioPng: function() {
      descargarPodioPngCore("cnvPng", _s.cfg.circNom, _s.cfg.circId, (_s.cfg.getRoot().campeonato || {}));
    },
    pngDia: function(ix) {
      var d = _s.hist[ix]; if (!d || !d.vtas.length) return;
      var m = _s.motos[_s.idx] || _s.motos[0], foto = (Array.isArray(m.fotos) ? m.fotos.find(Boolean) : "") || "";
      var best = Math.min.apply(null, d.vtas), med = d.vtas.reduce(function(a, b){ return a + b; }, 0) / d.vtas.length;
      var reg = Math.max(50, Math.min(100, Math.round((best / med) * 100))), rng = this.actualizarRango().rng;

      var render = function(imgObj) {
        var cv = document.getElementById("cnvPng"), cx = cv.getContext("2d");
        cx.fillStyle = "#0b0c10"; cx.fillRect(0, 0, 720, 720);
        drawCheckered(cx, 0, 18); drawCheckered(cx, 702, 18);
        cx.textAlign = "center";
        cx.fillStyle = "#ffc107"; cx.font = "bold 30px Arial"; cx.fillText(_s.cfg.circNom.toUpperCase(), 360, 68);
        cx.fillStyle = "#0dcaf0"; cx.font = "bold 19px Arial"; cx.fillText((m.disc === "SM" ? "SUPERMOTO" : "MOTOCROSS 1/4 RC") + " • " + rng, 360, 100);
        cx.fillStyle = "#fff"; cx.font = "bold 34px Arial"; cx.fillText(_s.cfg.getNom().toUpperCase() + " (#" + (m.dorsal || "1") + ")", 360, 148);

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
      document.getElementById("modalBackup").style.display = "flex";
      document.getElementById("msgBackup").textContent = "";
      var ta = document.getElementById("txtBackupJson");
      if (modo === "EXPORT") {
        ta.value = JSON.stringify({ v: 1, uid: _s.cfg.uid, nombre: _s.cfg.getNom(), fecha: new Date().toISOString(), motosGar: _s.motos, histDias: _s.hist });
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
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = "Backup_MX_" + _s.cfg.uid + ".json"; a.click();
    },
    restaurarBackup: function() {
      var txt = document.getElementById("txtBackupJson").value.trim(), msg = document.getElementById("msgBackup");
      if (!txt) { msg.style.color = "#ff4d5e"; msg.textContent = "Pega el JSON primero"; return; }
      try {
        var obj = JSON.parse(txt);
        if (!Array.isArray(obj.motosGar) && !Array.isArray(obj.histDias)) throw new Error("Formato invalido");
        if (Array.isArray(obj.motosGar) && obj.motosGar.length) { _s.motos = obj.motosGar; _s.idx = 0; localStorage.setItem("mxp_gar_" + _s.cfg.uid, JSON.stringify(_s.motos)); this.subirNube(); }
        if (Array.isArray(obj.histDias)) { _s.hist = obj.histDias; localStorage.setItem("mxp_hist_" + _s.cfg.uid, JSON.stringify(_s.hist)); }
        this.pintarGaraje(); this.pintarTiempos();
        msg.style.color = "#20c997"; msg.textContent = "✅ ¡Backup restaurado!";
      } catch (e) { msg.style.color = "#ff4d5e"; msg.textContent = "JSON no valido: " + e.message; }
    }
  });
})();