/**
 *
 * Reldens - Package Interface
 *
 */

const { Logger } = require('@reldens/utils');

class PackInterface
{

    setupPack(props)
    {
        Logger.error('Setup pack not implemented.', props);
    }

}

module.exports.PackInterface = PackInterface;
