class TilesetTileOptionsClearer
{
    constructor(binder)
    {
        this.binder = binder;
    }

    applyAndRenderTileset(tilesetIndex)
    {
        this.binder.applyToTilesetRow(tilesetIndex);
        this.binder.app.renderer.renderCanvas(tilesetIndex);
    }

    applyAndRenderGlobal()
    {
        this.binder.apply.applyToRow(-1, null);
        this.binder.app.renderAllCanvases();
    }

    clearSpotGroup(tilesetIndex, spotName, spotFn)
    {
        let spot = this.binder.findSpot(tilesetIndex, spotName);
        if(spot){
            spotFn(spot);
        }
        this.applyAndRenderTileset(tilesetIndex);
    }

    clearGroundGroup(tilesetIndex, spotName)
    {
        if(spotName){
            this.clearSpotGroup(tilesetIndex, spotName, (spot) => {
                spot.spotTile = null;
                spot.spotTileVariations = [];
            });
            return;
        }
        let groundGroupClearer = (tileOptions) => {
            tileOptions.groundTile = null;
            tileOptions.pathTile = null;
            tileOptions.borderTile = null;
            tileOptions.randomGroundTiles = [];
        };
        this.dispatchTileOpts(tilesetIndex, groundGroupClearer, groundGroupClearer);
    }

    clearPathTilesGroup(tilesetIndex)
    {
        let pathGroupClearer = (tileOptions) => {
            tileOptions.pathTile = null;
            tileOptions.surroundingTiles = {};
        };
        this.dispatchTileOpts(tilesetIndex, pathGroupClearer, pathGroupClearer);
    }

    clearBordersGroup(tilesetIndex, spotName)
    {
        if(spotName){
            this.clearSpotGroup(tilesetIndex, spotName, (spot) => {
                spot.bordersTiles = {};
                spot.borderCornersTiles = {};
            });
            return;
        }
        let bordersGroupClearer = (tileOptions) => {
            tileOptions.bordersTiles = {};
            tileOptions.borderCornersTiles = {};
        };
        this.dispatchTileOpts(tilesetIndex, bordersGroupClearer, bordersGroupClearer);
    }

    dispatchTileOpts(tilesetIndex, globalFn, tilesetFn)
    {
        if(-1 === tilesetIndex){
            let globalTileOptions = this.binder.app.globalTileOptions;
            if(globalTileOptions){
                globalFn(globalTileOptions);
            }
            this.applyAndRenderGlobal();
            return;
        }
        let tileset = this.binder.app.state[tilesetIndex];
        if(tileset.tileOptions){
            tilesetFn(tileset.tileOptions);
        }
        this.applyAndRenderTileset(tilesetIndex);
    }

    clearOption(tilesetIndex, optionKey, positionKey, spotName)
    {
        if('ground' === optionKey){
            this.clearGroundGroup(tilesetIndex, spotName);
            return;
        }
        if('borders' === optionKey){
            this.clearBordersGroup(tilesetIndex, spotName);
            return;
        }
        if(spotName){
            let spot = this.binder.findSpot(tilesetIndex, spotName);
            if(!spot){
                return;
            }
            if(positionKey){
                if(spot[optionKey]){
                    delete spot[optionKey][positionKey];
                }
                this.applyAndRenderTileset(tilesetIndex);
                return;
            }
            if('surroundingTiles' === optionKey){
                spot.spotTile = null;
            }
            if('spotTileVariations' === optionKey){
                spot[optionKey] = [];
                this.applyAndRenderTileset(tilesetIndex);
                return;
            }
            if(this.binder.positionOrders[optionKey] !== undefined){
                spot[optionKey] = {};
                this.applyAndRenderTileset(tilesetIndex);
                return;
            }
            spot[optionKey] = null;
            this.applyAndRenderTileset(tilesetIndex);
            return;
        }
        if(-1 === tilesetIndex){
            this.clearGlobalOption(optionKey, positionKey);
            this.applyAndRenderGlobal();
            return;
        }
        let tileset = this.binder.app.state[tilesetIndex];
        if(!tileset.tileOptions){
            return;
        }
        this.clearTilesetOption(tileset.tileOptions, optionKey, positionKey);
        this.applyAndRenderTileset(tilesetIndex);
    }

    clearTilesetOption(tileOpts, optionKey, positionKey)
    {
        if(positionKey){
            if(tileOpts[optionKey]){
                delete tileOpts[optionKey][positionKey];
            }
            return;
        }
        if('randomGroundTiles' === optionKey){
            tileOpts[optionKey] = [];
            return;
        }
        if(this.binder.positionOrders[optionKey] !== undefined){
            tileOpts[optionKey] = {};
            return;
        }
        tileOpts[optionKey] = null;
    }

    clearGlobalOption(optionKey, positionKey)
    {
        if(!this.binder.app.globalTileOptions){
            return;
        }
        this.clearTilesetOption(this.binder.app.globalTileOptions, optionKey, positionKey);
    }

    clearArrayItem(tilesetIndex, optionKey, valueStr, spotName)
    {
        let value = +valueStr;
        if(spotName){
            let spot = this.binder.findSpot(tilesetIndex, spotName);
            if(spot && Array.isArray(spot[optionKey])){
                spot[optionKey] = spot[optionKey].filter((v) => v !== value);
            }
            this.applyAndRenderTileset(tilesetIndex);
            return;
        }
        let globalArrayClearer = (tileOptions) => {
            if(Array.isArray(tileOptions[optionKey])){
                tileOptions[optionKey] = tileOptions[optionKey].filter((v) => v.flatIndex !== value);
            }
        };
        let tilesetArrayClearer = (tileOptions) => {
            if(Array.isArray(tileOptions[optionKey])){
                tileOptions[optionKey] = tileOptions[optionKey].filter((v) => v !== value);
            }
        };
        this.dispatchTileOpts(tilesetIndex, globalArrayClearer, tilesetArrayClearer);
    }
}
window.TilesetTileOptionsClearer = TilesetTileOptionsClearer;
