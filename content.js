// 1. Lista de dominios a bloquear (Puedes añadir Instagram u otros aquí)
const blockedSites = ["chatgpt.com", "gemini.google.com", "claude.ai", "instagram.com"];
const currentDomain = window.location.hostname;

// Verificar si estamos en un sitio que debe ser protegido
const isBlockedSite = blockedSites.some(site => currentDomain.includes(site));

if (isBlockedSite) {
    console.log(`AI Chat Locker: Bloqueando pantalla completa en ${currentDomain}`);

    // 2. Crear la "Cortina de Bloqueo" a pantalla completa
    const lockScreen = document.createElement("div");
    lockScreen.style.position = "fixed";
    lockScreen.style.top = "0";
    lockScreen.style.left = "0";
    lockScreen.style.width = "100vw";
    lockScreen.style.height = "100vh";
    lockScreen.style.backgroundColor = "rgba(0, 0, 0, 0.3)"; // Fondo oscuro translúcido
    lockScreen.style.backdropFilter = "blur(15px)"; // Desenfoque extremo
    lockScreen.style.webkitBackdropFilter = "blur(15px)";
    lockScreen.style.zIndex = "9999999"; // Asegura que esté por encima de todo
    lockScreen.style.display = "flex";
    lockScreen.style.flexDirection = "column";
    lockScreen.style.justifyContent = "center";
    lockScreen.style.alignItems = "center";
    lockScreen.style.fontFamily = "Arial, sans-serif";

    // 3. Crear la interfaz del PIN temporal
    lockScreen.innerHTML = `
        <h2 style="color: white; margin-bottom: 20px;">Sitio Protegido</h2>
        <input type="password" id="pinInput" placeholder="Ingresa tu PIN" 
                style="padding: 12px; font-size: 16px; border-radius: 8px; border: none; outline: none; text-align: center; width: 200px;">
        <button id="unlockBtn" 
                style="margin-top: 15px; padding: 12px 25px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold;">
            Desbloquear
        </button>
        <p id="errorMsg" style="color: #ff4d4d; margin-top: 15px; display: none; font-weight: bold;">PIN incorrecto</p>
    `;

    // Inyectar la cortina en la página
    document.body.appendChild(lockScreen);

    // Ocultar la barra de desplazamiento (scroll) del fondo
    document.body.style.overflow = "hidden";

    // 4. Lógica para desbloquear con el PIN quemado (Fase 1)
    document.getElementById("unlockBtn").addEventListener("click", () => {
        const enteredPin = document.getElementById("pinInput").value;
        const correctPin = "1234"; // Tu PIN temporal para pruebas

        if (enteredPin === correctPin) {
            lockScreen.remove(); // Quita la cortina
            document.body.style.overflow = "auto"; // Restaura el scroll de la página original
        } else {
            document.getElementById("errorMsg").style.display = "block";
            document.getElementById("pinInput").value = ""; // Limpia el input
        }
    });
} else {
    console.log("AI Chat Locker: Sitio no protegido.");
}