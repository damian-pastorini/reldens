/**
 *
 * Reldens - Scene Interpolation Branches Showcase
 *
 * Long run only: shows on the real frames what the scene interpolation branches probe checks in one page evaluation,
 * which shows nothing by itself. The branches without motion are grouped in one short caption for the player and one
 * for the objects. The player and the NPC then get the moving entries the probe crafted, slowed only for the video, so
 * they are seen stepping to the same targets, the player stops with the client interpolation off and goes on with it
 * on, and the stopped entries with the real state place them back in one frame, restoring the configured speed. The
 * crafted bullet of the probe is a plain object that is never drawn, so nothing is shown or said about it. The normal
 * run skips all of it.
 *
 */

const { LongRunShowcase } = require('./long-run-showcase');
const { SceneInterpolationProbe } = require('./scene-interpolation-probe');
const { SceneInterpolationShowcase } = require('./scene-interpolation-showcase');

class SceneInterpolationBranchesShowcase
{

    static PLAYER_SKIPPED_CAPTION = 'No state, sprite or player engine, or already in place: the player does not move';
    static NPC_SKIPPED_CAPTION = 'No animation, no entry or already in place: the NPC does not move';
    static PLAYER_VISIBLE_SPEED = 0.008;
    static NPC_VISIBLE_SPEED = 0.03;
    static MOVING_ENTRY_MS = 2000;
    static PAUSED_ENTRY_MS = 1200;
    static STOPPED_ENTRY_MS = 1200;

    static async showResults(page, playersResults, objectsResults, npcKey, longRun)
    {
        if(!longRun){
            return false;
        }
        await SceneInterpolationBranchesShowcase.showPlayerMotion(page, playersResults);
        await LongRunShowcase.showStep(page, SceneInterpolationBranchesShowcase.NPC_SKIPPED_CAPTION, true);
        await SceneInterpolationBranchesShowcase.showNpcMotion(page, objectsResults, npcKey);
        return true;
    }

    static async showPlayerMotion(page, results)
    {
        let movingTo = results.moving.state;
        let visibleSpeed = SceneInterpolationBranchesShowcase.PLAYER_VISIBLE_SPEED;
        await SceneInterpolationShowcase.runStep(
            page,
            'Moving: the player steps closer to '+movingTo.x+','+movingTo.y+' on every frame (slowed for this video)',
            () => SceneInterpolationProbe.setVisibleEntry(page, '', visibleSpeed, movingTo),
            SceneInterpolationBranchesShowcase.MOVING_ENTRY_MS
        );
        await SceneInterpolationShowcase.runStep(
            page,
            'Client interpolation off: the target is kept but the player stops getting closer',
            () => SceneInterpolationProbe.setVisibleEntry(page, '', visibleSpeed, movingTo, false),
            SceneInterpolationBranchesShowcase.PAUSED_ENTRY_MS
        );
        await SceneInterpolationShowcase.runStep(
            page,
            'Client interpolation on again: the player keeps getting closer',
            () => SceneInterpolationProbe.setVisibleEntry(page, '', visibleSpeed, movingTo),
            SceneInterpolationBranchesShowcase.PAUSED_ENTRY_MS
        );
        await SceneInterpolationShowcase.runStep(
            page,
            'Stopped: the player is placed on its real position in one frame',
            () => SceneInterpolationProbe.setVisibleEntry(page, '', results.interpolationSpeed),
            0
        );
        await LongRunShowcase.waitForCamera(page, true);
    }

    static async showNpcMotion(page, results, npcKey)
    {
        let movingTo = results.moving.objectState;
        await SceneInterpolationShowcase.runStep(
            page,
            'Moving: the NPC steps closer to '+movingTo.x+','+movingTo.y+' on every frame (slowed for this video)',
            () => SceneInterpolationProbe.setVisibleEntry(
                page,
                npcKey,
                SceneInterpolationBranchesShowcase.NPC_VISIBLE_SPEED,
                movingTo
            ),
            SceneInterpolationBranchesShowcase.MOVING_ENTRY_MS
        );
        await SceneInterpolationShowcase.runStep(
            page,
            'Stopped: the NPC is placed on its real position in one frame',
            () => SceneInterpolationProbe.setVisibleEntry(page, npcKey, results.interpolationSpeed),
            SceneInterpolationBranchesShowcase.STOPPED_ENTRY_MS
        );
    }

}

module.exports.SceneInterpolationBranchesShowcase = SceneInterpolationBranchesShowcase;
