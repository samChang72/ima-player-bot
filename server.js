const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const PLAYER_URL = `http://localhost:${PORT}/player.html`;
const LOG_PATH = path.join(__dirname, 'ad_log.txt');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_PATH, `[${timestamp}] ${message}\n`);
}

app.use((req, res, next) => {
    if (req.hostname === 'localhost') {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

let browser;
let pages = [];
let executionCount = 0; // 計數器

async function openPages() {
    pages = [];
    for (let i = 0; i < 5; i++) {
        const page = await browser.newPage();
        page.on('console', async (msg) => {
            const msgText = msg.text();
            if (msgText.includes('Ad error:')) {
                const logMsg = `Ad error detected on page ${i}, reloading...`;
                console.log(logMsg);
                logToFile(logMsg);
                try {
                    await page.evaluate(() => {
                        if (window.adsManager) {
                            try { window.adsManager.destroy(); } catch (e) {}
                        }
                    });
                    await page.reload({ waitUntil: 'networkidle2' });
                } catch (err) {
                    const errMsg = 'Error reloading page: ' + err.toString();
                    console.error(errMsg);
                    logToFile(errMsg);
                }
            }
        });
        await page.goto(PLAYER_URL, { waitUntil: 'networkidle2' });
        pages.push(page);
    }
}

async function closePages() {
    for (const page of pages) {
        try {
            await page.close();
        } catch (err) {
            const errMsg = 'Error closing page: ' + err.toString();
            console.error(errMsg);
            logToFile(errMsg);
        }
    }
    pages = [];
}

async function startBot() {
    browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    await openPages();

    const interval = setInterval(async () => {
        executionCount++;
        if (executionCount >= 50) {
            console.log('Reached 50 executions, shutting down...');
            logToFile('Reached 50 executions, shutting down...');
            clearInterval(interval);
            await closePages();
            await browser.close();
            process.exit(0); // 結束應用程式
        }

        await closePages();
        await openPages();
    }, 16000); // 16 秒
}

app.listen(PORT, async () => {
    console.log(`Local server running at http://localhost:${PORT}`);
    logToFile(`Service started at http://localhost:${PORT}`);
    await startBot();
});
