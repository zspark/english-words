
// ISO-like readable timestamp (e.g., 2026-07-29 12:30:23.102)
function getTimestamp(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${date} ${time}.${ms}`;
};

type LogArgs = unknown[];
type LOG_LEVEL = 'LOG' | 'DEBUG' | 'ERROR' | 'VITAL';

function print(level: LOG_LEVEL, browserCSS: string, ...args: LogArgs): void {
    const time = getTimestamp();

    // Browser Console formatting (%c applies CSS styles)
    console.log(
        `%c[${time}] %c[${level}]`,
        'color: gray; font-weight: normal;',
        browserCSS,
        ...args
    );
};

const _out = Object.freeze({
    /** General informational logs */
    log(...args: LogArgs): void {
        print('LOG', 'color: #1e90ff; font-weight: bold;', ...args);
    },

    /** Debug messages (for development details) */
    debug(...args: LogArgs): void {
        print('DEBUG', 'color: #e67e22; font-weight: bold;', ...args);
    },

    /** Errors and unexpected failures */
    error(...args: LogArgs): void {
        print('ERROR', 'color: #ff4d4d; font-weight: bold;', ...args);
    },

    /** Critical system messages that need immediate attention */
    vital(...args: LogArgs): void {
        print('VITAL', 'background: #8e44ad; color: #ffffff; font-weight: bold; padding: 2px 4px; border-radius: 2px;', ...args);
    }
})

export default _out;
