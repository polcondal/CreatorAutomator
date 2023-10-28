import * as readline from 'node:readline/promises';
import fs from 'fs';
import path from 'path';

import { stdin as input, stdout as output } from 'node:process';
import { Account } from './models/Account.js';
import logger from './logger.js';

const rl = readline.createInterface({ input, output });

class Utils {

    static async getBoolInput(question: string): Promise<boolean> {
        let answer = null;
        while (answer !== 'y' && answer !== 'n') {
            answer = await rl.question(question);
            answer.toLowerCase();
        }
        return answer === 'y';
    }

    static async getNumberInput(question: string): Promise<number> {
        let answer = null;
        while (!Number(answer)) {
            answer = await rl.question(question);
        }
        return Number(answer);
    }

    static async getStringInput(question: string): Promise<string> {
        let answer = null;
        while (answer === null) {
            answer = await rl.question(question);
        }
        return answer;
    }

    static ValidateEmail(email: string): boolean {
        const re = /\S+@\S+\.\S+/;
        return re.test(email);
    }

    static ErrorInValues(accounts: Account[], prompt: string, collection: string): boolean {
        let fatalError = false;

        // The prompt is required
        if (prompt == undefined || prompt == "") {
            logger.error("No prompt found in env_config.json! Exiting...");
            fatalError = true;
        }

        // The user can choose to not specify a collection
        if (collection == undefined || collection == "") {
            logger.warn("No collection set in env_config.json");
        }

        // ACCOUNT CHECKS -------------------------

        logger.trace("Importing accounts from JSON...")
        logger.trace(JSON.stringify(accounts));
        logger.info("Found " + accounts.length + " accounts in env_config.json !")

        // There has to be at least 1 account
        if (accounts.length == 0 || accounts == undefined) {
            logger.error("No accounts found in env_config.json!");
            fatalError = true;
        }

        // In case of fatal error, stop, and notify the user to configure the bot
        if (fatalError) {
            return true;
        }
        return false;
    }

    /**
     * Sleeps code execution for a certain amount of time.
     * @param ms milliseconds to sleep
     * @returns {Promise<void>}
     */
    static async Sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class ImageUtils {
    static imageFolder: string = path.resolve('./images/');

    static async SaveImage(data: Buffer): Promise<void> {
        // Create directory if it doesn't exist
        if (!fs.existsSync(ImageUtils.imageFolder)) {
            fs.mkdirSync(ImageUtils.imageFolder);
        }

        const name: string = ImageUtils.imageFolder + "/image_" + Date.now() + ".png";

        logger.info("Saving image to " + name);

        fs.writeFileSync(name, data);
    }
}

export { Utils, ImageUtils };