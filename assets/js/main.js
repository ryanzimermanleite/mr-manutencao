/* MR Manutenção Industrial e Comercial — comportamento do site */
(function () {
  "use strict";

  // Número que recebe as mensagens do formulário e do simulador (DDI + DDD + número, só dígitos).
  var WHATSAPP = "5519987219972";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- cabeçalho ---------- */
  var header = $(".site-header");
  var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- menu no celular ---------- */
  var toggle = $(".menu-toggle");
  var nav = $("#menu");
  var setMenu = function (open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    $(".sr-only", toggle).textContent = open ? "Fechar menu" : "Abrir menu";
  };
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  /* ---------- link ativo no menu ---------- */
  var links = $$(".site-nav ul a");
  var secoes = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window && secoes.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- animação de entrada ---------- */
  // listas em cascata: cada item recebe a sua vez (--i)
  $$("[data-stagger]").forEach(function (lista) {
    Array.prototype.forEach.call(lista.children, function (filho, i) { filho.style.setProperty("--i", i); });
  });
  var revelar = $$(".reveal, [data-stagger]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revelar.forEach(function (el) { io.observe(el); });
  } else {
    revelar.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- filtro de trabalhos ---------- */
  var filtros = $$(".filtro");
  var projetos = $$(".projeto");
  filtros.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.filtro;
      filtros.forEach(function (b) {
        var ativo = b === btn;
        b.classList.toggle("is-active", ativo);
        b.setAttribute("aria-pressed", String(ativo));
      });
      projetos.forEach(function (p) {
        var mostrar = cat === "todos" || p.dataset.cat === cat || p.dataset.cat === "sempre";
        p.hidden = !mostrar;
        if (mostrar) p.classList.add("is-visible");
      });
    });
  });

  /* ---------- galeria (lightbox) ---------- */
  var lb = $("#lightbox");
  var lbImg = $("#lb-img");
  var lbTitulo = $("#lb-titulo");
  var lbContador = $("#lb-contador");
  var galeria = null;
  var indice = 0;
  var origem = null;

  var mostrarFoto = function (i) {
    var fotos = galeria.fotos;
    indice = (i + fotos.length) % fotos.length;
    var foto = fotos[indice];
    var titulo = foto.legenda || galeria.titulo;
    lbImg.src = foto.src;
    lbImg.width = foto.w;
    lbImg.height = foto.h;
    lbImg.alt = titulo + (fotos.length > 1 ? " (foto " + (indice + 1) + " de " + fotos.length + ")" : "");
    lbTitulo.textContent = titulo;
    lbContador.textContent = fotos.length > 1 ? (indice + 1) + " / " + fotos.length : "";
    var prox = fotos[(indice + 1) % fotos.length];
    if (prox) { new Image().src = prox.src; }
  };

  var abrirGaleria = function (slug, botao, inicio) {
    galeria = (window.GALERIAS || {})[slug];
    if (!galeria || !galeria.fotos.length) return;
    origem = botao || null;
    lb.hidden = false;
    document.body.classList.add("sem-rolagem");
    var unica = galeria.fotos.length < 2;
    $(".lb-ant", lb).hidden = unica;
    $(".lb-prox", lb).hidden = unica;
    mostrarFoto(inicio || 0);
    $(".lb-fechar", lb).focus();
  };

  var fecharGaleria = function () {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.classList.remove("sem-rolagem");
    if (origem) origem.focus();
  };

  $$("[data-galeria]").forEach(function (btn) {
    btn.addEventListener("click", function () { abrirGaleria(btn.dataset.galeria, btn, Number(btn.dataset.inicio) || 0); });
  });
  $(".lb-fechar", lb).addEventListener("click", fecharGaleria);
  $(".lb-ant", lb).addEventListener("click", function () { mostrarFoto(indice - 1); });
  $(".lb-prox", lb).addEventListener("click", function () { mostrarFoto(indice + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) fecharGaleria(); });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") fecharGaleria();
    else if (e.key === "ArrowLeft") mostrarFoto(indice - 1);
    else if (e.key === "ArrowRight") mostrarFoto(indice + 1);
    else if (e.key === "Tab") {
      // mantém o foco dentro da galeria
      var focaveis = $$("button:not([hidden])", lb);
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  });

  // deslizar no celular
  var toqueX = null;
  lb.addEventListener("touchstart", function (e) { toqueX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (toqueX === null) return;
    var dx = e.changedTouches[0].clientX - toqueX;
    toqueX = null;
    if (Math.abs(dx) > 50 && galeria && galeria.fotos.length > 1) mostrarFoto(indice + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- formulário → WhatsApp ---------- */
  var form = $("#form-contato");
  var erro = $("#form-erro");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = form.nome.value.trim();
    var empresa = form.empresa.value.trim();
    var servico = form.servico.value;
    var mensagem = form.mensagem.value.trim();

    form.nome.classList.toggle("is-invalid", !nome);
    form.mensagem.classList.toggle("is-invalid", !mensagem);
    if (!nome || !mensagem) {
      erro.hidden = false;
      (nome ? form.mensagem : form.nome).focus();
      return;
    }
    erro.hidden = true;

    var texto = "Olá! Meu nome é " + nome + (empresa ? ", da empresa " + empresa : "") + "." +
      "\nServiço de interesse: " + servico + "." +
      "\n\n" + mensagem;
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  });

  /* ---------- serviços: abre um item por vez ---------- */
  var itensServico = $$(".servico-item");
  itensServico.forEach(function (item) {
    var botao = $(".servico-btn", item);
    botao.addEventListener("click", function () {
      var abrir = !item.classList.contains("is-open");
      itensServico.forEach(function (outro) {
        outro.classList.remove("is-open");
        $(".servico-btn", outro).setAttribute("aria-expanded", "false");
      });
      if (abrir) {
        item.classList.add("is-open");
        botao.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- números que contam ao aparecer ---------- */
  // "anos de mercado" acompanha o calendário (fundada em 2019)
  $$("[data-desde]").forEach(function (el) {
    var anos = new Date().getFullYear() - Number(el.dataset.desde);
    if (anos > 0) { el.dataset.count = String(anos); el.textContent = String(anos); }
  });
  var milhar = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var contar = function (el) {
    var alvo = Number(el.dataset.count), prefixo = el.dataset.prefix || "", inicio = null;
    var passo = function (agora) {
      if (inicio === null) inicio = agora;
      var p = Math.min(1, (agora - inicio) / 1400);
      el.textContent = prefixo + milhar(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  if ("IntersectionObserver" in window) {
    var ioContagem = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { contar(en.target); ioContagem.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { ioContagem.observe(el); });
  }

  /* ---------- manifesto: as palavras acendem conforme a página rola ---------- */
  var manifesto = $("#manifesto");
  if (manifesto) {
    var palavras = [];
    Array.prototype.slice.call(manifesto.childNodes).forEach(function (no) {
      if (no.nodeType === 3) {
        var frag = document.createDocumentFragment();
        no.textContent.split(/(\s+)/).forEach(function (parte) {
          if (!parte) return;
          if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(" ")); return; }
          var span = document.createElement("span");
          span.className = "pal";
          span.textContent = parte;
          frag.appendChild(span);
          palavras.push(span);
        });
        manifesto.replaceChild(frag, no);
      } else if (no.nodeType === 1) {
        no.classList.add("pal");
        palavras.push(no);
      }
    });
    var acender = function () {
      var r = manifesto.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.88 - r.top) / (r.height + vh * 0.3);
      var n = Math.round(Math.max(0, Math.min(1, p)) * palavras.length);
      palavras.forEach(function (el, i) { el.classList.toggle("is-on", i < n); });
    };
    window.addEventListener("scroll", acender, { passive: true });
    window.addEventListener("resize", acender);
    acender();
  }

  /* ---------- simulador de economia com manutenção ---------- */
  // Faixas do U.S. DOE (O&M Best Practices Guide): preventiva economiza 12–18% sobre a corretiva;
  // a preditiva economiza mais 8–12% sobre o que sobra.
  var gasto = $("#sim-gasto");
  if (gasto) {
    var saidaValor = $("#sim-valor"), saidaPrev = $("#sim-prev"), saidaPred = $("#sim-pred"), cta = $("#sim-cta");
    var reais = function (v) {
      if (v >= 1e6) {
        var mi = Math.round(v / 1e5) / 10;
        return "R$ " + String(mi).replace(".", ",") + (mi < 2 ? " milhão" : " milhões");
      }
      return "R$ " + milhar(Math.round(v / 1000)) + " mil";
    };
    var faixa = function (a, b) { return reais(a) + " a " + reais(b); };
    var atualizar = function () {
      var v = Number(gasto.value);
      var p = (v - Number(gasto.min)) / (Number(gasto.max) - Number(gasto.min)) * 100;
      gasto.style.setProperty("--p", p + "%");
      saidaValor.textContent = reais(v);
      saidaPrev.textContent = faixa(v * 0.12, v * 0.18);
      var predMin = v * (1 - 0.88 * 0.92), predMax = v * (1 - 0.82 * 0.88);
      saidaPred.textContent = faixa(predMin, predMax);
      gasto.setAttribute("aria-valuetext", reais(v) + " por ano");
      var texto = "Olá! Gostaria de um plano de manutenção preventiva para a minha empresa." +
        "\nHoje gastamos cerca de " + reais(v) + " por ano com manutenção.";
      cta.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
    };
    gasto.addEventListener("input", atualizar);
    atualizar();
  }

  /* ---------- título da tela inicial: cada palavra sobe na sua vez ---------- */
  var titulo = $(".hero h1");
  if (titulo) {
    var nPalavra = 0;
    var quebrar = function (no) {
      Array.prototype.slice.call(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          var frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach(function (parte) {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(" ")); return; }
            var fora = document.createElement("span");
            fora.className = "palavra";
            var dentro = document.createElement("span");
            dentro.textContent = parte;
            dentro.style.setProperty("--i", nPalavra++);
            fora.appendChild(dentro);
            frag.appendChild(fora);
          });
          no.replaceChild(frag, filho);
        } else if (filho.nodeType === 1 && filho.tagName !== "BR") {
          quebrar(filho);
        }
      });
    };
    titulo.setAttribute("aria-label", titulo.textContent.replace(/\s+/g, " ").trim());
    quebrar(titulo);
  }

  /* ---------- rolagem: barra de leitura e camadas que andam em velocidades diferentes ---------- */
  var camadas = $$("[data-parallax]");
  var celular = window.matchMedia && window.matchMedia("(max-width: 680px)").matches;
  var pedido = false;
  var aoRolar = function () {
    pedido = false;
    var alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
    header.style.setProperty("--prog", alturaTotal > 0 ? Math.min(1, window.scrollY / alturaTotal) : 0);
    var vh = window.innerHeight;
    camadas.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var fator = Number(el.dataset.parallax) * (celular ? 0.5 : 1);
      var deslocamento = (r.top + r.height / 2 - vh / 2) * -fator;
      el.style.translate = "0 " + deslocamento.toFixed(1) + "px";
    });
  };
  window.addEventListener("scroll", function () {
    if (!pedido) { pedido = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  window.addEventListener("resize", aoRolar);
  aoRolar();

  /* ---------- cartões que inclinam acompanhando o mouse (só em computador) ---------- */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add("is-tilting");
        el.style.setProperty("--ry", (x * 10).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () {
        el.classList.remove("is-tilting");
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ---------- ano no rodapé ---------- */
  var ano = $("#ano");
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
