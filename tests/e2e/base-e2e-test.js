/**
 *
 * Reldens - Base E2E Test
 *
 * Provides shared Playwright test fixtures (gameConfig, longRun, screenshots, page) used by all spec files. The
 * e2eGroup option is set by the Playwright project of the parallel spec group (ParallelSpecGroups), the gameConfig
 * fixture gives the specs the test users of that group and the page fixture resets only that group before every test.
 *
 */

const { test: baseTest, expect: baseExpect } = require('@playwright/test');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { Selectors } = require('./selectors');
const { PlayerReset } = require('./helpers/player-reset');
const { ParallelSpecGroups } = require('./helpers/parallel-spec-groups');
const { TimeConstants } = require('./helpers/time-constants');
const { RecordingStepReadTimer } = require('./helpers/recording-step-read-timer');

class BaseE2eTest
{
    // @TODO - BETA - Replace all the static methods.
    static configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
    static gameConfig = FileHandler.exists(BaseE2eTest.configPath)
        ? FileHandler.fetchFileJson(BaseE2eTest.configPath)
        : {};
    static longRun = '1' === process.env.LONG_RUN;
    static videosDir = FileHandler.joinPaths(process.cwd(), 'test-results', 'videos');
    static videoSize = {width: 1280, height: 1080};
    static gameplayRecordingStartDelayMs = 1000;
    static cameraStillPollMs = 250;
    static recordingViewIntervalMs = 100;
    static recordingCameraLerp = 0.1;
    static instantCameraLerp = 1;
    static cloudTextureKey = 'weather-cloud';
    static gameplayRecordingPages = [];
    static overlaysStylesPath = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'assets', 'e2e-overlays.css');
    static recordingNote = 'Automatic e2e test recording - the player teleports skip the walk to the required areas.';
    static screenshotsDir = FileHandler.joinPaths(process.cwd(), 'test-results', 'screenshots');
    static gameDataPath = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'game-data.json');
    static expect = baseExpect;
    static test = baseTest.extend({
        e2eGroup: [ParallelSpecGroups.EXCLUSIVE_GROUP, {option: true}],
        gameConfig: async ({e2eGroup}, use) => {
            await use(ParallelSpecGroups.buildGroupConfig(BaseE2eTest.gameConfig, e2eGroup));
        },
        longRun: async ({}, use) => {
            await use(BaseE2eTest.longRun);
        },
        selectors: async ({}, use) => {
            await use(Selectors);
        },
        screenshots: async ({}, use, testInfo) => {
            await use(BaseE2eTest.makeScreenshotter(testInfo));
        },
        page: async ({ browser, gameConfig, e2eGroup }, use, testInfo) => {
            await PlayerReset.resetAll(gameConfig, e2eGroup);
            await BaseE2eTest.runPageFixture(browser, use, testInfo, null);
        },
        secondPage: async ({ browser }, use, testInfo) => {
            await BaseE2eTest.runPageFixture(browser, use, testInfo, 'player2');
        }
    });

    static loadGameData()
    {
        let gameData = FileHandler.exists(BaseE2eTest.gameDataPath)
            ? FileHandler.fetchFileJson(BaseE2eTest.gameDataPath)
            : null;
        BaseE2eTest.expect(gameData, 'The game data must be collected before the specs run').toBeTruthy();
        return gameData;
    }

    static loadRoomObjects(roomName)
    {
        let roomObjects = BaseE2eTest.loadGameData().rooms[roomName];
        BaseE2eTest.expect(roomObjects, 'The game data must contain the room objects of '+roomName).toBeTruthy();
        return roomObjects;
    }

    static loadRoomEntries(roomName, listsKeys, onlyMoving = false)
    {
        let roomObjects = BaseE2eTest.loadRoomObjects(roomName);
        let entries = [];
        for(let listKey of listsKeys){
            entries.push(...roomObjects[listKey]);
        }
        return onlyMoving ? entries.filter(entry => 0 < entry.randomMovementTiles) : entries;
    }

    static slugify(title)
    {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    }

    static makeScreenshotter(testInfo)
    {
        return {
            count: 0,
            folder: FileHandler.joinPaths(BaseE2eTest.screenshotsDir, BaseE2eTest.slugify(testInfo.title)),
            async capture(page, name)
            {
                if(!page || page.isClosed()) {
                    return;
                }
                this.count++;
                FileHandler.createFolder(this.folder);
                let filename = String(this.count).padStart(2, '0')+'-'+BaseE2eTest.slugify(name)+'.png';
                try {
                    await page.screenshot({ path: FileHandler.joinPaths(this.folder, filename), fullPage: false });
                } catch(error) {
                    Logger.error('[screenshot] Could not save "'+filename+'": '+error.message);
                }
            }
        };
    }

    static browserCursorScript()
    {
        return () => {
            let cursorEl = document.createElement('div');
            cursorEl.style.cssText = [
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
                'transition:background 0.1s,opacity 0.3s,width 0.1s,height 0.1s'
            ].join(';');
            let hideAfterMs = 1500;
            let hideTimer = false;
            let showCursor = () => {
                cursorEl.style.opacity = '1';
                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    cursorEl.style.opacity = '0';
                }, hideAfterMs);
            };
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(cursorEl);
            });
            document.addEventListener('mousemove', (event) => {
                cursorEl.style.left = event.clientX+'px';
                cursorEl.style.top = event.clientY+'px';
                showCursor();
            });
            document.addEventListener('mousedown', () => {
                cursorEl.style.background = 'rgba(255,220,50,0.95)';
                cursorEl.style.width = '32px';
                cursorEl.style.height = '32px';
                showCursor();
            });
            document.addEventListener('mouseup', () => {
                cursorEl.style.background = 'rgba(255,80,80,0.85)';
                cursorEl.style.width = '16px';
                cursorEl.style.height = '16px';
                showCursor();
            });
        };
    }

    static async makeContext(browser)
    {
        let outputDir = FileHandler.joinPaths(process.cwd(), 'test-results');
        let envPort = process.env.RELDENS_E2E_PORT || null;
        let effectiveBaseUrl = envPort
            ? 'http://localhost:'+envPort
            : (BaseE2eTest.gameConfig.baseUrl || 'http://localhost:8080');
        let recordVideoConfig = {};
        recordVideoConfig['dir'] = outputDir;
        recordVideoConfig['size'] = BaseE2eTest.videoSize;
        let context = await browser.newContext({
            baseURL: effectiveBaseUrl,
            viewport: BaseE2eTest.videoSize,
            recordVideo: recordVideoConfig
        });
        await context.addInitScript(BaseE2eTest.browserCursorScript());
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
        } catch(error) {
            Logger.error('[video] Could not save "'+filename+'": '+error.message);
        }
    }

    static async startRecordingView(page, zoom)
    {
        await page.evaluate((recordingView) => {
            setInterval(() => {
                let scene = window.reldens?.getActiveScene();
                let camera = scene?.cameras?.main;
                if(!camera){
                    return;
                }
                if(recordingView.zoom !== camera.zoom){
                    camera.setZoom(recordingView.zoom);
                }
                if(recordingView.cameraLerp > camera.lerp.x){
                    camera.setLerp(recordingView.cameraLerp, recordingView.cameraLerp);
                }
                let clouds = scene.children.list.filter(child => recordingView.cloudTextureKey === child.texture?.key);
                for(let cloud of clouds){
                    cloud.setVisible(false);
                }
                let domContainer = scene.game.domContainer;
                if(domContainer?.scrollLeft || domContainer?.scrollTop){
                    domContainer.scrollTo(0, 0);
                }
            }, recordingView.intervalMs);
        }, {
            zoom,
            cameraLerp: BaseE2eTest.recordingCameraLerp,
            cloudTextureKey: BaseE2eTest.cloudTextureKey,
            intervalMs: BaseE2eTest.recordingViewIntervalMs
        });
    }

    static async setCameraLerp(page, cameraLerp)
    {
        await page.evaluate((lerp) => {
            window.reldens.getActiveScene().cameras.main.setLerp(lerp, lerp);
        }, cameraLerp);
    }

    static async startGameplayRecording(page, testInfo, zoom, suffix, firstStep)
    {
        await page.addStyleTag({path: BaseE2eTest.overlaysStylesPath});
        await BaseE2eTest.setCameraLerp(page, BaseE2eTest.instantCameraLerp);
        await page.evaluate((bannerTexts) => {
            let banner = document.createElement('div');
            banner.classList.add('e2e-recording-banner');
            for(let className of Object.keys(bannerTexts)){
                let bannerLine = document.createElement('div');
                bannerLine.classList.add(className);
                bannerLine.textContent = bannerTexts[className];
                banner.append(bannerLine);
            }
            document.body.append(banner);
        }, {
            'e2e-recording-title': testInfo.title,
            'e2e-recording-note': BaseE2eTest.recordingNote,
            'e2e-recording-step': firstStep
        });
        await BaseE2eTest.startRecordingView(page, zoom);
        await BaseE2eTest.waitForCameraStill(page);
        await page.waitForTimeout(BaseE2eTest.gameplayRecordingStartDelayMs);
        FileHandler.createFolder(BaseE2eTest.videosDir);
        await page.screencast.start({
            path: FileHandler.joinPaths(
                BaseE2eTest.videosDir,
                BaseE2eTest.slugify(testInfo.title)+(suffix ? '-'+suffix : '')+'.webm'
            ),
            size: BaseE2eTest.videoSize
        });
        await BaseE2eTest.setCameraLerp(page, BaseE2eTest.recordingCameraLerp);
        BaseE2eTest.gameplayRecordingPages.push(page);
    }

    static async waitForCameraStill(page)
    {
        await page.waitForFunction(
            () => {
                let camera = window.reldens?.getActiveScene()?.cameras?.main;
                if(!camera || camera.fadeEffect?.isRunning){
                    return false;
                }
                let cameraScroll = Math.round(camera.scrollX)+'/'+Math.round(camera.scrollY);
                let isCameraStill = cameraScroll === window.e2eCameraScroll;
                window.e2eCameraScroll = cameraScroll;
                return isCameraStill;
            },
            null,
            {polling: BaseE2eTest.cameraStillPollMs, timeout: TimeConstants.SCENE_LOAD}
        );
    }

    static async stopGameplayRecording(page)
    {
        let recordingPageIndex = BaseE2eTest.gameplayRecordingPages.indexOf(page);
        if(-1 === recordingPageIndex){
            return false;
        }
        BaseE2eTest.gameplayRecordingPages.splice(recordingPageIndex, 1);
        await RecordingStepReadTimer.waitForRead(page);
        await page.screencast.stop().catch((error) => {
            Logger.error('[video] Could not stop the gameplay recording: '+error.message);
        });
        return true;
    }

    static async runPageFixture(browser, use, testInfo, suffix)
    {
        let context = await BaseE2eTest.makeContext(browser);
        let page = await context.newPage();
        await use(page);
        if(!page.isClosed() && !BaseE2eTest.gameplayRecordingPages.includes(page)) {
            await page.waitForTimeout(BaseE2eTest.longRun ? 3000 : 1500);
        }
        let video = page.video();
        let isGameplayRecorded = await BaseE2eTest.stopGameplayRecording(page);
        await context.close();
        if(isGameplayRecorded){
            await video.delete();
            return;
        }
        await BaseE2eTest.saveVideo(video, BaseE2eTest.slugify(testInfo.title), suffix);
    }

    static setupWorkerLogCapture()
    {
        let logPath = FileHandler.joinPaths(process.cwd(), 'test-results', 'tests.log');
        FileHandler.createFolder(FileHandler.joinPaths(process.cwd(), 'test-results'));
        let writeLog = (...args) => {
            FileHandler.appendToFile(logPath, args.map(a => 'object' === typeof a ? JSON.stringify(a) : ''+a).join(' ')+'\n');
        };
        console.log = writeLog;
        console.error = writeLog;
    }
}

BaseE2eTest.setupWorkerLogCapture();
module.exports.BaseE2eTest = BaseE2eTest;
