/**
 *
 * Reldens - TilesetAnimation
 *
 * This class will generate and run the animations.
 *
 */

class TilesetAnimation
{

    register(layer, tileData)
    {
        this.animations = [];
        this.registered = {};
        this.layer = null;
        this.layer = layer;
        let index = 0;
        for(let i of Object.keys(tileData)){
            let tile = tileData[i];
            tile.id = index++;
            tile.init = i;
            this.animations.push(tile);
        }
    }

    start()
    {
        for(let anim of this.animations){
            this.repeat(anim.id, anim.animation, anim.init, 0);
        }
    }

    repeat(id, animation, prev, index)
    {
        if(this.registered[id]){
            this.registered[id] = null;
        }
        this.layer.replaceByIndex(prev, animation[index].tileid+1);
        let total = animation.length;
        let duration = animation[index].duration;
        let indexTotal = (index+1) % total;
        let animationTile = animation[index % total].tileid+1;
        this.registered[id] = setTimeout(this.repeat.bind(this, id, animation, animationTile, indexTotal), duration);
    }

    destroy()
    {
        for(let i of Object.keys(this.registered)){
            if(this.registered[i]){
                clearTimeout(this.registered[i]);
            }
        }
    }

}

module.exports.TilesetAnimation = TilesetAnimation;
