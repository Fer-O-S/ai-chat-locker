(() => {
    document.adoptedStyleSheets = [ACL.createStyleSheet()];

    const app = document.getElementById("app");
    let form = null;
    // Solo vive mientras el popup está abierto; cada cambio se vuelve a verificar con él
    let currentPin = "";
    // Chat abierto en la pestaña activa, si lo hay
    let currentChat = null;

    function render(titleText, bodyText, formOptions, extra = []) {
        if (form) form.destroy();
        form = formOptions ? ACL.createPinForm(formOptions) : null;
        app.replaceChildren(
            ACL.el("h1", { class: "acl-title", text: titleText }),
            ACL.el("p", { class: "acl-text", text: bodyText }),
            ...(form ? [form.element] : []),
            ...extra
        );
        if (form) form.focus();
    }

    function secondaryButton(label, onClick) {
        const button = ACL.el("button", { class: "acl-secondary", type: "button", text: label });
        button.addEventListener("click", onClick);
        return button;
    }

    function lockButton() {
        return secondaryButton("Bloquear ahora", async () => {
            const response = await ACL.send({ type: "lock-all" });
            if (!response.ok) {
                renderUnavailable();
                return;
            }
            currentPin = "";
            window.close();
            // La pestaña de ajustes puede seguir abierta: vuelve a pedir el PIN
            start();
        });
    }

    async function findCurrentChat() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const reply = await chrome.tabs.sendMessage(tab.id, { type: "current-chat" });
            return reply && reply.id && ACL.isValidChat(reply.site, reply.id) ? { site: reply.site, id: reply.id } : null;
        } catch (error) {
            // La pestaña no es de un sitio compatible
            return null;
        }
    }

    function isProtected(status, chat) {
        return status.chats.some(item => item.site === chat.site && item.id === chat.id);
    }

    // Proteger un chat no pide PIN; quitar la protección sí
    function protectButtons(status, onDone) {
        if (status.mode !== "chats" || !currentChat || isProtected(status, currentChat)) return [];
        return [secondaryButton("Proteger este chat", async () => {
            const response = await ACL.send({ type: "protect-chat", ...currentChat });
            if (response.ok) onDone();
            else renderUnavailable();
        })];
    }

    function renderSetup() {
        render("Crea tu PIN", `Usa ${ACL.MIN_PIN_LENGTH} caracteres o más.`, {
            fields: ACL.NEW_PIN_FIELDS,
            submitLabel: "Guardar PIN",
            validate: ACL.validateNewPinPair,
            submit: values => ACL.send({ type: "create-pin", pin: values.newPin }),
            onSuccess: values => {
                currentPin = values.newPin;
                renderSettings("PIN guardado.");
            }
        });
    }

    function renderAccess(status, message = "") {
        render("Ajustes", "Escribe tu PIN para cambiarlos.", {
            fields: [{ name: "pin", label: "PIN" }],
            submitLabel: "Abrir ajustes",
            submit: values => ACL.send({ type: "verify-pin", pin: values.pin }),
            onSuccess: values => {
                currentPin = values.pin;
                renderSettings();
            }
        }, [
            ...protectButtons(status, () => start("Chat protegido.")),
            lockButton(),
            ACL.el("p", { class: "acl-ok acl-note", role: "status", text: message })
        ]);
        if (status.retryAfterMs > 0) form.wait(status.retryAfterMs);
    }

    function renderChangePin() {
        render("Cambiar PIN", `Usa ${ACL.MIN_PIN_LENGTH} caracteres o más.`, {
            fields: [{ name: "pin", label: "PIN actual" }, ...ACL.NEW_PIN_FIELDS],
            submitLabel: "Guardar PIN nuevo",
            validate: ACL.validateNewPinPair,
            submit: values => ACL.send({ type: "change-pin", pin: values.pin, newPin: values.newPin }),
            onSuccess: values => {
                currentPin = values.newPin;
                renderSettings("PIN actualizado.");
            }
        }, [secondaryButton("Cancelar", () => renderSettings())]);
    }

    function optionGroup(name, legend, options, selected) {
        const labels = options.map(([value, label]) => {
            const input = ACL.el("input", { type: "radio", name, value });
            input.checked = value === selected;
            return ACL.el("label", { class: "acl-option" }, [input, label]);
        });
        return ACL.el("fieldset", { class: "acl-options" }, [ACL.el("legend", { text: legend }), ...labels]);
    }

    function chatListSection(status, save) {
        if (status.mode !== "chats") return [];
        const section = ACL.el("section", { class: "acl-section" }, [
            ACL.el("h2", { class: "acl-subtitle", text: `Chats protegidos (${status.chats.length})` })
        ]);
        section.append(...protectButtons(status, () => renderSettings("Chat protegido.")));

        if (status.chats.length === 0) {
            section.append(ACL.el("p", { class: "acl-text", text: "Abre un chat de ChatGPT, Claude o Gemini, pulsa el icono de la extensión y elige Proteger este chat." }));
            return [section];
        }

        // No se guardan títulos: el chat se identifica por el sitio y la fecha
        const rows = status.chats.map(chat => {
            const site = ACL.siteByName(chat.site);
            const isCurrent = currentChat && currentChat.site === chat.site && currentChat.id === chat.id;
            const date = new Date(chat.addedAt).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
            const label = isCurrent ? `${site.label}, este chat` : `${site.label}, ${date}`;
            const remove = ACL.el("button", { class: "acl-link", type: "button", text: "Quitar", "aria-label": `Quitar protección: ${label}` });
            remove.addEventListener("click", () => save({ type: "unprotect-chat", site: chat.site, id: chat.id }, "Protección quitada."));
            return ACL.el("li", { class: "acl-row" }, [
                ACL.el("span", { class: "acl-row-label", text: label }),
                ACL.el("a", { class: "acl-link", href: site.chatUrl(chat.id), target: "_blank", rel: "noreferrer", text: "Abrir", "aria-label": `Abrir: ${label}` }),
                remove
            ]);
        });
        section.append(ACL.el("ul", { class: "acl-list" }, rows));
        return [section];
    }

    async function renderSettings(message = "") {
        const status = await ACL.send({ type: "status" });
        if (!status.ok) {
            renderUnavailable();
            return;
        }

        const feedback = ACL.el("p", { class: "acl-ok", role: "status", text: message });
        const error = ACL.el("p", { class: "acl-error", role: "alert" });

        // Solo la última petición actualiza el aviso
        let lastRequest = 0;
        async function send(request) {
            const number = ++lastRequest;
            feedback.textContent = "";
            error.textContent = "";
            const response = await ACL.send({ ...request, pin: currentPin });
            if (number !== lastRequest) return false;
            if (!response.ok) error.textContent = "No se pudo guardar. Cierra los ajustes y vuelve a abrirlos.";
            return response.ok;
        }
        async function saveAndRefresh(request, doneMessage) {
            if (await send(request)) renderSettings(doneMessage);
        }

        const modes = optionGroup("mode", "Qué bloquear en las IA", [
            ["site", "Todo el sitio"],
            ["chats", "Chats elegidos"]
        ], status.mode);
        modes.addEventListener("change", event => saveAndRefresh({ type: "set-mode", mode: event.target.value }, "Cambio guardado."));

        const minutes = [...new Set([...ACL.MINUTE_OPTIONS, status.minutes])].sort((a, b) => a - b);
        const times = optionGroup("minutes", "Bloquear por inactividad", minutes.map(value => [value, ACL.minutesLabel(value)]), status.minutes);
        times.classList.add("acl-times");
        times.addEventListener("change", async event => {
            if (await send({ type: "set-minutes", minutes: Number(event.target.value) })) feedback.textContent = "Cambio guardado.";
        });

        render("Ajustes", "Instagram siempre se bloquea completo.", null, [
            modes,
            ...chatListSection(status, saveAndRefresh),
            times,
            feedback,
            error,
            ACL.el("div", { class: "acl-actions" }, [secondaryButton("Cambiar PIN", renderChangePin), lockButton()])
        ]);
    }

    function renderUnavailable() {
        render("No se pudo conectar con la extensión", "Cierra esta ventana y vuelve a abrirla.");
    }

    async function start(message = "") {
        const [status, chat] = await Promise.all([ACL.send({ type: "status" }), findCurrentChat()]);
        currentChat = chat;
        if (!status.ok) renderUnavailable();
        else if (status.hasPin) renderAccess(status, message);
        else renderSetup();
    }

    start();
})();
