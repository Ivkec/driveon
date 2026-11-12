/* ==========================================================================
   DriveOn - JavaScript za index.html i kontakt.html
   Svaka funkcija proverava da li njen deo postoji na stranici,
   pa isti fajl radi na obe stranice.
   ========================================================================== */

(function () {
  "use strict";

  /* Google Analytics ID. Zameni pravim ID-jem (i u komentaru u <head>). */
  var GA_ID = "G-XXXXXXXXXX";
  var CONSENT_KEY = "driveon_cookie_consent";
  var DODATNI_CAS = 2100;

  var formatDin = new Intl.NumberFormat("sr-Latn-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function din(iznos) {
    return formatDin.format(iznos) + " din";
  }

  /* ---------- Header: providan na vrhu, tamno plav posle skrola ---------- */
  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- Vozni park: slajder preko celog ekrana ---------- */
  function initFleetLightbox() {
    var fleet = document.querySelector("[data-fleet]");
    var box = document.querySelector("[data-lightbox]");
    if (!fleet || !box) return;

    var cards = Array.prototype.slice.call(fleet.querySelectorAll(".fleet__card"));

    // Podaci iz kartice: prva slika je slika sa kartice, a dodatne slike
    // (sa svojim nazivom i detaljima) stoje u skrivenom bloku .fleet__extra
    function listItems(root) {
      return Array.prototype.map.call(root.querySelectorAll("li"), function (li) {
        return li.textContent;
      });
    }

    function readCard(card) {
      var img = card.querySelector(".fleet__media img");
      var slides = [{
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt"),
        title: card.querySelector("h3").textContent,
        details: listItems(card.querySelector(".fleet__details"))
      }];
      Array.prototype.forEach.call(card.querySelectorAll(".fleet__slide"), function (el) {
        slides.push({
          src: el.getAttribute("data-src"),
          alt: el.getAttribute("data-alt"),
          title: el.querySelector(".fleet__slide-title").textContent,
          details: listItems(el)
        });
      });
      return {
        tag: card.querySelector(".tag").textContent,
        meta: card.querySelector(".card__meta").textContent,
        slides: slides
      };
    }

    var frame = box.querySelector("[data-lightbox-frame]");
    var imgEl = box.querySelector("[data-lightbox-img]");
    var tagEl = box.querySelector("[data-lightbox-tag]");
    var titleEl = box.querySelector("[data-lightbox-title]");
    var metaEl = box.querySelector("[data-lightbox-meta]");
    var detailsEl = box.querySelector("[data-lightbox-details]");
    var countEl = box.querySelector("[data-lightbox-count]");
    var thumbsEl = box.querySelector("[data-lightbox-thumbs]");
    var captionEl = box.querySelector("[data-lightbox-caption]");
    var closeBtn = box.querySelector("[data-lightbox-close]");
    var prevBtn = box.querySelector("[data-lightbox-prev]");
    var nextBtn = box.querySelector("[data-lightbox-next]");
    var current = 0;
    var lastFocus = null;
    var vehicle = null;
    var busy = false;
    var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

    function reduceMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Tekst ispod/pored slike: naziv i detalji trenutne slike
    function renderText() {
      var s = vehicle.slides[current];
      var total = vehicle.slides.length;
      titleEl.textContent = s.title;
      detailsEl.innerHTML = "";
      s.details.forEach(function (d) {
        var li = document.createElement("li");
        li.textContent = d;
        detailsEl.appendChild(li);
      });
      countEl.textContent = total > 1 ? (current + 1) + " / " + total : "";
      Array.prototype.forEach.call(thumbsEl.children, function (t, i) {
        t.classList.toggle("is-active", i === current);
        t.setAttribute("aria-current", i === current ? "true" : "false");
      });
    }

    function buildThumbs() {
      thumbsEl.innerHTML = "";
      var total = vehicle.slides.length;
      thumbsEl.hidden = total < 2;
      prevBtn.hidden = total < 2;
      nextBtn.hidden = total < 2;
      if (total < 2) return;
      vehicle.slides.forEach(function (s, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "lightbox__thumb";
        b.setAttribute("aria-label", "Slika " + (i + 1) + ": " + s.title);
        var im = document.createElement("img");
        im.src = s.src;
        im.alt = "";
        im.width = 72;
        im.height = 72;
        b.appendChild(im);
        b.addEventListener("click", function () { show(i); });
        thumbsEl.appendChild(b);
      });
    }

    // Prelaz: stara slika klizi u stranu i bledi, nova ulazi sa druge strane
    function show(index, dir) {
      var total = vehicle.slides.length;
      index = (index + total) % total;
      if (index === current || busy) return;
      if (dir === undefined) dir = index > current ? 1 : -1;
      current = index;
      var s = vehicle.slides[current];

      if (reduceMotion() || !imgEl.animate) {
        imgEl.src = s.src;
        imgEl.alt = s.alt;
        renderText();
        return;
      }

      busy = true;
      var old = imgEl.cloneNode();
      old.removeAttribute("data-lightbox-img");
      old.setAttribute("aria-hidden", "true");
      frame.insertBefore(old, imgEl);

      var next = new Image();
      next.src = s.src;
      var ready = next.decode ? next.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        imgEl.src = s.src;
        imgEl.alt = s.alt;
        renderText();
        var dur = 520;
        old.animate([
          { transform: "translateX(0) scale(1)", opacity: 1 },
          { transform: "translateX(" + (-dir * 35) + "%) scale(0.94)", opacity: 0 }
        ], { duration: dur, easing: EASE, fill: "forwards" });
        var anim = imgEl.animate([
          { transform: "translateX(" + (dir * 60) + "%) scale(1.04)", opacity: 0 },
          { transform: "translateX(0) scale(1)", opacity: 1 }
        ], { duration: dur, easing: EASE });
        captionEl.animate([
          { transform: "translateY(10px)", opacity: 0 },
          { transform: "none", opacity: 1 }
        ], { duration: 380, delay: 120, easing: EASE, fill: "backwards" });
        anim.onfinish = anim.oncancel = function () {
          old.remove();
          busy = false;
        };
      });
    }

    function go(step) {
      if (!vehicle || vehicle.slides.length < 2) return;
      show(current + step, step);
    }

    var openCard = null;
    var closing = false;

    // Pravougaonik slike sa kartice, samo ako se kartica vidi na ekranu
    function cardRect(card) {
      if (!card) return null;
      var img = card.querySelector(".fleet__media img");
      if (!img) return null;
      var r = img.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return null;
      return r;
    }

    // Slika "izraste" iz kartice u veliki kadar (i obrnuto pri zatvaranju)
    function flipFrom(r) {
      var f = frame.getBoundingClientRect();
      return "translate(" + (r.left - f.left) + "px, " + (r.top - f.top) + "px) scale(" +
        (r.width / f.width) + ", " + (r.height / f.height) + ")";
    }

    var fadeParts = [];
    function parts() {
      if (!fadeParts.length) {
        fadeParts = [captionEl, thumbsEl, prevBtn, nextBtn, closeBtn];
      }
      return fadeParts;
    }

    function open(card) {
      lastFocus = card.querySelector(".fleet__btn") || document.activeElement;
      openCard = card;
      vehicle = readCard(card);
      current = 0;
      busy = false;
      closing = false;
      tagEl.textContent = vehicle.tag;
      metaEl.textContent = vehicle.meta;
      imgEl.src = vehicle.slides[0].src;
      imgEl.alt = vehicle.slides[0].alt;
      buildThumbs();
      renderText();
      // unapred učitaj ostale slike te kategorije da prelaz bude odmah
      vehicle.slides.forEach(function (s) { var p = new Image(); p.src = s.src; });
      box.hidden = false;
      box.scrollTop = 0;
      document.body.classList.add("has-lightbox");
      closeBtn.focus({ preventScroll: true });

      if (reduceMotion() || !box.animate) return;
      box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
      var r = cardRect(card);
      if (r) {
        frame.animate([
          { transform: flipFrom(r), borderRadius: "16px" },
          { transform: "none" }
        ], { duration: 560, easing: EASE });
      } else {
        frame.animate([
          { transform: "translateY(24px) scale(0.94)", opacity: 0 },
          { transform: "none", opacity: 1 }
        ], { duration: 460, easing: EASE });
      }
      parts().forEach(function (el, i) {
        el.animate([
          { opacity: 0, translate: "0 12px" },
          { opacity: 1, translate: "0 0" }
        ], { duration: 420, delay: 200 + i * 50, easing: EASE, fill: "backwards" });
      });
    }

    function finishClose() {
      box.hidden = true;
      closing = false;
      document.body.classList.remove("has-lightbox");
      box.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    function close() {
      if (box.hidden || closing) return;
      if (reduceMotion() || !box.animate) { finishClose(); return; }
      closing = true;
      var dur = 380;
      parts().forEach(function (el) {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in", fill: "forwards" });
      });
      var r = current === 0 ? cardRect(openCard) : null;
      frame.animate(r ? [
        { transform: "none" },
        { transform: flipFrom(r), borderRadius: "16px" }
      ] : [
        { transform: "none", opacity: 1 },
        { transform: "translateY(16px) scale(0.94)", opacity: 0 }
      ], { duration: dur, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
      var fade = box.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: dur, delay: r ? 120 : 0, easing: "ease-in", fill: "forwards"
      });
      fade.onfinish = finishClose;
    }

    fleet.addEventListener("click", function (e) {
      var card = e.target.closest(".fleet__card");
      if (!card) return;
      open(card);
    });

    prevBtn.addEventListener("click", function () { go(-1); });
    nextBtn.addEventListener("click", function () { go(1); });
    closeBtn.addEventListener("click", close);

    // Klik na tamnu pozadinu zatvara prikaz
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });

    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Tab") {
        var f = box.querySelectorAll("button:not([hidden])");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Prevlačenje prstom na telefonu
    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  /* ---------- Strelica "nazad na vrh" ---------- */
  function initToTop() {
    var btn = document.querySelector("[data-to-top]");
    if (!btn) return;
    function update() {
      btn.classList.toggle("is-visible", window.scrollY > 500);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* Sitne zelene čestice oko završne kartice, kad se okvir iscrta */
  function addGoalParticles(card) {
    if (card.querySelector(".goal__particles")) return;
    var box = document.createElement("div");
    box.className = "goal__particles";
    box.setAttribute("aria-hidden", "true");
    for (var n = 0; n < 22; n++) {
      var p = document.createElement("span");
      p.className = "goal__particle";
      var side = n % 4;            // 0 gore, 1 desno, 2 dole, 3 levo
      var t = Math.random() * 100; // položaj duž ivice u procentima
      var drift = 6 + Math.random() * 10;
      var x, y, dx, dy;
      if (side === 0) { x = t; y = 12; dx = (Math.random() - 0.5) * 8; dy = -drift; }
      else if (side === 2) { x = t; y = 88; dx = (Math.random() - 0.5) * 8; dy = drift; }
      else if (side === 1) { x = 98; y = t; dx = drift; dy = (Math.random() - 0.5) * 8; }
      else { x = 2; y = t; dx = -drift; dy = (Math.random() - 0.5) * 8; }
      p.style.left = x + "%";
      p.style.top = y + "%";
      p.style.setProperty("--s", (2 + Math.random() * 2.5).toFixed(1) + "px");
      p.style.setProperty("--dx", dx.toFixed(1) + "px");
      p.style.setProperty("--dy", dy.toFixed(1) + "px");
      p.style.setProperty("--o", (0.3 + Math.random() * 0.35).toFixed(2));
      p.style.setProperty("--d", (2.6 + Math.random() * 2.4).toFixed(2) + "s");
      p.style.setProperty("--delay", (Math.random() * 3).toFixed(2) + "s");
      box.appendChild(p);
    }
    card.appendChild(box);
  }

  /* ---------- Koraci: pojavljuju se jedan po jedan, pa se iscrta veza ---------- */
  function initStepsReveal() {
    var lists = document.querySelectorAll(".steps");
    if (!lists.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    Array.prototype.forEach.call(lists, function (list) {
      var steps = Array.prototype.slice.call(list.querySelectorAll(".step"));
      if (!steps.length) return;
      list.classList.add("js-reveal");

      var seenUpTo = -1;   // najveći indeks koraka koji je ušao u ekran
      var next = 0;        // sledeći korak koji treba prikazati
      var busy = false;

      function tick() {
        if (busy || next > seenUpTo || next >= steps.length) return;
        busy = true;
        var i = next;
        steps[i].classList.add("is-visible");
        if (steps[i].classList.contains("step--goal")) {
          // okvir se iscrtava oko 1,45 s, pa tek onda kreću čestice
          setTimeout(function () { addGoalParticles(steps[i]); }, 1000);
        }
        var wait = 300;
        var isGoal = steps[i].classList.contains("step--goal");
        if (i > 0) {
          // posle pojave koraka iscrtava se veza od prethodnog do njega,
          // a tamnoplavi okvir prelazi sa prethodnog koraka na ovaj
          setTimeout(function () {
            steps[i - 1].classList.add("is-linked");
            steps[i - 1].classList.remove("is-current");
            if (!isGoal) steps[i].classList.add("is-current");
          }, 150);
          wait = 450;
        } else if (!isGoal) {
          steps[i].classList.add("is-current");
        }
        if (i === steps.length - 1 && !isGoal) {
          // poslednji korak bez završne kartice: okvir se skloni posle kratke pauze
          setTimeout(function () { steps[i].classList.remove("is-current"); }, 1100);
        }
        setTimeout(function () {
          busy = false;
          next = i + 1;
          tick();
        }, wait);
      }

      // Korak se računa kao "dosegnut" čim mu vrh uđe u ekran,
      // pa se pojave i koraci preko kojih se brzo preskrolovalo.
      var ticking = false;
      function check() {
        ticking = false;
        var limit = window.innerHeight * 0.95;
        for (var k = steps.length - 1; k > seenUpTo; k--) {
          if (steps[k].getBoundingClientRect().top < limit) {
            seenUpTo = k;
            break;
          }
        }
        tick();
        if (seenUpTo >= steps.length - 1) window.removeEventListener("scroll", onScroll);
      }
      function onScroll() {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(check);
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      check();
    });
  }

  /* ---------- Žute trake ispod istaknutih reči ---------- */
  function initHighlights() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var marks = Array.prototype.filter.call(document.querySelectorAll(".hl"), function (el) {
      return !el.closest(".hero, .page-intro");
    });
    if (!marks.length) return;
    document.documentElement.classList.add("js-hl");

    var ticking = false;
    function check() {
      ticking = false;
      var limit = window.innerHeight * 0.85;
      marks = marks.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add("is-drawn");
          return false;
        }
        return true;
      });
      if (!marks.length) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
  }

  /* ---------- Brojač na karticama sa brojkama ---------- */
  function initCounters() {
    var nums = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
    if (!nums.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function format(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // U HTML-u su upisane prave brojke (za pretraživače i bez JS-a).
    // Kad JS radi, kreću od nule i broje se do svoje vrednosti kad uđu u ekran.
    nums.forEach(function (el) {
      el.textContent = (el.getAttribute("data-prefix") || "") + "0";
    });

    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      var prefix = el.getAttribute("data-prefix") || "";
      var duration = 1300;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + format(Math.round(target * eased));
        if (t < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    var ticking = false;
    function check() {
      ticking = false;
      var limit = window.innerHeight * 0.9;
      nums = nums.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) {
          run(el);
          return false;
        }
        return true;
      });
      if (!nums.length) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
  }

  /* ---------- Blago pojavljivanje grupe kartica (instruktori) ---------- */
  function initRevealGroups() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var groups = Array.prototype.slice.call(document.querySelectorAll("[data-reveal-group]"));
    if (!groups.length) return;
    groups.forEach(function (g) { g.classList.add("js-reveal-group"); });

    var ticking = false;
    function check() {
      ticking = false;
      var limit = window.innerHeight * 0.85;
      groups = groups.filter(function (g) {
        if (g.getBoundingClientRect().top < limit) {
          g.classList.add("is-revealed");
          return false;
        }
        return true;
      });
      if (!groups.length) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
  }

  /* ---------- Blago pojavljivanje kartica pri skrolu (cela stranica, osim heroja) ---------- */
  function initScrollReveal() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var selectors = [
      ".situations > .situation",
      ".figures > .figure",
      ".benefits > li",
      ".fleet > .fleet__card",
      ".stats > .stat",
      ".testimonials > .testimonial",
      ".prices > .price-card",
      ".extras > *",
      ".services > *",
      ".later__box",
      ".faq > .faq__item",
      ".contact-list > li",
      ".map",
      ".signup .form",
      ".signup__aside .aside-box"
    ];
    var items = Array.prototype.slice.call(document.querySelectorAll(selectors.join(",")))
      .filter(function (el) { return !el.closest(".hero, [data-reveal-group]"); });
    if (!items.length) return;
    items.forEach(function (el) { el.classList.add("reveal-item"); });

    var ticking = false;
    function check() {
      ticking = false;
      var limit = window.innerHeight * 0.92;
      var batch = 0;
      items = items.filter(function (el) {
        var r = el.getBoundingClientRect();
        // sakriveni elementi (npr. neaktivni tab) nemaju visinu, pa se odmah označe
        if (r.height === 0 || r.top < limit) {
          el.style.setProperty("--rd", Math.min(batch, 5) * 0.08 + "s");
          if (r.height !== 0) batch++;
          el.classList.add("is-in");
          return false;
        }
        return true;
      });
      if (!items.length) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(check);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();
  }

  /* ---------- Mobilni meni (hamburger) ---------- */
  function initMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("glavni-meni");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      var hdr = document.querySelector(".site-header");
      if (hdr) hdr.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Zatvori meni" : "Otvori meni");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    /* Zatvori meni kad korisnik klikne na link */
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    /* Zatvori na Escape */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Ako se prozor proširi preko 768px, resetuj stanje */
    window.matchMedia("(min-width: 768px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- Tabovi za kategorije ---------- */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (wrap) {
      var tabs = Array.prototype.slice.call(wrap.querySelectorAll('[role="tab"]'));

      var list = wrap.querySelector('[role="tablist"]');
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Pozadina aktivnog taba koja klizi do taba na koji se klikne
      var indicator = document.createElement("span");
      indicator.className = "tabs__indicator";
      indicator.setAttribute("aria-hidden", "true");
      list.insertBefore(indicator, list.firstChild);
      list.classList.add("has-indicator");

      function moveIndicator(tab, animate) {
        if (!animate) indicator.style.transition = "none";
        indicator.style.width = tab.offsetWidth + "px";
        indicator.style.height = tab.offsetHeight + "px";
        indicator.style.transform = "translate(" + tab.offsetLeft + "px, " + tab.offsetTop + "px)";
        if (!animate) {
          void indicator.offsetWidth;
          indicator.style.transition = "";
        }
      }

      function current() {
        return tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
      }

      function activate(tab, focus) {
        var prevIndex = tabs.indexOf(current());
        var nextIndex = tabs.indexOf(tab);
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute("aria-selected", String(selected));
          t.tabIndex = selected ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          panel.hidden = !selected;
          if (selected && prevIndex !== nextIndex && !reduce) {
            // novi sadržaj ulazi sa strane u koju se ide
            panel.style.setProperty("--enter-x", (nextIndex > prevIndex ? 28 : -28) + "px");
            panel.classList.remove("is-entering");
            void panel.offsetWidth;
            panel.classList.add("is-entering");
          }
        });
        moveIndicator(tab, true);
        if (focus) tab.focus();
      }

      moveIndicator(current(), false);
      window.addEventListener("resize", function () { moveIndicator(current(), false); });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { moveIndicator(current(), false); });
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () {
          activate(tab, false);
        });

        /* Strelice levo/desno, Home i End, po ARIA obrascu za tabove */
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === "Home") next = tabs[0];
          if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            activate(next, true);
          }
        });
      });
    });
  }

  /* ---------- Kalkulator cene i rata ---------- */
  function initCalculator() {
    var form = document.querySelector("[data-calc]");
    if (!form) return;

    var select = form.querySelector("#calc-kategorija");
    var casovi = form.querySelector("#calc-casovi");
    var out = {
      kat: document.querySelector("[data-calc-kat]"),
      paket: document.querySelector("[data-calc-paket]"),
      broj: document.querySelector("[data-calc-broj]"),
      dodatno: document.querySelector("[data-calc-dodatno]"),
      ukupno: document.querySelector("[data-calc-ukupno]"),
      rate: document.querySelector("[data-calc-rate]"),
      rata: document.querySelector("[data-calc-rata]"),
      napomena: document.querySelector("[data-calc-napomena]"),
      cta: document.querySelector("[data-calc-cta]")
    };

    function brojCasova() {
      var n = parseInt(casovi.value, 10);
      if (isNaN(n) || n < 0) n = 0;
      if (n > 40) n = 40;
      return n;
    }

    function update() {
      var opt = select.options[select.selectedIndex];
      var cena = Number(opt.getAttribute("data-price")) || 0;
      var okvirna = opt.getAttribute("data-okvirna") === "true";
      var checked = form.querySelector('input[name="rate"]:checked');
      var rate = checked ? Number(checked.value) : 6;
      var n = brojCasova();
      var dodatno = n * DODATNI_CAS;
      var ukupno = cena + dodatno;

      out.kat.textContent = opt.value;
      out.paket.textContent = din(cena);
      out.broj.textContent = String(n);
      out.dodatno.textContent = din(dodatno);
      out.ukupno.textContent = din(ukupno);
      out.rate.textContent = String(rate);
      out.rata.textContent = din(Math.round((ukupno / rate) * 100) / 100);
      out.napomena.textContent = okvirna
        ? "Okvirna cena za ovu kategoriju. Tačan iznos potvrđujemo telefonom. Rate su bez kamate."
        : "Bez kamate. Ukupan iznos je isti kao kad plaćaš odjednom.";
      out.cta.setAttribute("href", "kontakt.html?kategorija=" + encodeURIComponent(opt.value));
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
    form.addEventListener("change", update);
    casovi.addEventListener("input", update);
    casovi.addEventListener("blur", function () {
      casovi.value = brojCasova();
      update();
    });

    form.querySelectorAll("[data-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        casovi.value = Math.min(40, Math.max(0, brojCasova() + Number(btn.getAttribute("data-step"))));
        update();
      });
    });

    update();
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    document.querySelectorAll("[data-faq]").forEach(function (faq) {
      var buttons = Array.prototype.slice.call(faq.querySelectorAll(".faq__q button"));
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function panelOf(btn) {
        return document.getElementById(btn.getAttribute("aria-controls"));
      }

      function finish(panel, fn) {
        var done = false;
        function end(e) {
          if (e && e.propertyName !== "height") return;
          if (done) return;
          done = true;
          panel.removeEventListener("transitionend", end);
          fn();
        }
        panel.addEventListener("transitionend", end);
        setTimeout(end, 500); // za slučaj da transitionend ne stigne
      }

      function openPanel(btn) {
        var panel = panelOf(btn);
        btn.setAttribute("aria-expanded", "true");
        btn.closest(".faq__item").classList.add("is-open");
        panel.hidden = false;
        if (reduce) return;
        var full = panel.scrollHeight;
        panel.style.height = "0px";
        panel.style.opacity = "0";
        void panel.offsetHeight;
        panel.style.height = full + "px";
        panel.style.opacity = "1";
        finish(panel, function () {
          panel.style.height = "";
          panel.style.opacity = "";
        });
      }

      function closePanel(btn) {
        var panel = panelOf(btn);
        btn.setAttribute("aria-expanded", "false");
        btn.closest(".faq__item").classList.remove("is-open");
        if (reduce) { panel.hidden = true; return; }
        panel.style.height = panel.scrollHeight + "px";
        void panel.offsetHeight;
        panel.style.height = "0px";
        panel.style.opacity = "0";
        finish(panel, function () {
          if (btn.getAttribute("aria-expanded") === "true") return;
          panel.hidden = true;
          panel.style.height = "";
            panel.style.opacity = "";
        });
      }

      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var isOpen = btn.getAttribute("aria-expanded") === "true";
          // uvek je otvoreno najviše jedno pitanje
          buttons.forEach(function (other) {
            if (other !== btn && other.getAttribute("aria-expanded") === "true") closePanel(other);
          });
          if (isOpen) closePanel(btn);
          else openPanel(btn);
        });
      });
    });
  }

  /* ---------- Cookie banner + Google Analytics ---------- */
  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
      /* localStorage nije dostupan (privatni prozor). Izbor važi samo za ovu posetu. */
    }
  }

  function loadAnalytics() {
    if (window.__driveonGaLoaded || GA_ID === "G-XXXXXXXXXX") return; /* ne učitava dok nema pravog ID-ja */
    window.__driveonGaLoaded = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  function initCookies() {
    var banner = document.getElementById("cookie-banner");
    if (!banner) return;

    function show() {
      banner.hidden = false;
    }

    function hide() {
      banner.hidden = true;
    }

    var consent = readConsent();
    if (consent === "accepted") {
      loadAnalytics();
    } else if (consent !== "rejected") {
      show();
    }

    banner.querySelectorAll("[data-cookie]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-cookie");
        saveConsent(value);
        if (value === "accepted") loadAnalytics();
        hide();
      });
    });

    /* Link "Podešavanja kolačića" u footeru ponovo otvara banner */
    document.querySelectorAll("[data-cookie-settings]").forEach(function (btn) {
      btn.addEventListener("click", show);
    });
  }

  /* ---------- Forma za prijavu (kontakt.html) ---------- */
  function initSignupForm() {
    var form = document.querySelector("[data-signup]");
    if (!form) return;

    var summary = form.querySelector("[data-form-summary]");
    var confirmBox = document.querySelector("[data-confirm]");

    /* Ako je posetilac došao iz kalkulatora, kategorija je već izabrana */
    var params = new URLSearchParams(window.location.search);
    var kat = params.get("kategorija");
    if (kat) {
      var sel = form.querySelector("#kategorija");
      if (sel.querySelector('option[value="' + CSS.escape(kat) + '"]')) sel.value = kat;
    }

    function setError(fieldEl, errorId, message) {
      var wrap = fieldEl.closest(".field");
      var err = document.getElementById(errorId);
      if (message) {
        wrap.classList.add("has-error");
        err.textContent = message;
        err.hidden = false;
        if (fieldEl.setAttribute) fieldEl.setAttribute("aria-invalid", "true");
      } else {
        wrap.classList.remove("has-error");
        err.textContent = "";
        err.hidden = true;
        if (fieldEl.removeAttribute) fieldEl.removeAttribute("aria-invalid");
      }
      return !message;
    }

    var rules = {
      // Ime i prezime: bar dve reči odvojene razmakom, samo slova (i crtica ili apostrof)
      ime: function (v) {
        v = v.trim();
        if (!v) return "Upiši ime i prezime.";
        var parts = v.split(/\s+/);
        if (parts.length < 2) return "Upiši ime i prezime, odvojene razmakom.";
        var word = /^[A-Za-zČčĆćŽžŠšĐđ][A-Za-zČčĆćŽžŠšĐđ'-]*$/;
        for (var i = 0; i < parts.length; i++) {
          if (!word.test(parts[i])) return "Ime i prezime mogu da sadrže samo slova.";
          if (parts[i].replace(/['-]/g, "").length < 2) return "Ime i prezime moraju imati bar po dva slova.";
        }
        return "";
      },
      // Telefon: samo brojevi (dozvoljen je + na početku), 9 do 15 cifara
      telefon: function (v) {
        v = v.trim();
        if (!v) return "Upiši broj telefona da bismo mogli da te pozovemo.";
        if (!/^\+?\d+$/.test(v)) return "Upiši samo brojeve, bez razmaka i drugih znakova.";
        var digits = v.replace(/\D/g, "");
        if (digits.length < 9 || digits.length > 15) return "Broj nije ispravan. Primer: 0621234567 ili +381621234567.";
        return "";
      },
      email: function (v) {
        v = v.trim();
        if (!v) return "Upiši email adresu.";
        if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v)) return "Email adresa nije ispravna. Primer: ime@primer.rs";
        return "";
      },
      kategorija: function (v) {
        return v ? "" : "Izaberi kategoriju.";
      }
    };

    // U polje za telefon može da se upiše samo broj (i + na početku)
    var tel = form.elements.telefon;
    tel.addEventListener("input", function () {
      var cleaned = tel.value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
      if (cleaned !== tel.value) tel.value = cleaned;
    });

    function validateField(name) {
      var el = form.elements[name];
      return setError(el, name + "-greska", rules[name](el.value));
    }

    function validateTermin() {
      var any = form.querySelectorAll('input[name="termin"]:checked').length > 0;
      var first = form.querySelector('input[name="termin"]');
      return setError(first, "termin-greska", any ? "" : "Izaberi bar jedan termin.");
    }

    function validateSaglasnost() {
      var cb = form.elements.saglasnost;
      return setError(cb, "saglasnost-greska", cb.checked ? "" : "Bez saglasnosti ne možemo da te kontaktiramo.");
    }

    /* Provera polja kad korisnik izađe iz njega */
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      el.addEventListener("blur", function () {
        if (el.value || el.closest(".field").classList.contains("has-error")) validateField(name);
      });
      el.addEventListener("input", function () {
        if (el.closest(".field").classList.contains("has-error")) validateField(name);
      });
    });
    form.querySelectorAll('input[name="termin"]').forEach(function (cb) {
      cb.addEventListener("change", validateTermin);
    });
    form.elements.saglasnost.addEventListener("change", validateSaglasnost);

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var ok = true;
      ["ime", "telefon", "email", "kategorija"].forEach(function (name) {
        if (!validateField(name)) ok = false;
      });
      if (!validateTermin()) ok = false;
      if (!validateSaglasnost()) ok = false;

      if (!ok) {
        summary.hidden = false;
        var firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) firstError.focus();
        return;
      }
      summary.hidden = true;

      /*
        OVDE POVEŽI BACKEND.
        Primer:
        fetch(form.action, { method: "POST", body: new FormData(form) })
          .then(function () { showConfirm(); })
          .catch(function () { alert / poruka o grešci });
      */
      showConfirm();
    });

    function showConfirm() {
      var ime = form.elements.ime.value.trim().split(/\s+/)[0];
      confirmBox.querySelector("[data-confirm-name]").textContent = ime ? ", " + ime : "";
      confirmBox.querySelector("[data-confirm-phone]").textContent = form.elements.telefon.value.trim();
      form.hidden = true;
      confirmBox.hidden = false;
      confirmBox.focus();
      window.scrollTo({ top: confirmBox.getBoundingClientRect().top + window.pageYOffset - 100 });
    }
  }

  /* ---------- Pokretanje ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initScrollReveal();
    initRevealGroups();
    initCounters();
    initHighlights();
    initStepsReveal();
    initToTop();
    initFleetLightbox();
    initHeaderScroll();
    initTabs();
    initCalculator();
    initFaq();
    initCookies();
    initSignupForm();
  });
})();
