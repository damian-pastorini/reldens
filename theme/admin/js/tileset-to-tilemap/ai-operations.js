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
            if('cluster' === element.type){
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
        for(let el of controls){
            el.disabled = blocked;
        }
        if(!blocked){
            this.app.generator.updateGenerateButtonState();
        }
    }

    showAiProgress(msg, tilesetIndex)
    {
        if(!this.app.refs[tilesetIndex]){
            return;
        }
        let el = this.app.refs[tilesetIndex].aiProgressMsg;
        if(!el){
            return;
        }
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    hideAiProgress()
    {
        for(let i = 0; i < this.app.state.length; i++){
            if(!this.app.refs[i]){
                continue;
            }
            let el = this.app.refs[i].aiProgressMsg;
            if(!el){
                continue;
            }
            el.classList.add('hidden');
            el.textContent = '';
        }
    }

    resolveUniqueName(name, tilesetIndex, excludeIndex)
    {
        let match = name.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)$/);
        if(!match){
            return name;
        }
        let base = match[1];
        let usedNumbers = new Set();
        let tileset = this.app.state[tilesetIndex];
        for(let idx = 0; idx < tileset.elements.length; idx++){
            if(idx === excludeIndex){
                continue;
            }
            let el = tileset.elements[idx];
            if(!el.name){
                continue;
            }
            let m = el.name.match(/^([a-z]+(?:-[a-z]+)*)-(\d+)$/);
            if(!m){
                continue;
            }
            if(m[1] !== base){
                continue;
            }
            usedNumbers.add(Number(m[2]));
        }
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
            let idx = sentIndices[i];
            if(!tileset.elements[idx]){
                continue;
            }
            tileset.elements[idx].name = namedElements[i].name;
        }
        this.app.clearSelection(tilesetIndex);
    }

    async runAiDetectLayers(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.setReviewBlocked(true);
        this.setAiControlsLoading(true, triggerBtn);
        let tileset = this.app.state[tilesetIndex];
        for(let item of this.pendingElements(tileset)){
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
                continue;
            }
            item.element.layers = data.layers;
            this.app.refresh(tilesetIndex);
        }
        this.setAiControlsLoading(false, triggerBtn);
        this.setReviewBlocked(false);
        this.hideAiProgress();
    }

    async runAiDetectElements(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.setReviewBlocked(true);
        this.setAiControlsLoading(true, triggerBtn);
        let tileset = this.app.state[tilesetIndex];
        for(let j = tileset.elements.length - 1; j >= 0; j--){
            let el = tileset.elements[j];
            if('cluster' !== el.type){
                continue;
            }
            if(el.approved){
                continue;
            }
            this.showAiProgress(
                'Detecting elements in cluster '+(j+1)+' of '+tileset.filename+'...',
                tilesetIndex
            );
            let tiles = this.app.collectElementTiles(el);
            let response = await fetch('ai-detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.app.aiRequestBuilder.build(tileset, provider, { clusterTiles: tiles }))
            });
            let data = await response.json();
            if(!data.elements || !data.elements.length){
                continue;
            }
            let globalOffset = this.app.getGlobalOffset(tilesetIndex);
            let newElements = data.elements.map((elem, idx) => SharedUtils.makeElement(
                elem.name, globalOffset + j + idx, elem.layers
            ));
            tileset.elements.splice(j, 1, ...newElements);
            this.app.reindexColors(tilesetIndex);
            this.app.clearSelection(tilesetIndex);
        }
        this.setAiControlsLoading(false, triggerBtn);
        this.setReviewBlocked(false);
        this.hideAiProgress();
    }

    async runAiName(tilesetIndex, triggerBtn)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        this.setReviewBlocked(true);
        this.setAiControlsLoading(true, triggerBtn);
        let totalRenamed = 0;
        let totalLocked = 0;
        let tileset = this.app.state[tilesetIndex];
        let pending = this.pendingElements(tileset);
        let toName = [];
        for(let item of pending){
            toName.push({ index: item.index, absoluteTiles: this.app.collectElementTiles(item.element) });
        }
        for(let element of tileset.elements){
            if('cluster' !== element.type && element.approved){
                totalLocked++;
            }
        }
        if(toName.length){
            for(let k = 0; k < toName.length; k++){
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
                if(data.elements && data.elements.length){
                    data.elements[0].name = this.resolveUniqueName(
                        data.elements[0].name, tilesetIndex, toName[k].index
                    );
                    this.applyNameUpdate(tilesetIndex, data.elements, [toName[k].index]);
                    totalRenamed++;
                }
            }
        }
        this.setAiControlsLoading(false, triggerBtn);
        this.setReviewBlocked(false);
        this.showAiProgress(
            totalRenamed+' element(s) renamed. '+totalLocked+' locked (skipped).',
            tilesetIndex
        );
    }

    async bulkDetectAi(tilesetIndex)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        let btn = this.app.refs[tilesetIndex].bulkDetectBtn;
        let elements = this.app.state[tilesetIndex].elements;
        let selectedClusters = [];
        for(let i = 0; i < elements.length; i++){
            if(!elements[i].bulkSelected){
                continue;
            }
            if('cluster' !== elements[i].type){
                continue;
            }
            selectedClusters.push(i);
        }
        for(let i = selectedClusters.length - 1; i >= 0; i--){
            await this.app.aiElement.runAiDetectSingle(tilesetIndex, selectedClusters[i], provider, btn);
        }
        let updated = this.app.state[tilesetIndex].elements;
        for(let i = 0; i < updated.length; i++){
            if(!updated[i].bulkSelected){
                continue;
            }
            if('cluster' === updated[i].type){
                continue;
            }
            await this.app.aiElement.runAiDetectSingle(tilesetIndex, i, provider, btn);
        }
    }

    async bulkNameAi(tilesetIndex)
    {
        let provider = this.app.refs[tilesetIndex].aiSelect.value;
        let btn = this.app.refs[tilesetIndex].bulkNameBtn;
        let elements = this.app.state[tilesetIndex].elements;
        for(let i = 0; i < elements.length; i++){
            if(!elements[i].bulkSelected){
                continue;
            }
            if('cluster' === elements[i].type){
                continue;
            }
            await this.app.aiElement.runAiNameSingle(tilesetIndex, i, provider, btn);
        }
    }
}
