// Crea elementos sin innerHTML: algunos sitios exigen Trusted Types
ACL.el = function (tag, props = {}, children = []) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
        if (name === "class") element.className = value;
        else if (name === "text") element.textContent = value;
        else element.setAttribute(name, value);
    }
    element.append(...children);
    return element;
};

ACL.lockIcon = function () {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const attributes = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.8",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
        class: "acl-icon"
    };
    for (const [name, value] of Object.entries(attributes)) svg.setAttribute(name, value);
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM12 15v2");
    svg.append(path);
    return svg;
};

// Formulario de PIN con mostrar/ocultar, errores accesibles y cuenta atrás.
// validate(values) devuelve { field, message } o null.
// submit(values) devuelve la respuesta del service worker.
ACL.createPinForm = function ({ fields, submitLabel, validate, submit, onSuccess }) {
    const error = ACL.el("p", { class: "acl-error", id: "acl-error", role: "alert" });
    const button = ACL.el("button", { class: "acl-primary", type: "submit", text: submitLabel });
    const show = ACL.el("input", { type: "checkbox" });
    const inputs = {};
    const firstField = fields[0].name;
    let busy = false;
    let countdown = null;

    const rows = fields.map(({ name, label }) => {
        const id = `acl-${name}`;
        inputs[name] = ACL.el("input", {
            class: "acl-input",
            id,
            type: "password",
            autocomplete: "off",
            spellcheck: "false",
            maxlength: ACL.MAX_PIN_LENGTH,
            "aria-describedby": "acl-error"
        });
        return ACL.el("div", { class: "acl-field" }, [
            ACL.el("label", { class: "acl-label", for: id, text: label }),
            inputs[name]
        ]);
    });

    const form = ACL.el("form", { class: "acl-form", novalidate: "" }, [
        ...rows,
        ACL.el("label", { class: "acl-check" }, [show, fields.length > 1 ? "Mostrar los PIN" : "Mostrar PIN"]),
        error,
        button
    ]);

    function clearError() {
        if (countdown) return;
        error.textContent = "";
        for (const input of Object.values(inputs)) input.removeAttribute("aria-invalid");
    }

    function showError(message, field) {
        error.textContent = message;
        inputs[field].setAttribute("aria-invalid", "true");
        inputs[field].focus();
    }

    function setButton(text, disabled) {
        button.textContent = text;
        button.disabled = disabled;
    }

    function wait(ms) {
        const end = Date.now() + ms;
        clearInterval(countdown);
        error.textContent = "Demasiados intentos fallidos.";

        function tick() {
            const seconds = Math.ceil((end - Date.now()) / 1000);
            if (seconds > 0) {
                const label = seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
                setButton(`Espera ${label}`, true);
                return;
            }
            clearInterval(countdown);
            countdown = null;
            setButton(submitLabel, false);
            clearError();
        }

        countdown = setInterval(tick, 1000);
        tick();
    }

    function hidePins() {
        show.checked = false;
        for (const input of Object.values(inputs)) input.type = "password";
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy || countdown) return;
        clearError();

        const values = Object.fromEntries(fields.map(({ name }) => [name, inputs[name].value]));
        const empty = fields.find(({ name }) => !values[name]);
        const problem = empty
            ? { field: empty.name, message: "Completa este campo." }
            : validate && validate(values);
        if (problem) {
            showError(problem.message, problem.field);
            return;
        }

        busy = true;
        setButton("Comprobando…", true);
        const response = await submit(values);
        busy = false;
        setButton(submitLabel, false);

        if (response.ok) {
            form.reset();
            hidePins();
            onSuccess(values);
            return;
        }
        if (response.reason === "locked") {
            inputs[firstField].value = "";
            wait(response.retryAfterMs);
            return;
        }
        if (response.reason === "wrong-pin") inputs[firstField].value = "";
        showError(ACL.errorText(response), firstField);
    });

    show.addEventListener("change", () => {
        for (const input of Object.values(inputs)) input.type = show.checked ? "text" : "password";
    });
    form.addEventListener("input", clearError);

    return {
        element: form,
        clearError,
        wait,
        focus: () => inputs[firstField].focus(),
        destroy: () => clearInterval(countdown)
    };
};

ACL.NEW_PIN_FIELDS = [
    { name: "newPin", label: "PIN nuevo" },
    { name: "repeatPin", label: "Repite el PIN" }
];

ACL.validateNewPinPair = function (values) {
    const message = ACL.validateNewPin(values.newPin);
    if (message) return { field: "newPin", message };
    if (values.newPin !== values.repeatPin) return { field: "repeatPin", message: "Los PIN no coinciden." };
    return null;
};
