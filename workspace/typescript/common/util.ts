export class Logger {
    info(message: string) {
        console.log(message);
    }

    error(message: string) {
        console.error(message);
    }

    warn(message: string) {
        console.warn(message);
    }

    debug(message: string) {
        console.debug(message);
    }
}