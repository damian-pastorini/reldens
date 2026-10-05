/**
 *
 * Reldens - Enemies Wander Summary
 *
 * Samples the server snapshot of the room enemies with random movement and summarizes how they wander, checked
 * against the random movement rules: a free enemy only walks to tiles inside its area (original tile plus or minus its
 * max tiles), an enemy that rests outside its area (pushed by another body) walks back inside on its next move, at
 * most "maxDelay" later, and a path that keeps the enemy blocked on the same tile is dropped on the second move check.
 * Every invalid enemy is reported with its whole trail, so a failure shows the exact server data of each sample.
 *
 */

const { Login } = require('./login');
const { RoomObjectsApi } = require('./room-objects-api');
const { ObjectsConst } = require('../../../lib/objects/constants');

class EnemiesWanderSummary
{

    static SAMPLES = 120;
    static SAMPLE_INTERVAL_MS = 250;
    static BLOCKED_PATH_MOVES = 2;

    static addSnapshotsToSamples(samplesByKey, snapshots, isAggressive, sample, sampledAt)
    {
        for(let snapshot of snapshots){
            if(ObjectsConst.TYPE_ENEMY !== snapshot.type || isAggressive !== snapshot.isAggressive){
                continue;
            }
            if(0 === snapshot.maxTiles){
                continue;
            }
            if(!samplesByKey[snapshot.key]){
                samplesByKey[snapshot.key] = [];
            }
            samplesByKey[snapshot.key].push({...snapshot, sample, sampledAt});
        }
    }

    static async collectEnemiesSamples(page, gameConfig, isAggressive)
    {
        let samplesByKey = {};
        for(let sample = 0; sample < EnemiesWanderSummary.SAMPLES; sample++){
            EnemiesWanderSummary.addSnapshotsToSamples(
                samplesByKey,
                await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME),
                isAggressive,
                sample,
                Date.now()
            );
            await page.waitForTimeout(EnemiesWanderSummary.SAMPLE_INTERVAL_MS);
        }
        return samplesByKey;
    }

    static describeSnapshot(snapshot)
    {
        let destination = snapshot.destination
            ? ' to '+snapshot.destination.currentCol+','+snapshot.destination.currentRow
            : '';
        return '#'+snapshot.sample+' tile '+snapshot.currentCol+','+snapshot.currentRow
            +' origin '+snapshot.originalCol+','+snapshot.originalRow
            +' px '+snapshot.x+','+snapshot.y
            +' velocity '+snapshot.velocityX+','+snapshot.velocityY
            +' path '+snapshot.pathSteps+destination
            +' contacts '+snapshot.contacts.join('|')
            +' battle '+snapshot.inBattle;
    }

    static isTileOutsideArea(snapshot, tile)
    {
        return snapshot.maxTiles < Math.abs(tile.currentCol - snapshot.originalCol)
            || snapshot.maxTiles < Math.abs(tile.currentRow - snapshot.originalRow);
    }

    static hasDestinationOutsideArea(snapshot)
    {
        if(!snapshot.destination){
            return false;
        }
        return EnemiesWanderSummary.isTileOutsideArea(snapshot, snapshot.destination);
    }

    static isRestingOutsideArea(snapshot)
    {
        if(snapshot.destination){
            return false;
        }
        if(0 !== snapshot.velocityX || 0 !== snapshot.velocityY){
            return false;
        }
        return EnemiesWanderSummary.isTileOutsideArea(snapshot, snapshot);
    }

    static isBlockedOnPath(snapshot, previousSnapshot)
    {
        if(!snapshot.destination){
            return false;
        }
        if(!previousSnapshot || !previousSnapshot.destination){
            return false;
        }
        return snapshot.currentCol === previousSnapshot.currentCol
            && snapshot.currentRow === previousSnapshot.currentRow
            && snapshot.destination.currentCol === previousSnapshot.destination.currentCol
            && snapshot.destination.currentRow === previousSnapshot.destination.currentRow;
    }

    static longestStretchMs(snapshots, matchesSnapshot)
    {
        let longestMs = 0;
        let stretchStartedAt = false;
        let previousSnapshot = false;
        for(let snapshot of snapshots){
            if(!matchesSnapshot(snapshot, previousSnapshot)){
                stretchStartedAt = false;
                previousSnapshot = snapshot;
                continue;
            }
            if(false === stretchStartedAt){
                stretchStartedAt = snapshot.sampledAt;
            }
            longestMs = Math.max(longestMs, snapshot.sampledAt - stretchStartedAt);
            previousSnapshot = snapshot;
        }
        return longestMs;
    }

    static measureMovement(snapshots)
    {
        return {
            destinationsOutside: snapshots.filter(
                snapshot => EnemiesWanderSummary.hasDestinationOutsideArea(snapshot)
            ).length,
            restingOutsideMs: EnemiesWanderSummary.longestStretchMs(
                snapshots,
                snapshot => EnemiesWanderSummary.isRestingOutsideArea(snapshot)
            ),
            blockedMs: EnemiesWanderSummary.longestStretchMs(snapshots, EnemiesWanderSummary.isBlockedOnPath)
        };
    }

    static isInvalidMovement(movement, maxDelay)
    {
        return 0 < movement.destinationsOutside
            || maxDelay < movement.restingOutsideMs
            || EnemiesWanderSummary.BLOCKED_PATH_MOVES * maxDelay < movement.blockedMs;
    }

    static summarize(samplesByKey)
    {
        let summary = {freeKeys: [], inBattleKeys: [], wanderedKeys: [], invalidMovements: []};
        for(let key of Object.keys(samplesByKey)){
            let snapshots = samplesByKey[key];
            if(snapshots.some(snapshot => 0 < snapshot.inBattle)){
                summary.inBattleKeys.push(key);
                continue;
            }
            summary.freeKeys.push(key);
            let firstSnapshot = [...snapshots].shift();
            if(snapshots.some(snapshot => snapshot.x !== firstSnapshot.x || snapshot.y !== firstSnapshot.y)){
                summary.wanderedKeys.push(key);
            }
            let movement = EnemiesWanderSummary.measureMovement(snapshots);
            if(!EnemiesWanderSummary.isInvalidMovement(movement, firstSnapshot.maxDelay)){
                continue;
            }
            summary.invalidMovements.push({
                key,
                maxTiles: firstSnapshot.maxTiles,
                maxDelay: firstSnapshot.maxDelay,
                ...movement,
                trail: snapshots.map(snapshot => EnemiesWanderSummary.describeSnapshot(snapshot))
            });
        }
        return summary;
    }

}

module.exports.EnemiesWanderSummary = EnemiesWanderSummary;
