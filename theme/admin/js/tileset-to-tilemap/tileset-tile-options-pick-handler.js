class TilesetTileOptionsPickHandler
{
    constructor(binder)
    {
        this.binder = binder;
    }

    ensureArray(target, key)
    {
        let arr = target[key];
        if(!arr){
            arr = [];
        }
        return arr;
    }

    applyToggleResult(target, key, arr, idx, value)
    {
        if(-1 !== idx){
            arr.splice(idx, 1);
            target[key] = arr;
            return;
        }
        arr.push(value);
        target[key] = arr;
    }

    toggleArrayOption(target, key, flatIndex)
    {
        let arr = this.ensureArray(target, key);
        let idx = arr.indexOf(flatIndex);
        this.applyToggleResult(target, key, arr, idx, flatIndex);
    }

    handleTileClick(tilesetIndex, row, col)
    {
        let activeTI = this.binder.activeTilesetIndex;
        let sourceTI = (-1 === activeTI) ? tilesetIndex : activeTI;
        let tileset = this.binder.app.state[sourceTI];
        let flatIndex = row * tileset.tilesetColumns + col;
        let optionKey = this.binder.activeOptionKey;
        let posKey = this.binder.activePositionKey;
        let spotName = this.binder.activeSpotName;
        if(spotName){
            this.handleSpotTilePick(sourceTI, spotName, optionKey, posKey, flatIndex);
            this.binder.applyToTilesetRow(sourceTI);
            this.binder.app.renderer.renderCanvas(sourceTI);
            return;
        }
        if(-1 === activeTI){
            this.handleGlobalOptionPick(optionKey, posKey, flatIndex, tilesetIndex);
            this.binder.apply.applyToRow(-1, null);
            this.binder.app.renderAllCanvases();
            return;
        }
        this.handleGlobalTilePick(activeTI, optionKey, posKey, flatIndex);
        this.binder.applyToTilesetRow(activeTI);
        this.binder.app.renderer.renderCanvas(activeTI);
    }

    handleGlobalOptionPick(optionKey, posKey, flatIndex, tilesetIndex)
    {
        if(!this.binder.app.globalTileOptions){
            this.binder.app.globalTileOptions = this.binder.buildDefaultTileOptions();
        }
        let opts = this.binder.app.globalTileOptions;
        let entry = {tilesetIndex, flatIndex};
        if('randomGroundTiles' === optionKey){
            this.toggleGlobalArrayOption(opts, 'randomGroundTiles', entry);
            return;
        }
        if(null !== posKey){
            this.applyGlobalPositionalPick(opts, optionKey, posKey, flatIndex, tilesetIndex);
            return;
        }
        opts[optionKey] = entry;
    }

    toggleGlobalArrayOption(target, key, entry)
    {
        let arr = this.ensureArray(target, key);
        let idx = -1;
        for(let i = 0; i < arr.length; i++){
            if(arr[i].flatIndex === entry.flatIndex && arr[i].tilesetIndex === entry.tilesetIndex){
                idx = i;
                break;
            }
        }
        this.applyToggleResult(target, key, arr, idx, entry);
    }

    applyGlobalPositionalPick(target, optionKey, posKey, flatIndex, tilesetIndex)
    {
        if(!target[optionKey]){
            target[optionKey] = {};
        }
        target[optionKey][posKey] = {tilesetIndex, flatIndex};
        this.advanceToNextPosition(-1);
    }

    handleSpotTilePick(tilesetIndex, spotName, optionKey, posKey, flatIndex)
    {
        let spot = this.binder.findSpot(tilesetIndex, spotName);
        if(!spot){
            return;
        }
        if('spotTile' === optionKey){
            spot.spotTile = flatIndex;
            return;
        }
        if('spotTileVariations' === optionKey){
            this.toggleArrayOption(spot, 'spotTileVariations', flatIndex);
            return;
        }
        if(null !== posKey){
            this.applyPositionalPick(spot, optionKey, posKey, flatIndex, tilesetIndex);
        }
    }

    handleGlobalTilePick(tilesetIndex, optionKey, posKey, flatIndex)
    {
        let tileset = this.binder.app.state[tilesetIndex];
        if(!tileset.tileOptions){
            tileset.tileOptions = this.binder.buildDefaultTileOptions();
        }
        let tileOpts = tileset.tileOptions;
        if('randomGroundTiles' === optionKey){
            this.toggleArrayOption(tileOpts, 'randomGroundTiles', flatIndex);
            return;
        }
        if(null !== posKey){
            this.applyPositionalPick(tileOpts, optionKey, posKey, flatIndex, tilesetIndex);
            return;
        }
        tileOpts[optionKey] = flatIndex;
    }

    applyPositionalPick(target, optionKey, posKey, flatIndex, tilesetIndex)
    {
        if(!target[optionKey]){
            target[optionKey] = {};
        }
        target[optionKey][posKey] = flatIndex;
        this.advanceToNextPosition(tilesetIndex);
    }

    resolvePickTarget(tilesetIndex, spotName, optionKey)
    {
        if(spotName){
            let spot = this.binder.findSpot(tilesetIndex, spotName);
            if(spot){
                let val = spot[optionKey];
                return val ? val : {};
            }
            return {};
        }
        if(-1 === tilesetIndex){
            let opts = this.binder.app.globalTileOptions;
            if(!opts){
                return {};
            }
            let val = opts[optionKey];
            return val ? val : {};
        }
        let tileset = this.binder.app.state[tilesetIndex];
        let tileOpts = tileset.tileOptions;
        if(!tileOpts){
            return {};
        }
        let val = tileOpts[optionKey];
        return val ? val : {};
    }

    advanceToNextPosition(tilesetIndex)
    {
        let optionKey = this.binder.activeOptionKey;
        let order = this.binder.positionOrders[optionKey];
        if(!order){
            this.binder.deactivate();
            return;
        }
        let resolveIndex = (-1 === this.binder.activeTilesetIndex) ? -1 : tilesetIndex;
        let target = this.resolvePickTarget(resolveIndex, this.binder.activeSpotName, optionKey);
        let nextPos = null;
        for(let pos of order){
            if(null === target[pos] || undefined === target[pos]){
                nextPos = pos;
                break;
            }
        }
        if(!nextPos){
            this.binder.deactivate();
            return;
        }
        this.binder.activatePosition(nextPos);
    }
}
