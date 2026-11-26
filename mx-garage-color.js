(function() {
  var _lado = 1, _stCol = null, _raw = null, _mask = null, _undo = [], CW = 240, CH = 160;

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

  Object.assign(mxGar, {
    _initColor: function() {
      var cv = document.getElementById("cnvCapEdit");
      if (!cv) return;
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
      if (_lado === 1) { mxGar._s.cols = res; _lado = 2; document.getElementById("txtPasoCap").textContent = "✓ LADO 1 OK — CAPTURA LADO 2 O PULSA GUARDAR"; }
      else { mxGar._s.cols = mxGar._s.cols.concat(res).slice(-6); document.getElementById("txtPasoCap").textContent = "✅ 2 LADOS LISTOS — PULSA GUARDAR FIRMA"; }
      mxGar._pintarMuestras(); this.volverCam();
    },
    addCol: function(r, g, b, zn) {
      if (mxGar._s.cols.length >= 6) mxGar._s.cols.shift();
      mxGar._s.cols.push({ r: r, g: g, b: b, zona: zn, hex: "rgb(" + r + "," + g + "," + b + ")", lab: rgbLab(r, g, b) });
      mxGar._pintarMuestras();
    },
    limpiarCols: function() { mxGar._s.cols = []; mxGar._pintarMuestras(); },
    guardarFirma: function() {
      var s = mxGar._s;
      if (!s.cols.length) { alert("Captura o añade colores primero."); return; }
      s.motos[s.idx].colores = s.cols.slice();
      this.cerrarCapColor(); mxGar.guardarMoto();
      if (s.cfg.onSpeak) s.cfg.onSpeak("Colores guardados en la nube");
    }
  });
})();