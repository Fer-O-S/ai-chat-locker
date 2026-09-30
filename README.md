# AI Chat Locker

A lightweight browser extension designed to protect your sensitive AI conversations and web sessions behind a secure PIN interface.

AI Chat Locker injects a privacy screen over the viewport when locked or inactive, ensuring your private prompts, workplace data, and personal chats remain protected from unauthorized local viewing.

---

## Key Features

- **Privacy Overlay:** Injects a secure blur interface across the viewport, preventing unauthorized access to visible chat content.
- **SHA-256 Hash Encryption:** PINs are never stored in plain text. All credentials are encrypted locally using standard Web Crypto API hashing before persistence.
- **Inactivity Auto-Lock:** Automatically locks the active session after a user-defined period of idle time (1, 5, 10 minutes, or manual reload only).
- **Smart Generation Detection:** Automatically detects active AI response generation (e.g., stop buttons, typing indicators) and defers auto-locking to prevent interrupted prompts or data loss.
- **Persistent Auto-Focus & Keyboard Shortcuts:** Enforces focus on the PIN input field to counter dynamic DOM rendering, with full support for Enter key execution.
- **Dynamic PIN & Timeout Configuration:** Allows instant PIN updates and idle timeout reconfigurations directly from the security modal.

---

## Supported Platforms

The extension currently supports content scripts on the following domains:

- **ChatGPT** (`chatgpt.com`)
- **Google Gemini** (`gemini.google.com`)
- **Claude AI** (`claude.ai`)
- **Instagram Web** (`instagram.com`)

---

## Technical Architecture & Security Model

- **Architecture:** Client-side Browser Extension (Manifest V3)
- **Security Storage:** `chrome.storage.local` with SHA-256 hashed value comparisons.
- **DOM Engine:** Native Vanilla JavaScript DOM manipulation using `MutationObserver` heuristics and event-driven interaction listeners.
- **Future Roadmap:** Planned integration with NestJS, PostgreSQL, Prisma, and Docker to support centralized authentication and encrypted cloud preferences.

---

## Installation (Developer Mode)

1. Clone this repository to your local machine:
   git clone https://github.com/YOUR_USERNAME/ai-chat-locker.git

2. Open your Chromium-based browser (Chrome, Edge, Brave) and navigate to:
   chrome://extensions/

3. Enable Developer mode in the top-right corner of the Extensions page.

4. Click Load unpacked and select the root directory of this repository.

5. Open any supported platform (e.g., Gemini or ChatGPT) to configure your initial PIN.

---

## License

Distributed under the MIT License. See LICENSE for more information.