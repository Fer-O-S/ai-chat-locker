(() => {
    // early.css oculta la página mientras este atributo no valga "unlocked"
    const ATTRIBUTE = "data-ai-chat-locker";
    const UNLOCKED = "unlocked";
    const WHOLE_SITE = "site";

    // null en los sitios que siempre se bloquean completos
    const site = ACL.siteByHost(location.hostname);
    // null hasta conocer la configuración; mientras tanto la página sigue bloqueada
    let settings = null;
    let locked = true;
    // Qué se desbloqueó con el PIN: el sitio o un chat concreto
    let unlockedScope = null;
    // Puede haber contenido de un chat protegido detrás de la pantalla de bloqueo
    let hidesProtectedChat = false;
    let reloading = false;
    let observedRoot = null;

    const lockScreen = ACL.createLockScreen({ onUnlock: unlock });
    const monitor = ACL.createInactivityMonitor({ onExpire: lockIfNeeded });
    const chatList = site ? ACL.createChatListGuard() : null;

    // Devuelve qué hay que desbloquear para ver esa dirección, o null si es pública
    function scopeFor(href) {
        if (!site || !settings || settings.mode !== "chats") return WHOLE_SITE;
        const id = ACL.findProtectedChat(site, settings.chats, new URL(href));
        return id ? `chat:${id}` : null;
    }

    function applySettings(mode, chats) {
        settings = { mode: ACL.normalizeMode(mode), chats: Array.isArray(chats) ? chats : [] };
        if (chatList) {
            const ids = settings.chats.filter(chat => chat.site === site.name).map(chat => chat.id);
            chatList.update(settings.mode === "chats" ? ids : []);
        }
    }

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
                applySettings(status.mode, status.chats);
                if (!status.hasPin) {
                    lockScreen.renderSetup();
                    return;
                }
                evaluate();
                if (locked && !reloading) renderUnlock(status.retryAfterMs);
                return;
            }
        }
        lockScreen.renderUnavailable();
    }

    function renderUnlock(retryAfterMs) {
        const onlyThisChat = Boolean(settings && settings.mode === "chats" && site);
        lockScreen.renderUnlock({
            retryAfterMs,
            onLeave: onlyThisChat ? () => location.assign("/") : null
        });
    }

    // Aplica el bloqueo que corresponde a la dirección actual
    function evaluate() {
        if (!settings || reloading) return;
        const scope = scopeFor(location.href);

        if (scope !== null) {
            if (scope !== unlockedScope) lock();
            if (locked) hidesProtectedChat = scope !== WHOLE_SITE;
            return;
        }

        unlockedScope = null;
        monitor.stop();
        if (!locked) return;
        if (hidesProtectedChat) {
            // Al salir de un chat bloqueado, el sitio aún podría mostrarlo un instante:
            // se recarga para partir de una página limpia
            reloading = true;
            location.reload();
            return;
        }
        reveal();
    }

    function lock() {
        unlockedScope = null;
        if (locked) return;
        locked = true;
        monitor.stop();
        lockScreen.renderLoading();
        lockScreen.show();
        sync();
        refreshScreen();
    }

    // Una página pública no tiene nada que bloquear
    function lockIfNeeded() {
        if (scopeFor(location.href) === null) return;
        lock();
        evaluate();
    }

    function reveal() {
        locked = false;
        hidesProtectedChat = false;
        sync();
        lockScreen.hide();
    }

    // El PIN fue correcto
    function unlock() {
        unlockedScope = scopeFor(location.href);
        reveal();
        if (unlockedScope !== null) monitor.start();
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

    // Estos sitios cambian de chat sin recargar la página
    if (site && window.navigation) {
        // Antes de cambiar: solo puede bloquear, nunca desbloquear
        navigation.addEventListener("navigate", event => {
            if (locked || event.downloadRequest !== null) return;
            const target = new URL(event.destination.url);
            if (target.origin !== location.origin) return;
            const scope = scopeFor(target.href);
            if (scope !== null && scope !== unlockedScope) lock();
        });
        // Después de cambiar, o si el cambio se canceló
        navigation.addEventListener("currententrychange", evaluate);
        navigation.addEventListener("navigateerror", evaluate);
    }

    window.addEventListener("pageshow", event => {
        // Al volver con el botón Atrás el navegador puede restaurar la página ya desbloqueada
        if (event.persisted) {
            reloading = false;
            lockIfNeeded();
        } else {
            lockScreen.focus();
        }
    });
    window.addEventListener("focus", () => lockScreen.focus());

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.inactivityMinutes) monitor.setMinutes(changes.inactivityMinutes.newValue);
        if (changes.lastActivity) monitor.remoteActivity(changes.lastActivity.newValue);
        if (settings && (changes.lockMode || changes.protectedChats)) {
            applySettings(
                changes.lockMode ? changes.lockMode.newValue : settings.mode,
                changes.protectedChats ? changes.protectedChats.newValue : settings.chats
            );
            evaluate();
        }
        if (changes.lockSignal) lockIfNeeded();
        // El PIN se acaba de crear desde otra pestaña o el popup
        if (changes.pinRecord && locked && lockScreen.isSetup()) refreshScreen();
    });

    // El popup pregunta qué chat está abierto en la pestaña
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || message.type !== "current-chat") return;
        const id = site && ACL.chatIdFromPath(site, location.pathname);
        sendResponse({ supported: Boolean(site), site: site ? site.name : null, id });
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
