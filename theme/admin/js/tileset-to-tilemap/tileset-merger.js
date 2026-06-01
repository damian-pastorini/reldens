class TilesetMerger
{
    constructor(app)
    {
        this.app = app;
        this.uiBinder = new TilesetMergeUiBinder(this);
    }

    bind()
    {
        let mergeBtn = this.app.getElement('.merge-btn');
        mergeBtn.addEventListener('click', () => {
            let isOverride = this.app.sessions.isOverrideChecked();
            let message = isOverride
                ? 'Merge selected tilesets? This will overwrite the current session.'
                : 'Merge selected tilesets into a new session?';
            this.app.modals.show(message, () => this.runMerge());
        });
    }

    getCheckedMergeRows()
    {
        let result = [];
        for(let i = 0; i < this.app.state.length; i++){
            let refs = this.app.refs[i];
            if(!refs || !refs.row){
                continue;
            }
            let checkbox = refs.row.querySelector('.tileset-merge-checkbox');
            if(!checkbox || !checkbox.checked){
                continue;
            }
            result.push({index: i, row: refs.row});
        }
        return result;
    }

    sizesEqual(a, b)
    {
        return a.tileWidth === b.tileWidth && a.tileHeight === b.tileHeight;
    }

    bindTileset(row, tilesetIndex)
    {
        let mergeCheckbox = row.querySelector('.tileset-merge-checkbox');
        let mergeConfigToggle = row.querySelector('.tileset-merge-config-toggle');
        let mergeConfig = row.querySelector('.tileset-merge-config');
        let autoResizeCheckbox = row.querySelector('.tileset-merge-auto-resize');
        let resizeOptions = row.querySelector('.tileset-merge-resize-options');
        let resizeRadios = row.querySelectorAll('.tileset-merge-resize-radio');
        let radioName = 'tileset-merge-resize-'+tilesetIndex;
        for(let radio of resizeRadios){
            radio.name = radioName;
        }
        mergeCheckbox.addEventListener('change', () => {
            this.uiBinder.onMergeCheckboxChange(tilesetIndex, mergeCheckbox, mergeConfig);
        });
        autoResizeCheckbox.addEventListener('change', () => {
            this.uiBinder.onAutoResizeChange(tilesetIndex, autoResizeCheckbox, mergeCheckbox, resizeOptions);
        });
        mergeConfigToggle.addEventListener('click', () => {
            mergeConfig.classList.toggle('hidden');
            row.querySelector('.tileset-map-config-fieldset').classList.add('hidden');
        });
    }

    checkMergeTileSizeCompatibility(tilesetIndex)
    {
        let currentTileset = this.app.state[tilesetIndex];
        if(!currentTileset){
            return null;
        }
        let checkedRows = this.getCheckedMergeRows();
        for(let { index, row } of checkedRows){
            if(index === tilesetIndex){
                continue;
            }
            let otherTileset = this.app.state[index];
            if(this.sizesEqual(otherTileset, currentTileset)){
                continue;
            }
            let otherAutoResize = row.querySelector('.tileset-merge-auto-resize');
            if(otherAutoResize && otherAutoResize.checked){
                continue;
            }
            return {
                existingW: otherTileset.tileWidth,
                existingH: otherTileset.tileHeight,
                currentW: currentTileset.tileWidth,
                currentH: currentTileset.tileHeight
            };
        }
        return null;
    }

    setAutoResizeForAllChecked(tilesetIndex)
    {
        let currentTileset = this.app.state[tilesetIndex];
        let currentRefs = this.app.refs[tilesetIndex];
        if(currentRefs && currentRefs.row){
            this.uiBinder.enableAutoResizeOnRow(currentRefs.row);
        }
        for(let { index, row } of this.getCheckedMergeRows()){
            if(index === tilesetIndex){
                continue;
            }
            if(this.sizesEqual(this.app.state[index], currentTileset)){
                continue;
            }
            this.uiBinder.enableAutoResizeOnRow(row);
        }
    }

    findIncompatibleMergeRows(referenceIndex)
    {
        let referenceTileset = this.app.state[referenceIndex];
        let result = [];
        for(let entry of this.getCheckedMergeRows()){
            if(entry.index === referenceIndex){
                continue;
            }
            if(this.sizesEqual(this.app.state[entry.index], referenceTileset)){
                continue;
            }
            result.push(entry);
        }
        return result;
    }

    buildMergeTilesetEntry(index, row)
    {
        let resizeStrategy = 'bigger';
        let checkedRadio = row.querySelector('.tileset-merge-resize-radio:checked');
        if(checkedRadio){
            resizeStrategy = checkedRadio.value;
        }
        return {
            stateIndex: index,
            tileset: this.app.generator.serializeTileset(this.app.state[index], false, index),
            includeElements: row.querySelector('.tileset-merge-elements').checked,
            includeClusters: row.querySelector('.tileset-merge-clusters').checked,
            autoResize: row.querySelector('.tileset-merge-auto-resize').checked,
            resizeStrategy
        };
    }

    collectMergeTilesets()
    {
        let result = [];
        for(let { index, row } of this.getCheckedMergeRows()){
            result.push(this.buildMergeTilesetEntry(index, row));
        }
        return result;
    }

    async readMergeStream(response, completedRef)
    {
        await SharedUtils.readSseStream(response, async (part) => {
            if(await this.handleMergeEvent(part)){
                completedRef.completed = true;
            }
        });
    }

    async runMerge()
    {
        let tilesets = this.collectMergeTilesets();
        if(2 > tilesets.length){
            this.app.sessions.showStatus('Select at least 2 tilesets to merge', true);
            return;
        }
        let isOverride = this.app.sessions.isOverrideChecked();
        let sessionName = this.app.sessions.readSessionNameValue();
        let targetSessionId = SharedUtils.buildSessionId(this.app.sessionId, isOverride, sessionName);
        this.pendingMergeTargetSessionId = targetSessionId;
        this.app.modals.showGenerate('Merging tilesets...');
        let completedRef = { completed: false };
        let controller = this.app.createAbortController();
        try {
            let response = await fetch('merge', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({sessionId: targetSessionId, tilesets}), // HOFF
                signal: controller.signal
            });
            await this.readMergeStream(response, completedRef);
        } catch(error) {
            this.app.sessions.showStatus('Merge error: '+error.message, true);
        } finally {
            this.app.releaseAbortController(controller);
        }
        if(!completedRef.completed){
            this.app.modals.hideGenerate();
        }
    }

    async handleMergeEvent(eventText)
    {
        let parsed = SharedUtils.parseSSEEvent(eventText);
        if(!parsed){
            return false;
        }
        let {eventType, data} = parsed;
        if('progress' === eventType){
            this.app.modals.showGenerate(data.message);
            return false;
        }
        if('error' === eventType){
            this.app.modals.hideGenerate();
            this.app.sessions.showStatus('Error: '+(data.message || 'Unknown error'), true);
            return true;
        }
        if('done' === eventType){
            this.app.modals.hideGenerate();
            if(this.pendingMergeTargetSessionId && this.pendingMergeTargetSessionId !== this.app.sessionId){
                this.app.sessionId = this.pendingMergeTargetSessionId;
            }
            this.pendingMergeTargetSessionId = null;
            this.applyMergeResult(data.mergedTileset, data.stateIndices);
            this.app.sessions.showStatus('Tilesets merged successfully', false);
            await this.app.sessions.refreshSessionInList(this.app.sessionId);
            return true;
        }
        return false;
    }

    applyMergeResult(mergedTilesetData, mergedStateIndices)
    {
        let sorted = [...mergedStateIndices].sort((a, b) => b - a);
        let mapMeta = this.app.stateBuilder.collectMapMeta();
        for(let i of sorted){
            this.app.state.splice(i, 1);
            mapMeta.splice(i, 1);
        }
        this.app.stateBuilder.resetState();
        this.app.stateBuilder.rebuildAllRows(mapMeta);
        this.app.stateBuilder.append({
            sessionId: this.app.sessionId,
            showAiControls: this.app.showAiControls,
            activeProviders: this.app.activeProviders,
            tilesets: [mergedTilesetData]
        });
        if(!this.app.state.length){
            this.app.hideReviewSection();
        }
    }
}
window.TilesetMerger = TilesetMerger;
