
# CreatorAutomator

A simple and fast Scraper bot for automating image generation with Bing Image Creator.

Built with TypeScript in NodeJs, using Playwright.

## Features

- Downloads images locally or saves them to a collection in Bing Saves, creating it if it doesn't exist.
- Identifies throttling in your accounts and takes appropriate actions.

## Quick Start

1. Navigate to the root of the project directory.
2. Install dependencies with: `npm install`
3. Configure the bot with your own parameters and accounts (see [Configuration](#configuration)).
4. **Start the bot with** `npm run start`

*You can also run it in Debug mode with:* `npm run debug`

---

## Configuration

You have two options to configure this bot.

### 1 - Configuration Assistant

This bot comes with a simple and handy configuration assistant. If you don't want to fiddle with the JSON file.
**Run it with** `npm run config`.

### 2 - Editing the `config.json` File

This program uses a JSON file called `config.json` to save your options.
It is located in the `./dist/` of the project directory.

Once you find it, the structure is pretty self explanatory.

---

#### Known Issues / Roadmap

- Multiple account support is not yet fully implemented nor tested, the program will try to iterate through the accounts.
- Currently, I can't make the bot work in headless mode. It probably is due to some cookie issue or headless browser detection.

**Disclaimer: This bot is for educational purposes only. I am not responsible for any damage done to your accounts.**
