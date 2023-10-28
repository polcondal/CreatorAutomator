import json from '../config.json' assert { type: "json" };
import fs from 'fs';
import path from 'path';
import { Account } from './models/Account.js';

import logger from './logger.js';

// const __dirnameSrc = path.resolve(path.dirname('./'));
const __dirnameDist = path.resolve('../config.json');

logger.trace("json " + JSON.stringify(json));

const accounts = json.accounts;

/**
 * Utils class that contains static methods for reading from the json file.
 */
class JsonUtils {
    static ImportAccountsFromJson(): Account[] {
        const AccountsArray: Account[] = [];

        if (accounts == undefined || accounts.length == 0) {
            return [];
        }

        // For every account, check if it has a valid email and password, and create an Account object from it, then add it to the array
        for (let account in accounts) {
            const email = accounts[account].email;
            const password = accounts[account].password;

            if (password == undefined || password === "" || email == undefined || email === "") {
                continue;
            }

            const acc = new Account(email, password);

            AccountsArray.push(acc);
        }
        return AccountsArray;
    }

    static GetPrompt(): string {
        if (json.prompt == undefined || json.prompt === "") {
            return "";
        }
        return json.prompt;
    }

    static GetCollection(): string {
        if (json.collection == undefined || json.collection === "") {
            return "";
        }
        return json.collection;
    }

    static GetDownloadImages(): boolean {
        return json.downloadImages;
    }
}

/**
 * Utils class that contains static methods for modifying the json file, to be used only by the assistant.
 */
class AssitantUtils {
    static SetAccounts(accounts: Account[]): void {
        json.accounts = accounts;
        logger.info("Updated accounts.");
    }

    static AddAccount(account: Account): void {
        json.accounts.push(account);
        logger.info("Added account: " + account.email);
    }

    static RemoveAccount(index: number): void {
        const account = json.accounts[index];
        json.accounts.splice(index, 1);
        logger.info("Removed account: " + account.email);
    }

    static SetPrompt(prompt: string): void {
        json.prompt = prompt;
        logger.info("Set prompt to: \n -> " + prompt);
    }

    static SetCollection(collection: string): void {
        json.collection = collection;
        logger.info("Set collection to: \n -> " + collection);
    }

    static SetDownloadImages(downloadImages: boolean): void {
        json.downloadImages = downloadImages;
        logger.info("Set downloadImages to: \n -> " + downloadImages);
    }

    static SaveConfig(): void {
        try {
            const jsonString = JSON.stringify(json);

            // fs.writeFileSync(path.resolve(__dirnameSrc), jsonString, 'utf-8');
            fs.writeFileSync(__dirnameDist, jsonString, 'utf-8');

            logger.info("Successfully saved config to " + __dirnameDist + "/config.json");
        } catch (error) {
            logger.error("Failed to save config.");
            logger.error(error);
            throw error;
        }
    }
}

export { JsonUtils as JsonUtils, AssitantUtils };