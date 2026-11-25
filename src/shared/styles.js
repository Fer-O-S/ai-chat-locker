// Estilos comunes de la pantalla de bloqueo y del popup. Se aplican con
// adoptedStyleSheets para no depender de la CSP de cada sitio.
ACL.createStyleSheet = function () {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        :host {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        .acl-root {
            --page: #eef0f4;
            --card: #ffffff;
            --text: #171a21;
            --muted: #565d6b;
            --line: #868e9c;
            --soft: #f1f3f7;
            --accent: #1d4ed8;
            --accent-hover: #1e40af;
            --on-accent: #ffffff;
            --danger: #b42318;
            --ok: #13692f;
            color: var(--text);
            color-scheme: light dark;
            font: 400 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            text-align: left;
        }
        @media (prefers-color-scheme: dark) {
            .acl-root {
                --page: #101218;
                --card: #1b1f28;
                --text: #f1f3f7;
                --muted: #a9b1c0;
                --line: #6d7686;
                --soft: #272c38;
                --accent: #8ab0ff;
                --accent-hover: #adc8ff;
                --on-accent: #0d1a36;
                --danger: #ff9d94;
                --ok: #7ddc9a;
            }
        }
        .acl-root, .acl-root * { box-sizing: border-box; }
        .acl-root [hidden] { display: none !important; }
        .acl-screen {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            max-width: none;
            max-height: none;
            margin: 0;
            padding: 24px;
            border: none;
            overflow: auto;
            background: var(--page);
        }
        .acl-screen[open] { display: flex; }
        .acl-card {
            width: 100%;
            max-width: 360px;
            margin: auto;
            padding: 28px;
            background: var(--card);
            border-radius: 16px;
            box-shadow: 0 1px 2px rgb(0 0 0 / 8%), 0 12px 32px rgb(0 0 0 / 12%);
        }
        .acl-icon { display: block; width: 32px; height: 32px; margin-bottom: 14px; color: var(--accent); }
        .acl-title { margin: 0 0 4px; font-size: 20px; line-height: 1.3; font-weight: 600; color: var(--text); }
        .acl-text { margin: 0; color: var(--muted); font-size: 14px; }
        .acl-form { margin: 20px 0 0; }
        .acl-field { margin-bottom: 14px; }
        .acl-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: var(--text); }
        .acl-input {
            width: 100%;
            height: 44px;
            padding: 0 12px;
            border: 1px solid var(--line);
            border-radius: 10px;
            background: var(--card);
            color: var(--text);
            font: inherit;
            font-size: 16px;
        }
        .acl-input[aria-invalid="true"] { border-color: var(--danger); }
        .acl-input:focus-visible, .acl-root button:focus-visible, .acl-root summary:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }
        .acl-root button { font: inherit; cursor: pointer; }
        .acl-root button:disabled { cursor: default; opacity: 0.7; }
        .acl-primary, .acl-secondary {
            display: block;
            width: 100%;
            min-height: 44px;
            padding: 8px 16px;
            border-radius: 10px;
        }
        .acl-primary { border: 1px solid transparent; background: var(--accent); color: var(--on-accent); }
        .acl-root button.acl-primary { font-weight: 600; }
        .acl-primary:hover:enabled { background: var(--accent-hover); }
        .acl-secondary { border: 1px solid var(--line); background: transparent; color: var(--text); }
        .acl-secondary:hover:enabled { background: var(--soft); }
        .acl-secondary + .acl-secondary, .acl-form + .acl-secondary { margin-top: 8px; }
        .acl-check { display: flex; align-items: center; gap: 8px; width: fit-content; margin-bottom: 14px; font-size: 14px; color: var(--muted); cursor: pointer; }
        .acl-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--accent); }
        .acl-error, .acl-ok { margin: 0 0 12px; font-size: 14px; }
        .acl-error { color: var(--danger); }
        .acl-ok { color: var(--ok); }
        .acl-error:empty, .acl-ok:empty { display: none; }
        .acl-help { margin-top: 20px; font-size: 13px; color: var(--muted); }
        .acl-help summary { width: fit-content; cursor: pointer; border-radius: 4px; }
        .acl-help p { margin: 8px 0 0; }
        .acl-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin: 16px 0; padding: 0; border: none; }
        .acl-options legend { margin-bottom: 8px; padding: 0; font-size: 14px; font-weight: 500; }
        .acl-option { position: relative; display: flex; align-items: center; justify-content: center; min-height: 38px; border: 1px solid var(--line); border-radius: 10px; font-size: 14px; }
        .acl-option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
        .acl-option:has(input:checked) { border-color: var(--accent); background: var(--accent); color: var(--on-accent); }
        .acl-option:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
        .acl-page { display: flex; min-height: 100vh; margin: 0; padding: 24px; background: var(--page); }
        .acl-popup { width: 320px; margin: 0; padding: 20px; background: var(--card); }
    `);
    return sheet;
};
