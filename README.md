# AI Chat Locker

Extensión de navegador que protege con un PIN tus conversaciones de IA y sesiones web frente a quien tenga acceso a tu pantalla.

---

## Funciones

- **Bloqueo desde el inicio:** la página se oculta antes de mostrarse y solo aparece al escribir el PIN.
- **Bloqueo por inactividad:** al recargar o tras 1, 5, 10, 15, 30 o 60 minutos. La actividad se comparte entre las pestañas protegidas.
- **Sin pérdida de texto:** al bloquearse por inactividad no se recarga la página, así que los borradores se conservan.
- **Detección de respuestas:** si la IA está respondiendo, el bloqueo se pospone y se reintenta cada 5 segundos, hasta un máximo de 10 minutos.
- **Bloquear ahora:** desde el popup o con `Alt+Shift+L` (se puede cambiar en la página de atajos del navegador).
- **Ajustes protegidos:** cambiar el PIN o el tiempo requiere escribir el PIN actual.
- **Límite de intentos:** al quinto fallo hay que esperar 30 segundos. La espera se duplica con cada fallo, hasta 15 minutos.
- **Tema claro y oscuro:** sigue la preferencia del sistema.

---

## Sitios compatibles

- **ChatGPT** (`chatgpt.com`)
- **Google Gemini** (`gemini.google.com`)
- **Claude** (`claude.ai`)
- **Instagram Web** (`www.instagram.com`)

---

## Instalación (modo desarrollador)

1. Clona el repositorio:

   ```
   git clone https://github.com/YOUR_USERNAME/ai-chat-locker.git
   ```

2. Abre `chrome://extensions/` en un navegador basado en Chromium 111 o posterior (Chrome, Edge, Brave).
3. Activa el modo de desarrollador.
4. Pulsa **Cargar descomprimida** y elige la carpeta del repositorio.
5. Abre un sitio compatible y crea tu PIN (6 caracteres o más).

Si actualizas o recargas la extensión, recarga también las pestañas que ya estaban abiertas.

---

## Ajustes

Desde los ajustes puedes cambiar el tiempo de inactividad y el PIN. Hay tres formas de abrirlos, y todas piden el PIN:

- Pulsa **Ajustes** en la pantalla de bloqueo.
- Pulsa el icono de AI Chat Locker en la barra del navegador. Si no aparece, abre el menú de extensiones (pieza de puzle) y fíjalo.
- En la página de extensiones del navegador, abre los detalles de AI Chat Locker y elige **Opciones de la extensión**.

---

## Estructura

```
ai-chat-locker/
├── manifest.json
├── icons/
└── src/
    ├── background/
    │   ├── service-worker.js   Mensajes y atajo de teclado
    │   └── pin-store.js        Guardado y verificación del PIN
    ├── content/
    │   ├── early.css           Oculta la página mientras está bloqueada
    │   ├── lock-screen.js      Pantalla de bloqueo
    │   ├── inactivity.js       Detector de inactividad
    │   └── main.js             Coordina el bloqueo
    ├── popup/                  Ajustes (popup y pestaña) y "Bloquear ahora"
    └── shared/                 Configuración, estilos y formulario de PIN
```

---

## Seguridad

- El PIN se guarda en `chrome.storage.local` como un hash PBKDF2-SHA-256 con salt aleatorio y 600 000 iteraciones. Nunca se guarda en texto plano.
- Los PIN de la versión 1.0 se convierten al nuevo formato la primera vez que desbloqueas.
- La pantalla de bloqueo usa un Shadow DOM cerrado y el sitio no recibe las teclas del PIN.

**Límites:** protege frente a miradas y accesos casuales. Quien pueda usar DevTools, desactivar la extensión o leer los archivos del perfil del navegador puede saltarse el bloqueo. El contenido de los chats no se cifra y el título de la pestaña sigue visible.

**Si olvidas el PIN:** no se puede recuperar. Quita la extensión y vuelve a instalarla para crear otro.

---

## Planes futuros

Integración con NestJS, PostgreSQL, Prisma y Docker para ofrecer autenticación centralizada y preferencias cifradas en la nube.

---

## Licencia

Distribuido bajo la licencia MIT.
