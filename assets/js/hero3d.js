/* MR Manutenção Industrial e Comercial — célula industrial 3D da tela inicial (three.js r128).

   Uma máquina com esteira, parada com defeito. O técnico da MR (com a logo nas costas) chega de van
   e, etapa por etapa, mostra os serviços da empresa:
     1/6 manutenção corretiva (troca da engrenagem quebrada)   2/6 proteções NR-12
     3/6 dispositivos de segurança                              4/6 elétrica e automação
     5/6 estruturas metálicas                                   6/6 tubulação, solda e climatização
   e no fim a produção volta a andar. A câmera aproxima de quem está trabalhando em cada etapa.

   Tudo é calculado a partir do tempo do ciclo, então cada volta é igual.
   Gira quando a pessoa arrasta. Sem WebGL, fica a ilustração estática do HTML. */
(function () {
  "use strict";

  function start() {
    var THREE = window.THREE;
    var stage = document.getElementById("stage");
    var canvas = document.getElementById("maquina3d");
    var chip = document.getElementById("stage-chip");
    if (!THREE || !stage || !canvas) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (err) {
      return;
    }
    // no celular a resolução e a sombra ficam um pouco mais leves: a cena é pequena na tela e roda mais lisa
    var telaPequena = !!(window.matchMedia && window.matchMedia("(max-width: 680px)").matches);
    var DPR = Math.min(window.devicePixelRatio || 1, telaPequena ? 1.5 : 2);
    renderer.setPixelRatio(DPR);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    /* ---------- cena, câmera e luz ---------- */
    var R = 3.75;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 3, 45);
    var CAM_BASE = new THREE.Vector3(0, 5.8, 14.6), ALVO_BASE = new THREE.Vector3(0, 0.7, 0);
    camera.position.copy(CAM_BASE);
    camera.lookAt(ALVO_BASE);

    scene.add(new THREE.HemisphereLight(0xe2eaff, 0x14205c, 0.95));
    var sol = new THREE.DirectionalLight(0xfff3df, 1.2);
    sol.position.set(5.5, 9.5, 6.5);
    sol.castShadow = true;
    sol.shadow.mapSize.set(telaPequena ? 1024 : 2048, telaPequena ? 1024 : 2048);
    sol.shadow.camera.left = -6; sol.shadow.camera.right = 6;
    sol.shadow.camera.top = 6; sol.shadow.camera.bottom = -6;
    sol.shadow.camera.near = 4; sol.shadow.camera.far = 26;
    sol.shadow.bias = -0.0006;
    sol.shadow.normalBias = 0.02;
    scene.add(sol);
    var contra = new THREE.DirectionalLight(0x8fb0ff, 0.4);
    contra.position.set(-6, 3, -5);
    scene.add(contra);

    var rig = new THREE.Group();   // gira com o arraste
    var build = new THREE.Group(); // tudo o que fica sobre o piso (encolhe e volta a cada ciclo)
    scene.add(rig);
    rig.add(build);

    /* ---------- texturas desenhadas em canvas ---------- */
    function canvasTex(w, h, desenhar) {
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      desenhar(c.getContext("2d"), w, h);
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    }
    function rep(base, rx, ry) {
      var t = base.clone();
      t.needsUpdate = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      return t;
    }
    var TEX_TELA = canvasTex(32, 32, function (g) {
      g.clearRect(0, 0, 32, 32);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 32, 6);
      g.fillRect(0, 0, 6, 32);
    });
    var TEX_CORREIA = canvasTex(64, 16, function (g) {
      g.fillStyle = "#2c313d"; g.fillRect(0, 0, 64, 16);
      g.fillStyle = "#464d5d"; g.fillRect(0, 0, 8, 16);
    });
    var TEX_GRADE = canvasTex(32, 32, function (g) {
      g.fillStyle = "#7f8899"; g.fillRect(0, 0, 32, 32);
      g.fillStyle = "#5b6373"; g.fillRect(0, 0, 32, 4); g.fillRect(0, 0, 4, 32);
    });
    var TEX_PLACA = canvasTex(256, 160, function (g) {
      g.fillStyle = "#1c8a4c"; g.fillRect(0, 0, 256, 160);
      g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.strokeRect(10, 10, 236, 140);
      g.fillStyle = "#ffffff"; g.textAlign = "center";
      g.font = "bold 30px Arial, sans-serif"; g.fillText("SEGURANÇA", 128, 58);
      g.font = "bold 62px Arial, sans-serif"; g.fillText("NR-12", 128, 124);
    });
    var TEX_ETIQUETA = canvasTex(64, 128, function (g) {
      g.fillStyle = "#d8262c"; g.fillRect(0, 0, 64, 128);
      g.fillStyle = "#ffffff"; g.fillRect(6, 30, 52, 30);
      g.fillStyle = "#d8262c"; g.font = "bold 15px Arial"; g.textAlign = "center"; g.fillText("PERIGO", 32, 51);
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(32, 12, 6, 0, Math.PI * 2); g.fill();
    });
    var TEX_ALERTA = canvasTex(128, 128, function (g) {
      g.fillStyle = "#1b1b1b";
      g.beginPath(); g.moveTo(64, 8); g.lineTo(124, 116); g.lineTo(4, 116); g.closePath(); g.fill();
      g.fillStyle = "#f6c315";
      g.beginPath(); g.moveTo(64, 24); g.lineTo(110, 106); g.lineTo(18, 106); g.closePath(); g.fill();
      g.fillStyle = "#1b1b1b"; g.fillRect(58, 48, 12, 34); g.fillRect(58, 88, 12, 11);
    });
    var TEX_OK = canvasTex(128, 128, function (g) {
      g.fillStyle = "#2fb463"; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ffffff"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(36, 66); g.lineTo(56, 86); g.lineTo(94, 44); g.stroke();
    });
    var TEX_BRILHO = canvasTex(64, 64, function (g) {
      var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.25, "rgba(190,220,255,.9)");
      grad.addColorStop(1, "rgba(120,170,255,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    });

    function std(color, extra) {
      var o = { color: color, roughness: 0.62, metalness: 0.08 };
      for (var k in extra || {}) o[k] = extra[k];
      return new THREE.MeshStandardMaterial(o);
    }
    var M = {
      disco: std(0x05124a, { roughness: 0.85 }),
      anel: std(0xee8933, { emissive: 0xb85a12, emissiveIntensity: 0.75 }),
      corpo: std(0xe9edf3, { roughness: 0.45, metalness: 0.15 }),
      azul: std(0x07359a, { roughness: 0.45, metalness: 0.2 }),
      inox: std(0xc3ccd8, { metalness: 0.75, roughness: 0.3 }),
      aco: std(0x8f99a8, { metalness: 0.6, roughness: 0.4 }),
      acoEscuro: std(0x4a5262, { metalness: 0.5, roughness: 0.45 }),
      amarelo: std(0xf2b705, { roughness: 0.45, metalness: 0.2 }),
      quadroTela: std(0x2a303c, { metalness: 0.5, roughness: 0.5 }),
      escuro: std(0x1a1f2b, { roughness: 0.8 }),
      pneu: std(0x15171d, { roughness: 0.9 }),
      branco: std(0xf6f8fb, { roughness: 0.5, metalness: 0.1 }),
      painel: std(0xc9cfd8, { roughness: 0.5, metalness: 0.25 }),
      vidro: std(0x1c2a44, { roughness: 0.15, metalness: 0.6 }),
      laranja: std(0xee6a1f, { metalness: 0.2 }),
      caixa: std(0xc9a26b, { roughness: 0.9 }),
      fita: std(0xe8d3a8, { roughness: 0.7 }),
      papelao: std(0xb48b55, { roughness: 0.9 }),
      peca: std(0x1e5bd8, { metalness: 0.45, roughness: 0.3 }),
      vermelho: std(0xd8262c, { roughness: 0.4 }),
      grade: std(0xffffff, { map: rep(TEX_GRADE, 6, 5), metalness: 0.5, roughness: 0.5 }),
      uniforme: std(0xd5dae2, { roughness: 0.85 }),
      calca: std(0x1d2440),
      pele: std(0xd9a273, { roughness: 0.8 }),
      capaceteAzul: std(0x0b46c4, { roughness: 0.4 }),
      mascara: std(0x22262e, { roughness: 0.4, metalness: 0.3 }),
      farol: std(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.6 }),
      hmi: std(0x0d1424, { emissive: 0x2f6bff, emissiveIntensity: 0.7 }),
      ledQuadro: std(0x1c5a33, { emissive: 0x2dff7a, emissiveIntensity: 0.9 }),
      luminaria: std(0xf2f4f8, { emissive: 0xfff6dc, emissiveIntensity: 0 }),
      ledCortina: std(0x7a1515, { emissive: 0xff3030, emissiveIntensity: 1.2 }),
      engQuebrada: std(0xb9c3cf, { metalness: 0.7, roughness: 0.35, emissive: 0xff2a1a, emissiveIntensity: 0 }),
      engNova: std(0xe3c27a, { metalness: 0.85, roughness: 0.22, emissive: 0x2dff7a, emissiveIntensity: 0 }),
      policarbonato: std(0xbfd8ff, { transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
      faisca: new THREE.MeshBasicMaterial({ color: 0xffc56a, toneMapped: false })
    };
    var TORRE = {
      r: std(0x8a1d22, { emissive: 0xff2a2a, emissiveIntensity: 0 }),
      a: std(0x8a6a10, { emissive: 0xffc21a, emissiveIntensity: 0 }),
      g: std(0x14562f, { emissive: 0x2dff7a, emissiveIntensity: 0 })
    };
    var FEIXE = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.75, toneMapped: false });
    var CONE_LUZ = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    var RISCO = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
    var RISCO_FUNDO = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false });
    var VERMELHO = new THREE.Color(0xff3b3b), VERDE = new THREE.Color(0x2dff7a);
    var LOGO_MAT = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
    new THREE.TextureLoader().load("assets/img/marca/simbolo.png", function (t) {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      LOGO_MAT.map = t;
      LOGO_MAT.opacity = 1;
      LOGO_MAT.needsUpdate = true;
    });

    // peças com as mesmas medidas reaproveitam a mesma geometria (menos memória de vídeo, melhor no celular)
    var GEO = {};
    function geoBox(w, h, d) { var k = "b" + w + "|" + h + "|" + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); }
    function geoCyl(rt, rb, h, seg) { var k = "c" + rt + "|" + rb + "|" + h + "|" + seg; return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, seg)); }
    function box(w, h, d, mat, x, y, z, parent) {
      var m = new THREE.Mesh(geoBox(w, h, d), mat);
      m.position.set(x, y, z);
      (parent || build).add(m);
      return m;
    }
    function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
      var m = new THREE.Mesh(geoCyl(rt, rb, h, seg || 18), mat);
      m.position.set(x, y, z);
      (parent || build).add(m);
      return m;
    }
    function grupo(x, y, z, parent) {
      var g = new THREE.Group();
      g.position.set(x, y, z);
      (parent || build).add(g);
      return g;
    }
    function roda(r, larg, x, y, z, parent) {
      var m = cyl(r, r, larg, M.pneu, x, y, z, parent, 16);
      m.rotation.z = Math.PI / 2;
      return m;
    }
    function plano(w, h, mat, x, y, z, rotY, parent) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.rotation.y = rotY || 0;
      (parent || build).add(m);
      return m;
    }
    function placaFlutuante(tex, tam, x, y, z) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
      s.scale.set(tam, tam, 1);
      s.renderOrder = 5;
      var g = grupo(x, y, z);
      g.add(s);
      g.visible = false;
      return g;
    }

    /* ---------- relógio do ciclo: as seis etapas e a produção ---------- */
    var E = [0, 6.4, 9.2, 11.8, 14.8, 17.4, 20.4]; // início das etapas 1..6 e da produção (E[6])
    var T_OK = E[6], T_FIM = 27.6, T_DESMONTA = 0.8, T_TOTAL = T_FIM + T_DESMONTA;
    var ETAPAS = [
      "Manutenção corretiva",
      "Proteções NR-12",
      "Dispositivos de segurança",
      "Elétrica e automação",
      "Estruturas metálicas",
      "Tubulação, solda e climatização"
    ];
    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
    var easeIn = function (p) { return p * p * p; };
    var easeInOut = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
    var easeBack = function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
    var mod = function (a, b) { return ((a % b) + b) % b; };
    var janela = function (t, t0, t1) { return t >= t0 && t < t1; };
    // aparece crescendo (com um leve "pulo") a partir de t0
    function cresce(obj, t, t0, dur, eixo) {
      var p = clamp01((t - t0) / (dur || 0.5));
      obj.visible = p > 0;
      var e = Math.max(0.001, easeBack(p));
      if (eixo === "y") obj.scale.y = e; else if (eixo === "x") obj.scale.x = e; else obj.scale.setScalar(e);
    }

    /* ---------- base giratória e piso ---------- */
    var disco = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.14, 0.24, 110), M.disco);
    disco.position.y = -0.15;
    rig.add(disco);
    var anel = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.035, 10, 140), M.anel);
    anel.rotation.x = Math.PI / 2;
    rig.add(anel);

    var EY = 0.5, EZ = 0.15;                              // altura e linha central da esteira
    var GX0 = -1.15, GX1 = 1.15, GZ0 = -0.75, GZ1 = 1.05; // área das proteções NR-12
    var QX = -2.25, QZ = -1.0;                            // quadro elétrico
    var PLAT = { x0: 1.65, x1: 2.6, z0: -1.5, z1: -0.75, y: 0.9 }; // plataforma metálica

    var piso = new THREE.Mesh(new THREE.CircleGeometry(R, 110), std(0xffffff, {
      roughness: 0.55, metalness: 0.05,
      map: canvasTex(1024, 1024, function (g, S) {
        var px = function (v) { return (v / (2 * R) + 0.5) * S; };
        var len = function (v) { return (v / (2 * R)) * S; };
        g.fillStyle = "#bdc5d1"; g.fillRect(0, 0, S, S);
        for (var n = 0; n < 2400; n++) {
          g.fillStyle = n % 2 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)";
          g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
        }
        g.strokeStyle = "rgba(60,70,95,.15)"; g.lineWidth = 2;
        for (var j = -4; j <= 4; j++) {
          g.beginPath(); g.moveTo(px(j), 0); g.lineTo(px(j), S); g.stroke();
          g.beginPath(); g.moveTo(0, px(j)); g.lineTo(S, px(j)); g.stroke();
        }
        function zebra(x0, z0, x1, z1) {
          g.save();
          g.beginPath(); g.rect(px(x0), px(z0), len(x1 - x0), len(z1 - z0)); g.clip();
          g.fillStyle = "#f2c200"; g.fillRect(0, 0, S, S);
          g.strokeStyle = "#1f2128"; g.lineWidth = 8;
          for (var h = -S; h < 2 * S; h += 24) { g.beginPath(); g.moveTo(h, 0); g.lineTo(h - S, S); g.stroke(); }
          g.restore();
        }
        // faixa zebrada em volta da área protegida
        var m = 0.14;
        g.fillStyle = "#aab3c1"; g.fillRect(px(GX0 - m), px(GZ0 - m), len(GX1 - GX0 + 2 * m), len(GZ1 - GZ0 + 2 * m));
        zebra(GX0 - m - 0.1, GZ0 - m - 0.1, GX1 + m + 0.1, GZ0 - m);
        zebra(GX0 - m - 0.1, GZ1 + m, GX1 + m + 0.1, GZ1 + m + 0.1);
        zebra(GX0 - m - 0.1, GZ0 - m, GX0 - m, GZ1 + m);
        zebra(GX1 + m, GZ0 - m, GX1 + m + 0.1, GZ1 + m);
        zebra(QX - 0.42, QZ + 0.22, QX + 0.42, QZ + 0.8);             // área livre do quadro
        // passarela verde de pedestres com setas
        g.fillStyle = "#2a9d5c"; g.fillRect(0, px(1.55), px(1.9), len(0.42));
        g.fillStyle = "#f2c200"; g.fillRect(0, px(1.52), px(1.9), len(0.035)); g.fillRect(0, px(1.97), px(1.9), len(0.035));
        g.fillStyle = "rgba(255,255,255,.85)";
        for (var a = -3.2; a < 1.7; a += 0.85) {
          var ax = px(a), ay = px(1.76), u = len(0.09);
          g.beginPath(); g.moveTo(ax - u, ay - u); g.lineTo(ax + u, ay); g.lineTo(ax - u, ay + u); g.lineTo(ax - u * 0.4, ay); g.closePath(); g.fill();
        }
      })
    }));
    piso.rotation.x = -Math.PI / 2;
    rig.add(piso);

    /* ---------- esteira ---------- */
    var EL = 5.2;
    var esteira = grupo(0, 0, EZ);
    var correiaMat = std(0xffffff, { map: rep(TEX_CORREIA, EL / 0.22, 1), roughness: 0.8 });
    box(EL, 0.03, 0.44, correiaMat, 0, EY, 0, esteira);
    [-1, 1].forEach(function (s) { box(EL, 0.08, 0.035, M.aco, 0, EY - 0.035, s * 0.24, esteira); });
    [-2.35, -1.5, 1.5, 2.35].forEach(function (x) {
      [-1, 1].forEach(function (s) { box(0.045, EY - 0.08, 0.045, M.aco, x, (EY - 0.08) / 2, s * 0.19, esteira); });
      box(0.045, 0.035, 0.42, M.aco, x, 0.1, 0, esteira);
    });
    [-1, 1].forEach(function (s) { cyl(0.05, 0.05, 0.46, M.inox, s * EL / 2, EY - 0.02, 0, esteira, 14).rotation.x = Math.PI / 2; });

    /* ---------- a máquina (encaixotadora) ---------- */
    var maq = grupo(0, 0, EZ);
    box(1.0, 0.92, 0.72, M.corpo, 0, 0.62, 0, maq);
    box(1.02, 0.08, 0.74, M.azul, 0, 0.2, 0, maq);
    box(1.02, 0.05, 0.74, M.azul, 0, 1.06, 0, maq);
    [-1, 1].forEach(function (s) { box(0.02, 0.3, 0.48, M.escuro, s * 0.505, EY + 0.13, 0, maq); });
    box(0.26, 0.26, 0.012, M.vidro, 0.32, 0.84, 0.365, maq);
    box(0.6, 0.18, 0.5, M.papelao, 0.05, 1.18, -0.05, maq);
    for (var pl = 0; pl < 5; pl++) box(0.6, 0.004, 0.5, M.fita, 0.05, 1.1 + pl * 0.035, -0.05, maq);
    var torre = grupo(0.42, 1.08, -0.25, maq);
    cyl(0.016, 0.016, 0.14, M.acoEscuro, 0, 0.07, 0, torre, 8);
    cyl(0.05, 0.05, 0.065, TORRE.g, 0, 0.18, 0, torre, 16);
    cyl(0.05, 0.05, 0.065, TORRE.a, 0, 0.25, 0, torre, 16);
    cyl(0.05, 0.05, 0.065, TORRE.r, 0, 0.32, 0, torre, 16);
    cyl(0.036, 0.05, 0.03, M.acoEscuro, 0, 0.37, 0, torre, 16);
    var hmi = grupo(0.33, 0.52, 0.37, maq);
    box(0.18, 0.14, 0.03, M.escuro, 0, 0, 0, hmi);
    box(0.15, 0.1, 0.008, M.hmi, 0, 0.005, 0.017, hmi);
    box(0.1, 0.1, 0.03, M.amarelo, 0.38, 0.3, 0.37, maq);               // chave geral
    box(0.025, 0.07, 0.02, M.vermelho, 0.38, 0.3, 0.392, maq);

    function engrenagem(raio, dentes, espessura, mat) {
      var forma = new THREE.Shape();
      var rIn = raio * 0.8, passo = (Math.PI * 2) / dentes;
      for (var i = 0; i < dentes; i++) {
        var a = i * passo;
        [[rIn, a], [raio, a + passo * 0.15], [raio, a + passo * 0.45], [rIn, a + passo * 0.6]].forEach(function (p, k) {
          var x = Math.cos(p[1]) * p[0], y = Math.sin(p[1]) * p[0];
          if (i === 0 && k === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
        });
      }
      forma.closePath();
      var furo = new THREE.Path();
      furo.absarc(0, 0, raio * 0.28, 0, Math.PI * 2, true);
      forma.holes.push(furo);
      var geo = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 });
      geo.translate(0, 0, -espessura / 2);
      var g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat || M.inox));
      var cubo = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.3, raio * 0.3, espessura + 0.04, 20), M.acoEscuro);
      cubo.rotation.x = Math.PI / 2;
      g.add(cubo);
      return g;
    }
    // trem de engrenagens à mostra, atrás de uma tampa transparente com intertravamento
    box(0.6, 0.82, 0.02, M.acoEscuro, -0.2, 0.62, 0.37, maq);
    var EZF = 0.405;
    var engA = engrenagem(0.18, 16, 0.04);
    engA.position.set(-0.27, 0.56, EZF);
    maq.add(engA);
    var POS_B = new THREE.Vector3(-0.063, 0.734, EZF);
    var engB = engrenagem(0.12, 11, 0.04, M.engQuebrada);
    engB.position.copy(POS_B);
    maq.add(engB);
    var engNova = engrenagem(0.12, 11, 0.04, M.engNova);
    engNova.visible = false;
    maq.add(engNova);
    var engC = engrenagem(0.085, 8, 0.04);
    engC.position.set(0.03, 0.894, EZF);
    maq.add(engC);
    box(0.04, 0.06, 0.03, M.vermelho, 0.115, 0.62, 0.385, maq);         // chave de intertravamento
    var tampa = grupo(-0.5, 0.62, 0.465, maq);
    box(0.6, 0.8, 0.01, M.policarbonato, 0.3, 0, 0, tampa);
    box(0.6, 0.025, 0.02, M.amarelo, 0.3, 0.4, 0, tampa);
    box(0.6, 0.025, 0.02, M.amarelo, 0.3, -0.4, 0, tampa);
    box(0.025, 0.8, 0.02, M.amarelo, 0.6, 0, 0, tampa);
    box(0.025, 0.8, 0.02, M.amarelo, 0, 0, 0, tampa);
    box(0.02, 0.12, 0.03, M.escuro, 0.56, 0, 0.02, tampa);
    var bloqueio = grupo(0.38, 0.24, 0.41, maq);                         // cadeado e etiqueta de perigo
    box(0.05, 0.05, 0.025, M.vermelho, 0, 0, 0, bloqueio);
    plano(0.08, 0.16, std(0xffffff, { map: TEX_ETIQUETA, side: THREE.DoubleSide }), 0, -0.12, 0.01, 0, bloqueio);
    var FORA = new THREE.Vector3(-0.08, 0.7, 0.8), MAO = new THREE.Vector3(0.02, 0.5, 0.58);

    // defeito: fumaça, área de risco e placas
    var fumaca = [];
    for (var fi = 0; fi < 6; fi++) {
      var fm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9aa2b0, transparent: true, opacity: 0, depthWrite: false }));
      fm.visible = false;
      build.add(fm);
      fumaca.push(fm);
    }
    var risco = grupo(0, 0, EZ);
    var aro = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.86, 56), RISCO);
    aro.rotation.x = -Math.PI / 2; aro.position.y = 0.02; aro.renderOrder = 2;
    risco.add(aro);
    var fundoRisco = new THREE.Mesh(new THREE.CircleGeometry(0.8, 56), RISCO_FUNDO);
    fundoRisco.rotation.x = -Math.PI / 2; fundoRisco.position.y = 0.018; fundoRisco.renderOrder = 2;
    risco.add(fundoRisco);
    var alerta = placaFlutuante(TEX_ALERTA, 0.42, 0, 1.75, EZ);
    var okIcone = placaFlutuante(TEX_OK, 0.5, 0, 1.8, EZ);

    /* ---------- 2/6 proteções NR-12 ---------- */
    var HG = 1.24, BAIXO = 0.12, TOPO = 1.2, TUNEL = 0.82;
    var postes = [], paineis = [], telas = [], vistos = {};
    function poste(x, z) {
      var chave = x.toFixed(3) + "," + z.toFixed(3);
      if (vistos[chave]) return;
      vistos[chave] = true;
      var g = grupo(x, 0, z);
      box(0.05, HG, 0.05, M.amarelo, 0, HG / 2, 0, g);
      box(0.11, 0.012, 0.11, M.amarelo, 0, 0.006, 0, g);
      g.visible = false;
      postes.push(g);
    }
    function painel(x0, z0, x1, z1, y0, y1) {
      var dx = x1 - x0, dz = z1 - z0, comp = Math.sqrt(dx * dx + dz * dz), alt = y1 - y0;
      var g = grupo((x0 + x1) / 2, 0, (z0 + z1) / 2);
      g.rotation.y = -Math.atan2(dz, dx);
      var tela = std(0x1f2430, { map: rep(TEX_TELA, comp / 0.07, alt / 0.07), transparent: true, depthWrite: false, side: THREE.DoubleSide, metalness: 0.4 });
      telas.push(box(comp - 0.05, alt, 0.008, tela, 0, (y0 + y1) / 2, 0, g));
      box(comp - 0.05, 0.03, 0.025, M.quadroTela, 0, y1, 0, g);
      box(comp - 0.05, 0.03, 0.025, M.quadroTela, 0, y0, 0, g);
      poste(x0, z0); poste(x1, z1);
      g.visible = false;
      paineis.push({ g: g, alto: y0 > 0.5 });
      return g;
    }
    [[GX0, -0.38], [-0.38, 0.38], [0.38, GX1]].forEach(function (s) { painel(s[0], GZ0, s[1], GZ0, BAIXO, TOPO); });
    [GX0, GX1].forEach(function (x) {
      painel(x, GZ0, x, EZ - 0.28, BAIXO, TOPO);
      painel(x, EZ - 0.28, x, EZ + 0.28, TUNEL, TOPO);
      painel(x, EZ + 0.28, x, GZ1, BAIXO, TOPO);
    });
    var painelPlaca = painel(GX0, GZ1, -0.76, GZ1, BAIXO, TOPO);
    painel(0.16, GZ1, GX1, GZ1, BAIXO, TOPO);
    var placa = plano(0.27, 0.17, std(0xffffff, { map: TEX_PLACA, roughness: 0.5 }), 0, 0.88, 0.012, 0, painelPlaca);

    /* ---------- 3/6 cortina de luz e botão de emergência ---------- */
    var CX0 = -0.73, CX1 = 0.13, CZ = GZ1 - 0.04;
    var cortinaPostes = [CX0, CX1].map(function (x, i) {
      var p = grupo(x, 0, CZ);
      box(0.05, 1.08, 0.05, M.amarelo, 0, 0.54, 0, p);
      box(0.012, 0.95, 0.03, M.escuro, i ? -0.026 : 0.026, 0.56, 0, p);
      cyl(0.012, 0.012, 0.01, M.ledCortina, 0, 1.09, 0, p, 8);
      p.visible = false;
      return p;
    });
    var feixes = [];
    for (var b = 0; b < 7; b++) {
      var geoF = new THREE.BoxGeometry(CX1 - CX0 - 0.05, 0.013, 0.013);
      geoF.translate((CX1 - CX0 - 0.05) / 2, 0, 0);
      var fx = new THREE.Mesh(geoF, FEIXE);
      fx.position.set(CX0 + 0.025, 0.26 + b * 0.12, CZ);
      fx.visible = false;
      build.add(fx);
      feixes.push(fx);
    }
    var emergencia = grupo(0.62, 0, 1.36);
    cyl(0.022, 0.022, 0.86, M.amarelo, 0, 0.43, 0, emergencia, 10);
    box(0.13, 0.13, 0.11, M.amarelo, 0, 0.92, 0, emergencia);
    cyl(0.05, 0.05, 0.03, M.vermelho, 0, 0.92, 0.07, emergencia, 18).rotation.x = Math.PI / 2;
    box(0.2, 0.012, 0.2, M.escuro, 0, 0.006, 0, emergencia);
    emergencia.visible = false;

    /* ---------- 4/6 quadro elétrico, eletrocalha e iluminação LED ---------- */
    var quadroEl = grupo(QX, 0, QZ);
    box(0.8, 0.1, 0.38, M.escuro, 0, 0.05, 0, quadroEl);
    box(0.76, 1.3, 0.34, M.painel, 0, 0.75, 0, quadroEl);
    [0.45, 0.75, 1.05].forEach(function (y, n) {
      box(0.62, 0.035, 0.03, M.aco, 0, y - 0.11, 0.15, quadroEl);
      for (var k = 0; k < 6; k++) box(0.07, 0.16, 0.06, n === 1 && k > 3 ? M.laranja : M.azul, -0.24 + k * 0.095, y, 0.15, quadroEl);
    });
    var portaQ = grupo(-0.38, 0.75, 0.18, quadroEl);
    box(0.76, 1.28, 0.03, M.painel, 0.38, 0, 0, portaQ);
    box(0.02, 0.16, 0.03, M.escuro, 0.7, 0, 0.025, portaQ);
    cyl(0.025, 0.025, 0.02, M.ledQuadro, 0.22, 0.48, 0.02, portaQ, 12).rotation.x = Math.PI / 2;
    box(0.3, 0.2, 0.012, M.quadroTela, 0.34, 0.22, 0.02, portaQ);
    quadroEl.visible = false;
    var calha = grupo(QX, 0, QZ);
    var CALHA_X = -0.3 - QX, CALHA_Z = (EZ - 0.36) - QZ;
    box(0.16, 0.36, 0.07, M.aco, 0, 1.58, 0, calha);
    box(CALHA_X + 0.08, 0.05, 0.18, M.aco, CALHA_X / 2, 1.76, 0, calha);
    box(0.18, 0.05, CALHA_Z, M.aco, CALHA_X, 1.76, CALHA_Z / 2, calha);
    box(0.06, 1.76 - 1.1, 0.06, M.aco, CALHA_X, 1.43, CALHA_Z, calha);
    calha.visible = false;
    var luminarias = [[-1.55, -1.3], [1.35, -1.3]].map(function (p) {
      var g = grupo(p[0], 0, p[1]);
      cyl(0.025, 0.03, 1.95, M.acoEscuro, 0, 0.975, 0, g, 10);
      box(0.04, 0.04, 0.55, M.acoEscuro, 0, 1.93, 0.26, g);
      box(0.5, 0.05, 0.14, M.acoEscuro, 0, 1.9, 0.5, g);
      box(0.46, 0.012, 0.11, M.luminaria, 0, 1.87, 0.5, g);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.8, 24, 1, true), CONE_LUZ);
      cone.position.set(0, 0.97, 0.5);
      g.add(cone);
      g.visible = false;
      return g;
    });

    /* ---------- 5/6 plataforma metálica com escada e guarda-corpo ---------- */
    var plat = grupo(0, 0, 0);
    var pcx = (PLAT.x0 + PLAT.x1) / 2, pcz = (PLAT.z0 + PLAT.z1) / 2, pw = PLAT.x1 - PLAT.x0, pd = PLAT.z1 - PLAT.z0;
    var colunasP = [];
    [[PLAT.x0, PLAT.z0], [PLAT.x1, PLAT.z0], [PLAT.x0, PLAT.z1], [PLAT.x1, PLAT.z1]].forEach(function (c) {
      var g = grupo(c[0], 0, c[1], plat);
      box(0.06, PLAT.y, 0.06, M.aco, 0, PLAT.y / 2, 0, g);
      g.visible = false;
      colunasP.push(g);
    });
    var deck = grupo(pcx, PLAT.y, pcz, plat);
    box(pw + 0.06, 0.04, pd + 0.06, M.grade, 0, 0, 0, deck);
    box(pw + 0.08, 0.08, 0.04, M.aco, 0, -0.05, pd / 2 + 0.03, deck);
    box(pw + 0.08, 0.08, 0.04, M.aco, 0, -0.05, -pd / 2 - 0.03, deck);
    deck.visible = false;
    var escada = grupo(PLAT.x1, 0, -1.12, plat);                      // desce no sentido +x
    var EXL = 0.62, ang = Math.atan2(PLAT.y, EXL), comp = Math.sqrt(PLAT.y * PLAT.y + EXL * EXL);
    [-0.18, 0.18].forEach(function (z) {
      var longarina = box(comp, 0.07, 0.03, M.aco, EXL / 2, PLAT.y / 2, z, escada);
      longarina.rotation.z = -ang;
      var corrimao = box(comp, 0.025, 0.025, M.amarelo, EXL / 2, PLAT.y / 2 + 0.5, z, escada);
      corrimao.rotation.z = -ang;
      box(0.025, 0.5, 0.025, M.amarelo, EXL - 0.02, 0.25, z, escada);
    });
    for (var d = 1; d <= 5; d++) box(0.1, 0.02, 0.36, M.grade, EXL - d * EXL / 6, d * PLAT.y / 6, 0, escada);
    escada.visible = false;
    var guarda = grupo(0, 0, 0, plat);                                // guarda-corpo amarelo
    [[PLAT.x0, PLAT.z0, PLAT.x1, PLAT.z0], [PLAT.x0, PLAT.z1, PLAT.x1, PLAT.z1], [PLAT.x0, PLAT.z0, PLAT.x0, PLAT.z1],
      [PLAT.x1, PLAT.z0, PLAT.x1, -1.32], [PLAT.x1, -0.92, PLAT.x1, PLAT.z1]].forEach(function (s) {
      var dx = s[2] - s[0], dz = s[3] - s[1], L = Math.sqrt(dx * dx + dz * dz);
      var g = grupo((s[0] + s[2]) / 2, PLAT.y, (s[1] + s[3]) / 2, guarda);
      g.rotation.y = -Math.atan2(dz, dx);
      box(L, 0.025, 0.025, M.amarelo, 0, 0.55, 0, g);
      box(L, 0.02, 0.02, M.amarelo, 0, 0.3, 0, g);
      box(L, 0.08, 0.01, M.amarelo, 0, 0.04, 0, g);
      [-L / 2, L / 2].forEach(function (u) { box(0.03, 0.55, 0.03, M.amarelo, u, 0.275, 0, g); });
    });
    guarda.visible = false;

    /* ---------- 6/6 tubulação em inox (solda TIG) e climatizador ---------- */
    var tubos = grupo(0.5, 0, -1.78);
    [-1.75, 0, 1.75].forEach(function (x) {
      box(0.06, 1.72, 0.06, M.azul, x, 0.86, 0, tubos);
      box(0.06, 0.04, 0.36, M.azul, x, 1.7, 0, tubos);
    });
    var tubosLinha = grupo(0, 0, 0, tubos);
    [1.48, 1.64].forEach(function (y, k) {
      cyl(0.045, 0.045, 4.2, M.inox, 0, y, k ? 0.1 : -0.1, tubosLinha, 16).rotation.z = Math.PI / 2;
      for (var x = -1.9; x <= 1.9; x += 0.95) cyl(0.065, 0.065, 0.03, M.inox, x, y, k ? 0.1 : -0.1, tubosLinha, 16).rotation.z = Math.PI / 2;
    });
    tubos.visible = false;
    var SOLDA = new THREE.Vector3(2.32, 1.48, -1.68);                    // ponto da solda (mundo do rig)
    var brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILHO, depthTest: false, blending: THREE.AdditiveBlending, transparent: true, toneMapped: false }));
    brilho.position.copy(SOLDA);
    brilho.renderOrder = 6;
    brilho.visible = false;
    build.add(brilho);
    var faiscas = [];
    for (var si = 0; si < 16; si++) {
      var fs = new THREE.Mesh(geoBox(0.016, 0.016, 0.016), M.faisca);
      fs.visible = false;
      build.add(fs);
      faiscas.push(fs);
    }
    var clima = grupo(1.88, PLAT.y + 0.02, -1.3);                        // climatizador sobre a plataforma
    box(0.34, 0.36, 0.3, M.branco, 0, 0.18, 0, clima);
    box(0.36, 0.05, 0.32, M.azul, 0, 0.02, 0, clima);
    var ventoinha = grupo(0, 0.2, 0.155, clima);
    for (var pa = 0; pa < 4; pa++) {
      var pas = box(0.24, 0.05, 0.01, M.acoEscuro, 0, 0, 0, ventoinha);
      pas.rotation.z = pa * Math.PI / 4;
    }
    cyl(0.135, 0.135, 0.01, M.aco, 0, 0, 0.012, ventoinha, 24).rotation.x = Math.PI / 2;
    cyl(0.07, 0.07, 0.75, M.inox, 0.05, 0.72, -0.05, clima, 16);
    clima.visible = false;

    /* ---------- van da MR ---------- */
    var van = grupo(2.45, 0, 1.78);
    (function () {
      var v = van;
      box(0.56, 0.5, 0.82, M.branco, 0, 0.45, -0.1, v);
      box(0.56, 0.28, 0.26, M.branco, 0, 0.34, 0.43, v);
      box(0.54, 0.24, 0.02, M.vidro, 0, 0.58, 0.33, v).rotation.x = -0.5;
      box(0.57, 0.08, 1.08, M.azul, 0, 0.28, 0.03, v);
      [-1, 1].forEach(function (s) {
        box(0.08, 0.04, 0.02, M.farol, s * 0.2, 0.36, 0.565, v);
        roda(0.1, 0.08, s * 0.25, 0.1, 0.33, v);
        roda(0.1, 0.08, s * 0.25, 0.1, -0.38, v);
      });
      plano(0.46, 0.18, LOGO_MAT, -0.285, 0.55, -0.12, -Math.PI / 2, v);
      plano(0.46, 0.18, LOGO_MAT, 0.285, 0.55, -0.12, Math.PI / 2, v);
      plano(0.3, 0.118, LOGO_MAT, 0, 0.55, -0.512, Math.PI, v);
    })();
    var portaVan = box(0.015, 0.4, 0.34, M.branco, -0.287, 0.46, 0.08, van);

    /* ---------- equipe da MR (logo nas costas) ---------- */
    function pessoa(opcoes) {
      opcoes = opcoes || {};
      var fora = grupo(0, 0, 0);
      var g = grupo(0, 0, 0, fora);
      g.scale.setScalar(2.1);
      var pernas = [-0.026, 0.026].map(function (x) {
        var p = grupo(x, 0.16, 0, g);
        box(0.036, 0.16, 0.045, M.calca, 0, -0.08, 0, p);
        box(0.038, 0.025, 0.06, M.escuro, 0, -0.152, 0.008, p);
        return p;
      });
      box(0.105, 0.15, 0.06, M.uniforme, 0, 0.235, 0, g);
      box(0.107, 0.02, 0.062, M.azul, 0, 0.17, 0, g);                    // faixa azul na cintura
      plano(0.078, 0.031, LOGO_MAT, 0, 0.268, -0.0312, Math.PI, g);    // logo da MR nas costas
      plano(0.032, 0.0126, LOGO_MAT, -0.028, 0.285, 0.0312, 0, g);     // e pequena no peito
      var bracos = [-0.07, 0.07].map(function (x) {
        var b = grupo(x, 0.3, 0, g);
        box(0.03, 0.13, 0.036, M.uniforme, 0, -0.06, 0, b);
        box(0.026, 0.025, 0.03, M.pele, 0, -0.135, 0, b);
        return b;
      });
      var cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), M.pele);
      cabeca.position.y = 0.35;
      g.add(cabeca);
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.capaceteAzul);
      cap.position.y = 0.356;
      g.add(cap);
      box(0.1, 0.008, 0.06, M.capaceteAzul, 0, 0.358, 0.035, g);
      if (opcoes.mascara) box(0.07, 0.06, 0.012, M.mascara, 0, 0.345, 0.042, g);
      if (opcoes.maleta) box(0.07, 0.05, 0.03, M.laranja, 0, -0.16, 0, bracos[1]);
      if (opcoes.tocha) {
        var tocha = box(0.012, 0.012, 0.07, M.escuro, 0, -0.14, 0.03, bracos[0]);
        tocha.rotation.x = 0.3;
      }
      fora.visible = false;
      return { g: fora, pernas: pernas, bracos: bracos };
    }
    var tecnico = pessoa({ maleta: true });
    var soldador = pessoa({ mascara: true, tocha: true });

    // trajetos: pontos [x, z, (altura)] e para onde fica virado ao chegar
    var TEC_ROTA = [
      { t0: 0.5, t1: 2.0, pts: [[2.12, 1.6], [1.0, 1.15], [0.15, EZ + 0.64]], fim: -2.7 },
      { t0: E[1] + 0.05, t1: E[1] + 1.0, pts: [[0.15, EZ + 0.64], [0.35, 1.35], [-1.5, 1.42]], fim: Math.PI },
      { t0: E[2] + 0.05, t1: E[2] + 0.9, pts: [[-1.5, 1.42], [0.62, 1.66]], fim: Math.PI },
      { t0: E[3] + 0.05, t1: E[3] + 1.3, pts: [[0.62, 1.66], [-1.6, 1.45], [QX + 0.02, QZ + 0.6]], fim: Math.PI },
      { t0: T_OK + 0.3, t1: T_OK + 1.7, pts: [[QX + 0.02, QZ + 0.6], [-1.6, 1.45], [-0.3, 1.66]], fim: 0.2 }
    ];
    var SOL_ROTA = [
      { t0: E[4] + 0.1, t1: E[4] + 1.8, pts: [[2.12, 1.6], [3.2, 0.62], [3.3, -1.12]], fim: -Math.PI / 2 },
      { t0: E[5] + 0.05, t1: E[5] + 1.0, pts: [[3.3, -1.12, 0], [PLAT.x1 + EXL, -1.12, 0], [PLAT.x1, -1.12, PLAT.y], [2.32, -1.3, PLAT.y]], fim: Math.PI }
    ];
    function percorrer(pts, p) {
      var lens = [], tot = 0, i;
      for (i = 0; i < pts.length - 1; i++) {
        var l = Math.sqrt(Math.pow(pts[i + 1][0] - pts[i][0], 2) + Math.pow(pts[i + 1][1] - pts[i][1], 2) + Math.pow((pts[i + 1][2] || 0) - (pts[i][2] || 0), 2));
        lens.push(l); tot += l;
      }
      var dd = p * tot;
      for (i = 0; i < lens.length; i++) {
        if (dd <= lens[i] || i === lens.length - 1) {
          var f = lens[i] ? Math.min(1, dd / lens[i]) : 0, a = pts[i], b2 = pts[i + 1];
          return {
            x: a[0] + (b2[0] - a[0]) * f, z: a[1] + (b2[1] - a[1]) * f, y: (a[2] || 0) + ((b2[2] || 0) - (a[2] || 0)) * f,
            ang: Math.atan2(b2[0] - a[0], b2[1] - a[1])
          };
        }
        dd -= lens[i];
      }
      return { x: pts[0][0], z: pts[0][1], y: 0, ang: 0 };
    }
    // posição de alguém ao longo do ciclo: escondido antes do primeiro trajeto, andando ou parado no lugar
    function moverPessoa(p, rota, t) {
      var g = p.g;
      if (t < rota[0].t0) { g.visible = false; return false; }
      g.visible = true;
      var pos = null, andando = false;
      for (var i = rota.length - 1; i >= 0; i--) {
        var r = rota[i];
        if (t >= r.t0) {
          if (t < r.t1) { pos = percorrer(r.pts, easeInOut((t - r.t0) / (r.t1 - r.t0))); andando = true; }
          else { pos = percorrer(r.pts, 1); pos.ang = r.fim; }
          break;
        }
      }
      g.position.set(pos.x, pos.y + (andando ? Math.abs(Math.sin(t * 11)) * 0.02 : 0), pos.z);
      g.rotation.y = pos.ang;
      g.scale.setScalar(Math.max(0.001, clamp01((t - rota[0].t0) / 0.25)));
      var balanco = andando ? Math.sin(t * 11) * 0.55 : 0;
      p.pernas[0].rotation.x = balanco;
      p.pernas[1].rotation.x = -balanco;
      p.bracos[0].rotation.x = -balanco * 0.8;
      p.bracos[1].rotation.x = balanco * 0.8;
      return andando;
    }

    /* ---------- produção: peças entram, caixas saem ---------- */
    var V = 0.45, GAP = 0.55, N_PROD = 12;
    var produtos = [];
    var geoPeca = new THREE.BoxGeometry(0.22, 0.04, 0.22), geoRessalto = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16);
    var geoCaixa = new THREE.BoxGeometry(0.28, 0.22, 0.26), geoFita = new THREE.BoxGeometry(0.285, 0.012, 0.06);
    for (var pi = 0; pi < N_PROD; pi++) {
      var pg = new THREE.Group();
      var peca = new THREE.Group();
      var pm = new THREE.Mesh(geoPeca, M.peca); pm.position.y = 0.02; peca.add(pm);
      var rs = new THREE.Mesh(geoRessalto, M.peca); rs.position.y = 0.06; peca.add(rs);
      var cx = new THREE.Group();
      var cxm = new THREE.Mesh(geoCaixa, M.caixa); cxm.position.y = 0.11; cx.add(cxm);
      var ft = new THREE.Mesh(geoFita, M.fita); ft.position.y = 0.221; cx.add(ft);
      pg.add(peca); pg.add(cx);
      pg.userData = { peca: peca, caixa: cx };
      pg.visible = false;
      build.add(pg);
      produtos.push(pg);
    }
    var LINHA = N_PROD * GAP; // comprimento do ciclo das peças (maior que a esteira)

    /* ---------- tudo o que muda com o tempo ---------- */
    var faseAtual = -1;
    function etapa(t) {
      var i = 0;
      for (var k = 0; k < E.length; k++) if (t >= E[k]) i = k;
      return i; // 0..5 = etapas 1..6, 6 = produção
    }
    function aplicar(t) {
      var pisca = Math.sin(t * 9) > 0;
      var operando = t >= T_OK, tOp = t - T_OK;

      /* 1/6 manutenção corretiva */
      var T_ABRE = 2.2, T_TIRA = 2.8, T_NOVA = 3.95, T_FECHA = 5.0, T_TESTE = 5.45, T_CONSERTADO = 6.4;
      var giroTeste = 1.6 * clamp01((t - T_TESTE) / (T_CONSERTADO - T_TESTE));
      var angA = -giroTeste - (operando ? tOp * 3.2 : 0);
      var angB = -angA * 16 / 11 + 0.1;
      engA.rotation.z = angA;
      engC.rotation.z = angA * 2 + 0.2;
      var abre = easeInOut(clamp01((t - T_ABRE) / 0.5)), fecha = easeInOut(clamp01((t - T_FECHA) / 0.45));
      tampa.rotation.y = -1.9 * (abre - fecha);
      bloqueio.visible = janela(t, T_ABRE + 0.2, T_FECHA + 0.3);
      var sai1 = easeInOut(clamp01((t - T_TIRA) / 0.6)), sai2 = easeInOut(clamp01((t - T_TIRA - 0.6) / 0.45));
      engB.visible = t < T_TIRA + 1.05;
      engB.position.copy(POS_B).lerp(FORA, sai1).lerp(MAO, sai2);
      engB.scale.setScalar(Math.max(0.001, 1 - sai2));
      engB.rotation.z = angB + (t < 2.0 ? Math.sin(t * 45) * 0.05 : 0) + sai1 * 1.2;
      M.engQuebrada.emissiveIntensity = t < T_TIRA + 1.05 ? 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(t * 8)) : 0;
      var entra1 = easeOut(clamp01((t - T_NOVA) / 0.45)), entra2 = easeInOut(clamp01((t - T_NOVA - 0.45) / 0.5));
      engNova.visible = t >= T_NOVA;
      engNova.position.copy(MAO).lerp(FORA, entra1).lerp(POS_B, entra2);
      engNova.scale.setScalar(Math.max(0.001, Math.min(1, entra1 * 1.4)));
      engNova.rotation.z = angB + (1 - entra2) * 2.2;
      M.engNova.emissiveIntensity = janela(t, T_NOVA, T_NOVA + 0.5) ? 1.2 * (1 - (t - T_NOVA) / 0.5)
        : janela(t, T_TESTE, T_CONSERTADO + 0.4) ? 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 7)) : 0;
      var quebrada = t < T_TESTE;
      TORRE.r.emissiveIntensity = quebrada ? (pisca ? 2.6 : 0.15) : 0;
      TORRE.a.emissiveIntensity = !quebrada && !operando ? (t < T_CONSERTADO ? (pisca ? 2.2 : 0.15) : 1.5) : 0;
      TORRE.g.emissiveIntensity = operando ? 2.2 : 0;
      M.hmi.emissive.setHex(quebrada ? 0xff2a2a : operando ? 0x2f6bff : 0xffc21a);
      M.hmi.emissiveIntensity = quebrada && !pisca ? 0.25 : 0.8;
      var pulso = 0.55 + 0.45 * Math.sin(t * 6);
      risco.visible = t < T_TESTE;
      RISCO.opacity = 0.75 * pulso;
      RISCO_FUNDO.opacity = 0.22 * pulso;
      var bob = Math.sin(t * 3) * 0.04;
      alerta.visible = t < T_ABRE;
      alerta.position.y = 1.78 + bob;
      alerta.scale.setScalar(Math.max(0.001, easeBack(clamp01(t / 0.5)) * (1 - clamp01((t - T_ABRE + 0.3) / 0.3))));
      okIcone.visible = janela(t, T_OK, T_OK + 3.4);
      okIcone.position.y = 1.85 + bob;
      okIcone.scale.setScalar(Math.max(0.001, easeBack(clamp01((t - T_OK) / 0.4)) * (1 - clamp01((t - T_OK - 3.0) / 0.4))));
      fumaca.forEach(function (fm, i) {
        var u = mod(t * 0.7 + i / fumaca.length, 1);
        var ativo = t < T_ABRE + 0.4;
        fm.visible = ativo;
        if (!ativo) return;
        fm.position.set(-0.1 + Math.sin(i * 2.1) * 0.08 + u * 0.12, 1.1 + u * 0.8, EZ + Math.cos(i * 1.7) * 0.06);
        fm.scale.setScalar(0.6 + u * 1.6);
        fm.material.opacity = 0.5 * (1 - u) * clamp01((T_ABRE + 0.4 - t) / 0.6);
      });

      /* 2/6 proteções NR-12 */
      postes.forEach(function (p, i) { cresce(p, t, E[1] + 0.9 + i * 0.07, 0.45, "y"); });
      paineis.forEach(function (p, i) {
        if (p.alto) {
          var q = easeOut(clamp01((t - (E[1] + 2.1 + i * 0.03)) / 0.45));
          p.g.visible = q > 0;
          p.g.position.y = (1 - q) * 1.1;
        } else {
          cresce(p.g, t, E[1] + 1.2 + i * 0.1, 0.5, "y");
        }
      });
      cresce(placa, t, E[1] + 2.5, 0.4);

      /* 3/6 dispositivos de segurança */
      cortinaPostes.forEach(function (p, i) { cresce(p, t, E[2] + 0.7 + i * 0.12, 0.45, "y"); });
      feixes.forEach(function (f, i) { cresce(f, t, E[2] + 1.0 + i * 0.07, 0.4, "x"); });
      cresce(emergencia, t, E[2] + 1.4, 0.45);
      var verde = easeInOut(clamp01((t - (E[2] + 2.0)) / 0.5));
      FEIXE.color.copy(VERMELHO).lerp(VERDE, verde);
      FEIXE.opacity = 0.55 + 0.3 * Math.abs(Math.sin(t * 3));
      M.ledCortina.emissive.copy(verde > 0.5 ? VERDE : VERMELHO);

      /* 4/6 elétrica e automação */
      cresce(quadroEl, t, E[3] + 0.3, 0.6, "y");
      cresce(calha, t, E[3] + 0.8, 0.7, "x");
      luminarias.forEach(function (l, i) { cresce(l, t, E[3] + 0.5 + i * 0.15, 0.5, "y"); });
      var luz = easeOut(clamp01((t - (E[3] + 2.2)) / 0.4));
      M.luminaria.emissiveIntensity = 1.6 * luz;
      CONE_LUZ.opacity = 0.09 * luz;
      var abreQ = easeInOut(clamp01((t - (E[3] + 1.4)) / 0.4)), fechaQ = easeInOut(clamp01((t - (E[3] + 2.5)) / 0.4));
      portaQ.rotation.y = -1.9 * (abreQ - fechaQ);

      /* 5/6 estruturas metálicas */
      colunasP.forEach(function (c, i) { cresce(c, t, E[4] + 0.2 + i * 0.1, 0.45, "y"); });
      var qd = easeOut(clamp01((t - (E[4] + 0.7)) / 0.45));
      deck.visible = qd > 0;
      deck.position.y = PLAT.y + (1 - qd) * 0.8;
      cresce(escada, t, E[4] + 1.0, 0.5);
      cresce(guarda, t, E[4] + 1.4, 0.5, "y");

      /* 6/6 tubulação, solda e climatização */
      cresce(tubos, t, E[5] + 0.15, 0.6, "y");
      tubosLinha.scale.x = Math.max(0.001, easeOut(clamp01((t - (E[5] + 0.5)) / 0.7)));
      cresce(clima, t, E[5] + 0.4, 0.45);
      ventoinha.rotation.z = t >= E[5] + 0.8 ? (t - E[5]) * 9 : 0;
      var soldando = janela(t, E[5] + 1.2, T_OK - 0.2);
      brilho.visible = soldando;
      var cintila = 0.7 + 0.3 * Math.sin(t * 57) * Math.sin(t * 31);
      brilho.scale.setScalar(0.32 * cintila);
      faiscas.forEach(function (fs, i) {
        fs.visible = soldando;
        if (!soldando) return;
        var u = mod(t * 2.4 + i / faiscas.length, 1), a2 = i * 2.39;
        fs.position.set(SOLDA.x + Math.cos(a2) * 0.3 * u, SOLDA.y + 0.25 * u - 0.9 * u * u, SOLDA.z + 0.12 + Math.sin(a2) * 0.18 * u);
        fs.scale.setScalar(1 - u * 0.8);
      });

      /* equipe */
      var vanAberta = janela(t, 0.2, 0.9) || janela(t, E[4] - 0.2, E[4] + 0.5);
      portaVan.position.z = 0.08 - (vanAberta ? 0.3 : 0);
      var tecAndando = moverPessoa(tecnico, TEC_ROTA, t);
      if (!tecAndando) {
        var bt = tecnico.bracos;
        if (janela(t, T_ABRE - 0.1, T_FECHA + 0.4)) {             // trocando a engrenagem
          var aj = janela(t, T_NOVA + 0.9, T_FECHA) ? Math.sin(t * 10) * 0.3 : 0;
          bt[0].rotation.x = -1.35 + aj; bt[1].rotation.x = -1.05 - aj * 0.5;
        } else if (janela(t, E[1] + 1.1, E[2])) {                 // instalando as proteções
          bt[0].rotation.x = -1.9 + Math.sin(t * 5) * 0.2; bt[1].rotation.x = -1.6 - Math.sin(t * 5) * 0.2;
        } else if (janela(t, E[2] + 1.6, E[2] + 2.3)) {           // testa o botão de emergência
          bt[0].rotation.x = -1.2; bt[1].rotation.x = 0;
        } else if (janela(t, E[3] + 1.4, E[3] + 2.6)) {           // ligações no quadro
          bt[0].rotation.x = -1.3 + Math.sin(t * 9) * 0.2; bt[1].rotation.x = -1.1;
        } else if (t >= T_OK + 1.7) {                             // joinha no fim
          bt[1].rotation.x = -2.5;
        }
      }
      var solAndando = moverPessoa(soldador, SOL_ROTA, t);
      if (!solAndando && soldando) {
        soldador.bracos[0].rotation.x = -1.25 + Math.sin(t * 6) * 0.06;
        soldador.bracos[1].rotation.x = -1.0;
      }

      /* produção */
      correiaMat.map.offset.x = operando ? -(tOp * V) / 0.22 : 0;
      var entrada = clamp01(tOp / 0.5);
      for (var k = 0; k < produtos.length; k++) {
        var pg = produtos[k];
        if (!operando) { pg.visible = false; continue; }
        var dd = mod(tOp * V + k * GAP, LINHA);
        var x = -EL / 2 + dd;
        var borda = Math.min(1, dd / 0.25, (EL - dd) / 0.25);
        if (dd > EL || borda <= 0 || (x > -0.42 && x < 0.42)) { pg.visible = false; continue; }
        pg.visible = true;
        pg.userData.peca.visible = x < 0;
        pg.userData.caixa.visible = x >= 0;
        pg.position.set(x, EY + 0.015, EZ);
        pg.scale.setScalar(Math.max(0.001, Math.min(borda, entrada)));
      }

      // ciclo: monta no começo e encolhe no fim
      var montar = easeOut(clamp01(t / 0.6)), desmontar = easeIn(clamp01((t - T_FIM) / T_DESMONTA));
      build.scale.setScalar(Math.max(0.001, Math.min(montar, 1 - desmontar)));

      // etiqueta da etapa
      var idx = etapa(t);
      if (idx !== faseAtual) {
        faseAtual = idx;
        var pronto = idx === 6;
        stage.classList.toggle("is-done", pronto);
        if (chip) {
          chip.classList.toggle("is-done", pronto);
          chip.classList.toggle("is-warn", idx > 0 && !pronto);
          chip.lastElementChild.textContent = pronto ? "Produção em andamento" : (idx + 1) + "/6 · " + ETAPAS[idx];
        }
      }
    }

    // sombras: quase tudo projeta e recebe; telas, luzes e marcas no piso não
    rig.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    piso.castShadow = false;
    var semSombra = [FEIXE, CONE_LUZ, RISCO, RISCO_FUNDO, LOGO_MAT, M.faisca, M.policarbonato];
    build.traverse(function (o) { if (o.isMesh && semSombra.indexOf(o.material) >= 0) o.castShadow = false; });
    telas.forEach(function (m) { m.castShadow = false; });
    fumaca.forEach(function (m) { m.castShadow = false; m.receiveShadow = false; });

    /* ---------- câmera: aproxima de quem está trabalhando em cada etapa ---------- */
    // foco (no "mundo" do disco), quanto aproximar e de que ângulo olhar; null = gira sozinho
    var CENAS = [
      { t: 0, foco: [0, 0.6, 0.1], zoom: 0, yaw: null },
      { t: 1.4, foco: [-0.12, 0.66, EZ + 0.6], zoom: 0.62, yaw: -0.22 },
      { t: E[1] + 0.2, foco: [0, 0.62, 0.2], zoom: 0.18, yaw: -0.5 },
      { t: E[2] + 0.2, foco: [-0.15, 0.62, 1.05], zoom: 0.42, yaw: -0.3 },
      { t: E[3] + 0.4, foco: [QX + 0.3, 0.85, QZ + 0.3], zoom: 0.42, yaw: 0.45 },
      { t: E[4] + 0.2, foco: [2.3, 0.75, -0.9], zoom: 0.36, yaw: -0.85 },
      { t: E[5] + 0.3, foco: [2.15, 1.3, -1.35], zoom: 0.5, yaw: -0.6 },
      { t: T_OK + 0.2, foco: [0, 0.6, 0.1], zoom: 0, yaw: null }
    ];
    CENAS.forEach(function (c) { c.v = new THREE.Vector3(c.foco[0], c.foco[1], c.foco[2]); });
    var MAIS_ZOOM = telaPequena ? 1.12 : 1; // no celular aproxima um pouco mais, porque a cena é menor
    var vFoco = new THREE.Vector3(), vAlvo = new THREE.Vector3(), vCam = new THREE.Vector3();
    function cenaCamera(t) {
      var i = 0;
      for (var k = 0; k < CENAS.length; k++) if (t >= CENAS[k].t) i = k;
      var atual = CENAS[i], antes = CENAS[i > 0 ? i - 1 : CENAS.length - 1];
      var b2 = easeInOut(clamp01((t - atual.t) / 1.4));
      vFoco.copy(antes.v).lerp(atual.v, b2);
      return { zoom: (antes.zoom + (atual.zoom - antes.zoom) * b2) * MAIS_ZOOM, yaw: atual.yaw, peso: b2 };
    }

    /* ---------- giro: automático + arraste ---------- */
    var yaw = -0.5, pitch = 0.06, vel = 0, dragging = false, lastX = 0, lastY = 0, retomar = 0;
    var AUTO = 0.16;
    canvas.addEventListener("pointerdown", function (e) {
      dragging = true; vel = 0; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add("is-dragging");
      stage.classList.add("was-dragged");
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* sem captura, segue normal */ }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      vel = dx * 0.009;
      yaw += vel;
      // no toque, o movimento vertical fica para a rolagem da página
      if (e.pointerType === "mouse") pitch = Math.max(-0.1, Math.min(0.5, pitch + dy * 0.004));
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (nome) {
      canvas.addEventListener(nome, function () {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove("is-dragging");
        retomar = performance.now() + 2500;
      });
    });

    /* ---------- tamanho e visibilidade ---------- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener("resize", resize);
    var naTela = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { naTela = en[0].isIntersecting; }, { rootMargin: "80px" }).observe(stage);
    }

    /* ---------- laço ---------- */
    var tempo = 0, pausado = false;
    var anterior = 0, iniciado = false, contados = 0, somaDt = 0, aliviado = false;
    function desenhar() {
      aplicar(tempo);
      rig.rotation.y = yaw;
      rig.rotation.x = pitch;
      rig.updateMatrixWorld(true);
      var c = cenaCamera(tempo);
      vFoco.applyMatrix4(rig.matrixWorld);
      vAlvo.copy(ALVO_BASE).lerp(vFoco, Math.min(1, c.zoom * 1.6));
      vCam.copy(CAM_BASE).sub(ALVO_BASE).multiplyScalar(1 - c.zoom).add(vAlvo);
      camera.position.copy(vCam);
      camera.lookAt(vAlvo);
      renderer.render(scene, camera);
      if (!iniciado) { iniciado = true; stage.classList.add("has-3d"); }
    }
    function laco(agora) {
      requestAnimationFrame(laco);
      var dt = Math.min(0.05, (agora - anterior) / 1000 || 0);
      anterior = agora;
      if (!naTela) return;
      if (!pausado) tempo += dt;
      if (tempo >= T_TOTAL) tempo = 0;
      if (!dragging) {
        var c = cenaCamera(tempo);
        if (Math.abs(vel) > 0.0004) { yaw += vel; vel *= 0.93; }
        else if (agora > retomar) {
          if (c.yaw !== null) {
            // vira até o melhor ângulo da etapa, pelo caminho mais curto
            var alvoYaw = c.yaw + Math.round((yaw - c.yaw) / (Math.PI * 2)) * Math.PI * 2;
            yaw += (alvoYaw - yaw) * Math.min(1, dt * 1.8);
          } else {
            yaw += AUTO * dt;
          }
        }
      }
      desenhar();
      // aparelho lento: desliga as sombras e reduz a resolução para manter a fluidez
      if (!aliviado && contados < 90) {
        contados++; somaDt += dt;
        if (contados === 90 && somaDt / 90 > 0.034) {
          aliviado = true;
          sol.castShadow = false;
          renderer.setPixelRatio(Math.min(DPR, 1.25));
          resize();
        }
      }
    }
    resize();
    desenhar();
    requestAnimationFrame(laco);

    // usado só para conferência visual (ex.: __maquina3d.ir(3.3) mostra a troca da engrenagem)
    window.__maquina3d = {
      ir: function (t, giro) { tempo = t; if (typeof giro === "number") yaw = giro; desenhar(); },
      pausar: function (p) { pausado = !!p; },
      etapas: E
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
