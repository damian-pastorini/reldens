/**
 *
 * Reldens - Test Admin Tileset Upload
 *
 * Tests the administration Tileset Analyzer upload on the running server (the e2e servers run the analyzer with skipAi):
 * the sample gravity tileset is picked in the page with the tile size, spacing and margin of its map, the analysis ends
 * with the columns, rows and image size of that map tileset, the session is saved and listed with its state, its process
 * log and its uploaded image, the reloaded page lists it, and the session deleted with its id leaves the list.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { TimeConstants } = require('./helpers/time-constants');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminTilesetUpload
{

    static MAPS_PATH = FileHandler.joinPaths(process.cwd(), 'theme', 'default', 'assets', 'maps');
    static MAP_NAME = 'reldens-gravity';
    static DONE_EVENT = 'event: done';

    static tilesetPath(gameConfig)
    {
        return AdminPanelSession.adminPath(gameConfig)+'/tileset-analyzer';
    }

    static loadMapTileset()
    {
        let mapJson = FileHandler.fetchFileJson(
            FileHandler.joinPaths(TestAdminTilesetUpload.MAPS_PATH, TestAdminTilesetUpload.MAP_NAME+'.json')
        );
        expect(mapJson, 'The gravity map json is readable').toBeTruthy();
        return mapJson.tilesets[0];
    }

    static parseDoneEvent(streamText)
    {
        let doneBlock = streamText.split('\n\n').find(block => block.startsWith(TestAdminTilesetUpload.DONE_EVENT));
        expect(doneBlock, 'The upload stream ends with the done event: '+streamText).toBeTruthy();
        return sc.toJson(doneBlock.split('\ndata: ')[1], {});
    }

    static async fetchSessions(page, gameConfig)
    {
        let response = await page.request.get(TestAdminTilesetUpload.tilesetPath(gameConfig)+'/sessions');
        expect(response.status(), 'The sessions list answers').toBe(200);
        return (await response.json()).sessions;
    }

    static async uploadMapTileset(page, gameConfig, longRun, mapTileset)
    {
        await page.goto(TestAdminTilesetUpload.tilesetPath(gameConfig)+'/');
        await page.setInputFiles('#file-input', FileHandler.joinPaths(TestAdminTilesetUpload.MAPS_PATH, mapTileset.image));
        await page.fill('.param-tile-width', String(mapTileset.tilewidth));
        await page.fill('.param-tile-height', String(mapTileset.tileheight));
        await page.fill('.param-spacing', String(mapTileset.spacing));
        await page.fill('.param-margin', String(mapTileset.margin));
        let responseTimeout = {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)};
        let uploadResponse = page.waitForResponse(
            (response) => 'POST' === response.request().method() && response.url().endsWith('/upload'),
            responseTimeout
        );
        let saveResponse = page.waitForResponse(
            (response) => 'POST' === response.request().method() && response.url().endsWith('/save'),
            responseTimeout
        );
        await page.click('.analyze-btn');
        let doneData = TestAdminTilesetUpload.parseDoneEvent(await (await uploadResponse).text());
        let savedSession = await (await saveResponse).json();
        await expect(page.locator('.review-section'), 'The review section shows the analyzed tileset').toBeVisible(
            responseTimeout
        );
        return {doneData, savedSession};
    }

    static async runUploadTest(page, screenshots, gameConfig, longRun)
    {
        let mapTileset = TestAdminTilesetUpload.loadMapTileset();
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        let uploaded = await TestAdminTilesetUpload.uploadMapTileset(page, gameConfig, longRun, mapTileset);
        await screenshots.capture(page, 'tileset-upload-analyzed');
        let sessionId = uploaded.doneData.sessionId;
        let tileset = uploaded.doneData.tilesets[0];
        expect(
            [
                uploaded.doneData.tilesets.length,
                tileset.filename,
                tileset.imageWidth,
                tileset.imageHeight,
                tileset.tilesetColumns,
                tileset.tileRows,
                tileset.tileCount,
                uploaded.savedSession.success
            ],
            'The analyzed tileset has the image size, columns, rows and tiles of the map tileset and is saved'
        ).toEqual([
            1,
            mapTileset.image,
            mapTileset.imagewidth,
            mapTileset.imageheight,
            mapTileset.columns,
            mapTileset.tilecount / mapTileset.columns,
            mapTileset.tilecount,
            true
        ]);
        let listedSession = (await TestAdminTilesetUpload.fetchSessions(page, gameConfig))
            .find(session => session.sessionId === sessionId);
        expect(listedSession, 'The uploaded session is listed: '+sessionId).toBeTruthy();
        let listedFiles = listedSession.files.map(file => file.type+':'+file.name);
        for(let expectedFile of ['output:session-editor-state.json', 'output:_process.log', 'input:'+tileset.imageId]){
            expect(listedFiles, 'The session lists '+expectedFile).toContain(expectedFile);
        }
        let imageResponse = await page.request.get(TestAdminTilesetUpload.tilesetPath(gameConfig)+'/'+tileset.imageUrl);
        expect(imageResponse.status(), 'The uploaded image is served').toBe(200);
        await page.reload();
        await expect(
            page.locator('.generated-files-list [data-session-id="'+sessionId+'"]'),
            'The reloaded page lists the session'
        ).toHaveCount(1, {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)});
        await screenshots.capture(page, 'tileset-upload-session-listed');
        let deleteResponse = await page.request.delete(TestAdminTilesetUpload.tilesetPath(gameConfig)+'/sessions/'+sessionId, {
            headers: {'x-csrf-token': await AdminPanelSession.fetchCsrfToken(page)}
        });
        expect(deleteResponse.status(), 'The session is deleted').toBe(200);
        let remainingIds = (await TestAdminTilesetUpload.fetchSessions(page, gameConfig)).map(session => session.sessionId);
        expect(remainingIds, 'The deleted session leaves the list').not.toContain(sessionId);
    }

    static run()
    {
        test.describe('Admin Tileset Upload', () => {
            test('tileset uploaded from the Tileset Analyzer is analyzed with the map tile size, saved and listed as a session', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestAdminTilesetUpload.runUploadTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestAdminTilesetUpload.run();
