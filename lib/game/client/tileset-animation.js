/**
 *
 * Reldens - TileSetAnimation
 *
 * Handles animated tiles in Phaser tilemaps by cycling through tile frames based on tileset
 * animation data. Registers tile animations from tileset metadata and uses timers to swap
 * tiles at specified durations, creating animated map elements.
 *
 */

class TileSetAnimation
{

    /**
     * @param {Object} [props]
     * @param {Object} [props.timer]
     */
    constructor(props)
    {
        this.timer = props?.timer;
    }

    /**
     * @param {Phaser.Tilemaps.TilemapLayer} layer
     * @param {Object} tileset
     */
    register(layer, tileset)
    {
        this.animations = [];
        this.registered = {};
        this.layer = layer;
        this.tileset = tileset;
        for(let i of Object.keys(tileset.tileData)){
            let tileData = tileset.tileData[i];
            if(!tileData.animation){
                continue;
            }
            tileData.id = i;
            let indexCounter = 0;
            for(let anInd of tileData.animation){
                if(Number(i) === Number(anInd?.tileid || 0)){
                    tileData.initIndex = indexCounter;
                    break;
                }
                indexCounter++;
            }
            this.animations.push(tileData);
        }
    }

    start()
    {
        for(let anim of this.animations){
            let animation = anim.animation;
            let total = animation.length;
            let startIndex = Number(anim.initIndex || 0);
            let next = Number((startIndex+1) % total);
            this.repeat(anim, startIndex, next);
        }
    }

    /**
     * @param {Object} anim
     * @param {number} index
     * @param {number} next
     */
    repeat(anim, index, next)
    {
        let id = anim.id;
        if(this.registered[id]){
            this.registered[id] = null;
        }
        let animation = anim.animation;
        let total = animation.length;
        let firstId = Number(this.tileset.firstgid);
        let replaceTile = Number(anim.animation[index].tileid)+firstId;
        let replacementTile = Number(anim.animation[next].tileid)+firstId;
        this.layer.replaceByIndex(replaceTile, replacementTile);
        let duration = animation[next].duration;
        let indexTotal = Number((next+1) % total);
        this.registered[id] = this.setTimeout(this.repeat.bind(this, anim, Number(next), indexTotal), duration);
    }

    destroy()
    {
        for(let i of Object.keys(this.registered)){
            if(this.registered[i]){
                this.clearTimeout(this.registered[i]);
            }
        }
    }

    /**
     * @param {Function} callback
     * @param {number} duration
     * @returns {*}
     */
    setTimeout(callback, duration)
    {
        if(this.timer){
            return this.timer.setTimeout(callback, duration);
        }
        // fallback for old timers:
        // @ts-ignore
        return setTimeout(callback, duration);
    }

    /**
     * @param {*} timer
     * @returns {*}
     */
    clearTimeout(timer)
    {
        if(this.timer){
            return this.timer.clearTimeout(timer);
        }
        // fallback for old timers:
        // @ts-ignore
        return clearTimeout(timer);
    }

}

module.exports.TileSetAnimation = TileSetAnimation;
