const blockedSites = ["chatgpt.com", "gemini.google.com", "claude.ai", "instagram.com"];
const currentDomain = window.location.hostname;
const isBlockedSite = blockedSites.some(site => currentDomain.includes(site));

let inactivityTimer = null;
let currentInactivityLimitMs = 0; // 0 = Desactivado por defecto (Solo al recargar)

// Función para encriptar el PIN con SHA-256
async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verificación para no interrumpir a la IA mientras genera texto
function estaLaIARespondiendo() {
    const stopBtn = document.querySelector('button[data-testid="stop-button"]') || 
                    document.querySelector('button[aria-label*="Stop"]') || 
                    document.querySelector('button[aria-label*="Detener"]');
    return Boolean(stopBtn);
}

// Lógica del temporizador de inactividad
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);

    // Si el tiempo es 0 o no está definido, no se activa el auto-bloqueo
    if (!currentInactivityLimitMs || currentInactivityLimitMs === 0) return;

    inactivityTimer = setTimeout(() => {
        // Si la IA está respondiendo, posterga el bloqueo 5 segundos más
        if (estaLaIARespondiendo()) {
            console.log("AI Chat Locker: La IA está respondiendo. Reintentando en 5s...");
            resetInactivityTimer();
            return;
        }

        console.log("AI Chat Locker: Inactividad detectada. Recargando...");
        location.reload();
    }, currentInactivityLimitMs);
}

function iniciarDetectorInactividad(minutos) {
    if (!minutos || minutos === 0) return;

    currentInactivityLimitMs = minutos * 60 * 1000;

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });
    
    resetInactivityTimer();
}

if (isBlockedSite) {
    // Leemos el PIN y los minutos guardados (0 por defecto si es nuevo)
    chrome.storage.local.get(['userPin', 'inactivityMinutes'], function(result) {
        const storedPin = result.userPin;
        const savedMinutes = result.inactivityMinutes !== undefined ? result.inactivityMinutes : 0; // Por defecto: Solo al recargar
        crearPantallaBloqueo(storedPin, savedMinutes);
    });
}

function crearPantallaBloqueo(storedPin, savedMinutes) {
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

    // Opciones secundarias limpias (al lado una de la otra)
    const extraOptionsHTML = !isSetupMode ? `
        <div style="margin-top: 25px; display: flex; gap: 20px; align-items: center;">
            <span id="changePinBtn" style="color: #e5e7eb; cursor: pointer; text-decoration: underline; font-size: 14px;">Cambiar PIN</span>
            <span id="configTimeBtn" style="color: #e5e7eb; cursor: pointer; text-decoration: underline; font-size: 14px;">Tiempo (${savedMinutes === 0 ? 'Solo recargar' : savedMinutes + 'm'})</span>
        </div>
    ` : "";

    lockScreen.innerHTML = `
        <h2 style="color: white; margin-bottom: 20px;">${titleText}</h2>
        <input type="password" id="pinInput" placeholder="Ingresa tu PIN" style="padding: 12px; font-size: 16px; border-radius: 8px; border: none; outline: none; text-align: center; width: 200px;">
        
        <button id="actionBtn" style="margin-top: 20px; padding: 12px 25px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold;">
            ${btnText}
        </button>
        <p id="errorMsg" style="color: #ff4d4d; margin-top: 15px; display: none; font-weight: bold;">PIN incorrecto</p>
        ${extraOptionsHTML}
    `;

    document.body.appendChild(lockScreen);
    document.body.style.overflow = "hidden";

    // Auto-focus persistente
    const pinInput = document.getElementById("pinInput");
    pinInput.focus();

    const mantenerFoco = setInterval(() => {
        if (document.activeElement !== pinInput) {
            pinInput.focus();
        }
    }, 100);

    setTimeout(() => {
        clearInterval(mantenerFoco);
    }, 1500);

    async function procesarPIN() {
        const enteredPin = pinInput.value;
        const errorMsg = document.getElementById("errorMsg");

        if (isSetupMode) {
            if (enteredPin.length >= 4) {
                const hashedNewPin = await hashPIN(enteredPin);
                // Guardamos el PIN y aseguramos '0' como tiempo inicial por defecto
                chrome.storage.local.set({ 
                    'userPin': hashedNewPin,
                    'inactivityMinutes': 0 
                }, function() {
                    alert("PIN guardado de forma segura.");
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

                // Iniciar el detector de inactividad con los minutos guardados
                iniciarDetectorInactividad(savedMinutes);
            } else {
                errorMsg.innerText = "PIN incorrecto";
                errorMsg.style.display = "block";
                pinInput.value = "";
            }
        }
    }

    document.getElementById("actionBtn").addEventListener("click", procesarPIN);

    pinInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            procesarPIN();
        }
    });

    if (!isSetupMode) {
        // Lógica para Cambiar PIN
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
                        alert("El PIN debe tener al menos 4 caracteres.");
                    }
                } else {
                    alert("PIN actual incorrecto.");
                }
            }
        });

        // Lógica para Ajustar el Tiempo de Inactividad
        document.getElementById("configTimeBtn").addEventListener("click", () => {
            const inputMin = prompt("Minutos de inactividad antes de bloquear:\n\n- Escribe 0 para bloquear SOLO al recargar.\n- Escribe 1, 5, 10, etc. para minutos de inactividad.", savedMinutes);
            
            if (inputMin !== null) {
                const newMinutes = parseInt(inputMin, 10);
                if (!isNaN(newMinutes) && newMinutes >= 0) {
                    chrome.storage.local.set({ 'inactivityMinutes': newMinutes }, () => {
                        alert(`Configuración actualizada: ${newMinutes === 0 ? "Solo al recargar" : newMinutes + " min de inactividad"}`);
                        location.reload();
                    });
                } else {
                    alert("Por favor, ingresa un número válido (0 o mayor).");
                }
            }
        });
    }
}