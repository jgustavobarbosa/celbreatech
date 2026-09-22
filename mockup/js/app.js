(() => {
  const I = window.CelbreaI18n;
  const topTitle = document.getElementById("top-title");
  let wizardStep = 1;
  let padPositive = false;

  const known = [
    "celbrea",
    "torre",
    "triagem",
    "score",
    "referencia",
    "paciente",
    "navegador",
    "cohorts",
    "arquivo",
    "mensageria",
    "stub",
  ];

  function showView(name, stubName) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const view = document.getElementById(`view-${name}`);
    if (!view) return;
    view.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
      const isStub =
        name === "stub" && item.dataset.view === "stub" && item.dataset.stub === stubName;
      const isMatch = item.dataset.view === name && name !== "stub";
      item.classList.toggle("active", isMatch || isStub);
    });

    if (name === "stub" && stubName) {
      const el = document.getElementById("stub-title");
      if (el) el.textContent = `${I.t("stub.prefix")}: ${stubName}`;
      if (topTitle) topTitle.textContent = stubName;
    } else if (topTitle) {
      topTitle.textContent = I.titleForView(name);
      topTitle.setAttribute("data-i18n", `title.${name}`);
    }

    history.replaceState(null, "", `#${name}`);
    if (window.lucide) lucide.createIcons();
  }

  function setWizardStep(step) {
    wizardStep = Math.min(5, Math.max(1, step));
    document.querySelectorAll(".wizard-pane").forEach((p) => {
      p.classList.toggle("active", Number(p.dataset.pane) === wizardStep);
    });
    document.querySelectorAll("#wizard-steps .step-pill").forEach((pill) => {
      const n = Number(pill.dataset.step);
      pill.classList.toggle("on", n === wizardStep);
      pill.classList.toggle("done", n < wizardStep);
    });
  }

  function syncPadUI() {
    const reading = document.getElementById("pad-reading");
    const confirm = document.getElementById("confirm-result");
    const badge = document.getElementById("score-badge");
    const neg = document.getElementById("btn-neg");
    const pos = document.getElementById("btn-pos");
    if (reading) {
      reading.textContent = padPositive ? I.t("tri.readingPos") : I.t("tri.readingNeg");
    }
    if (confirm) confirm.textContent = padPositive ? I.t("tri.pos") : I.t("tri.neg");
    if (badge) {
      badge.textContent = padPositive ? I.t("score.badgePos") : I.t("score.badgeNeg");
      badge.className = padPositive ? "chip chip-alert" : "chip chip-ok";
    }
    if (neg) neg.classList.toggle("active-neg", !padPositive);
    if (pos) pos.classList.toggle("active-pos", padPositive);

    const ring = document.getElementById("score-ring");
    const num = document.getElementById("score-num");
    if (ring && num) {
      const score = padPositive ? 78 : 24;
      num.textContent = String(score);
      ring.style.background = `conic-gradient(${padPositive ? "var(--coral)" : "var(--success)"} 0 ${score}%, rgba(26,26,26,0.08) ${score}% 100%)`;
    }
  }

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.view === "stub") showView("stub", btn.dataset.stub);
      else showView(btn.dataset.view);
    });
  });

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.go));
  });

  document.querySelectorAll("[data-next-step]").forEach((btn) => {
    btn.addEventListener("click", () => setWizardStep(wizardStep + 1));
  });
  document.querySelectorAll("[data-prev-step]").forEach((btn) => {
    btn.addEventListener("click", () => setWizardStep(wizardStep - 1));
  });

  document.getElementById("btn-neg")?.addEventListener("click", () => {
    padPositive = false;
    syncPadUI();
  });
  document.getElementById("btn-pos")?.addEventListener("click", () => {
    padPositive = true;
    syncPadUI();
  });

  document.querySelectorAll(".hotspot").forEach((dot) => {
    dot.addEventListener("click", () => {
      dot.classList.toggle("on");
      if (document.querySelectorAll(".hotspot.on").length > 0) {
        padPositive = true;
        syncPadUI();
      }
    });
  });

  document.getElementById("btn-scan")?.addEventListener("click", () => {
    document.getElementById("qr-frame")?.classList.add("ok");
  });

  document.getElementById("btn-simular-birads")?.addEventListener("click", () => {
    const alertBox = document.getElementById("birads-alert");
    if (alertBox) alertBox.hidden = false;
  });

  document.getElementById("patient-tabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    const name = tab.dataset.tab;
    document.querySelectorAll("#patient-tabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll("#view-paciente .patient-panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      I.setLang(btn.dataset.lang);
      syncPadUI();
      const hash = (location.hash || "#celbrea").replace("#", "");
      if (known.includes(hash) && hash !== "stub" && topTitle) {
        topTitle.textContent = I.titleForView(hash);
      }
    });
  });

  window.addEventListener("celbrea:i18n", () => {
    syncPadUI();
    if (window.lucide) lucide.createIcons();
  });

  I.apply();
  const hash = (location.hash || "#celbrea").replace("#", "");
  showView(known.includes(hash) ? hash : "celbrea");
  setWizardStep(1);
  syncPadUI();
  if (window.lucide) lucide.createIcons();
})();
