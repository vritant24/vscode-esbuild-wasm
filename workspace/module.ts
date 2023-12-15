import { Logger } from "./common/util";

export class A {
    private logger: Logger;
    constructor() {
        this.logger = new Logger();
    }

    print() {
        this.logger.info("Hello World!");
    }
}