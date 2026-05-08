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
        let fn = (opts) => {
            opts.groundTile = null;
            opts.pathTile = null;
            opts.borderTile = null;
            opts.randomGroundTiles = [];
        };
        this.dispatchTileOpts(tilesetIndex, fn, fn);
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
        let fn = (opts) => {
            opts.bordersTiles = {};
            opts.borderCornersTiles = {};
        };
        this.dispatchTileOpts(tilesetIndex, fn, fn);
    }

    dispatchTileOpts(tilesetIndex, globalFn, tilesetFn)
    {
        if(-1 === tilesetIndex){
            let opts = this.binder.app.globalTileOptions;
            if(opts){
                globalFn(opts);
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
            }
            if(!positionKey){
                spot[optionKey] = 'spotTileVariations' === optionKey ? [] : null;
            }
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
        let globalFn = (opts) => {
            if(Array.isArray(opts[optionKey])){
                opts[optionKey] = opts[optionKey].filter((v) => v.flatIndex !== value);
            }
        };
        let tilesetFn = (opts) => {
            if(Array.isArray(opts[optionKey])){
                opts[optionKey] = opts[optionKey].filter((v) => v !== value);
            }
        };
        this.dispatchTileOpts(tilesetIndex, globalFn, tilesetFn);
    }
}
