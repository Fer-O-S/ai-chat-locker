importScripts("/src/shared/config.js", "/src/shared/sites.js", "/src/background/pin-store.js");

// Las pestañas escuchan este valor en storage y se bloquean cuando cambia
async function lockAll() {
    await chrome.storage.local.set({ lockSignal: Date.now() });
    return { ok: true };
}

// Los ajustes piden el PIN, así que se pueden abrir desde la pantalla de bloqueo
async function openSettings() {
    await chrome.runtime.openOptionsPage();
    return { ok: true };
}

async function handle(message, fromPopup) {
    switch (message.type) {
        case "status": return PinStore.status();
        case "create-pin": return PinStore.create(message.pin);
        case "verify-pin": return PinStore.verify(message.pin);
        case "lock-all": return lockAll();
        case "open-settings": return openSettings();
    }
    if (fromPopup) {
        switch (message.type) {
            case "change-pin": return PinStore.change(message.pin, message.newPin);
            case "set-minutes": return PinStore.setMinutes(message.pin, message.minutes);
            case "set-mode": return PinStore.setMode(message.pin, message.mode);
            case "protect-chat": return PinStore.protectChat(message.site, message.id);
            case "unprotect-chat": return PinStore.unprotectChat(message.pin, message.site, message.id);
        }
    }
    return { ok: false, reason: "unknown" };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const fromPopup = Boolean(sender.url && sender.url.startsWith(chrome.runtime.getURL("")));
    handle(message, fromPopup).then(sendResponse, () => sendResponse({ ok: false, reason: "error" }));
    return true;
});

chrome.commands.onCommand.addListener(command => {
    if (command === "lock-now") lockAll();
});
