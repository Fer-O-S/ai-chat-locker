// Oculta los títulos de los chats protegidos en la barra lateral y los listados, y los
// resultados del buscador del sitio, que podrían mostrar fragmentos de esos chats.
ACL.createChatListGuard = function () {
    const sheet = new CSSStyleSheet();
    let active = false;

    function rulesFor(id) {
        const item = `:is(a[href*="${id}" i], [jslog*="${id}" i])`;
        const row = `:is(li:not(:has(li)), tr, [role="listitem"], [role="option"]):has(${item})`;
        return `
            ${item}, ${item} *, ${row} * {
                visibility: hidden !important;
                transition: none !important;
            }
            ${item} { position: relative !important; }
            ${item}::after {
                content: "Chat protegido" !important;
                visibility: visible !important;
                position: absolute !important;
                inset: 0 !important;
                display: flex !important;
                align-items: center !important;
                padding: 0 10px !important;
                overflow: hidden !important;
                white-space: nowrap !important;
                font-size: 14px !important;
                font-style: italic !important;
                opacity: 0.75 !important;
            }
        `;
    }

    const search = `:is(
        [cmdk-root],
        [role="dialog"]:has(:is(
            input[type="search"],
            input[placeholder*="search" i],
            input[placeholder*="busca" i]
        ))
    )`;
    const searchRules = `
        ${search} * {
            visibility: hidden !important;
            transition: none !important;
        }
        ${search}::after {
            content: "Búsqueda bloqueada por AI Chat Locker. Pulsa Escape para cerrarla." !important;
            visibility: visible !important;
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 24px !important;
            text-align: center !important;
            font-size: 15px !important;
        }
    `;

    function attach() {
        if (active && !document.adoptedStyleSheets.includes(sheet)) {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
    }

    // El sitio podría reemplazar la lista de hojas de estilo
    setInterval(attach, 1000);

    return {
        update(ids) {
            active = ids.length > 0;
            sheet.replaceSync(active ? ids.map(rulesFor).join("\n") + searchRules : "");
            attach();
        }
    };
};
