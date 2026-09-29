const blockedSites = ["chatgpt.com", "gemini.google.com", "claude.ai", "instagram.com"];
const currentDomain = window.location.hostname;
const isBlockedSite = blockedSites.some(site => currentDomain.includes(site));

// Función para encriptar el PIN con SHA-256
async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    const extraOptionsHTML = !isSetupMode ? `
        <div style="margin-top: 25px; display: flex; justify-content: center;">
            <span id="changePinBtn" style="color: #e5e7eb; cursor: pointer; text-decoration: underline; font-size: 14px;">Cambiar PIN</span>
        </div>
    ` : "";

    lockScreen.innerHTML = `
        <h2 style="color: white; margin-bottom: 20px;">${titleText}</h2>
        <input type="password" id="pinInput" placeholder="Ingresa tu PIN" style="padding: 12px; font-size: 16px; border-radius: 8px; border: none; outline: none; text-align: center; width: 200px;">
        <button id="actionBtn" style="margin-top: 15px; padding: 12px 25px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold;">
            ${btnText}
        </button>
        <p id="errorMsg" style="color: #ff4d4d; margin-top: 15px; display: none; font-weight: bold;">PIN incorrecto</p>
        ${extraOptionsHTML}
    `;

    document.body.appendChild(lockScreen);
    document.body.style.overflow = "hidden";

    // Auto-focus persistente (Combate la carga dinámica de la IA)
    const pinInput = document.getElementById("pinInput");
    pinInput.focus();

    // Obligamos al cursor a quedarse en el input durante los primeros 1.5 segundos
    // mientras la IA de fondo termina de cargar sus elementos.
    const mantenerFoco = setInterval(() => {
        if (document.activeElement !== pinInput) {
            pinInput.focus();
        }
    }, 100);

    // Detenemos el bucle después de 1.5 segundos para no consumir memoria del navegador
    setTimeout(() => {
        clearInterval(mantenerFoco);
    }, 1500);

    // Extraemos la lógica de procesar el PIN a una función interna para reutilizarla
    async function procesarPIN() {
        const enteredPin = pinInput.value;
        const errorMsg = document.getElementById("errorMsg");

        if (isSetupMode) {
            if (enteredPin.length >= 4) {
                const hashedNewPin = await hashPIN(enteredPin);
                chrome.storage.local.set({ 'userPin': hashedNewPin }, function() {
                    alert("PIN guardado de forma segura en tu navegador.");
                    location.reload();
                });
            } else {
                errorMsg.innerText = "El PIN debe tener al menos 4 caracteres";
                errorMsg.style.display = "block";
            }
        } else {
            const hashedEnteredPin = await hashPIN(enteredPin);
            if (hashedEnteredPin === storedPin) {
                lockScreen.remove();
                document.body.style.overflow = "auto";
            } else {
                errorMsg.innerText = "PIN incorrecto";
                errorMsg.style.display = "block";
                pinInput.value = "";
            }
        }
    }

    // Evento al hacer click en el botón
    document.getElementById("actionBtn").addEventListener("click", procesarPIN);

    // Evento para escuchar la tecla Enter en el campo de texto
    pinInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            procesarPIN();
        }
    });

    // Lógica para Cambiar PIN (Asíncrona)
    if (!isSetupMode) {
        document.getElementById("changePinBtn").addEventListener("click", async () => {
            const current = prompt("Por seguridad, ingresa tu PIN actual:");
            if (current) {
                const hashedCurrent = await hashPIN(current);
                if (hashedCurrent === storedPin) {
                    const newPin = prompt("Ingresa tu NUEVO PIN (mínimo 4 caracteres):");
                    if (newPin && newPin.length >= 4) {
                        const hashedNew = await hashPIN(newPin);
                        chrome.storage.local.set({ 'userPin': hashedNew }, () => {
                            alert("PIN actualizado correctamente.");
                            location.reload();
                        });
                    } else {
                        alert("El PIN debe tener al menos 4 caracteres. Intenta de nuevo.");
                    }
                } else {
                    alert("PIN actual incorrecto.");
                }
            }
        });
    }
}
