import { pino } from "pino";

const logger = pino({
    level: 'trace',
    timestamp: true,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

export default logger;

