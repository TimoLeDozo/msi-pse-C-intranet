/* eslint-disable no-alert */
(() => {
  // =========================
  // CONFIG
  // =========================
  const API = {
    preview: "/api/preview",
    generate: "/api/generate",
  };

  const LIMITS = {
    maxFiles: 15,
    // maxTotalBytes: 5 * 1024 * 1024, // (désactivé dans ton monofichier)
  };

  // =========================
  // DOM HELPERS
  // =========================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // =========================
  // ELEMENTS
  // =========================
  const header = $("#mainHeader");

  const logEl = $("#consoleLog");
  const historyList = $("#historyList");

  const fileInput = $("#f_attachments");
  const uploadContainer = $("#uploadContainer");
  const attachmentsList = $("#attachmentsList");
  const fileLabel = $("#fileLabel");
  const filesHint = $("#filesHint");
  let selectedFiles = [];

  const tokenEstimate = $("#tokenEstimate");

  const btnPreview = $("#btnPreview");
  const btnGenerate = $("#btnGenerate"); // hidden but used programmatically

  const statusMain = $("#statusMain");
  const progressFill = $("#progressFill");
  const resultLinks = $("#resultLinks");
  const docLink = $("#docLink");
  const pdfLink = $("#pdfLink");

  // Generation modal
  const generationModal = $("#generationModal");
  const modalLoading = $("#modalLoading");
  const modalSuccess = $("#modalSuccess");
  const modalError = $("#modalError");
  const modalStatusText = $("#modalStatusText");
  const modalPercentText = $("#modalPercentText");
  const modalProgressBar = $("#modalProgressBar");
  const modalErrorText = $("#modalErrorText");
  const modalDocLink = $("#modalDocLink");
  const modalPdfLink = $("#modalPdfLink");

  const btnCloseGenerationModal = $("#btnCloseGenerationModal");
  const btnCloseModalError = $("#btnCloseModalError");

  // Preview modal
  const previewModal = $("#previewModal");
  const btnClosePreviewModal = $("#btnClosePreviewModal");
  const btnBackToBrief = $("#btnBackToBrief");
  const btnValidatePreview = $("#btnValidatePreview");

  const p_titre = $("#p_titre");
  const p_contexte = $("#p_contexte");
  const p_demarche = $("#p_demarche");
  const p_phases = $("#p_phases");
  const p_phrase = $("#p_phrase");

  // Form inputs used for token estimation
  const tokenFields = ["f_titre", "f_ia_histoire", "f_ia_probleme", "f_ia_solution", "f_ia_objectifs"];

  // =========================
  // UI UTILS
  // =========================
  function log(msg) {
    if (!logEl) return;
    logEl.textContent = `${msg}\n${logEl.textContent}`;
  }

  function addHistory(msg) {
    if (!historyList) return;

    const placeholder = historyList.querySelector(".result-item.is-placeholder");
    if (placeholder) placeholder.remove();

    const li = document.createElement("li");
    li.className = "result-item";
    li.innerHTML = `
      <span>${escapeHtml(msg)}</span><br>
      <small style="color:rgba(255,255,255,0.3); font-size:0.7em;">${new Date().toLocaleTimeString()}</small>
    `;
    historyList.prepend(li);

    // keep last 5
    while (historyList.children.length > 5) {
      historyList.lastChild.remove();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(text, color = null) {
    if (!statusMain) return;
    statusMain.textContent = text;
    if (color) statusMain.style.color = color;
    else statusMain.style.color = "";
  }

  function setSidebarProgress(pct) {
    if (!progressFill) return;
    progressFill.style.width = `${pct}%`;
  }

  function setResultLinksVisible(visible) {
    if (!resultLinks) return;
    resultLinks.classList.toggle("is-visible", !!visible);
  }

  // =========================
  // MODAL UTILS
  // =========================
  function openGenerationModal() {
    if (!generationModal) return;
    generationModal.hidden = false;
    setModalState("loading");
  }

  function closeGenerationModal() {
    if (!generationModal) return;
    generationModal.hidden = true;
  }

  function setModalState(state) {
    // state: loading | success | error
    const show = (el, yes) => {
      if (!el) return;
      el.hidden = !yes;
    };

    show(modalLoading, state === "loading");
    show(modalSuccess, state === "success");
    show(modalError, state === "error");
  }

  function updateModalProgress(pct, status) {
    if (modalProgressBar) modalProgressBar.style.width = `${pct}%`;
    if (modalPercentText) modalPercentText.textContent = `${pct}%`;
    if (status && modalStatusText) modalStatusText.textContent = status;
  }

  /**
   * Compatible avec ton ancien showModal:
   * - si title contient "Erreur" ou "❌" => error state
   * - sinon => loading state
   */
  function showModal(title, message, progress) {
    openGenerationModal();

    const isError = String(title).includes("Erreur") || String(title).includes("Error") || String(title).includes("❌");

    if (isError) {
      setModalState("error");
      const titleEl = modalError?.querySelector(".modal-title");
      if (titleEl) titleEl.textContent = title;
      if (modalErrorText) modalErrorText.textContent = message || "Une erreur est survenue.";
      return;
    }

    setModalState("loading");
    const titleEl = modalLoading?.querySelector(".modal-title");
    if (titleEl) titleEl.textContent = title || "Neural Engine";
    updateModalProgress(Number.isFinite(progress) ? progress : 0, message || "...");
  }

  // Preview modal
  function openPreviewModal(aiData) {
    if (!previewModal) return;
    previewModal.hidden = false;

    if (aiData) {
      p_titre.value = aiData.titre || "";
      p_contexte.value = aiData.contexte || "";
      p_demarche.value = aiData.demarche || "";
      p_phases.value = aiData.phases || "";
      p_phrase.value = aiData.phrase || "";
    }
  }

  function closePreviewModal() {
    if (!previewModal) return;
    previewModal.hidden = true;
  }

  // =========================
  // API UTILS
  // =========================
  async function postJson(url, payload, { timeoutMs = 120000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = isJson ? (body?.error || body?.message || JSON.stringify(body)) : body;
        throw new Error(msg || `HTTP ${res.status}`);
      }

      return body;
    } finally {
      clearTimeout(t);
    }
  }

  // =========================
  // FILES
  // =========================
  function refreshFilesUI() {
    fileLabel.textContent = selectedFiles.length ? `${selectedFiles.length} fichier(s) choisi(s)` : "Aucun fichier choisi";
    filesHint.textContent = selectedFiles.length
      ? `${selectedFiles.length} fichier(s) sélectionné(s) (${selectedFiles.length}/${LIMITS.maxFiles}).`
      : `Aucun fichier sélectionné (0/${LIMITS.maxFiles}).`;

    attachmentsList.innerHTML = "";
    selectedFiles.forEach((f) => {
      const li = document.createElement("li");
      li.className = "attachment-item";
      li.innerHTML = `<span>${escapeHtml(f.name)}</span> <span style="opacity:0.5">${(f.size / 1024).toFixed(1)} KB</span>`;
      attachmentsList.appendChild(li);
    });
  }

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : "";
        resolve({ name: file.name, mimeType: file.type, bytes: base64 });
      };
      reader.readAsDataURL(file);
    });

  // =========================
  // TOKEN ESTIMATION
  // =========================
  function updateTokenEstimate() {
    let chars = 0;
    tokenFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.value) chars += String(el.value).length;
    });

    const est = Math.ceil(chars / 4);
    if (tokenEstimate) tokenEstimate.textContent = `Estimation prompt ≈ ${est} tokens (limite 100000)`;
  }

  // =========================
  // DICTATION
  // =========================
  function initDictationButtons() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    $$(".dictation-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        const statusEl = document.getElementById(`status-${targetId}`);

        if (!SpeechRecognition) {
          alert("Dictée non supportée par ce navigateur.");
          return;
        }

        const rec = new SpeechRecognition();
        rec.lang = "fr-FR";

        btn.classList.add("is-active");
        if (statusEl) statusEl.textContent = "ÉCOUTE...";

        rec.onresult = (e) => {
          const text = e.results?.[0]?.[0]?.transcript || "";
          if (targetEl) targetEl.value += (targetEl.value ? " " : "") + text;
          if (statusEl) statusEl.textContent = "OK";
          btn.classList.remove("is-active");
          updateTokenEstimate();
        };

        rec.onerror = () => {
          if (statusEl) statusEl.textContent = "ERREUR";
          btn.classList.remove("is-active");
        };

        rec.onend = () => {
          btn.classList.remove("is-active");
        };

        rec.start();
      });
    });
  }

  // =========================
  // PAYLOAD BUILDERS
  // =========================
  function buildPreviewPayload() {
    return {
      titre: $("#f_titre").value,
      thematique: $("#f_thematique").value,
      entrepriseNom: $("#f_entrepriseNom").value,

      ia_histoire: $("#f_ia_histoire").value,
      ia_lieux: $("#f_ia_lieux").value,
      ia_probleme: $("#f_ia_probleme").value,
      ia_solution: $("#f_ia_solution").value,
      ia_objectifs: $("#f_ia_objectifs").value,

      dureeSemaines: $("#f_dureeSemaines").value,
    };
  }

  function buildGeneratePayload() {
    return {
      titre: $("#f_titre").value,
      thematique: $("#f_thematique").value,
      entrepriseNom: $("#f_entrepriseNom").value,
      codeProjet: $("#f_codeProjet").value,
      dateDebut: $("#f_dateDebut").value,
      nbEquipes: $("#f_nbEquipes").value,
      dureeSemaines: $("#f_dureeSemaines").value,
      entrepriseLogo: $("#f_entrepriseLogo").value,
      entrepriseAdresse: $("#f_entrepriseAdresse").value,
      clientNom: $("#f_clientNom").value,
      clientFonction: $("#f_clientFonction").value,
      clientEmail: $("#f_clientEmail").value,

      ia_histoire: $("#f_ia_histoire").value,
      ia_lieux: $("#f_ia_lieux").value,
      ia_probleme: $("#f_ia_probleme").value,
      ia_solution: $("#f_ia_solution").value,
      ia_objectifs: $("#f_ia_objectifs").value,

      contexte: $("#f_contexte").value,
      demarche: $("#f_demarche").value,
      phases: $("#f_phases").value,
      phrase: $("#f_phrase").value,
    };
  }

  async function attachFilesIntoPayload(payload) {
    if (!selectedFiles.length) return payload;

    // Max files constraint
    if (selectedFiles.length > LIMITS.maxFiles) {
      alert(`Limite: ${LIMITS.maxFiles} fichiers max.`);
      selectedFiles = selectedFiles.slice(0, LIMITS.maxFiles);
      refreshFilesUI();
    }

    // (Optionnel) check total bytes (désactivé dans ton original)
    // const total = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    // if (total > LIMITS.maxTotalBytes) throw new Error("Taille totale PJ trop élevée.");

    payload.attachments = await Promise.all(selectedFiles.map(readFile));
    return payload;
  }

  // =========================
  // FLOWS
  // =========================
  async function runPreviewFlow() {
    const entreprise = $("#f_entrepriseNom").value;
    if (!entreprise) {
      alert("Erreur: Le nom de l'entreprise est requis pour l'IA.");
      return;
    }

    // Modal init + simulated progress to 90%
    showModal("🧠 Neural Engine", "Analyse du contexte et rédaction...", 0);

    let progress = 0;
    const timer = setInterval(() => {
      if (progress < 90) {
        progress += 0.45;
        updateModalProgress(Math.min(90, Math.round(progress)), "Analyse du contexte et rédaction...");
      }
    }, 200);

    addHistory("Démarrage pré-génération (Preview)...");
    log("Pré-génération (Preview) lancée...");

    try {
      let payload = buildPreviewPayload();
      payload = await attachFilesIntoPayload(payload);

      const res = await postJson(API.preview, payload);

      clearInterval(timer);

      if (res?.success) {
        showModal("Terminé", "Génération réussie !", 100);

        setTimeout(() => {
          closeGenerationModal();
          log(`Preview reçue. Coût: $${res?.cost?.totalUsd?.toFixed?.(4) ?? 0}`);
          addHistory("Proposition IA reçue.");
          openPreviewModal(res.aiSections);
        }, 500);

      } else {
        showModal("❌ Erreur", res?.error || "Erreur inconnue", 100);
        log("Erreur Preview: " + (res?.error || "Erreur inconnue"));
      }
    } catch (e) {
      clearInterval(timer);
      showModal("❌ Erreur", e?.message || String(e), 100);
      log("Crash Preview: " + (e?.message || String(e)));
    }
  }

  async function runGenerateFlow() {
    const titre = $("#f_titre").value;
    const entreprise = $("#f_entrepriseNom").value;

    if (!titre || !entreprise) {
      alert("Erreur: Titre et Entreprise requis.");
      return;
    }

    // UI init
    openGenerationModal();
    updateModalProgress(5, "Validation des données...");

    btnGenerate.disabled = true;
    setStatus("Initialisation...");
    setSidebarProgress(10);
    setResultLinksVisible(false);
    addHistory("Création document B2...");
    log("Préparation création PDF...");

    let payload;
    try {
      payload = buildGeneratePayload();

      if (selectedFiles.length > 0) {
        setStatus("Upload...");
        updateModalProgress(15, "Traitement des fichiers...");
        setSidebarProgress(20);
        payload = await attachFilesIntoPayload(payload);
        log(`${selectedFiles.length} fichiers inclus.`);
      }
    } catch (e) {
      btnGenerate.disabled = false;
      if (modalErrorText) modalErrorText.textContent = e?.message || "Erreur lecture fichier.";
      setModalState("error");
      log("Erreur lecture fichier: " + (e?.message || String(e)));
      return;
    }

    setStatus("Génération Document...");
    updateModalProgress(30, "Création Google Doc...");
    setSidebarProgress(40);

    // simulated progress (sidebar + modal) up to 90
    let p = 40;
    const interval = setInterval(() => {
      if (p < 90) {
        p += 1;
        setSidebarProgress(p);
        updateModalProgress(p, "Export PDF & Finalisation...");
      }
    }, 300);

    try {
      const res = await postJson(API.generate, payload);

      clearInterval(interval);
      setSidebarProgress(100);
      updateModalProgress(100, "Terminé !");
      btnGenerate.disabled = false;

      if (res?.success) {
        setStatus("Succès !", "#00ff99");
        addHistory("Document créé avec succès.");
        log("Document OK.");

        if (docLink) docLink.href = res.url;
        if (pdfLink) pdfLink.href = res.pdfUrl;
        setResultLinksVisible(true);

        if (modalDocLink) modalDocLink.href = res.url;
        if (modalPdfLink) modalPdfLink.href = res.pdfUrl;
        setModalState("success");

      } else {
        setStatus("Erreur Serveur", "#ff6b6b");
        const err = res?.error || "Erreur serveur";
        log("Erreur: " + err);
        if (modalErrorText) modalErrorText.textContent = err;
        setModalState("error");
      }

    } catch (e) {
      clearInterval(interval);
      btnGenerate.disabled = false;
      setStatus("Crash Critique", "#ff6b6b");
      log("Crash: " + (e?.message || String(e)));
      if (modalErrorText) modalErrorText.textContent = `Crash critique: ${e?.message || String(e)}`;
      setModalState("error");
    }
  }

  // =========================
  // EVENTS
  // =========================
  function initHeaderScroll() {
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initUpload() {
    if (!uploadContainer || !fileInput) return;

    // click container => open file picker
    const openPicker = () => fileInput.click();

    uploadContainer.addEventListener("click", openPicker);
    uploadContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openPicker();
    });

    fileInput.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files || []);

      // Concat comme ton original (accumule)
      selectedFiles = selectedFiles.concat(newFiles);

      // Trim to max
      if (selectedFiles.length > LIMITS.maxFiles) {
        selectedFiles = selectedFiles.slice(0, LIMITS.maxFiles);
        alert(`Limite atteinte : ${LIMITS.maxFiles} fichiers max. Les fichiers supplémentaires sont ignorés.`);
      }

      refreshFilesUI();
      addHistory(`${newFiles.length} documents ajoutés.`);
    });

    refreshFilesUI();
  }

  function initModalButtons() {
    btnCloseGenerationModal?.addEventListener("click", closeGenerationModal);
    btnCloseModalError?.addEventListener("click", closeGenerationModal);

    // click outside content to close (optional; conservateur -> non, pour éviter fermeture accidentelle)
    // generationModal?.addEventListener("click", (e) => {
    //   if (e.target === generationModal) closeGenerationModal();
    // });

    btnClosePreviewModal?.addEventListener("click", closePreviewModal);
    btnBackToBrief?.addEventListener("click", closePreviewModal);
  }

  function initPreviewValidation() {
    btnValidatePreview?.addEventListener("click", () => {
      // copy preview -> main form
      $("#f_titre").value = p_titre.value;
      $("#f_contexte").value = p_contexte.value;
      $("#f_demarche").value = p_demarche.value;
      $("#f_phases").value = p_phases.value;
      $("#f_phrase").value = p_phrase.value;

      closePreviewModal();
      log("Contenu IA validé. Lancement génération...");
      addHistory("Validation IA & Génération...");

      // trigger generation
      runGenerateFlow();
    });
  }

  function initTokenEstimator() {
    document.body.addEventListener("input", updateTokenEstimate);
    updateTokenEstimate();
  }

  // Buttons
  function initButtons() {
    btnPreview?.addEventListener("click", runPreviewFlow);
    btnGenerate?.addEventListener("click", runGenerateFlow);
  }

  // =========================
  // BOOT
  // =========================
  function boot() {
    initHeaderScroll();
    initUpload();
    initTokenEstimator();
    initDictationButtons();
    initModalButtons();
    initPreviewValidation();
    initButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
