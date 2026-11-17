/**
 *
 * Reldens - Enemies Wander Summary
 *
 * Samples the server snapshot of the room enemies with random movement and summarizes how they wander, checked
 * against the random movement rules: a free enemy only walks to tiles inside its area (original tile plus or minus its
 * max tiles), an enemy that rests outside its area (pushed by another body) walks back inside on its next move, and a
 * path that keeps the enemy blocked on the same tile is dropped on the second move check. Both rules are counted in the
 * random movement moves ("movesCount"), never in time, so a delayed timer on a loaded machine never fails them, and
 * the moves count of every free enemy must keep growing: a stretch without a new move longer than two "maxDelay" (one
 * full delay of room for the late timers) reports a stopped movement loop, which the moves rules alone never see.
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
    static RESTING_OUTSIDE_MOVES = 1;
    static BLOCKED_PATH_MOVES = 2;
    static STALLED_MOVES_DELAYS = 2;

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
            +' battle '+snapshot.inBattle
            +' moves '+snapshot.movesCount;
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

    static isMovesCountStalled(snapshot, previousSnapshot)
    {
        if(!previousSnapshot){
            return false;
        }
        return snapshot.movesCount === previousSnapshot.movesCount;
    }

    static longestStretch(snapshots, matchesSnapshot, measureKey)
    {
        let longestStretch = 0;
        let stretchStartValue = false;
        let previousSnapshot = false;
        for(let snapshot of snapshots){
            if(!matchesSnapshot(snapshot, previousSnapshot)){
                stretchStartValue = false;
                previousSnapshot = snapshot;
                continue;
            }
            if(false === stretchStartValue){
                stretchStartValue = snapshot[measureKey];
            }
            longestStretch = Math.max(longestStretch, snapshot[measureKey] - stretchStartValue);
            previousSnapshot = snapshot;
        }
        return longestStretch;
    }

    static measureMovement(snapshots)
    {
        return {
            destinationsOutside: snapshots.filter(
                snapshot => EnemiesWanderSummary.hasDestinationOutsideArea(snapshot)
            ).length,
            restingOutsideMoves: EnemiesWanderSummary.longestStretch(
                snapshots,
                snapshot => EnemiesWanderSummary.isRestingOutsideArea(snapshot),
                'movesCount'
            ),
            blockedMoves: EnemiesWanderSummary.longestStretch(
                snapshots,
                EnemiesWanderSummary.isBlockedOnPath,
                'movesCount'
            ),
            movesStalledMs: EnemiesWanderSummary.longestStretch(
                snapshots,
                EnemiesWanderSummary.isMovesCountStalled,
                'sampledAt'
            )
        };
    }

    static isInvalidMovement(movement, maxDelay)
    {
        return 0 < movement.destinationsOutside
            || EnemiesWanderSummary.RESTING_OUTSIDE_MOVES < movement.restingOutsideMoves
            || EnemiesWanderSummary.BLOCKED_PATH_MOVES < movement.blockedMoves
            || EnemiesWanderSummary.STALLED_MOVES_DELAYS * maxDelay < movement.movesStalledMs;
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
