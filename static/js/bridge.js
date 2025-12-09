/* static/js/bridge.js */
console.log("🌉 Bridge Intranet activé : Mode Python Server");

// Simulation de l'objet google.script.run
const google = {
  script: {
    run: {
      withSuccessHandler: function(onSuccess) {
        this._onSuccess = onSuccess;
        return this;
      },
      withFailureHandler: function(onFailure) {
        this._onFailure = onFailure;
        return this;
      },
      
      // --- Méthodes appelées par ton Front ---

      // 1. Générer la propale
      generateFullProposal: function(formData) {
        console.log("🚀 Envoi vers Python...", formData);
        
        // Afficher un loader si besoin (géré par le front normalement)
        
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
          if(data.error) throw new Error(data.error);
          if (this._onSuccess) this._onSuccess(data);
        })
        .catch(err => {
          console.error("Erreur Python:", err);
          if (this._onFailure) this._onFailure(err);
        });
      },

      // 2. Estimation coût (Bouchonné pour le local/intranet = 0€)
      estimateAndLogCost_public: function(data) {
        const fakeCost = {
            est: { total: 0, input: {tokens:0}, output: {tokens:0}, model: "Server-Local" },
            estimatedDurationMs: 1500
        };
        if (this._onSuccess) this._onSuccess(fakeCost);
      },

      // 3. Récupérer URL Logs (Inutile en local)
      getCostLogUrl_public: function() {
        if (this._onSuccess) this._onSuccess("#");
      },

      // 4. Récupérer le Logo
      getIcamLogoDataUrl: function() {
        // Renvoie le chemin relatif statique
        if (this._onSuccess) this._onSuccess("/static/assets/logo.png");
      }
    }
  }
};