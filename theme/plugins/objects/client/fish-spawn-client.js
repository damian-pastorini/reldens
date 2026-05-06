/**
 *
 * Reldens - FishSpawnClient
 *
 */

const { TimingObjectClient } = require('reldens/lib/objects/client/object/type/timing-object-client');

class FishSpawnClient extends TimingObjectClient
{

    constructor(gameManager, props, currentPreloader)
    {
        super(gameManager, props, currentPreloader);
        this.progressBarFillColor = 0x00aaff;
    }

}

module.exports.FishSpawnClient = FishSpawnClient;
