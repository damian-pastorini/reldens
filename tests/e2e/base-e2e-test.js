/**
 *
 * Reldens - Base E2E Test
 *
 * Provides shared Playwright test fixtures (gameConfig, longRun, screenshots, page) used by all spec files.
 *
 */

const { test: baseTest, expect: baseExpect } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { Selectors } = require('./selectors');

class BaseE2eTest
{
    // @TODO - BETA - Replace all the static methods.
    static configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
    static gameConfig = FileHandler.exists(BaseE2eTest.configPath)
        ? FileHandler.fetchFileJson(BaseE2eTest.configPath)
        : {};
    static longRun = process.env.LONG_RUN === '1';
    static videosDir = FileHandler.joinPaths(process.cwd(), 'test-results', 'videos');
    static screenshotsDir = FileHandler.joinPaths(process.cwd(), 'test-results', 'screenshots');
    static expect = baseExpect;
    static test = baseTest.extend({
        gameConfig: async ({}, use) => { await use(BaseE2eTest.gameConfig); },
        longRun: async ({}, use) => { await use(BaseE2eTest.longRun); },
        selectors: async ({}, use) => { await use(Selectors); },
        screenshots: async ({}, use, testInfo) => { await use(BaseE2eTest.makeScreenshotter(testInfo)); },
        page: async ({ browser }, use, testInfo) => { await BaseE2eTest.runPageFixture(browser, use, testInfo, null); },
        secondPage: async ({ browser }, use, testInfo) => {
            await BaseE2eTest.runPageFixture(browser, use, testInfo, 'player2');
        }
    });

    static slugify(title)
    {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    }

    static makeScreenshotter(testInfo)
    {
        let slug = BaseE2eTest.slugify(testInfo.title);
        let folder = FileHandler.joinPaths(BaseE2eTest.screenshotsDir, slug);
        let counter = 0;
        return {
            async capture(page, name)
            {
                if(!page || page.isClosed()) {
                    return;
                }
                counter++;
                FileHandler.createFolder(folder);
                let stepNumber = String(counter).padStart(2, '0');
                let safeName = BaseE2eTest.slugify(name);
                let filename = stepNumber+'-'+safeName+'.png';
                try {
                    await page.screenshot({ path: FileHandler.joinPaths(folder, filename), fullPage: false });
                } catch(captureError) {
                    Logger.error('[screenshot] Could not save "'+filename+'": '+captureError.message);
                }
            }
        };
    }

    static browserCursorScript()
    {
        let el = document.createElement('div');
        el.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:16px',
            'height:16px',
            'border-radius:50%',
            'background:rgba(255,80,80,0.85)',
            'border:2px solid #fff',
            'box-shadow:0 0 4px rgba(0,0,0,0.7)',
            'pointer-events:none',
            'z-index:2147483647',
            'transform:translate(-50%,-50%)',
            'transition:background 0.1s'
        ].join(';');
        document.addEventListener('DOMContentLoaded', () => { document.body.appendChild(el); });
        document.addEventListener('mousemove', (e) => {
            el.style.left = e.clientX+'px';
            el.style.top = e.clientY+'px';
        });
        document.addEventListener('mousedown', () => { el.style.background = 'rgba(255,220,50,0.95)'; });
        document.addEventListener('mouseup', () => { el.style.background = 'rgba(255,80,80,0.85)'; });
    }

    static async makeContext(browser)
    {
        let outputDir = FileHandler.joinPaths(process.cwd(), 'test-results');
        let context = await browser.newContext({
            baseURL: BaseE2eTest.gameConfig.baseUrl || 'http://localhost:8080',
            viewport: { width: 1280, height: 1080 },
            recordVideo: { dir: outputDir, size: { width: 1280, height: 1080 } }
        });
        await context.addInitScript(BaseE2eTest.browserCursorScript);
        return context;
    }

    static async saveVideo(video, slug, suffix)
    {
        if(!video) {
            return;
        }
        FileHandler.createFolder(BaseE2eTest.videosDir);
        let filename = suffix ? slug+'-'+suffix+'.webm' : slug+'.webm';
        try {
            await video.saveAs(FileHandler.joinPaths(BaseE2eTest.videosDir, filename));
        } catch(saveError) {
            Logger.error('[video] Could not save "'+filename+'": '+saveError.message);
        }
    }

    static async runPageFixture(browser, use, testInfo, suffix)
    {
        let context = await BaseE2eTest.makeContext(browser);
        let page = await context.newPage();
        await use(page);
        if(!page.isClosed()) {
            await page.waitForTimeout(BaseE2eTest.longRun ? 3000 : 1500);
        }
        let video = page.video();
        await context.close();
        await BaseE2eTest.saveVideo(video, BaseE2eTest.slugify(testInfo.title), suffix);
    }
}

module.exports.BaseE2eTest = BaseE2eTest;
