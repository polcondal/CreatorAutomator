import { JsonUtils, AssitantUtils } from './jsonUtils.js';
import { Utils } from './utils.js';
import { Account } from './models/Account.js';
import logger from './logger.js';


console.log("Welcome to the configuration assistant for CreatorAutomator. \n");

// First check if there are any errors in the config in order to notify the user
if (Utils.ErrorInValues(JsonUtils.ImportAccountsFromJson(), JsonUtils.GetPrompt(), JsonUtils.GetCollection())) {
    console.error("There are errors in the config!");
}

logger.warn("WARNING: PROCEEDING WILL SHOW YOUR PASSWORDS IN THIS TERMINAL");

await Utils.Sleep(1000);
const proceed: boolean = await Utils.getBoolInput("Proceed? (y/n) \n");

// Wait until user agrees to proceed or exits the program
if (!proceed) {
    console.log("Exiting...");
    process.exit(0);
}

await mainMenu();

/**
 * Main menu loop for the Assistant
 * Allows to edit all the settings
 */
async function mainMenu(): Promise<void> {

    await Utils.Sleep(650);

    let exit = false;
    while (!exit) {
        const prompt: string = JsonUtils.GetPrompt();
        const collection: string = JsonUtils.GetCollection();
        const downloadImages: boolean = JsonUtils.GetDownloadImages();
        const accounts: Account[] = JsonUtils.ImportAccountsFromJson();

        console.log("\nCURRENT CONFIG:\n" +
            "1.-[ " + accounts.length + " Accounts]-: \n" +
            JSON.stringify(accounts) + "\n" +
            "2.-[Prompt]-: \n" + prompt + "\n" +
            "3.-[Download Images]-: \n" + downloadImages + "\n" +
            "4.-[Saves Collection] (optional)-: \n" + collection + "\n" +
            "5.-[Save and Exit] \n" +
            "6.-[Exit without saving] \n");


        console.log("Type the index of the setting you want to change: \n");

        const option: number = await Utils.getNumberInput("Choose an option: ");

        switch (option) {
            case 1:
                await AccountsMenu();
                break;
            case 2:
                const newPrompt: string = await Utils.getStringInput("Enter the new prompt (leave blank for no change): \n");
                if (!newPrompt) { break; }
                AssitantUtils.SetPrompt(newPrompt);

                break;
            case 3:
                const downloadImages: boolean = await Utils.getBoolInput("Download newly generated images instead of saving them to a collection? (y/n) \n");
                AssitantUtils.SetDownloadImages(downloadImages);
                break;
            case 4:
                const newCollection: string = await Utils.getStringInput("Enter the name of the collection to save images in (it wont be used unless downloadImages is True) \n");
                AssitantUtils.SetCollection(newCollection);
                break;
            case 5:
                // Save and exit
                exit = await Utils.getBoolInput("Save and exit? (y/n)");

                AssitantUtils.SaveConfig();
                break;
            case 6:
                exit = await Utils.getBoolInput("Exit without saving? (y/n)");
                break;
            default:
                console.error("Invalid option!");
                break;
        }

        await Utils.Sleep(750);
    }

    console.log("Exiting... Bye!...");

    console.log("Use 'npm run start' to start the program with these new settings.")
    await Utils.Sleep(200).then(() => process.exit(0));
}

/**
 * Accounts Menu
 * Shows the main menu for accounts, add, remove, modify, back
 */
async function AccountsMenu(accounts: Account[] = JsonUtils.ImportAccountsFromJson()): Promise<void> {

    console.log("Your accounts: \n" + JSON.stringify(accounts) + "\n");


    console.log("1. Add Account \n" +
        "2. Remove Account \n" +
        "3. Modify Account \n" +
        "4. Back \n");

    const option: number = await Utils.getNumberInput("Choose an option: ");

    let correctInput = false;
    // while user inputs incorrect value, keep asking
    while (!correctInput) {
        switch (option) {
            // Add account
            case 1:
                console.log("Add account... \n");
                await AddAccount();
                break;
            // Remove account
            case 2:
                console.log("Remove account... \n");
                await RemoveAccount();
                break;
            // Modify account
            case 3:
                console.log("Modify account... \n");
                await ModifyAccount();
                break;
            case 4:
                console.log("Going back... \n");
                correctInput = true;
                return;

            default:
                logger.error("Invalid option!");
                break;
        }
    }

    async function AddAccount() {
        const email = await Utils.getStringInput("Enter the account's email: ");
        const password = await Utils.getStringInput("Enter the account's password: ");

        if (!Utils.ValidateEmail(email)) {
            logger.error("Invalid email format: " + email + " try again.");
            correctInput = false;
            return;
        }
        const acc = new Account(email, password);
        AssitantUtils.AddAccount(acc);
        console.log("Successfully added account: " + email);
    }

    async function RemoveAccount() {
        ListAccounts();

        const index = await Utils.getNumberInput("Enter the account's index: ");
        const indexToRemove = index - 1;
        if (indexToRemove > accounts.length || indexToRemove < 0 || indexToRemove == undefined) {
            logger.error("Invalid index, try again.");
            correctInput = false;
            return;
        }

        const account = accounts[indexToRemove];
        accounts.splice(indexToRemove, 1);

        console.log("Successfully removed account: " + account.email);
    }

    async function ModifyAccount() {
        ListAccounts();

        const index = await Utils.getNumberInput("Enter the account's index: ");

        const indexToModify = index - 1;
        if (indexToModify > accounts.length || indexToModify < 0 || indexToModify == undefined) {
            logger.error("Invalid index, try again.");
            correctInput = false;
            return;
        }

        const account = accounts[indexToModify];

        let correctEmail = false;

        while (!correctEmail) {
            const email = await Utils.getStringInput("Enter the account's email (leave blank for no change): ");

            // Empty, no change
            if (!email) { correctEmail = true; break; }

            // Validate email if changed
            if (!Utils.ValidateEmail(email)) {
                logger.error("Invalid email format: " + email + " try again.");
                correctEmail = false;
                continue;
            }
            // If correct
            else { console.log("Email is correct! \"" + email + "\"") }
        }


        console.log("Enter the account's password (leave blank for no change)");

        const password = await Utils.getStringInput("Enter the account's password (leave blank for no change): ");

        // Empty, no change
        if (!password) { } else { account.password = password; }


        accounts[indexToModify] = account;
        console.log("Successfully modified account: " + account.email);
    }

    /**
     * Lists all of the found accounts as a numbered list
     */
    function ListAccounts() {
        let index = 0;
        for (const acc in accounts) {
            index++;
            console.log(index + " " + acc);
        }
    }
}