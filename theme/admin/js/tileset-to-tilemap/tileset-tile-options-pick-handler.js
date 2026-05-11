/* exported TilesetTileOptionsPickHandler */
class TilesetTileOptionsPickHandler
{
    constructor(binder)
    {
        this.binder = binder;
    }

    ensureArray(target, key)
    {
        let itemsArray = target[key];
        if(!itemsArray){
            itemsArray = [];
        }
        return itemsArray;
    }

    applyToggleResult(target, key, itemsArray, foundIndex, value)
    {
        if(-1 !== foundIndex){
            itemsArray.splice(foundIndex, 1);
            target[key] = itemsArray;
            return;
        }
        itemsArray.push(value);
        target[key] = itemsArray;
    }

    toggleArrayOption(target, key, flatIndex)
    {
        let itemsArray = this.ensureArray(target, key);
        let foundIndex = itemsArray.indexOf(flatIndex);
        this.applyToggleResult(target, key, itemsArray, foundIndex, flatIndex);
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
        let globalOptions = this.binder.app.globalTileOptions;
        let entry = {tilesetIndex, flatIndex};
        if('randomGroundTiles' === optionKey){
            this.toggleGlobalArrayOption(globalOptions, 'randomGroundTiles', entry);
            return;
        }
        if(null !== posKey){
            this.applyGlobalPositionalPick(globalOptions, optionKey, posKey, flatIndex, tilesetIndex);
            return;
        }
        globalOptions[optionKey] = entry;
    }

    toggleGlobalArrayOption(target, key, entry)
    {
        let itemsArray = this.ensureArray(target, key);
        let foundIndex = -1;
        for(let i = 0; i < itemsArray.length; i++){
            if(itemsArray[i].flatIndex === entry.flatIndex && itemsArray[i].tilesetIndex === entry.tilesetIndex){
                foundIndex = i;
                break;
            }
        }
        this.applyToggleResult(target, key, itemsArray, foundIndex, entry);
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
            this.advanceFromSpotTile(tilesetIndex, spot);
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
                return spot[optionKey] ? spot[optionKey] : {};
            }
            return {};
        }
        if(-1 === tilesetIndex){
            let globalOptions = this.binder.app.globalTileOptions;
            if(!globalOptions){
                return {};
            }
            return globalOptions[optionKey] ? globalOptions[optionKey] : {};
        }
        let tileset = this.binder.app.state[tilesetIndex];
        let tileOpts = tileset.tileOptions;
        if(!tileOpts){
            return {};
        }
        return tileOpts[optionKey] ? tileOpts[optionKey] : {};
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
        let spotName = this.binder.activeSpotName;
        let target = this.resolvePickTarget(resolveIndex, spotName, optionKey);
        let nextPos = this.findNextEmptyPosition(order, target, null);
        if(null !== nextPos && '0,0' === nextPos && 'surroundingTiles' === optionKey){
            let spot = spotName ? this.binder.findSpot(resolveIndex, spotName) : null;
            if(spot && (null === spot.spotTile || undefined === spot.spotTile)){
                this.activateAndShowOption(resolveIndex, 'spotTile', spotName);
                return;
            }
            nextPos = this.findNextEmptyPosition(order, target, '0,0');
        }
        if(!nextPos){
            this.binder.deactivate();
            return;
        }
        this.binder.activatePosition(nextPos);
    }

    activateAndShowOption(tilesetIndex, optionKey, spotName)
    {
        this.binder.activateOption(tilesetIndex, optionKey, false, spotName);
        let rowEl = this.binder.getTilesetRowEl(tilesetIndex);
        if(!rowEl){
            return;
        }
        let container = spotName ? rowEl.querySelector('.spot-row[data-spot-name="'+spotName+'"]') : rowEl;
        if(container){
            let optionBtn = container.querySelector('.tile-option-btn[data-option="'+optionKey+'"]');
            if(optionBtn){
                optionBtn.classList.add('active');
            }
        }
        this.binder.apply.updateBanner(tilesetIndex, rowEl);
    }

    advanceFromSpotTile(tilesetIndex, spot)
    {
        let spotName = this.binder.activeSpotName;
        this.binder.deactivate();
        let target = spot.surroundingTiles ? spot.surroundingTiles : {};
        let nextPos = this.findNextEmptyPosition(this.binder.positionOrders.surroundingTiles, target, '0,0');
        if(!nextPos){
            return;
        }
        this.activateAndShowOption(tilesetIndex, 'surroundingTiles', spotName);
        this.binder.activatePosition(nextPos);
    }

    findNextEmptyPosition(order, target, skipKey)
    {
        for(let posKey of order){
            if(posKey === skipKey){
                continue;
            }
            if(null === target[posKey] || undefined === target[posKey]){
                return posKey;
            }
        }
        return null;
    }
}
window.TilesetTileOptionsPickHandler = TilesetTileOptionsPickHandler;
