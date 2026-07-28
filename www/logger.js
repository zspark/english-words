const logger = (() => {
    // ISO-like readable timestamp (e.g., 2026-07-29 12:30:23.102)
    const getTimestamp = () => {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${date} ${time}.${ms}`;
    };

    // Detect environment (Node.js terminal vs Browser console)
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

    // Terminal ANSI Color Codes (for Node.js)
    const colors = {
        reset: "\x1b[0m",
        dim: "\x1b[2m",
        blue: "\x1b[34m",
        red: "\x1b[31m",
        yellow: "\x1b[33m",
        magentaBg: "\x1b[45m\x1b[37m\x1b[1m", // White bold text on Magenta background
    };

    const print = (level, colorCode, browserCSS, ...args) => {
        const time = getTimestamp();

        if (isNode) {
            // Terminal formatting
            const tag = `${colorCode}[${level}]${colors.reset}`;
            const timeTag = `${colors.dim}[${time}]${colors.reset}`;
            console.log(`${timeTag} ${tag}`, ...args);
        } else {
            // Browser Console formatting (%c applies CSS styles)
            console.log(
                `%c[${time}] %c[${level}]`,
                'color: gray; font-weight: normal;',
                browserCSS,
                ...args
            );
        }
    };

    return {
        /** General informational logs */
        log(...args) {
            print('LOG', colors.blue, 'color: #1e90ff; font-weight: bold;', ...args);
        },

        /** Debug messages (for development details) */
        debug(...args) {
            print('DEBUG', colors.yellow, 'color: #e67e22; font-weight: bold;', ...args);
        },

        /** Errors and unexpected failures */
        error(...args) {
            print('ERROR', colors.red, 'color: #ff4d4d; font-weight: bold;', ...args);
        },

        /** Critical system messages that need immediate attention */
        vital(...args) {
            print('VITAL', colors.magentaBg, 'background: #8e44ad; color: #ffffff; font-weight: bold; padding: 2px 4px; border-radius: 2px;', ...args);
        }
    };
})();
