/**
 *
 * Reldens - Teleport NPC Data
 *
 * Reads the stored teleport NPC (the first object row of the teleport object type): its client key, its title, and the
 * value and label of its first option that has a destination, with that destination room.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { sc } = require('@reldens/utils');

class TeleportNpcData
{

    static TELEPORT_TYPE_KEY = 'teleport';

    static async load(gameConfig)
    {
        let teleportTypeId = await E2eSeedAndRestoreApi.fetchRowId(
            gameConfig,
            'objectsTypes',
            {key: TeleportNpcData.TELEPORT_TYPE_KEY}
        );
        let teleportRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {class_type: teleportTypeId})]
            .shift();
        expect(teleportRow, 'The teleport NPC must be stored').toBeTruthy();
        let destinations = sc.toJson(teleportRow.private_params, {}).destinations;
        let optionKey = [...Object.keys(destinations)].shift();
        let option = sc.toJson(teleportRow.client_params, {}).options[optionKey];
        expect(optionKey, 'The teleport NPC must have a destination').toBeTruthy();
        return {
            clientKey: teleportRow.client_key,
            title: teleportRow.title,
            optionValue: option.value,
            optionLabel: option.label,
            destinationRoom: destinations[optionKey].room
        };
    }

}

module.exports.TeleportNpcData = TeleportNpcData;
