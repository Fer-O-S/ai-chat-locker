// Pantalla de bloqueo dentro de un Shadow DOM cerrado y un <dialog> modal,
// para quedar por encima de los modales del sitio y aislada de sus estilos.
ACL.createLockScreen = function ({ onUnlock }) {
    const host = document.createElement("ai-chat-locker");
    const root = host.attachShadow({ mode: "closed" });
    root.adoptedStyleSheets = [ACL.createStyleSheet()];

    const title = ACL.el("h1", { class: "acl-title", id: "acl-title" });
    const text = ACL.el("p", { class: "acl-text", id: "acl-text" });
    const content = ACL.el("div");
    const card = ACL.el("div", { class: "acl-card" }, [ACL.lockIcon(), title, text, content]);
    const dialog = ACL.el("dialog", {
        class: "acl-root acl-screen",
        "aria-labelledby": "acl-title",
        "aria-describedby": "acl-text"
    }, [card]);
    root.append(dialog);

    let form = null;
    let shown = false;
    let mode = "loading";

    function isPlaced() {
        return host.isConnected && host.parentNode === document.documentElement;
    }

    function open() {
        if (!document.documentElement) return;
        if (!isPlaced()) document.documentElement.append(host);
        // Un dialog que salió del DOM puede conservar "open" sin ser modal
        if (dialog.open && !dialog.matches(":modal")) dialog.close();
        if (!dialog.open) dialog.showModal();
        if (form) form.focus();
    }

    dialog.addEventListener("cancel", event => event.preventDefault());
    dialog.addEventListener("close", () => {
        if (shown && !dialog.open) open();
    });

    function render(newMode, titleText, bodyText, formOptions, extra = []) {
        mode = newMode;
        if (form) form.destroy();
        form = formOptions ? ACL.createPinForm(formOptions) : null;
        title.textContent = titleText;
        text.textContent = bodyText;
        content.replaceChildren(...(form ? [form.element] : []), ...extra);
        if (shown && form) form.focus();
    }

    return {
        host,
        isSetup: () => mode === "setup",

        show() {
            shown = true;
            open();
        },

        hide() {
            shown = false;
            dialog.close();
            host.remove();
            render("loading", "", "");
        },

        // Restaura la pantalla si algo la quitó o alteró
        ensure() {
            if (!shown) return;
            for (const name of host.getAttributeNames()) host.removeAttribute(name);
            if (!isPlaced() || !dialog.matches(":modal")) open();
        },

        focus() {
            if (shown && form && !root.activeElement) form.focus();
        },

        clearError() {
            if (form) form.clearError();
        },

        renderLoading() {
            render("loading", "Chat protegido", "Cargando…");
        },

        renderUnavailable() {
            const reload = ACL.el("button", { class: "acl-primary", type: "button", text: "Recargar página" });
            reload.addEventListener("click", () => location.reload());
            render("unavailable", "No se pudo conectar con la extensión", "Recarga la página para volver a intentarlo.", null, [
                ACL.el("div", { class: "acl-form" }, [reload])
            ]);
        },

        renderSetup() {
            render("setup", "Crea tu PIN", `Protegerá tus chats en este navegador. Usa ${ACL.MIN_PIN_LENGTH} caracteres o más.`, {
                fields: ACL.NEW_PIN_FIELDS,
                submitLabel: "Guardar PIN",
                validate: ACL.validateNewPinPair,
                submit: values => ACL.send({ type: "create-pin", pin: values.newPin }),
                onSuccess: onUnlock
            });
        },

        renderUnlock(retryAfterMs) {
            const settings = ACL.el("button", { class: "acl-secondary", type: "button", text: "Ajustes" });
            settings.addEventListener("click", () => ACL.send({ type: "open-settings" }));
            const help = ACL.el("details", { class: "acl-help" }, [
                ACL.el("summary", { text: "¿Olvidaste tu PIN?" }),
                ACL.el("p", { text: "El PIN no se puede recuperar. Para crear otro, quita AI Chat Locker desde la página de extensiones del navegador y vuelve a instalarlo." })
            ]);
            render("unlock", "Chat protegido", "Escribe tu PIN para continuar.", {
                fields: [{ name: "pin", label: "PIN" }],
                submitLabel: "Desbloquear",
                submit: values => ACL.send({ type: "verify-pin", pin: values.pin }),
                onSuccess: onUnlock
            }, [settings, help]);
            if (retryAfterMs > 0) form.wait(retryAfterMs);
        }
    };
};
