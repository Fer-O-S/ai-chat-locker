const blockedSites = ["chatgpt.com", "gemini.google.com", "claude.ai", "instagram.com"];
const currentDomain = window.location.hostname;
const isBlockedSite = blockedSites.some(site => currentDomain.includes(site));

if (isBlockedSite) {
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

    const isSetupMode = !storedPin; 
    const titleText = isSetupMode ? "Configura tu nuevo PIN" : "Sitio Protegido";
    const btnText = isSetupMode ? "Guardar PIN" : "Desbloquear";

    // Solo mostramos "Cambiar PIN" si ya hay un PIN configurado
    const extraOptionsHTML = !isSetupMode ? `
        <div style="margin-top: 25px; display: flex; justify-content: center;">
            <span id="changePinBtn" style="color: #e5e7eb; cursor: pointer; text-decoration: underline; font-size: 14px;">Cambiar PIN</span>
        </div>
    ` : "";

    lockScreen.innerHTML = `
        <h2 style="color: white; margin-bottom: 20px;">${titleText}</h2>
        <input type="password" id="pinInput" placeholder="Ingresa tu PIN" 
               style="padding: 12px; font-size: 16px; border-radius: 8px; border: none; outline: none; text-align: center; width: 200px;">
        <button id="actionBtn" 
                style="margin-top: 15px; padding: 12px 25px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold;">
            ${btnText}
        </button>
        <p id="errorMsg" style="color: #ff4d4d; margin-top: 15px; display: none; font-weight: bold;">PIN incorrecto</p>
        ${extraOptionsHTML}
    `;

    document.body.appendChild(lockScreen);
    document.body.style.overflow = "hidden";

    // Lógica principal: Guardar o Desbloquear
    document.getElementById("actionBtn").addEventListener("click", () => {
        const enteredPin = document.getElementById("pinInput").value;
        const errorMsg = document.getElementById("errorMsg");

        if (isSetupMode) {
            if (enteredPin.length >= 4) {
                chrome.storage.local.set({ 'userPin': enteredPin }, function() {
                    alert("PIN guardado en tu navegador.");
                    location.reload();
                });
            } else {
                errorMsg.innerText = "El PIN debe tener al menos 4 caracteres";
                errorMsg.style.display = "block";
            }
        } else {
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

    // Lógica para Cambiar PIN
    if (!isSetupMode) {
        document.getElementById("changePinBtn").addEventListener("click", () => {
            const current = prompt("Por seguridad, ingresa tu PIN actual:");
            if (current === storedPin) {
                const newPin = prompt("Ingresa tu NUEVO PIN (mínimo 4 caracteres):");
                if (newPin && newPin.length >= 4) {
                    chrome.storage.local.set({ 'userPin': newPin }, () => {
                        alert("PIN actualizado correctamente.");
                        location.reload();
                    });
                } else {
                    alert("El PIN debe tener al menos 4 caracteres. Intenta de nuevo.");
                }
            } else if (current) {
                alert("PIN actual incorrecto.");
            }
        });
    }
}