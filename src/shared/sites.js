// Sitios de IA que admiten bloqueo por chat. Los demás (Instagram) siempre se bloquean completos.
// "path" reconoce la dirección de un chat y captura su identificador.
ACL.SITES = [
    {
        name: "chatgpt",
        label: "ChatGPT",
        host: "chatgpt.com",
        path: /^\/(?:g\/[^/]+\/)?c\/([0-9a-f-]{36})(?:\/|$)/i,
        chatUrl: id => `https://chatgpt.com/c/${id}`
    },
    {
        name: "claude",
        label: "Claude",
        host: "claude.ai",
        path: /^\/chat\/([0-9a-f-]{36})(?:\/|$)/i,
        chatUrl: id => `https://claude.ai/chat/${id}`
    },
    {
        name: "gemini",
        label: "Gemini",
        host: "gemini.google.com",
        path: /^\/(?:u\/\d+\/)?(?:app|gem\/[^/]+)\/([0-9a-f]{8,40})(?:\/|$)/i,
        chatUrl: id => `https://gemini.google.com/app/${id}`
    }
];

// "site" bloquea el sitio completo; "chats" solo los chats elegidos
ACL.normalizeMode = function (mode) {
    return mode === "chats" ? "chats" : "site";
};

ACL.siteByHost = function (host) {
    return ACL.SITES.find(site => site.host === host) || null;
};

ACL.siteByName = function (name) {
    return ACL.SITES.find(site => site.name === name) || null;
};

ACL.chatIdFromPath = function (site, path) {
    const match = site.path.exec(path);
    return match ? match[1].toLowerCase() : null;
};

ACL.isValidChat = function (siteName, id) {
    const site = ACL.siteByName(siteName);
    return Boolean(site && typeof id === "string" && ACL.chatIdFromPath(site, new URL(site.chatUrl(id)).pathname) === id);
};

// Busca el identificador en toda la dirección, no solo en la forma habitual,
// para que otra ruta hacia el mismo chat también quede bloqueada
ACL.findProtectedChat = function (site, chats, url) {
    let text = url.pathname + url.search + url.hash;
    try {
        text += " " + decodeURIComponent(text);
    } catch (error) {
        // Dirección con una codificación no válida: basta con el texto original
    }
    text = text.toLowerCase();
    const chat = chats.find(item => item.site === site.name && text.includes(item.id));
    return chat ? chat.id : null;
};
