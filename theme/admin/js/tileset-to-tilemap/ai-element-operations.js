class TilesetAiElementOperations
{
    constructor(app)
    {
        this.app = app;
    }

    setBtnLoading(btn, isLoading)
    {
        btn.disabled = isLoading;
        let spinner = btn.nextElementSibling;
        if(!spinner){
            return;
        }
        spinner.classList.toggle('hidden', !isLoading);
    }

    setAiSingleRunning(running)
    {
        if(running){
            this.app.runningDetections++;
        }
        if(!running){
            this.app.runningDetections = Math.max(0, this.app.runningDetections - 1);
        }
        let isBusy = this.app.runningDetections > 0;
        let section = this.app.getElement('.review-section');
        section.classList.toggle('ai-single-busy', isBusy);
        let targets = section.querySelectorAll(
            '.tileset-detect-elements-btn, .tileset-detect-layers-btn, .tileset-name-all-btn,'
            +'.element-lock-btn, .element-delete-btn,'
            +'.cluster-split-btn, .cluster-convert-btn,'
            +'.element-name-input, .element-quantity,'
            +'.element-free-space, .element-allow-paths,'
            +'.layer-type-radio, .add-element-btn,'
            +'.generate-btn, .generate-selected-btn, .zoom-reset-btn, .map-config-toggle'
        );
        for(let el of targets){
            el.disabled = isBusy;
        }
        if(!isBusy){
            this.app.generator.updateGenerateButtonState();
        }
    }

    applyDetectUpdate(tilesetIndex, newElements)
    {
        let tileset = this.app.state[tilesetIndex];
        let kept = [];
        for(let el of tileset.elements){
            if('cluster' === el.type && !el.approved){
                continue;
            }
            if('spot' === el.type){
                continue;
            }
            kept.push(el);
        }
        let globalOffset = this.app.getGlobalOffset(tilesetIndex);
        for(let i = 0; i < kept.length; i++){
            kept[i].colorIndex = globalOffset+i;
        }
        let keptTileKeys = new Set();
        for(let el of kept){
            for(let layer of el.layers){
                for(let tile of layer.tiles){
                    keptTileKeys.add(SharedUtils.tileKey(tile));
                }
            }
        }
        let colorBase = globalOffset+kept.length;
        let addedCount = 0;
        for(let i = 0; i < newElements.length; i++){
            if(this.hasOverlap(newElements[i], keptTileKeys)){
                continue;
            }
            kept.push(SharedUtils.makeElement(
                newElements[i].name, colorBase+addedCount, newElements[i].layers
            ));
            addedCount++;
        }
        tileset.elements = kept;
        this.app.clearSelection(tilesetIndex);
    }

    hasOverlap(element, keptTileKeys)
    {
        for(let layer of element.layers){
            for(let tile of layer.tiles){
                if(keptTileKeys.has(SharedUtils.tileKey(tile))){
                    return true;
                }
            }
        }
        return false;
    }

    async runAiDetectSingle(tilesetIndex, elementIndex, provider, btn)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        let tiles = this.app.collectElementTiles(element);
        this.setBtnLoading(btn, true);
        this.setAiSingleRunning(true);
        let isCluster = 'cluster' === element.type;
        let fetchUrl = isCluster ? 'ai-detect' : 'ai-assign-layers';
        let tileKey = isCluster ? 'clusterTiles' : 'elementTiles';
        let extraData = {};
        extraData[tileKey] = tiles;
        let data = null;
        try {
            let response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.app.aiRequestBuilder.build(tileset, provider, extraData))
            });
            data = await response.json();
        } catch(error) {
            data = null;
        }
        this.setBtnLoading(btn, false);
        this.setAiSingleRunning(false);
        if(!data){
            return;
        }
        if(isCluster){
            if(!data.elements){
                return;
            }
            if(!data.elements.length){
                return;
            }
            let globalOffset = this.app.getGlobalOffset(tilesetIndex);
            let newElements = data.elements.map((el, idx) => SharedUtils.makeElement(
                el.name, globalOffset + elementIndex + idx, el.layers
            ));
            tileset.elements.splice(elementIndex, 1, ...newElements);
            this.app.reindexColors(tilesetIndex);
            this.app.selectedTileset = tilesetIndex;
            this.app.selectedElement = elementIndex;
            this.app.showAllElements = true;
            this.app.viewAllMode = false;
            this.app.resetViewAllButtons();
            this.app.updatePaletteStyles();
            this.app.refresh(tilesetIndex);
            return;
        }
        if(!data.layers){
            return;
        }
        if(!data.layers.length){
            return;
        }
        element.layers = data.layers;
        this.app.refresh(tilesetIndex);
    }

    async runAiNameSingle(tilesetIndex, elementIndex, provider, btn)
    {
        let tileset = this.app.state[tilesetIndex];
        let el = tileset.elements[elementIndex];
        let absoluteTiles = this.app.collectElementTiles(el);
        let progressMsg = btn.nextElementSibling ? btn.nextElementSibling.nextElementSibling : null;
        this.setBtnLoading(btn, true);
        if(progressMsg){
            progressMsg.textContent = 'Naming...';
            progressMsg.classList.remove('hidden');
        }
        this.setAiSingleRunning(true);
        let data = null;
        try {
            let response = await fetch('ai-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.app.aiRequestBuilder.build(
                    tileset, provider, { elements: [{ absoluteTiles }] }
                ))
            });
            data = await response.json();
        } catch(error) {
            data = null;
        }
        this.setBtnLoading(btn, false);
        this.setAiSingleRunning(false);
        if(progressMsg){
            progressMsg.classList.add('hidden');
            progressMsg.textContent = '';
        }
        if(!data){
            return;
        }
        if(!data.elements){
            return;
        }
        if(!data.elements.length){
            return;
        }
        tileset.elements[elementIndex].name = this.app.ai.resolveUniqueName(
            data.elements[0].name,
            tilesetIndex,
            elementIndex
        );
        this.app.refresh(tilesetIndex);
    }
}
