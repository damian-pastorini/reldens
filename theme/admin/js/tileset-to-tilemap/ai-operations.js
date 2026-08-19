class TilesetAiOperations
{
    constructor(app)
    {
        this.app = app;
    }

    pendingElements(tileset)
    {
        let result = [];
        for(let index = 0; index < tileset.elements.length; index++){
            let element = tileset.elements[index];
            if(SharedUtils.CLUSTER_TYPE === element.type){
                continue;
            }
            if(element.approved){
                continue;
            }
            result.push({ index, element });
        }
        return result;
    }

    setAiControlsLoading(isLoading, activeBtn)
    {
        if(!activeBtn){
            return;
        }
        let spinner = activeBtn.nextElementSibling;
        if(!spinner){
            return;
        }
        spinner.classList.toggle('hidden', !isLoading);
    }

    setReviewBlocked(blocked)
    {
        let section = this.app.getElement('.review-section');
        section.classList.toggle('review-blocked', blocked);
        let controls = section.querySelectorAll('button, input, select');
        for(let control of controls){
            control.disabled = blocked;
        }
        if(!blocked){
            this.app.generator.updateGenerateButtonState();
        }
    }

    showAiProgress(message, tilesetIndex)
    {
        if(!this.app.refs[tilesetIndex]){
            return;
        }
        let progressMessageElement = this.app.refs[tilesetIndex].aiProgressMsg;
        if(!progressMessageElement){
            return;
        }
        progressMessageElement.textContent = message;
        progressMessageElement.classList.remove('hidden');
    }

    hideAiProgress()
    {
        for(let i = 0; i < this.app.state.length; i++){
            if(!this.app.refs[i]){
                continue;
            }
            let progressMessageElement = this.app.refs[i].aiProgressMsg;
            if(!progressMessageElement){
                continue;
            }
            progressMessageElement.classList.add('hidden');
            progressMessageElement.textContent = '';
        }
    }

    collectUsedNumbersForBase(tileset, base, excludeIndex)
    {
        let usedNumbers = new Set();
        for(let elementIdx = 0; elementIdx < tileset.elements.length; elementIdx++){
            if(elementIdx === excludeIndex){
                continue;
            }
            let element = tileset.elements[elementIdx];
            if(!element.name){
                continue;
            }
            let parsed = element.name.match(SharedUtils.NAME_PARSE_REGEX);
            if(!parsed){
                continue;
            }
            if(parsed[1] !== base){
                continue;
            }
            usedNumbers.add(Number(parsed[2]));
        }
        return usedNumbers;
    }

    resolveUniqueName(name, tilesetIndex, excludeIndex)
    {
        let match = name.match(SharedUtils.NAME_PARSE_REGEX);
        if(!match){
            return name;
        }
        let base = match[1];
        let tileset = this.app.state[tilesetIndex];
        let usedNumbers = this.collectUsedNumbersForBase(tileset, base, excludeIndex);
        let n = 1;
        for(let i = 1; usedNumbers.has(i); i++){
            n++;
        }
        return base+'-'+String(n).padStart(3, '0');
    }

    applyNameUpdate(tilesetIndex, namedElements, sentIndices)
    {
        let tileset = this.app.state[tilesetIndex];
        for(let i = 0; i < namedElements.length; i++){
            let elementIdx = sentIndices[i];
            if(!tileset.elements[elementIdx]){
                continue;
            }
            tileset.elements[elementIdx].name = namedElements[i].name;
        }
        this.app.clearSelection(tilesetIndex);
    }

    async detectLayersForOne(item, tileset, provider, tilesetIndex)
    {
        this.showAiProgress(
            'Detecting layers for element '+(item.index+1)+' in '+tileset.filename+'...',
            tilesetIndex
        );
        let tiles = this.app.collectElementTiles(item.element);
        let response = await fetch('ai-assign-layers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.app.aiRequestBuilder.build(tileset, provider, { elementTiles: tiles }))
        });
        let data = await response.json();
        if(!data.layers || !data.layers.length){
            return;
        }
        item.element.layers = data.layers;
        this.app.refresh(tilesetIndex);
    }

    startAiRun(triggerBtn)
    {
        this.setReviewBlocked(true);
        this.setAiControlsLoading(true, triggerBtn);
    }

    finishAiRun(triggerBtn)
    {
        this.setAiControlsLoading(false, triggerBtn);
        this.setReviewBlocked(false);
        this.hideAiProgress();
    }

    async runAiDetectLayers(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.startAiRun(triggerBtn);
        let tileset = this.app.state[tilesetIndex];
        for(let item of this.pendingElements(tileset)){
            await this.detectLayersForOne(item, tileset, provider, tilesetIndex);
        }
        this.finishAiRun(triggerBtn);
    }

    buildDetectedElements(detected, baseColorIndex)
    {
        let result = [];
        for(let i = 0; i < detected.length; i++){
            result.push(SharedUtils.makeElement(
                detected[i].name, baseColorIndex + i, detected[i].layers
            ));
        }
        return result;
    }

    async detectElementsForCluster(j, tileset, provider, tilesetIndex)
    {
        this.showAiProgress(
            'Detecting elements in cluster '+(j+1)+' of '+tileset.filename+'...',
            tilesetIndex
        );
        let tiles = this.app.collectElementTiles(tileset.elements[j]);
        let response = await fetch('ai-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.app.aiRequestBuilder.build(tileset, provider, { clusterTiles: tiles }))
        });
        let data = await response.json();
        if(!data.elements || !data.elements.length){
            return;
        }
        let globalOffset = this.app.getGlobalOffset(tilesetIndex);
        let newElements = this.buildDetectedElements(data.elements, globalOffset + j);
        tileset.elements.splice(j, 1, ...newElements);
        this.app.reindexColors(tilesetIndex);
        this.app.clearSelection(tilesetIndex);
    }

    shouldSkipForDetectElements(element)
    {
        if(SharedUtils.CLUSTER_TYPE !== element.type){
            return true;
        }
        return Boolean(element.approved);
    }

    async runAiDetectElements(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.startAiRun(triggerBtn);
        let tileset = this.app.state[tilesetIndex];
        for(let j = tileset.elements.length - 1; j >= 0; j--){
            if(this.shouldSkipForDetectElements(tileset.elements[j])){
                continue;
            }
            await this.detectElementsForCluster(j, tileset, provider, tilesetIndex);
        }
        this.finishAiRun(triggerBtn);
    }

    countLockedElements(tileset)
    {
        let totalLocked = 0;
        for(let element of tileset.elements){
            if(SharedUtils.CLUSTER_TYPE !== element.type && element.approved){
                totalLocked++;
            }
        }
        return totalLocked;
    }

    async nameOneElement(toName, k, tileset, provider, tilesetIndex)
    {
        this.showAiProgress(
            'Naming element '+(k+1)+'/'+toName.length+' in '+tileset.filename+'...',
            tilesetIndex
        );
        let response = await fetch('ai-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.app.aiRequestBuilder.build(
                tileset, provider, { elements: [{ absoluteTiles: toName[k].absoluteTiles }] }
            ))
        });
        let data = await response.json();
        if(!data.elements || !data.elements.length){
            return false;
        }
        data.elements[0].name = this.resolveUniqueName(
            data.elements[0].name, tilesetIndex, toName[k].index
        );
        this.applyNameUpdate(tilesetIndex, data.elements, [toName[k].index]);
        return true;
    }

    async runAiName(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.startAiRun(triggerBtn);
        let totalRenamed = 0;
        let tileset = this.app.state[tilesetIndex];
        let pending = this.pendingElements(tileset);
        let toName = [];
        for(let item of pending){
            toName.push({ index: item.index, absoluteTiles: this.app.collectElementTiles(item.element) });
        }
        let totalLocked = this.countLockedElements(tileset);
        for(let k = 0; k < toName.length; k++){
            if(await this.nameOneElement(toName, k, tileset, provider, tilesetIndex)){
                totalRenamed++;
            }
        }
        this.setAiControlsLoading(false, triggerBtn);
        this.setReviewBlocked(false);
        this.showAiProgress(
            totalRenamed+' element(s) renamed. '+totalLocked+' locked (skipped).',
            tilesetIndex
        );
    }

    bulkDetectAi(tilesetIndex)
    {
        return this.app.aiBulk.bulkDetectAi(tilesetIndex);
    }

    bulkNameAi(tilesetIndex)
    {
        return this.app.aiBulk.bulkNameAi(tilesetIndex);
    }
}
window.TilesetAiOperations = TilesetAiOperations;
