// Vigila la inactividad y la comparte entre pestañas mediante storage (lastActivity).
ACL.createInactivityMonitor = function ({ onExpire }) {
    const BUSY_RETRY_MS = 5000;
    const MAX_BUSY_MS = 10 * 60 * 1000;
    const WRITE_EVERY_MS = 2000;

    let minutes = 0;
    let running = false;
    let last = 0;
    let lastWrite = 0;
    let busySince = 0;
    let timer = null;
    let pointer = "";

    // Verificación para no bloquear mientras la IA genera texto
    function isAIResponding() {
        if (location.hostname.endsWith("instagram.com")) return false;
        return Boolean(document.querySelector(
            'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="Detener"]'
        ));
    }

    function remaining() {
        return last + minutes * 60 * 1000 - Date.now();
    }

    function schedule(ms) {
        clearTimeout(timer);
        timer = setTimeout(check, ms);
    }

    function check() {
        clearTimeout(timer);
        if (!running || !minutes) return;

        const left = remaining();
        if (left > 0) {
            schedule(left);
            return;
        }
        if (isAIResponding()) {
            if (!busySince) busySince = Date.now();
            if (Date.now() - busySince < MAX_BUSY_MS) {
                schedule(BUSY_RETRY_MS);
                return;
            }
        }
        onExpire();
    }

    // Devuelve false si el plazo ya había vencido y se bloqueó
    // (por ejemplo, al mover el mouse tras suspender el equipo)
    function record(time) {
        if (minutes && remaining() <= 0 && !busySince) check();
        if (!running) return false;
        last = Math.max(last, Math.min(time, Date.now()));
        busySince = 0;
        check();
        return true;
    }

    function share() {
        if (!minutes || Date.now() - lastWrite < WRITE_EVERY_MS) return;
        lastWrite = Date.now();
        try {
            chrome.storage.local.set({ lastActivity: lastWrite }).catch(() => {});
        } catch (error) {
            // La extensión se actualizó y esta pestaña conserva el script anterior
        }
    }

    function onActivity(event) {
        if (!running || !event.isTrusted) return;
        if (event.type === "mousemove") {
            // El navegador también emite mousemove si la página se mueve bajo un cursor quieto
            const position = `${event.screenX},${event.screenY}`;
            if (position === pointer) return;
            pointer = position;
        }
        if (record(Date.now())) share();
    }

    // "wheel" en captura detecta el scroll de los contenedores internos del chat
    for (const type of ["mousemove", "pointerdown", "keydown", "wheel", "touchmove"]) {
        window.addEventListener(type, onActivity, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) check();
    });

    return {
        start() {
            running = true;
            last = Date.now();
            busySince = 0;
            share();
            check();
        },

        stop() {
            running = false;
            clearTimeout(timer);
        },

        setMinutes(value) {
            minutes = ACL.normalizeMinutes(value);
            last = Date.now();
            busySince = 0;
            check();
        },

        // Actividad en otra pestaña
        remoteActivity(time) {
            if (running && Number.isFinite(time)) record(time);
        }
    };
};
