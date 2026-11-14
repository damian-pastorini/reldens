/**
 *
 * Reldens - Timing Mining Steps
 *
 * The steps of the timing objects rules specs on the first forest mining rock (TimingObjectSession): the mining
 * prepared with the cancel rules of that rock changed for the group (and its server timing state read), the completed
 * mining (one timingComplete and the reward added once) and the cancelled one (one timingCancel and no reward after
 * the whole duration), a short walk of the player along the rock side that keeps it inside the rock interaction area,
 * a walk out of that area along a clear line of tiles, the interaction messages the server hands to the rock counted
 * (TimingObjectsProbe), the pending action flag a client keeps for the rock after its click, and the timing progress
 * bar and tool sprite a client keeps for the rock.
 *
 */

const { expect } = require('@playwright/test');
const { TimingObjectSession } = require('./timing-object-session');
const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { Navigation } = require('./navigation');
const { Phaser } = require('./phaser');
const { PhaserRange } = require('./phaser-range');
const { Login } = require('./login');
const { SecurityApi } = require('./security-api');
const { sc } = require('@reldens/utils');

class TimingMiningSteps
{

    static START = 'timingStart';
    static CANCEL = 'timingCancel';
    static COMPLETE = 'timingComplete';
    static SHORT_WALK_MS = 100;
    static OUT_OF_AREA_DISTANCES = [5, 4, 3];
    static SIDE_WALKS = {
        vertical: [{column: 0, row: -1, direction: 'up'}, {column: 0, row: 1, direction: 'down'}],
        horizontal: [{column: -1, row: 0, direction: 'left'}, {column: 1, row: 0, direction: 'right'}]
    };

    static async prepare(context, rules = {})
    {
        let mining = await TimingObjectSession.prepareMining(context.page, context.gameConfig, context.longRun);
        for(let ruleKey of Object.keys(rules)){
            await TimingObjectSession.changeObjectProperty(
                context.gameConfig,
                context.e2eGroup,
                mining.rockKey,
                ruleKey,
                rules[ruleKey]
            );
        }
        mining.rock = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect(mining.rock.key, 'The rock timing state must be read: '+mining.rock.error).toBe(mining.rockKey);
        mining.duration = mining.rock.timingDuration;
        return mining;
    }

    static async expectCompleted(page, mining, message)
    {
        await TimingObjectSession.waitForTimingAction(page, TimingMiningSteps.COMPLETE, mining.duration + mining.serverTimeout);
        await expect.poll(
            async () => await TimingObjectSession.fetchInventoryItemQty(page, mining.rewardItemId),
            {message: message+': one reward', timeout: mining.serverTimeout}
        ).toBe(mining.rewardQtyBefore + 1);
        expect(await TimingObjectSession.fetchRecordedActions(page), message+': one terminal message')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.COMPLETE]);
    }

    static async expectCancelled(page, mining, message)
    {
        await TimingObjectSession.waitForTimingAction(page, TimingMiningSteps.CANCEL, mining.duration + mining.serverTimeout);
        await TimingObjectSession.expectRewardAfterDuration(page, mining, mining.rewardQtyBefore, message+': no reward');
        expect(await TimingObjectSession.fetchRecordedActions(page), message+': one terminal message')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.CANCEL]);
    }

    static isInsideArea(position, rock)
    {
        return Math.abs(position.x - rock.x) < rock.interactionArea && Math.abs(position.y - rock.y) < rock.interactionArea;
    }

    static isBesideRock(position, rock)
    {
        return Math.abs(position.x - rock.x) >= Math.abs(position.y - rock.y);
    }

    static async fetchSideWalkDirection(page, position, rock)
    {
        let walks = TimingMiningSteps.SIDE_WALKS[TimingMiningSteps.isBesideRock(position, rock) ? 'vertical' : 'horizontal'];
        let walkableDirections = (await PhaserRange.filterWalkableOffsets(page, position.x, position.y, walks, Navigation.TILE_SIZE))
            .map(walk => walk.direction);
        expect(walkableDirections.length, 'A walkable tile along the rock side must exist').toBeGreaterThan(0);
        return [...walkableDirections].shift();
    }

    static async walkInsideArea(page, mining)
    {
        let position = await Phaser.getPlayerServerPosition(page);
        let direction = await TimingMiningSteps.fetchSideWalkDirection(page, position, mining.rock);
        await Navigation.walkInDirection(page, direction, TimingMiningSteps.SHORT_WALK_MS);
        await expect.poll(
            async () => sc.toJsonString(await Phaser.getPlayerServerPosition(page)),
            {message: 'The player must move', timeout: mining.serverTimeout}
        ).not.toBe(sc.toJsonString(position));
        let movedPosition = await Phaser.getPlayerServerPosition(page);
        expect(TimingMiningSteps.isInsideArea(movedPosition, mining.rock), 'The player stays inside the rock area').toBe(true);
        return movedPosition;
    }

    static async walkOutOfArea(context, mining, distances = TimingMiningSteps.OUT_OF_AREA_DISTANCES)
    {
        let playerName = context.gameConfig.e2ePlayerName;
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            context.longRun
        );
        let walkTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            distances
        );
        expect(walkTile, 'A clear line of tiles must start on the miner').toBeTruthy();
        let movement = await MovementScenario.movePlayer(context.page, walkContext, walkTile, walkContext.navTimeout);
        expect(movement.done, 'The miner must walk away: '+sc.toJsonString(movement.last)).toBe(true);
        expect(TimingMiningSteps.isInsideArea(movement.last, mining.rock), 'The player leaves the rock area').toBe(false);
        return movement.last;
    }

    static async countInteractions(gameConfig, group, objectKey)
    {
        let counted = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/timing-objects/count-interactions', {
            roomName: Login.FOREST_ROOM_NAME,
            group,
            objectKey
        });
        expect(counted.interactions, 'The interactions with '+objectKey+' must be counted: '+counted.error).toBe(0);
    }

    static async fetchInteractions(gameConfig, objectKey)
    {
        return (await SecurityApi.request(
            gameConfig,
            'GET',
            '/api/e2e/timing-objects/interactions?'+new URLSearchParams({objectKey}).toString()
        )).interactions;
    }

    static async fetchPendingAction(page, objectKey)
    {
        return await page.evaluate(
            (key) => Boolean(window.reldens.getActiveScene().objectsAnimations[key]?.pendingAction),
            objectKey
        );
    }

    static async fetchClientTiming(page, rockKey)
    {
        return await page.evaluate((objectKey) => {
            let timingObject = window.reldens.getActiveScene().objectsAnimations[objectKey] || {};
            return {
                hasBar: Boolean(timingObject.timingBar),
                hasBarInterval: Boolean(timingObject.timingBarInterval),
                hasTool: Boolean(timingObject.timingToolAnimation && timingObject.timingToolAnimation.toolSprite)
            };
        }, rockKey);
    }

}

module.exports.TimingMiningSteps = TimingMiningSteps;
