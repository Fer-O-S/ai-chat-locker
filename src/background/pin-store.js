// Guarda y verifica el PIN. Todo pasa por una sola cola para que varias pestañas
// no puedan probar PIN en paralelo y saltarse el límite de intentos.
const PinStore = (() => {
    const ITERATIONS = 600000;
    const storage = chrome.storage.local;
    let queue = Promise.resolve();

    function serialize(task) {
        const result = queue.then(task);
        queue = result.catch(() => {});
        return result;
    }

    function toHex(buffer) {
        return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function fromHex(hex) {
        return Uint8Array.from(hex.match(/../g), pair => parseInt(pair, 16));
    }

    async function derive(pin, salt, iterations) {
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
        return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
    }

    async function createRecord(pin) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        return {
            version: 2,
            salt: toHex(salt),
            iterations: ITERATIONS,
            hash: await derive(pin, salt, ITERATIONS)
        };
    }

    async function matches(pin, { pinRecord, userPin }) {
        if (pinRecord) {
            return await derive(pin, fromHex(pinRecord.salt), pinRecord.iterations) === pinRecord.hash;
        }
        // Formato de la versión 1.0: SHA-256 sin salt
        return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin))) === userPin;
    }

    function remainingWait(lockout) {
        if (!lockout || !lockout.until) return 0;
        // El tope evita esperas absurdas si el reloj del sistema se atrasa
        return Math.min(Math.max(0, lockout.until - Date.now()), ACL.MAX_WAIT_MS);
    }

    async function check(pin) {
        const data = await storage.get(["pinRecord", "userPin", "lockout"]);
        if (!data.pinRecord && !data.userPin) return { ok: false, reason: "no-pin" };

        const wait = remainingWait(data.lockout);
        if (wait > 0) return { ok: false, reason: "locked", retryAfterMs: wait };

        if (typeof pin === "string" && await matches(pin, data)) {
            await storage.remove("lockout");
            if (!data.pinRecord) {
                // Migra el PIN antiguo al formato nuevo
                await storage.set({ pinRecord: await createRecord(pin) });
                await storage.remove("userPin");
            }
            return { ok: true };
        }

        const failures = ((data.lockout && data.lockout.failures) || 0) + 1;
        if (failures < ACL.FREE_ATTEMPTS) {
            await storage.set({ lockout: { failures, until: 0 } });
            return { ok: false, reason: "wrong-pin", attemptsLeft: ACL.FREE_ATTEMPTS - failures };
        }
        const extra = Math.min(failures - ACL.FREE_ATTEMPTS, 10);
        const retryAfterMs = Math.min(ACL.BASE_WAIT_MS * 2 ** extra, ACL.MAX_WAIT_MS);
        await storage.set({ lockout: { failures, until: Date.now() + retryAfterMs } });
        return { ok: false, reason: "locked", retryAfterMs };
    }

    return {
        async status() {
            const data = await storage.get(["pinRecord", "userPin", "lockout", "inactivityMinutes"]);
            return {
                ok: true,
                hasPin: Boolean(data.pinRecord || data.userPin),
                minutes: ACL.normalizeMinutes(data.inactivityMinutes),
                retryAfterMs: remainingWait(data.lockout)
            };
        },

        create: pin => serialize(async () => {
            const data = await storage.get(["pinRecord", "userPin"]);
            if (data.pinRecord || data.userPin) return { ok: false, reason: "pin-exists" };
            const message = ACL.validateNewPin(pin);
            if (message) return { ok: false, reason: "invalid-pin", message };
            await storage.set({ pinRecord: await createRecord(pin) });
            return { ok: true };
        }),

        verify: pin => serialize(() => check(pin)),

        change: (pin, newPin) => serialize(async () => {
            const message = ACL.validateNewPin(newPin);
            if (message) return { ok: false, reason: "invalid-pin", message };
            const result = await check(pin);
            if (result.ok) await storage.set({ pinRecord: await createRecord(newPin) });
            return result;
        }),

        setMinutes: (pin, minutes) => serialize(async () => {
            const result = await check(pin);
            if (result.ok) await storage.set({ inactivityMinutes: ACL.normalizeMinutes(minutes) });
            return result;
        })
    };
})();
