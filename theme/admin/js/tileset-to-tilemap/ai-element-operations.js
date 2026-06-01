class TilesetAiElementOperations
{
    constructor(app)
    {
        this.app = app;
    }

    setBtnLoading(triggerButton, isLoading)
    {
        triggerButton.disabled = isLoading;
        let spinner = triggerButton.nextElementSibling;
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
        for(let target of targets){
            target.disabled = isBusy;
        }
        if(!isBusy){
            this.app.generator.updateGenerateButtonState();
        }
    }

    keptElementShouldBeRetained(element)
    {
        if(SharedUtils.CLUSTER_TYPE === element.type && !element.approved){
            return false;
        }
        if(SharedUtils.SPOT_TYPE === element.type){
            return false;
        }
        return true;
    }

    collectLayerTileKeys(layer, keysOut)
    {
        for(let tile of layer.tiles){
            keysOut.add(SharedUtils.tileKey(tile));
        }
    }

    collectElementTileKeys(element, keysOut)
    {
        for(let layer of element.layers){
            this.collectLayerTileKeys(layer, keysOut);
        }
    }

    applyDetectUpdate(tilesetIndex, newElements)
    {
        let tileset = this.app.state[tilesetIndex];
        let kept = [];
        for(let element of tileset.elements){
            if(this.keptElementShouldBeRetained(element)){
                kept.push(element);
            }
        }
        let globalOffset = this.app.getGlobalOffset(tilesetIndex);
        for(let i = 0; i < kept.length; i++){
            kept[i].colorIndex = globalOffset+i;
        }
        let keptTileKeys = new Set();
        for(let element of kept){
            this.collectElementTileKeys(element, keptTileKeys);
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

    findIndexBy(items, predicate)
    {
        for(let i = 0; i < items.length; i++){
            if(predicate(items[i], i)){
                return i;
            }
        }
        return -1;
    }

    layerHasOverlap(layer, keptTileKeys)
    {
        return -1 !== this.findIndexBy(
            layer.tiles, (tile) => keptTileKeys.has(SharedUtils.tileKey(tile))
        );
    }

    hasOverlap(element, keptTileKeys)
    {
        return -1 !== this.findIndexBy(
            element.layers, (layer) => this.layerHasOverlap(layer, keptTileKeys)
        );
    }

    handleNoDataResult(data, errorMessage, triggerButton)
    {
        if(data){
            return false;
        }
        if(errorMessage){
            this.showSingleErrorOnButton(triggerButton, errorMessage);
        }
        return true;
    }

    showSingleErrorOnButton(triggerButton, message)
    {
        let progressMsg = triggerButton.nextElementSibling
            ? triggerButton.nextElementSibling.nextElementSibling
            : null;
        if(!progressMsg){
            return;
        }
        progressMsg.textContent = 'Failed: '+message;
        progressMsg.classList.remove('hidden');
    }

    async fetchJsonOrError(fetchUrl, body)
    {
        let result = { data: null, errorMessage: null };
        try {
            let response = await fetch(fetchUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            result.data = await response.json();
        } catch(error) {
            result.errorMessage = error.message;
        }
        return result;
    }

    buildElementsFromDetected(detected, baseColorIndex)
    {
        let result = [];
        for(let i = 0; i < detected.length; i++){
            result.push(SharedUtils.makeElement(
                detected[i].name, baseColorIndex + i, detected[i].layers
            ));
        }
        return result;
    }

    isEmptyArrayProp(data, key)
    {
        if(!data){
            return true;
        }
        if(!data[key]){
            return true;
        }
        return 0 === data[key].length;
    }

    applyClusterSplit(tilesetIndex, elementIndex, detectedElements)
    {
        let tileset = this.app.state[tilesetIndex];
        let globalOffset = this.app.getGlobalOffset(tilesetIndex);
        let newElements = this.buildElementsFromDetected(detectedElements, globalOffset + elementIndex);
        tileset.elements.splice(elementIndex, 1, ...newElements);
        this.app.reindexColors(tilesetIndex);
        this.app.selectedTileset = tilesetIndex;
        this.app.selectedElement = elementIndex;
        this.app.showAllElements = true;
        this.app.viewAllMode = false;
        this.app.resetViewAllButtons();
        this.app.updatePaletteStyles();
        this.app.refresh(tilesetIndex);
    }

    async runAiDetectSingle(tilesetIndex, elementIndex, provider, triggerButton)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        let tiles = this.app.collectElementTiles(element);
        this.setBtnLoading(triggerButton, true);
        this.setAiSingleRunning(true);
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        let fetchUrl = isCluster ? 'ai-detect' : 'ai-assign-layers';
        let tileKey = isCluster ? 'clusterTiles' : 'elementTiles';
        let extraData = {};
        extraData[tileKey] = tiles;
        let body = this.app.aiRequestBuilder.build(tileset, provider, extraData);
        let { data, errorMessage } = await this.fetchJsonOrError(fetchUrl, body);
        this.setBtnLoading(triggerButton, false);
        this.setAiSingleRunning(false);
        if(this.handleNoDataResult(data, errorMessage, triggerButton)){
            return;
        }
        if(isCluster){
            if(this.isEmptyArrayProp(data, 'elements')){
                return;
            }
            this.applyClusterSplit(tilesetIndex, elementIndex, data.elements);
            return;
        }
        if(this.isEmptyArrayProp(data, 'layers')){
            return;
        }
        element.layers = data.layers;
        this.app.refresh(tilesetIndex);
    }

    showProgressMsg(progressMsg, text)
    {
        if(!progressMsg){
            return;
        }
        progressMsg.textContent = text;
        progressMsg.classList.remove('hidden');
    }

    hideProgressMsg(progressMsg)
    {
        if(!progressMsg){
            return;
        }
        progressMsg.classList.add('hidden');
        progressMsg.textContent = '';
    }

    resolveProgressMsg(triggerButton)
    {
        if(!triggerButton.nextElementSibling){
            return null;
        }
        return triggerButton.nextElementSibling.nextElementSibling;
    }

    async runAiNameSingle(tilesetIndex, elementIndex, provider, triggerButton)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        let absoluteTiles = this.app.collectElementTiles(element);
        let progressMsg = this.resolveProgressMsg(triggerButton);
        this.setBtnLoading(triggerButton, true);
        this.showProgressMsg(progressMsg, 'Naming...');
        this.setAiSingleRunning(true);
        let body = this.app.aiRequestBuilder.build(
            tileset, provider, { elements: [{ absoluteTiles }] }
        );
        let { data, errorMessage } = await this.fetchJsonOrError('ai-name', body);
        this.setBtnLoading(triggerButton, false);
        this.setAiSingleRunning(false);
        this.hideProgressMsg(progressMsg);
        if(this.handleNoDataResult(data, errorMessage, triggerButton)){
            return;
        }
        if(this.isEmptyArrayProp(data, 'elements')){
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
window.TilesetAiElementOperations = TilesetAiElementOperations;
