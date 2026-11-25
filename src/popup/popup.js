(() => {
    document.adoptedStyleSheets = [ACL.createStyleSheet()];

    const app = document.getElementById("app");
    let form = null;
    // Solo vive mientras el popup está abierto; cada cambio se vuelve a verificar con él
    let currentPin = "";

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

    function renderAccess(retryAfterMs) {
        render("Ajustes", "Escribe tu PIN para cambiarlos.", {
            fields: [{ name: "pin", label: "PIN" }],
            submitLabel: "Abrir ajustes",
            submit: values => ACL.send({ type: "verify-pin", pin: values.pin }),
            onSuccess: values => {
                currentPin = values.pin;
                renderSettings();
            }
        }, [lockButton()]);
        if (retryAfterMs > 0) form.wait(retryAfterMs);
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

    async function renderSettings(message = "") {
        const status = await ACL.send({ type: "status" });
        if (!status.ok) {
            renderUnavailable();
            return;
        }

        const feedback = ACL.el("p", { class: "acl-ok", role: "status", text: message });
        const error = ACL.el("p", { class: "acl-error", role: "alert" });
        const values = [...new Set([...ACL.MINUTE_OPTIONS, status.minutes])].sort((a, b) => a - b);
        const options = values.map(minutes => {
            const input = ACL.el("input", { type: "radio", name: "minutes", value: minutes });
            input.checked = minutes === status.minutes;
            return ACL.el("label", { class: "acl-option" }, [input, ACL.minutesLabel(minutes)]);
        });
        const fieldset = ACL.el("fieldset", { class: "acl-options" }, [
            ACL.el("legend", { text: "Bloquear por inactividad" }),
            ...options
        ]);

        // Los clics rápidos se guardan en orden y solo el último actualiza el aviso
        let lastRequest = 0;
        fieldset.addEventListener("change", async event => {
            const request = ++lastRequest;
            const minutes = Number(event.target.value);
            feedback.textContent = "";
            error.textContent = "";
            const response = await ACL.send({ type: "set-minutes", pin: currentPin, minutes });
            if (request !== lastRequest) return;
            if (response.ok) feedback.textContent = "Cambio guardado.";
            else error.textContent = "No se pudo guardar. Cierra los ajustes y vuelve a abrirlos.";
        });

        render("Ajustes", "Se aplican en todas las pestañas protegidas.", null, [
            fieldset,
            feedback,
            error,
            secondaryButton("Cambiar PIN", renderChangePin),
            lockButton()
        ]);
    }

    function renderUnavailable() {
        render("No se pudo conectar con la extensión", "Cierra esta ventana y vuelve a abrirla.");
    }

    async function start() {
        const status = await ACL.send({ type: "status" });
        if (!status.ok) renderUnavailable();
        else if (status.hasPin) renderAccess(status.retryAfterMs);
        else renderSetup();
    }

    start();
})();
