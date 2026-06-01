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
        if(-1 !== activeTI && activeTI !== tilesetIndex){
            return;
        }
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
            this.handleGlobalOptionPick(optionKey, posKey, flatIndex, tileset.filename);
            this.binder.apply.applyToRow(-1, null);
            this.binder.app.renderAllCanvases();
            return;
        }
        this.handleGlobalTilePick(activeTI, optionKey, posKey, flatIndex);
        this.binder.applyToTilesetRow(activeTI);
        this.binder.app.renderer.renderCanvas(activeTI);
    }

    handleGlobalOptionPick(optionKey, posKey, flatIndex, tilesetKey)
    {
        if(!this.binder.app.globalTileOptions){
            this.binder.app.globalTileOptions = this.binder.buildDefaultTileOptions();
        }
        let globalOptions = this.binder.app.globalTileOptions;
        let entry = {tilesetKey, flatIndex};
        if('randomGroundTiles' === optionKey){
            this.toggleGlobalArrayOption(globalOptions, 'randomGroundTiles', entry);
            return;
        }
        if(null !== posKey){
            this.applyGlobalPositionalPick(globalOptions, optionKey, posKey, flatIndex, tilesetKey);
            return;
        }
        globalOptions[optionKey] = entry;
        if('pathTile' === optionKey){
            this.advanceFromPathTile(-1);
        }
    }

    toggleGlobalArrayOption(target, key, entry)
    {
        let itemsArray = this.ensureArray(target, key);
        let foundIndex = -1;
        for(let i = 0; i < itemsArray.length; i++){
            if(itemsArray[i].flatIndex === entry.flatIndex && itemsArray[i].tilesetKey === entry.tilesetKey){
                foundIndex = i;
                break;
            }
        }
        this.applyToggleResult(target, key, itemsArray, foundIndex, entry);
    }

    applyGlobalPositionalPick(target, optionKey, posKey, flatIndex, tilesetKey)
    {
        if(!target[optionKey]){
            target[optionKey] = {};
        }
        target[optionKey][posKey] = {tilesetKey, flatIndex};
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
        if('pathTile' === optionKey){
            this.advanceFromPathTile(tilesetIndex);
        }
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
            if(spot){
                nextPos = this.findNextEmptyPosition(order, target, '0,0');
            }
            if(!spot && !this.isPathTileSet(resolveIndex)){
                this.activateAndShowOption(resolveIndex, 'pathTile', null);
                return;
            }
            if(!spot){
                nextPos = this.findNextEmptyPosition(order, target, '0,0');
            }
        }
        if(!nextPos){
            this.binder.deactivate();
            return;
        }
        this.binder.activatePosition(nextPos);
    }

    showOptionActiveInContainer(rootEl, tilesetIndex, optionKey, spotName)
    {
        let container = spotName ? rootEl.querySelector('.spot-row[data-spot-name="'+spotName+'"]') : rootEl;
        if(container){
            let optionBtn = container.querySelector('.tile-option-btn[data-option="'+optionKey+'"]');
            if(optionBtn){
                optionBtn.classList.add('active');
            }
        }
        this.binder.apply.updateBanner(tilesetIndex, rootEl);
    }

    activateAndShowOption(tilesetIndex, optionKey, spotName)
    {
        this.binder.activateOption(tilesetIndex, optionKey, false, spotName);
        if(-1 === tilesetIndex){
            this.binder.withGlobalPanel((panel) => {
                this.showOptionActiveInContainer(panel, -1, optionKey, spotName);
            });
            return;
        }
        let rowEl = this.binder.getTilesetRowEl(tilesetIndex);
        if(!rowEl){
            return;
        }
        this.showOptionActiveInContainer(rowEl, tilesetIndex, optionKey, spotName);
    }

    isPathTileSet(tilesetIndex)
    {
        if(-1 === tilesetIndex){
            return this.binder.app.globalTileOptions
                && null !== this.binder.app.globalTileOptions.pathTile
                && undefined !== this.binder.app.globalTileOptions.pathTile;
        }
        return this.binder.app.state[tilesetIndex]
            && this.binder.app.state[tilesetIndex].tileOptions
            && null !== this.binder.app.state[tilesetIndex].tileOptions.pathTile
            && undefined !== this.binder.app.state[tilesetIndex].tileOptions.pathTile;
    }

    advanceFromPathTile(tilesetIndex)
    {
        this.binder.deactivate();
        let tileOpts = null;
        if(-1 === tilesetIndex){
            tileOpts = this.binder.app.globalTileOptions;
        }
        if(-1 !== tilesetIndex && this.binder.app.state[tilesetIndex]){
            tileOpts = this.binder.app.state[tilesetIndex].tileOptions;
        }
        let target = (tileOpts && tileOpts.surroundingTiles) ? tileOpts.surroundingTiles : {};
        let nextPos = this.findNextEmptyPosition(this.binder.positionOrders.surroundingTiles, target, '0,0');
        if(!nextPos){
            return;
        }
        this.activateAndShowOption(tilesetIndex, 'surroundingTiles', null);
        this.binder.activatePosition(nextPos);
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
