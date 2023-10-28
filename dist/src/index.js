import { AccountStatus } from './models/Account.js';
import { JsonUtils } from "./jsonUtils.js";
import { Utils, ImageUtils } from './utils.js';
import logger from './logger.js';
import { chromium } from "playwright";
// Command line args
const args = process.argv.slice(2);
// Headless mode and debug mode
let headless = false;
const debug = args.includes('--debug');
// Set the params
if (debug) {
    logger.info("Running in debug mode, logging is set to trace");
    logger.level = "trace";
    headless = false;
}
else {
    logger.level = "info";
    logger.info("Running in production mode");
    headless = true;
}
// FIXME: there is no way currently to run the bot in headless mode, it will not be able to log in.
// Does microsoft have some sort of bot protection ?
const browser = await chromium.launch({ headless: false });
const baseURL = 'https://www.bing.com/images/create/';
// All generated images start with this prefix
// https://th.bing.com/th/id/
// This starts as undefined in order to only check once
let collectionExists = undefined;
let collectionSelected = false;
// Get the accounts from the config
const accounts = JsonUtils.ImportAccountsFromJson();
const prompt = JsonUtils.GetPrompt();
const collection = JsonUtils.GetCollection();
logger.warn("WARNING: I am not responsible for any bans or restrictions that may occur to your account, use this bot at your own risk.");
await AccountManager(browser, accounts);
async function AccountManager(browser, accounts) {
    if (Utils.ErrorInValues(accounts, prompt, collection)) {
        logger.fatal("Please run \"npm run config\" to configure the bot.");
        process.exit(0);
    }
    for (let acc of accounts) {
        await RunAccount(browser, acc, JsonUtils.GetDownloadImages());
    }
}
// Bot Execution
async function RunAccount(browser, account, downloadImages = false) {
    // log the environment variables
    logger.info('Start context with account ' + account.email);
    logger.info("launching: " + chromium.name() + " from: " + chromium.executablePath());
    // Create the browser instance
    // It uses a viewport of 1280x720, this is the default viewport
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    // Begin
    logger.info('Navigating to ' + baseURL);
    await page.goto(baseURL);
    logger.info('Entering image creator page');
    page.getByRole("link", { name: "Create Join & Create" })
        .click();
    try {
        // Login
        await page.waitForLoadState('load');
        logger.info('Logging in...');
        await Utils.Sleep(1500);
        const emailForm = await page.waitForSelector('[placeholder="Email, phone, or Skype"]');
        logger.trace("Found email form: " + emailForm);
        await emailForm.click();
        logger.trace("Clicked email form");
        await emailForm.fill(account.email);
        logger.trace("Filled email form");
        await page.getByRole("button", { name: "Next" }).click();
        const passwordForm = page.getByPlaceholder("Password");
        await passwordForm.click();
        await passwordForm.fill(account.password);
        await page.getByRole("button", { name: "Sign in" }).click();
    }
    catch (error) {
        logger.error(error);
        logger.fatal('Error logging in, are the credentials correct?');
        // Change the account status
        account.status = AccountStatus.LOGIN_ERROR;
        return;
    }
    logger.info("Successfully logged in");
    try {
        logger.info('Rejecting cookies');
        page.getByRole("link", { name: "Reject" })
            .click();
        await page.getByLabel("Don't show this again").check();
        await page.getByRole("button", { name: "Yes" }).click();
        // remove annoying popups
        await page.locator(".gi_n_cls").click();
        await page.locator("div:nth-child(2) > .gi_tc_cls").click();
    }
    catch (error) {
        logger.error(error);
        logger.error('! Error closing popups');
    }
    // wait 1 second
    await Utils.Sleep(1000);
    // Go to creations tab
    logger.info('Going to creations tab');
    page.locator(".gil_n_btn ", { hasText: "Creations" }).click();
    // Fill in prompt
    const promptForm = page.getByPlaceholder("Want to see how Image Creator works? Select Surprise Me, then Create");
    logger.trace("Found prompt form");
    await promptForm.click();
    await promptForm.clear();
    await promptForm.fill(prompt);
    logger.info("Filled prompt form");
    // BEGIN LOGIC ----------------------------------------------------
    // Status Variables --------------
    let imgBlockVisible = false;
    let loadingBarVisible = false;
    let createButtonAvailable = false;
    let accountBoosted = false;
    let createButton = undefined;
    // -------------------------------
    async function UpdateState() {
        page.setDefaultTimeout(5000);
        // The images grid block is always present just hidden and shown using display: none; or block;
        try {
            imgBlockVisible = await page.locator("#giric").isVisible();
        }
        catch (error) {
            imgBlockVisible = false;
        }
        // The loading text is always present just hidden and shown using display: none; or block;
        try {
            loadingBarVisible = await page.locator(".giloadbararia").isVisible();
        }
        catch (error) {
            loadingBarVisible = false;
        }
        createButton = page.locator("#create_btn_c");
        //  The class of the button changes when it's greyed out, they add a loader icon and more stuff
        try {
            await createButton.hover();
            createButtonAvailable = await createButton.getAttribute("class") == "gi_btn_p" || await createButton.getAttribute("class") == "gi_btn_p ";
            logger.trace("createButtonAvailable: " + createButtonAvailable);
        }
        catch (error) {
            createButtonAvailable = false;
        }
        // Boost balance is always there, even if its 0
        const boostBalanceLocator = page.locator("#token_bal");
        const boostBalance = (await boostBalanceLocator.getAttribute("aria-label"));
        const parsedBoostBalance = parseInt(boostBalance);
        logger.trace("Boost balance is: ", parsedBoostBalance);
        if (parsedBoostBalance == null || parsedBoostBalance == undefined) {
            logger.warn("Couldnt retreive boost balance");
        }
        if (parsedBoostBalance.toString() == "0") {
            accountBoosted = false;
        }
        else {
            accountBoosted = true;
        }
        logger.trace(`Boosted: ${accountBoosted}`);
        logger.trace(`imgBlockVisible: ${imgBlockVisible}`);
        logger.trace(`loadingBarVisible: ${loadingBarVisible}`);
        logger.trace(`createButtonAvailable: ${createButtonAvailable}`);
        logger.trace("^^^^^^^^^^^^^^^^^^^^^^");
    }
    // MAIN LOOP
    async function Loop() {
        while (true) {
            await Utils.Sleep(750);
            await UpdateState();
            page.setDefaultTimeout(8500);
            let timesChecked = 0;
            // If button is enabled and found.
            if (createButtonAvailable && createButton) {
                logger.trace("Create button is available, clicking");
                timesChecked = 0;
                await createButton.click();
                logger.info("Clicked create button...");
                await Utils.Sleep(1500);
            }
            // If button is disabled or not found, it either means it's generating / or the user has been hard throttled
            else {
                logger.trace("Create button is not available, waiting");
                await Utils.Sleep(2000);
                timesChecked++;
                // Reload the page if it's been checked more than 10 times
                // the button may be stuck disabled
                if (timesChecked > 10) {
                    logger.trace("Page has been checked more than 10 times, reloading...");
                    await page.reload({ waitUntil: 'load' });
                    timesChecked = 0;
                }
                await checkForThrottling(account, page, accountBoosted);
                // While images block is not visible
                // Nested loop inside the main loop
                while (!imgBlockVisible) {
                    logger.trace("Images block is not visible, waiting");
                    timesChecked++;
                    // Reload the page if it's been checked more than 10 times
                    // the button may be stuck disabled
                    if (timesChecked > 10) {
                        logger.trace("Page has been checked more than 10 times, reloading...");
                        await page.reload({ waitUntil: 'load' });
                        timesChecked = 0;
                    }
                    await Utils.Sleep(2500);
                    await UpdateState();
                    // If the image block came back while waiting
                    if (imgBlockVisible) {
                        timesChecked = 0;
                        logger.trace("Images block has come back");
                        const imagesAmount = await GetAmountOfGeneratedImagesFromGridGiric(page.locator("#gir_async"));
                        logger.info("Found: " + imagesAmount + " generated images");
                        // If user wants to download images to disk
                        if (downloadImages) {
                            await saveImagesToDisk(imagesAmount, page);
                        }
                        // If user wants to save images to collection
                        else {
                            await saveImagesToCollection(imagesAmount, page);
                        }
                    }
                    // If not, make some checks
                    else {
                        logger.trace("Images block is still not visible, checking...");
                        await checkForThrottling(account, page, accountBoosted);
                        if (account.status == AccountStatus.HARD_THROTTLED) {
                            logger.error;
                            return;
                        }
                    }
                }
            }
            continue;
        }
    }
    await Loop();
    logger.info('Finished with account: ' + account.email + '...');
    await Utils.Sleep(1000);
    await context.close();
}
/**
 * Saves the images to the bing image collection specified in the config.json
 * @param amount Amount of images to save
 * @param page The page to operate on
 */
async function saveImagesToCollection(amount, page) {
    logger.info("Saving images to collection: " + collection + "...");
    // Iterate through all the images
    for (let i = 0; i < amount; i++) {
        logger.trace("Saving image " + (i + 1));
        // Get the image block for each image
        const imageBlock = page.locator(`[data-idx="${i + 1}"]`);
        logger.trace("Found image block for num: " + (i + 1) + " = " + imageBlock);
        await imageBlock.hover();
        // The tiny small button for saving is universal for all images, its higher up in the html??
        const saveButtonLocator = page.locator("#svctrlbtn");
        // hover and click in this button in order to make the collections list appear
        await saveButtonLocator.hover();
        await Utils.Sleep(250);
        await saveButtonLocator.click();
        // Get the listbox element that has all the collections, it has now appeared
        const listBoxLocator = page.getByRole("listbox", { name: "Your Collections" });
        // Get all the list elements from the listbox as locators
        const listBoxItems = await listBoxLocator.locator("li").all();
        // If undefined, its the first time checking
        if (collectionExists == undefined) {
            await CreateCollectionIfNotExists(page, listBoxItems);
            collectionExists = true;
        }
        // This here handles if the collections are correctly selected, it unselects the other ones if they are selected, and selects the correct one if its not selected
        // This is only executed once, since the collectionSelected is set to true after the first execution
        if (collectionSelected == false) {
            // Iterate through all the collections and check if the collection we want is there, if it is, we have to know if its clicked or not by (aria-selected)
            for (let item of listBoxItems) {
                const name = await item.locator("div").nth(1).innerText();
                const isItemSelected = (await item.getAttribute("aria-selected")) === "true";
                logger.trace("Checking coll item: " + name + " isSelected: " + isItemSelected);
                // If the collection is found, and it's not selected (clicked) we click it
                if (name == collection && !isItemSelected) {
                    logger.trace("Selecting collection: " + name);
                    await item.click();
                    await Utils.Sleep(200);
                }
                // If the collection is clicked and is not the one we want, we click in order to unselect it
                else if (name != collection && isItemSelected) {
                    logger.trace("Unselecting collection: " + name);
                    await item.click();
                    await Utils.Sleep(200);
                }
            }
            // Click away from the listbox since it is fully open after doing this
            await page.locator("#giricp").click();
            collectionSelected = true;
        }
    }
    logger.info("Done saving images");
}
/**
 * Checks if the collection exists, if not, it creates it, this can only be called after either hovering the save button, or clicking it. Since the popup is not visible otherwise.
 * @param page The page to operate on
 * @param collection The collection check
 */
async function CreateCollectionIfNotExists(page, listBoxItems) {
    logger.info("Checking if collection: " + collection + " exists");
    await Utils.Sleep(750);
    // CHECK IF COLLECTION EXISTS OR HAS TO BE CREATED
    for (let item of listBoxItems) {
        const name = await item.locator("div").nth(1).innerText();
        if (name == collection) {
            logger.info("Found collection: " + collection);
            return;
        }
    }
    logger.info("Collection: " + collection + " not found, creating it...");
    // If the collection doesnt exist, create it
    const createCollectionButton = page.locator("#svctrlhvrbtn");
    await createCollectionButton.click();
    // fill in the name of the collection
    await page.locator("#svctrlinlineformname").fill(collection);
    // Press enter
    await page.locator("#svctrlinlineformname").press("Enter");
    // click create
    await page.locator("#svctrlinlineformcreate").click();
    logger.info("Created new collection: " + collection);
    return;
}
/**
 * Saves the images to the disk
 * @param amount Amount of images to save
 * @param page The page to operate on
 */
async function saveImagesToDisk(amount, page) {
    logger.info("Saving images to disk");
    await Utils.Sleep(500);
    // // Get all img elements on the page with a src attribute starting with the IMAGE_PREFIX
    // const matchingImgElements = page.locator(`img[src^="${IMAGE_PREFIX}"]`).elementHandles();
    // logger.trace(JSON.stringify(matchingImgElements));
    // if (!matchingImgElements) {
    //     return;
    // }
    // Get all locators of the img element from the alt attribute of the image
    const imageTest = await page.locator(`img[alt="${prompt}"]`).all();
    logger.trace("Getting image element by alt text, found " + imageTest.length + " results");
    for (let i = 0; i < amount; i++) {
        logger.trace("Saving image " + (i + 1));
        // Get the image block for each image and click it
        // const imageBlock: Locator = page.locator(`[data-idx="${i + 1}"]`) as Locator;
        // logger.trace("Found image block for num: " + (i + 1) + " = " + imageBlock);
        await Utils.Sleep(500);
        const imageChild = imageTest[i];
        logger.trace("Getting image child = " + JSON.stringify(imageChild));
        // Get the src attribute of the image
        let imgLink = await imageChild.getAttribute("src") ?? undefined;
        if (!imgLink || imgLink === "" || imgLink === undefined) {
            logger.error("Couldnt find image link, skipping");
            continue;
        }
        // make the image link contain the highest quality query for the image
        // (1024 x 1024)
        imgLink = imgLink.replace(/w=\d+/, "w=1024").replace(/h=\d+/, "h=1024");
        logger.trace("Image link: " + imgLink);
        // make the request to get the image
        const imgResp = await page.context().request.get(imgLink);
        const responseBuffer = await imgResp.body();
        // Save the image
        await ImageUtils.SaveImage(responseBuffer);
        await Utils.Sleep(250);
    }
    logger.info("Done saving images");
}
/**
 * Wrapper function that checks if the account is throttled or not, and sets the status accordingly
 * @param account Account to check
 * @param page Page to operate on
 * @param accountboosted Whether the account is boosted or not, if it is, this function wont do anything since restrictions dont apply
 * @returns
 */
async function checkForThrottling(account, page, accountboosted) {
    logger.trace("checking for Throttling");
    // If boosted restrictions dont apply.
    if (accountboosted) {
        return;
    }
    // In case of soft throttle, (page not refreshing by itself)
    if (await isSoftThrottled(page)) {
        await page.reload({ waitUntil: 'load' });
        account.status = AccountStatus.ACTIVE;
        return;
    }
    // In case of hard throttle, (user is not allowed to generate images anymore)
    if (await isHardThrottled(page)) {
        account.status = AccountStatus.HARD_THROTTLED;
        return;
    }
    logger.trace("No throttling detected");
    account.status = AccountStatus.ACTIVE;
}
/**
 * Checks for HARD throttling, when the user is not allowed to generate images anymore, and sets the status accordingly
 * @param page The page to operate on
 * @returns If the account is hard throttled or not
 */
async function isHardThrottled(page) {
    const throttlingTopRightMsg = page.locator("#gilen_son");
    const locatorClassString = await throttlingTopRightMsg.getAttribute("class");
    logger.trace("HardlocatorClassString is: " + locatorClassString);
    if (locatorClassString.includes("show_n")) {
        logger.error('Found HARD throttling message, your public IP might be too hot, consider changing it, or you may not be able to keep generating images for this session.');
        return true;
    }
    else {
        return false;
    }
}
/**
 * Checks for a soft throttling message and refreshes the page if found, this circumvents waiting forever
 * @param page The page to operate on
 * @returns If the account is soft throttled or not
 */
async function isSoftThrottled(page) {
    const softThrottleMsg = page.locator("#gilen_c");
    const locatorClassString = await softThrottleMsg.getAttribute("class");
    logger.trace("SoftlocatorClassString is: " + locatorClassString);
    // If visible
    if (locatorClassString.includes("show_n")) {
        logger.warn('Found SOFT throttling message, refreshing page...');
        return true;
    }
    else {
        return false;
    }
}
/**
 * Retreives the amount of images generated from the grid locator
 * @param giric The locator of the giric grid
 * @returns The amount of images generated
 */
async function GetAmountOfGeneratedImagesFromGridGiric(giric) {
    const locatorClass = await giric.getAttribute("class");
    logger.trace("locatorClass: " + locatorClass);
    const number = locatorClass.replace("gir_", "");
    logger.trace("number: " + number);
    const sanitizedNumber = number.replace("giric ", "");
    logger.trace("sanitizedNumber: " + sanitizedNumber);
    const parsedNumber = parseInt(sanitizedNumber);
    logger.trace("parsedNumber: " + parsedNumber);
    return parsedNumber;
}
process.on('SIGINT', async () => {
    console.log("Cancelling Execution...");
    await Utils.Sleep(500);
    await browser.close();
    process.exit(0);
});
