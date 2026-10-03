class TilesetAnimationsNormalizer
{

    static buildDefaultAnimation(name)
    {
        return {
            name,
            baseTile: null,
            defaultDuration: null,
            frames: []
        };
    }

    static normalizeTileId(value)
    {
        if(!SharedUtils.isSet(value) || '' === value){
            return null;
        }
        let parsedValue = Number(value);
        if(isNaN(parsedValue) || 0 > parsedValue){
            return null;
        }
        return Math.floor(parsedValue);
    }

    static normalizeDuration(value)
    {
        let parsedValue = TilesetAnimationsNormalizer.normalizeTileId(value);
        if(null === parsedValue || 0 === parsedValue){
            return null;
        }
        return parsedValue;
    }

    static normalizeFrames(frames)
    {
        if(!Array.isArray(frames)){
            return [];
        }
        let normalizedFrames = [];
        for(let frame of frames){
            let tileId = TilesetAnimationsNormalizer.normalizeTileId(frame.tile);
            if(null === tileId){
                continue;
            }
            normalizedFrames.push({
                tile: tileId,
                duration: TilesetAnimationsNormalizer.normalizeDuration(frame.duration)
            });
        }
        return normalizedFrames;
    }

    static normalizeAnimations(tileAnimations)
    {
        if(!Array.isArray(tileAnimations)){
            return [];
        }
        let normalizedAnimations = [];
        for(let animation of tileAnimations){
            normalizedAnimations.push({
                name: animation.name || '',
                baseTile: TilesetAnimationsNormalizer.normalizeTileId(animation.baseTile),
                defaultDuration: TilesetAnimationsNormalizer.normalizeDuration(animation.defaultDuration),
                frames: TilesetAnimationsNormalizer.normalizeFrames(animation.frames)
            });
        }
        return normalizedAnimations;
    }

    static stripSkippedAnimations(tilesets)
    {
        let result = [];
        for(let tileset of tilesets){
            if(!tileset.skipTileAnimations){
                result.push(tileset);
                continue;
            }
            result.push(Object.assign({}, tileset, {tileAnimations: []}));
        }
        return result;
    }

    static resolveDefaultDuration(tileset)
    {
        let tilesetDuration = TilesetAnimationsNormalizer.normalizeDuration(tileset.animationsDefaultDuration);
        if(null === tilesetDuration){
            return SharedUtils.ANIMATIONS_DEFAULT_DURATION;
        }
        return tilesetDuration;
    }

}
window.TilesetAnimationsNormalizer = TilesetAnimationsNormalizer;
