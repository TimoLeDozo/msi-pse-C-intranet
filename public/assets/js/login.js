const form = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.style.display = "none";
  errorBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    window.location.href = "/";
    return;
  }

  errorBox.style.display = "block";
  errorBox.textContent = "Identifiants invalides.";
});
