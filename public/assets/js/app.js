/* eslint-disable no-alert */

(() => {
  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function fetchJson(url, { method = "POST", body, timeoutMs = 120000 } = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // JSON invalide côté serveur
        throw new Error(`Réponse non-JSON (${res.status}). Body: ${text?.slice(0, 400)}`);
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Timeout: le serveur met trop de temps à répondre.");
      }
      throw err;
    } finally {
      clearTimeout(t);
    }
  }

  // ---------- UI Logs ----------
  const logEl = $("consoleLog");
  const historyList = $("historyList");

  function log(msg) {
    if (!logEl) return;
    logEl.textContent = `${msg}\n${logEl.textContent}`;
  }

  function addHistory(msg) {
    if (!historyList) return;
    const li = document.createElement("li");
    li.className = "result-item";
    li.innerHTML = `<span>${msg}</span><br><small style="color:rgba(255,255,255,0.3); font-size:0.7em;">${new Date().toLocaleTimeString()}</small>`;
    historyList.prepend(li);
    if (historyList.children.length > 5) historyList.lastChild.remove();
  }

  // ---------- Upload ----------
  const fileInput = $("f_attachments");
  const attachmentsList = $("attachmentsList");
  const fileLabel = $("fileLabel");
  const filesHint = $("filesHint");
  const uploadContainer = $("uploadContainer");

  let selectedFiles = [];

  function bytesToBase64(dataUrl) {
    // data:xxx;base64,AAAA -> AAAA
    const idx = dataUrl.indexOf(",");
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  }

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Erreur lecture fichier: ${file.name}`));
      reader.onload = () =>
        resolve({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          bytes: bytesToBase64(reader.result),
          size: file.size,
        });
      reader.readAsDataURL(file);
    });

  function refreshFilesUI() {
    if (fileLabel) fileLabel.textContent = `${selectedFiles.length} fichier(s) choisi(s)`;
    if (filesHint) filesHint.textContent = selectedFiles.length
      ? `${selectedFiles.length} fichier(s) sélectionné(s) (max 15).`
      : "Aucun fichier sélectionné (0/15).";

    if (!attachmentsList) return;
    attachmentsList.innerHTML = "";
    selectedFiles.forEach((f) => {
      const li = document.createElement("li");
      li.className = "attachment-item";
      li.innerHTML = `<span>${f.name}</span> <span style="opacity:0.5">${(f.size / 1024).toFixed(1)} KB</span>`;
      attachmentsList.appendChild(li);
    });
  }

  function setupUpload() {
    if (uploadContainer && fileInput) {
      uploadContainer.addEventListener("click", () => fileInput.click());
    }

    if (!fileInput) return;

    fileInput.addEventListener("change", (e) => {
      const newFiles = Array.from(e.target.files || []);
      if (!newFiles.length) return;

      // simple cap à 15
      selectedFiles = selectedFiles.concat(newFiles).slice(0, 15);
      refreshFilesUI();
      addHistory(`${newFiles.length} documents ajoutés.`);
    });
  }

  // ---------- Token Estimation ----------
  function setupTokenEstimation() {
    document.body.addEventListener("input", () => {
      let chars = 0;
      ["f_titre", "f_ia_histoire", "f_ia_probleme", "f_ia_solution", "f_ia_objectifs"].forEach((id) => {
        const el = $(id);
        const v = el?.value || "";
        chars += v.length;
      });
      const est = Math.ceil(chars / 4);
      const tokenEl = $("tokenEstimate");
      if (tokenEl) tokenEl.textContent = `Estimation prompt ≈ ${est} tokens (limite 100000)`;
    });
  }

  // ---------- Dictation ----------
  function setupDictation() {
    const buttons = document.querySelectorAll(".dictation-button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const targetEl = $(targetId);
        const statusEl = $(`status-${targetId}`);

        if (!targetEl) return;

        if (!("webkitSpeechRecognition" in window)) {
          alert("Dictée non supportée par ce navigateur.");
          return;
        }

        const rec = new webkitSpeechRecognition();
        rec.lang = "fr-FR";
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        btn.classList.add("is-active");
        if (statusEl) statusEl.textContent = "ÉCOUTE...";

        rec.onresult = (e) => {
          const text = e.results?.[0]?.[0]?.transcript || "";
          targetEl.value += (targetEl.value ? " " : "") + text;
          if (statusEl) statusEl.textContent = "OK";
          btn.classList.remove("is-active");
          targetEl.dispatchEvent(new Event("input", { bubbles: true }));
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

  // ---------- Header scroll effect ----------
  function setupHeader() {
    const header = $("mainHeader");
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 40) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---------- Modals (generation) ----------
  function setModalState(state) {
    $("modalLoading").style.display = "none";
    $("modalSuccess").style.display = "none";
    $("modalError").style.display = "none";

    if (state === "loading") $("modalLoading").style.display = "flex";
    if (state === "success") $("modalSuccess").style.display = "flex";
    if (state === "error") $("modalError").style.display = "flex";
  }

  function openModal() {
    $("generationModal").style.display = "flex";
    setModalState("loading");
  }

  function closeModal() {
    $("generationModal").style.display = "none";
  }

  function updateModalProgress(pct, status) {
    $("modalProgressBar").style.width = `${pct}%`;
    $("modalPercentText").textContent = `${pct}%`;
    if (status) $("modalStatusText").textContent = status;
  }

  function showModal(title, message, progress) {
    $("generationModal").style.display = "flex";

    if (String(title).includes("Erreur") || String(title).includes("Error") || String(title).includes("❌")) {
      setModalState("error");
      const titleEl = document.querySelector("#modalError .modal-title");
      if (titleEl) titleEl.textContent = title;
      $("modalErrorText").textContent = message || "Une erreur est survenue.";
      return;
    }

    setModalState("loading");
    const titleEl = document.querySelector("#modalLoading .modal-title");
    if (titleEl) titleEl.textContent = title;
    updateModalProgress(progress ?? 0, message);
  }

  // ---------- Preview modal ----------
  function openPreviewModal(aiData) {
    $("previewModal").style.display = "flex";
    $("p_titre").value = aiData?.titre || "";
    $("p_contexte").value = aiData?.contexte || "";
    $("p_demarche").value = aiData?.demarche || "";
    $("p_phases").value = aiData?.phases || "";
    $("p_phrase").value = aiData?.phrase || "";
  }

  function closePreviewModal() {
    $("previewModal").style.display = "none";
  }

  // ---------- Data builders ----------
  function buildBaseData() {
    return {
      titre: $("f_titre").value,
      thematique: $("f_thematique").value,
      entrepriseNom: $("f_entrepriseNom").value,
      codeProjet: $("f_codeProjet").value,
      dateDebut: $("f_dateDebut").value,
      nbEquipes: $("f_nbEquipes").value,
      dureeSemaines: $("f_dureeSemaines").value,
      entrepriseLogo: $("f_entrepriseLogo").value,
      entrepriseAdresse: $("f_entrepriseAdresse").value,
      clientNom: $("f_clientNom").value,
      clientFonction: $("f_clientFonction").value,
      clientEmail: $("f_clientEmail").value,

      ia_histoire: $("f_ia_histoire").value,
      ia_lieux: $("f_ia_lieux").value,
      ia_probleme: $("f_ia_probleme").value,
      ia_solution: $("f_ia_solution").value,
      ia_objectifs: $("f_ia_objectifs").value,

      contexte: $("f_contexte").value,
      demarche: $("f_demarche").value,
      phases: $("f_phases").value,
      phrase: $("f_phrase").value,
    };
  }

  async function maybeAttachFiles(data) {
    if (!selectedFiles.length) return data;
    log("Traitement fichiers...");
    const attachments = await Promise.all(selectedFiles.map(readFile));
    return { ...data, attachments };
  }

  // ---------- Validation Helper ----------
  const REQUIRED_FIELDS = [
    { id: 'f_titre', message: 'Le titre du projet est requis' },
    { id: 'f_entrepriseNom', message: "Le nom de l'entreprise est requis" },
    { id: 'f_ia_probleme', message: 'Décrivez le problème principal à résoudre' }
  ];

  function clearValidationErrors() {
    REQUIRED_FIELDS.forEach(({ id }) => {
      const field = $(id);
      const errorEl = $(`error-${id}`);
      if (field) {
        field.classList.remove('invalid', 'valid');
      }
      if (errorEl) {
        errorEl.classList.remove('visible');
      }
    });
  }

  function showFieldError(fieldId, message) {
    const field = $(fieldId);
    const errorEl = $(`error-${fieldId}`);
    if (field) {
      field.classList.add('invalid');
      field.classList.remove('valid');
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field.focus();
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function validateForm() {
    clearValidationErrors();
    
    for (const { id, message } of REQUIRED_FIELDS) {
      const field = $(id);
      const value = field?.value?.trim();
      
      if (!value) {
        showFieldError(id, message);
        log(`Validation: ${message}`);
        return false;
      } else {
        field.classList.add('valid');
      }
    }
    
    return true;
  }

  // Add real-time validation on blur
  function setupRealTimeValidation() {
    REQUIRED_FIELDS.forEach(({ id, message }) => {
      const field = $(id);
      if (!field) return;
      
      field.addEventListener('blur', () => {
        const value = field.value?.trim();
        const errorEl = $(`error-${id}`);
        
        if (!value) {
          field.classList.add('invalid');
          field.classList.remove('valid');
          if (errorEl) errorEl.classList.add('visible');
        } else {
          field.classList.remove('invalid');
          field.classList.add('valid');
          if (errorEl) errorEl.classList.remove('visible');
        }
      });
      
      // Clear error on input
      field.addEventListener('input', () => {
        const value = field.value?.trim();
        const errorEl = $(`error-${id}`);
        
        if (value) {
          field.classList.remove('invalid');
          if (errorEl) errorEl.classList.remove('visible');
        }
      });
    });
  }

  // ---------- Button Loading States ----------
  function setButtonLoading(btn, isLoading, originalText = null) {
    if (!btn) return;
    
    if (isLoading) {
      btn._originalText = btn.textContent;
      btn.classList.add('btn-loading', 'loading');
      btn.disabled = true;
      btn.textContent = '⏳ Génération...';
    } else {
      btn.classList.remove('btn-loading', 'loading');
      btn.disabled = false;
      btn.textContent = originalText || btn._originalText || btn.textContent;
    }
  }

  function setButtonSuccess(btn) {
    if (!btn) return;
    btn.classList.remove('btn-loading', 'loading');
    btn.classList.add('btn-success');
    btn.textContent = '✓ Terminé !';
    
    setTimeout(() => {
      btn.classList.remove('btn-success');
      btn.disabled = false;
      btn.textContent = btn._originalText || '✨ Lancer l\'IA & Prévisualiser';
    }, 2000);
  }

  // ---------- Preview flow ----------
  async function onPreview() {
    if (!validateForm()) {
      return;
    }

    const btn = $("btnPreview");
    setButtonLoading(btn, true);

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
      const base = buildBaseData();

      const data = await maybeAttachFiles({
        titre: base.titre,
        thematique: base.thematique,
        entrepriseNom: base.entrepriseNom,

        ia_histoire: base.ia_histoire,
        ia_lieux: base.ia_lieux,
        ia_probleme: base.ia_probleme,
        ia_solution: base.ia_solution,
        ia_objectifs: base.ia_objectifs,

        dureeSemaines: base.dureeSemaines,
        // + attachments si présents
      });

      const res = await fetchJson("/api/proposal/preview", { body: data, timeoutMs: 180000 });

      clearInterval(timer);

      if (res?.success) {
        showModal("Terminé", "Génération réussie !", 100);
        await sleep(500);
        closeModal();

        const cost = res?.cost?.totalUsd;
        if (typeof cost === "number") log(`Preview reçue. Coût: $${cost.toFixed(4)}`);
        else log("Preview reçue.");

        addHistory("Proposition IA reçue.");
        setButtonSuccess(btn);
        openPreviewModal(res.aiSections || {});
      } else {
        showModal("❌ Erreur", res?.error || "Erreur inconnue.", 100);
        log("Erreur Preview: " + (res?.error || "Erreur inconnue."));
        setButtonLoading(btn, false);
      }
    } catch (err) {
      clearInterval(timer);
      showModal("❌ Erreur", err?.message || String(err), 100);
      log("Crash Preview: " + (err?.message || String(err)));
      setButtonLoading(btn, false);
    }
  }

  // ---------- Generate flow ----------
  async function onGenerate() {
    const btn = $("btnGenerate");
    const statusMain = $("statusMain");
    const progressFill = $("progressFill");
    const resultLinks = $("resultLinks");

    if (!validateForm()) {
      return;
    }

    openModal();
    updateModalProgress(5, "Validation des données...");

    btn.disabled = true;
    btn.textContent = "⏳ GÉNÉRATION EN COURS...";
    statusMain.textContent = "Initialisation...";
    statusMain.style.color = "";
    progressFill.style.width = "10%";
    resultLinks.style.display = "none";

    addHistory("Création document...");
    log("Préparation création (Doc/PDF)...");

    try {
      let data = buildBaseData();
      data = await maybeAttachFiles(data);

      statusMain.textContent = "Génération Document...";
      updateModalProgress(30, "Création & finalisation...");
      progressFill.style.width = "40%";

      // Simulation progression visuelle jusqu'à 90
      let p = 40;
      const interval = setInterval(() => {
        if (p < 90) {
          p++;
          progressFill.style.width = `${p}%`;
          updateModalProgress(p, "Export PDF & Finalisation...");
        }
      }, 300);

      const res = await fetchJson("/api/proposal/generate", { body: data, timeoutMs: 240000 });

      clearInterval(interval);
      progressFill.style.width = "100%";
      updateModalProgress(100, "Terminé !");
      btn.disabled = false;
      btn.textContent = "✨ GÉNÉRER LA PROPALE";

      if (res?.success) {
        statusMain.textContent = "Succès !";
        statusMain.style.color = "#00ff99";

        addHistory("Document créé avec succès.");
        log("Document OK.");

        $("docLink").href = res.url;
        $("pdfLink").href = res.pdfUrl;
        resultLinks.style.display = "grid";

        $("modalDocLink").href = res.url;
        $("modalPdfLink").href = res.pdfUrl;
        setModalState("success");
      } else {
        statusMain.textContent = "Erreur Serveur";
        statusMain.style.color = "#ff6b6b";
        log("Erreur: " + (res?.error || "Erreur inconnue."));
        $("modalErrorText").textContent = res?.error || "Erreur inconnue.";
        setModalState("error");
      }
    } catch (err) {
      progressFill.style.background = "red";
      btn.disabled = false;
      btn.textContent = "✨ GÉNÉRER LA PROPALE";

      statusMain.textContent = "Crash Critique";
      statusMain.style.color = "#ff6b6b";

      log("Crash: " + (err?.message || String(err)));
      $("modalErrorText").textContent = "Crash critique: " + (err?.message || String(err));
      setModalState("error");
    }
  }

  // ---------- Preview validation ----------
  function onValidatePreview() {
    $("f_titre").value = $("p_titre").value;
    $("f_contexte").value = $("p_contexte").value;
    $("f_demarche").value = $("p_demarche").value;
    $("f_phases").value = $("p_phases").value;
    $("f_phrase").value = $("p_phrase").value;

    closePreviewModal();

    log("Contenu IA validé. Lancement génération...");
    addHistory("Validation IA & Génération...");

    onGenerate();
  }

  // ---------- Bindings ----------
  function setupButtons() {
    $("btnPreview")?.addEventListener("click", onPreview);
    $("btnGenerate")?.addEventListener("click", onGenerate);

    $("btnValidatePreview")?.addEventListener("click", onValidatePreview);
    $("btnBackToBrief")?.addEventListener("click", closePreviewModal);

    $("btnClosePreview")?.addEventListener("click", closePreviewModal);
    $("btnClosePreviewModal")?.addEventListener("click", closePreviewModal);

    $("btnCloseGeneration")?.addEventListener("click", closeModal);
    $("btnCloseModal")?.addEventListener("click", closeModal);
    $("btnCloseGenerationModal")?.addEventListener("click", closeModal);
    $("btnCloseModalError")?.addEventListener("click", closeModal);

    // Bouton Réessayer dans la modale d'erreur
    $("btnRetryGeneration")?.addEventListener("click", () => {
      closeModal();
      log("Nouvelle tentative de génération...");
      addHistory("Réessai de génération...");
      // Petit délai pour laisser la modale se fermer
      setTimeout(() => onPreview(), 300);
    });

    // UX: bouton init console
    $("btnInitConsole")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector("#console")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // ---------- Init ----------
  function init() {
    setupHeader();
    setupUpload();
    setupTokenEstimation();
    setupDictation();
    setupRealTimeValidation();
    setupButtons();
    refreshFilesUI();
    log("Front chargé. Endpoints attendus: POST /api/proposal/preview & /api/proposal/generate");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
