import logger from "./logger.js"

export function assertExist(target: any): void {
    if (!target) {
        logger.vital(`[Assert Failed] ${target} should exist, but NOT!`);
    }
}
