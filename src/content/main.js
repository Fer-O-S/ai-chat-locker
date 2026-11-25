(() => {
    // early.css oculta la página mientras este atributo no valga "unlocked"
    const ATTRIBUTE = "data-ai-chat-locker";
    const UNLOCKED = "unlocked";

    let locked = true;
    let observedRoot = null;
    const lockScreen = ACL.createLockScreen({ onUnlock: unlock });
    const monitor = ACL.createInactivityMonitor({ onExpire: lock });

    function sync() {
        const html = document.documentElement;
        if (!html) return;
        const isUnlocked = html.getAttribute(ATTRIBUTE) === UNLOCKED;
        if (locked && isUnlocked) html.removeAttribute(ATTRIBUTE);
        if (!locked && !isUnlocked) html.setAttribute(ATTRIBUTE, UNLOCKED);
        if (locked) lockScreen.ensure();
    }

    async function refreshScreen() {
        for (const delay of [0, 300, 1000]) {
            if (delay) await new Promise(resolve => setTimeout(resolve, delay));
            const status = await ACL.send({ type: "status" });
            if (!locked) return;
            if (status.ok) {
                monitor.setMinutes(status.minutes);
                if (status.hasPin) lockScreen.renderUnlock(status.retryAfterMs);
                else lockScreen.renderSetup();
                return;
            }
        }
        lockScreen.renderUnavailable();
    }

    function lock() {
        if (locked) return;
        locked = true;
        monitor.stop();
        lockScreen.renderLoading();
        lockScreen.show();
        sync();
        refreshScreen();
    }

    function unlock() {
        locked = false;
        sync();
        lockScreen.hide();
        monitor.start();
    }

    // Mientras está bloqueado, el sitio no recibe las teclas del PIN. Este listener se
    // registra antes que los del sitio porque el script corre en document_start.
    const guardedEvents = [
        "keydown", "keypress", "keyup", "beforeinput", "input", "paste", "copy", "cut",
        "compositionstart", "compositionupdate", "compositionend"
    ];
    for (const type of guardedEvents) {
        window.addEventListener(type, event => {
            if (!locked) return;
            event.stopImmediatePropagation();
            if (event.key === "Escape") event.preventDefault();
            // Si el foco se perdió, se recupera antes de que se escriba el carácter
            if (type === "keydown" && event.target !== lockScreen.host) lockScreen.focus();
            if (type === "input" && event.target === lockScreen.host) lockScreen.clearError();
        }, true);
    }

    window.addEventListener("pageshow", event => {
        // Al volver con el botón Atrás el navegador puede restaurar la página ya desbloqueada
        if (event.persisted) lock();
        else lockScreen.focus();
    });
    window.addEventListener("focus", () => lockScreen.focus());

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.inactivityMinutes) monitor.setMinutes(changes.inactivityMinutes.newValue);
        if (changes.lastActivity) monitor.remoteActivity(changes.lastActivity.newValue);
        if (changes.lockSignal) lock();
        // El PIN se acaba de crear desde otra pestaña o el popup
        if (changes.pinRecord && locked && lockScreen.isSetup()) refreshScreen();
    });

    const observer = new MutationObserver(() => {
        observeRoot();
        sync();
    });

    function observeRoot() {
        if (!document.documentElement || observedRoot === document.documentElement) return;
        observedRoot = document.documentElement;
        observer.observe(observedRoot, { childList: true, attributes: true, attributeFilter: [ATTRIBUTE] });
    }

    observer.observe(document, { childList: true });
    observer.observe(lockScreen.host, { attributes: true });
    observeRoot();

    lockScreen.renderLoading();
    lockScreen.show();
    refreshScreen();
})();
