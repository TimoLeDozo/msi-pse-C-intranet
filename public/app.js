const logBox = document.getElementById("consoleLog");
const statusFill = document.getElementById("statusFill");
const statusText = document.getElementById("statusText");

function log(msg) {
  const li = document.createElement("li");
  li.textContent = "> " + msg;
  logBox.prepend(li);
}

document.getElementById("btnGenerate").addEventListener("click", async () => {
  log("Préparation…");

  const data = {
    titre: document.getElementById("titre").value,
    entrepriseNom: document.getElementById("entrepriseNom").value,
    ia_probleme: document.getElementById("ia_probleme").value,
    ia_solution: document.getElementById("ia_solution").value,
    ia_objectifs: document.getElementById("ia_objectifs").value,
  };

  statusText.textContent = "Analyse AI en cours…";

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const json = await res.json();

  if (json.success) {
    statusFill.style.width = "100%";
    statusText.textContent = "Terminé";

    document.getElementById("resultLinks").innerHTML = `
      <a href="${json.url}" target="_blank">Ouvrir DOCX</a>
      <a href="${json.pdfUrl}" target="_blank">Télécharger PDF</a>
    `;

    document.getElementById("modal").style.display = "grid";
  } else {
    log("Erreur : " + json.error);
  }
});
