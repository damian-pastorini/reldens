/**
 *
 * Reldens - AudioUpdate
 *
 * Represents an audio update message to be sent to the server.
 *
 */

const { AudioConst } = require('../constants');
const { GameConst } = require('../../game/constants');

class AudioUpdate
{

    /**
     * @param {string} updateType - The audio category key to update
     * @param {boolean} updateValue - Whether the audio category should be enabled or disabled
     */
    constructor(updateType, updateValue)
    {
        this[GameConst.ACTION_KEY] = AudioConst.AUDIO_UPDATE;
        this[AudioConst.MESSAGE.DATA.UPDATE_TYPE] = updateType;
        this[AudioConst.MESSAGE.DATA.UPDATE_VALUE] = updateValue;
    }

}

module.exports.AudioUpdate = AudioUpdate;
