// Constantes y utilidades compartidas por el content script, el popup y el service worker.
globalThis.ACL = {
    MIN_PIN_LENGTH: 6,
    MAX_PIN_LENGTH: 64,

    // 0 = bloquear solo al recargar
    MINUTE_OPTIONS: [0, 1, 5, 10, 15, 30, 60],
    MAX_MINUTES: 120,

    // Al quinto fallo seguido hay que esperar; la espera se duplica con cada fallo extra
    FREE_ATTEMPTS: 5,
    BASE_WAIT_MS: 30 * 1000,
    MAX_WAIT_MS: 15 * 60 * 1000
};

// Las versiones anteriores permitían cualquier número, incluso uno que desbordaba setTimeout
ACL.normalizeMinutes = function (value) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.min(Math.max(1, Math.round(value)), ACL.MAX_MINUTES);
};

ACL.minutesLabel = function (minutes) {
    return minutes === 0 ? "Al recargar" : `${minutes} min`;
};

ACL.validateNewPin = function (pin) {
    if (typeof pin !== "string" || pin.length < ACL.MIN_PIN_LENGTH) {
        return `Usa al menos ${ACL.MIN_PIN_LENGTH} caracteres.`;
    }
    if (pin.length > ACL.MAX_PIN_LENGTH) {
        return `Usa como máximo ${ACL.MAX_PIN_LENGTH} caracteres.`;
    }
    return null;
};

// Envía un mensaje al service worker. Nunca rechaza: los fallos llegan como { ok: false }
ACL.send = async function (message) {
    try {
        const response = await chrome.runtime.sendMessage(message);
        return response || { ok: false, reason: "unavailable" };
    } catch (error) {
        return { ok: false, reason: "unavailable" };
    }
};

ACL.errorText = function (response) {
    switch (response.reason) {
        case "wrong-pin":
            return response.attemptsLeft === 1
                ? "PIN incorrecto. Te queda 1 intento."
                : `PIN incorrecto. Te quedan ${response.attemptsLeft} intentos.`;
        case "invalid-pin":
            return response.message;
        case "pin-exists":
            return "Ya hay un PIN configurado. Recarga la página.";
        case "no-pin":
            return "Aún no hay un PIN configurado. Recarga la página.";
        default:
            return "No se pudo conectar con la extensión. Recarga la página.";
    }
};
