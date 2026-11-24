/**
 *
 * Reldens - Test Rewards Drops
 *
 * Tests the drops of a killed enemy with both group players in the forest (exclusive group, KillRewardsSteps: the
 * configured enemy placed next to the first player with one hit point and its droppable reward changed for the group,
 * both clients recording the room messages and DropsProbe reading the drops of the room): the drops are created on
 * separate nodes and every client receives them; a pick up gives the item and removes the drop on every client, and the
 * second pick up of the same drop finds no object and sends the remove again; two players picking the same drop at the
 * same time get one item between them and a pick up sent twice in the same tick gives one item; a configured disappear
 * time removes the drops on
 * every client and a disappear time of zero keeps them; the auto pick up on hit gives the item when the player walks
 * over the drop and nothing with it off; a drop out of the configured drops or actions interaction distance is not
 * picked up; and a pick up with no drop id does nothing.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillRewardsSteps } = require('./helpers/kill-rewards-steps');
const { DeathDropSteps } = require('./helpers/death-drop-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Navigation } = require('./helpers/navigation');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsDrops
{

    static DROPS_PATH = 'server/objects/drops/';
    static DROP_QUANTITY = 3;
    static DISAPPEAR_MS = 2000;
    static OUT_OF_RANGE_DISTANCE = 1;
    static AROUND_DISTANCE = 2 * Navigation.TILE_SIZE;

    static async fetchRemoves(page, dropId)
    {
        return (await RoomMessagesRecorder.fetchMessages(page, ObjectsConst.DROPS.REMOVE)).filter(
            message => dropId === message.id
        ).length;
    }

    static async runDropsSeenTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, TestRewardsDrops.DROP_QUANTITY, {}, true);
        let dropIds = dropsKill.drops.map(drop => drop.id);
        expect(dropIds, 'The drops of the reward quantity are created').toHaveLength(TestRewardsDrops.DROP_QUANTITY);
        let killPosition = dropsKill.placement.position;
        expect(
            dropsKill.drops.filter(drop => TestRewardsDrops.AROUND_DISTANCE < Math.max(
                Math.abs(drop.x - killPosition.x),
                Math.abs(drop.y - killPosition.y)
            )),
            'The drops are around the killed enemy'
        ).toEqual([]);
        for(let player of dropsKill.players){
            let clientDrops = Object.assign({}, ...await DeathDropSteps.fetchDrops(player.page));
            expect(Object.keys(clientDrops), player.playerName+' receives the drops').toEqual(
                expect.arrayContaining(dropIds)
            );
            expect(
                new Set(dropIds.map(dropId => clientDrops[dropId].x+'-'+clientDrops[dropId].y)).size,
                'The drops are on separate nodes'
            ).toBe(TestRewardsDrops.DROP_QUANTITY);
        }
    }

    static async runPickUpTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let dropId = [...dropsKill.drops].shift().id;
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        let pickUp = Object.assign({id: dropId}, KillRewardsSteps.PICK_UP);
        await RoomMessagesRecorder.sendMessage(context.page, pickUp);
        let pickedQuantities = [quantities[0] + 1, quantities[1]];
        await expect.poll(async () => await KillRewardsSteps.fetchQuantities(context, dropsKill), {
            message: 'The picker gets the item',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual(pickedQuantities);
        for(let player of dropsKill.players){
            await expect.poll(async () => await TestRewardsDrops.fetchRemoves(player.page, dropId), {
                message: 'The drop is removed on '+player.playerName,
                timeout: TimeConstants.SERVER_RESPONSE
            }).toBe(1);
        }
        await RoomMessagesRecorder.sendMessage(context.secondPage, pickUp);
        await expect.poll(async () => await TestRewardsDrops.fetchRemoves(context.secondPage, dropId), {
            message: 'The second pick up finds no object and sends the remove again',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toBe(2);
        expect(await KillRewardsSteps.fetchQuantities(context, dropsKill), 'No item for the second pick up')
            .toEqual(pickedQuantities);
    }

    static async expectPickedOnce(context, dropsKill, dropId, quantities, message)
    {
        let expectedTotal = quantities[0] + quantities[1] + 1;
        await expect.poll(async () => {
            let pickedQuantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
            return pickedQuantities[0] + pickedQuantities[1];
        }, {message, timeout: TimeConstants.SERVER_RESPONSE}).toBe(expectedTotal);
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        let settledQuantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        expect(settledQuantities[0] + settledQuantities[1], message+', no second item later').toBe(expectedTotal);
        expect(
            (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).filter(drop => dropId === drop.id),
            'The picked drop is removed'
        ).toHaveLength(0);
        return settledQuantities;
    }

    static async runSimultaneousPickUpsTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let dropId = [...dropsKill.drops].shift().id;
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        let pickUp = Object.assign({id: dropId}, KillRewardsSteps.PICK_UP);
        await Promise.all(dropsKill.players.map(player => RoomMessagesRecorder.sendMessage(player.page, pickUp)));
        await TestRewardsDrops.expectPickedOnce(context, dropsKill, dropId, quantities, 'The two players get one item');
    }

    static async runDoublePickUpTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let dropId = [...dropsKill.drops].shift().id;
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        let pickUp = Object.assign({id: dropId}, KillRewardsSteps.PICK_UP);
        await RoomMessagesRecorder.sendMessages(context.page, [pickUp, pickUp]);
        let picked = await TestRewardsDrops.expectPickedOnce(context, dropsKill, dropId, quantities, 'One item for both');
        expect(picked, 'The picker gets the single item').toEqual([quantities[0] + 1, quantities[1]]);
    }

    static async runDisappearTest(context, disappearTime, keptDrops)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, {
            [TestRewardsDrops.DROPS_PATH+'disappearTime']: disappearTime
        });
        let dropId = [...Object.keys(Object.assign({}, ...await DeathDropSteps.fetchDrops(context.page)))].shift();
        await context.page.waitForTimeout(TestRewardsDrops.DISAPPEAR_MS + KillRewardsSteps.SETTLE_MS);
        expect(
            (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).filter(drop => dropId === drop.id),
            'The drops kept in the room'
        ).toHaveLength(keptDrops);
        for(let player of dropsKill.players){
            let removes = await TestRewardsDrops.fetchRemoves(player.page, dropId);
            expect(removes, 'Removes on '+player.playerName).toBe(1 - keptDrops);
        }
    }

    static async runAutoPickUpTest(context, autoPickUp, givenItems)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, {
            [TestRewardsDrops.DROPS_PATH+'autoPickUpOnHit']: autoPickUp
        });
        let dropId = [...dropsKill.drops].shift().id;
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        let clientDrop = Object.assign({}, ...await DeathDropSteps.fetchDrops(context.page))[dropId];
        let sent = await Navigation.moveToWorldPoint(context.page, clientDrop.x, clientDrop.y);
        let expectedQuantities = [quantities[0] + givenItems, quantities[1]];
        let walk = await RoomMovementApi.collectTrail(
            async () => ({
                quantities: await KillRewardsSteps.fetchQuantities(context, dropsKill),
                player: await RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName),
                other: await RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, dropsKill.players[1].playerName)
            }),
            (snapshot) => expectedQuantities.join() === snapshot.quantities.join(),
            TimeConstants.SERVER_RESPONSE
        );
        expect(
            walk.last.quantities,
            'The item given by walking over the drop (the client send, the drop, the player and the other player x, y,'
                +' velocity, path steps and contacts and the room drops): '+sc.toJsonString([sent, [clientDrop.x, clientDrop.y]])+' '
                +sc.toJsonString(RoomMovementApi.dropRepeatedSteps(walk.trail.map((snapshot) => [snapshot.player, snapshot.other].map(
                    (player) => [player.x, player.y, player.velocityX, player.velocityY, player.pathSteps, player.contacts]
                ))))+' '
                +sc.toJsonString(await DeathDropSteps.fetchRoomDrops(context.gameConfig))
        ).toEqual(expectedQuantities);
        await context.page.waitForTimeout(KillRewardsSteps.SETTLE_MS);
        expect(
            (await DeathDropSteps.fetchRoomDrops(context.gameConfig)).filter(drop => dropId === drop.id),
            'The drop kept in the room'
        ).toHaveLength(1 - givenItems);
    }

    static async runOutOfRangeTest(context, distancePath)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, {
            [distancePath]: TestRewardsDrops.OUT_OF_RANGE_DISTANCE
        });
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        await RoomMessagesRecorder.sendMessage(
            context.page,
            Object.assign({id: [...dropsKill.drops].shift().id}, KillRewardsSteps.PICK_UP)
        );
        await KillRewardsSteps.expectDropKept(context, dropsKill, quantities, 'No item out of the interaction distance');
    }

    static async runNoIdTest(context)
    {
        let dropsKill = await KillRewardsSteps.enterBothWithDrops(context, 1, KillRewardsSteps.DROPS_IN_RANGE);
        let quantities = await KillRewardsSteps.fetchQuantities(context, dropsKill);
        await RoomMessagesRecorder.sendMessage(context.page, KillRewardsSteps.PICK_UP);
        await KillRewardsSteps.expectDropKept(context, dropsKill, quantities, 'No item without a drop id');
    }

    static run()
    {
        test.describe('Rewards Drops', () => {
            test('drops are created on separate nodes and every client receives them', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runDropsSeenTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('picked drop gives the item and is removed on every client, a second pick up finds no object', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runPickUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('same drop picked by both players at the same time gives one item', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runSimultaneousPickUpsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('pick up sent twice in the same tick gives one item', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runDoublePickUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('configured disappear time removes the drops on every client', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runDisappearTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    TestRewardsDrops.DISAPPEAR_MS,
                    0
                );
            });
            test('disappear time zero keeps the drops', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runDisappearTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, 0, 1);
            });
            test('auto pick up on hit gives the item when walking over the drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runAutoPickUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, true, 1);
            });
            test('auto pick up on hit off gives nothing when walking over the drop', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runAutoPickUpTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, false, 0);
            });
            test('drop out of the drops interaction distance is not picked up', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runOutOfRangeTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    TestRewardsDrops.DROPS_PATH+'interactionsDistance'
                );
            });
            test('drop out of the actions interaction distance is not picked up', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runOutOfRangeTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'server/objects/actions/interactionsDistance'
                );
            });
            test('pick up without a drop id does nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsDrops.runNoIdTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsDrops.run();
