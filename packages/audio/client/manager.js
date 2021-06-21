/**
 *
 * Reldens - Audio Manager
 *
 */

const { sc } = require('@reldens/utils');

class AudioManager
{

    constructor(props)
    {
        this.audioCategories = sc.getDef(props, 'audioCategories', {});
        this.globalAudios = sc.getDef(props, 'globalAudios', {});
        this.roomsAudios = sc.getDef(props, 'roomsAudios', {});
        this.soundsEnabled = sc.getDef(this.props, 'soundsEnabled', false);
        this.musicEnabled = sc.getDef(this.props, 'musicEnabled', false);
        this.playing = {};
    }

    setAudio(audioType, enabled)
    {
        let isEnabled = Boolean(enabled);
        this[audioType+'Enabled'] = isEnabled;
        if(!sc.hasOwn(this.playing, audioType)){
            return false;
        }
        let playOrStop = isEnabled ? 'play' : 'stop';
        if(sc.isArray(this.playing[audioType])){
            for(let playingAudio of this.playing[audioType]){
                playingAudio[playOrStop]();
            }
        } else {
            this.playing[audioType][playOrStop]();
        }
    }

}

module.exports.AudioManager = AudioManager;
