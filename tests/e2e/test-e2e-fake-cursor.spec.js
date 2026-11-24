/**
 *
 * Reldens - Test E2E Fake Cursor
 *
 * Tests the fake cursor every e2e page draws for the recorded videos (BaseE2eTest.browserCursorScript): a click with no
 * hold, like every long run click, turns the pointer yellow and 32px on the mousedown and keeps that click state for at
 * least six frames of the 25 fps recorded videos after the mouseup, before it goes back to the red 16px pointer. Every
 * cursor size change is timed with a MutationObserver (the position and opacity changes are left out), so the check
 * reads the real page timers and never a video frame.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestE2eFakeCursor
{

    static VIDEO_FRAME_MS = 40;
    static SHOWN_FRAMES = 6;
    static CLICK_POINT = {x: 100, y: 100};

    static async recordCursorChanges(page)
    {
        await page.evaluate(() => {
            let cursorEl = document.getElementById('e2e-fake-cursor');
            window.e2eCursorChanges = [];
            window.e2eMouseUpAt = 0;
            let lastWidth = cursorEl.style.width;
            new MutationObserver(() => {
                if(lastWidth === cursorEl.style.width){
                    return;
                }
                lastWidth = cursorEl.style.width;
                window.e2eCursorChanges.push({at: performance.now(), width: lastWidth});
            }).observe(cursorEl, {attributes: true, attributeFilter: ['style']});
            document.addEventListener('mouseup', () => {
                window.e2eMouseUpAt = performance.now();
            });
        });
    }

    static async runClickStateTest(page)
    {
        await page.goto('/');
        await expect(page.locator('#e2e-fake-cursor'), 'The fake cursor is added to the page').toHaveCount(1);
        await TestE2eFakeCursor.recordCursorChanges(page);
        await page.mouse.click(TestE2eFakeCursor.CLICK_POINT.x, TestE2eFakeCursor.CLICK_POINT.y);
        await expect.poll(
            async () => page.evaluate(() => window.e2eCursorChanges.map(change => change.width)),
            {message: 'The click state is shown and then released', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(['32px', '16px']);
        let clickState = await page.evaluate(() => [window.e2eCursorChanges].map(
            (widthChanges) => ({
                shownBeforeMouseUp: widthChanges[0].at <= window.e2eMouseUpAt,
                shownAfterMouseUpMs: widthChanges[1].at - window.e2eMouseUpAt
            })
        ).pop());
        expect(clickState.shownBeforeMouseUp, 'The click state starts on the mousedown').toBe(true);
        expect(
            clickState.shownAfterMouseUpMs,
            'The click state stays for at least six video frames after the mouseup'
        ).toBeGreaterThanOrEqual(TestE2eFakeCursor.VIDEO_FRAME_MS * TestE2eFakeCursor.SHOWN_FRAMES);
    }

    static run()
    {
        test.describe('E2E Fake Cursor', () => {
            test('a click with no hold keeps the fake cursor click state for six video frames after the mouseup', async ({ page }) => {
                await TestE2eFakeCursor.runClickStateTest(page);
            });
        });
    }

}

TestE2eFakeCursor.run();
