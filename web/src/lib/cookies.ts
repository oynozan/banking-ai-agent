export default class Cookie {
    static set(name: string, value: string, days?: number, path: string = "/") {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}`;
    }

    static get(name: string): string | null {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");

        for (let i = 0; i < ca.length; i++) {
            const c = ca[i].trim();
            if (c.startsWith(nameEQ)) {
                return decodeURIComponent(c.substring(nameEQ.length));
            }
        }
        return null;
    }

    static delete(name: string, path: string = "/") {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
    }

    static has(name: string): boolean {
        return this.get(name) !== null;
    }

    static getAll(): Record<string, string> {
        const cookies: Record<string, string> = {};
        const ca = document.cookie.split(";");
        ca.forEach(cookie => {
            const [key, ...val] = cookie.trim().split("=");
            cookies[key] = decodeURIComponent(val.join("="));
        });
        return cookies;
    }
}
