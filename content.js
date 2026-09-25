const blockedSites = ["chatgpt.com", "gemini.google.com", "claude.ai", "instagram.com"];
const currentDomain = window.location.hostname;
const isBlockedSite = blockedSites.some(site => currentDomain.includes(site));

if (isBlockedSite) {
    // 1. Consultar la memoria del navegador para ver si ya hay un PIN
    chrome.storage.local.get(['userPin'], function(result) {
        const storedPin = result.userPin;
        crearPantallaBloqueo(storedPin);
    });
}

function crearPantallaBloqueo(storedPin) {
    const lockScreen = document.createElement("div");
    lockScreen.style.position = "fixed";
    lockScreen.style.top = "0";
    lockScreen.style.left = "0";
    lockScreen.style.width = "100vw";
    lockScreen.style.height = "100vh";
    lockScreen.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    lockScreen.style.backdropFilter = "blur(15px)";
    lockScreen.style.webkitBackdropFilter = "blur(15px)";
    lockScreen.style.zIndex = "9999999";
    lockScreen.style.display = "flex";
    lockScreen.style.flexDirection = "column";
    lockScreen.style.justifyContent = "center";
    lockScreen.style.alignItems = "center";
    lockScreen.style.fontFamily = "Arial, sans-serif";

    // 2. Definir si estamos en modo "Configuración" o "Desbloqueo"
    const isSetupMode = !storedPin; // Si storedPin es undefined, estamos en configuración
    const titleText = isSetupMode ? "⚙️ Configura tu nuevo PIN" : "🔒 Sitio Protegido";
    const btnText = isSetupMode ? "Guardar PIN" : "Desbloquear";

    lockScreen.innerHTML = `
        <h2 style="color: white; margin-bottom: 20px;">${titleText}</h2>
        <input type="password" id="pinInput" placeholder="Ingresa tu PIN" 
               style="padding: 12px; font-size: 16px; border-radius: 8px; border: none; outline: none; text-align: center; width: 200px;">
        <button id="actionBtn" 
                style="margin-top: 15px; padding: 12px 25px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold;">
            ${btnText}
        </button>
        <p id="errorMsg" style="color: #ff4d4d; margin-top: 15px; display: none; font-weight: bold;">PIN incorrecto</p>
    `;

    document.body.appendChild(lockScreen);
    document.body.style.overflow = "hidden";

    document.getElementById("actionBtn").addEventListener("click", () => {
        const enteredPin = document.getElementById("pinInput").value;
        const errorMsg = document.getElementById("errorMsg");

        if (isSetupMode) {
            // Guardar nuevo PIN
            if (enteredPin.length >= 4) {
                chrome.storage.local.set({ 'userPin': enteredPin }, function() {
                    lockScreen.remove();
                    document.body.style.overflow = "auto";
                    alert("✅ PIN guardado en tu navegador. Se te pedirá al recargar la página.");
                });
            } else {
                errorMsg.innerText = "El PIN debe tener al menos 4 caracteres";
                errorMsg.style.display = "block";
            }
        } else {
            // Validar PIN existente
            if (enteredPin === storedPin) {
                lockScreen.remove();
                document.body.style.overflow = "auto";
            } else {
                errorMsg.innerText = "PIN incorrecto";
                errorMsg.style.display = "block";
                document.getElementById("pinInput").value = "";
            }
        }
    });
}