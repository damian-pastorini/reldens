/* exported TilesetGenerator */
class TilesetGenerator
{
    constructor(app)
    {
        this.app = app;
    }

    bindGenerateConfirm(button, message, callback)
    {
        button.addEventListener('click', () => this.app.modals.show(message, callback));
    }

    bind()
    {
        let generateAllMessage = 'Are you sure? This will save all tilesets and generate the files.'
            +' Warning: this may fail for very large sessions due to a JSON size limit (~512MB)'
            +' in Node.js. If generation fails, use "Generate Selected" instead.';
        let generateSelectedMessage = 'Are you sure? This will save all tilesets and generate the files.';
        this.bindGenerateConfirm(
            this.app.getElement('.generate-btn'), generateAllMessage, () => this.generate(false)
        );
        this.bindGenerateConfirm(
            this.app.getElement('.generate-selected-btn'), generateSelectedMessage, () => this.generate(true)
        );
        this.app.getElement('.save-session-btn').addEventListener(
            'click', () => this.app.sessions.saveAll()
        );
        let allWizardBtn = this.app.getElement('.all-to-maps-wizard-btn');
        if(allWizardBtn){
            allWizardBtn.addEventListener('click', () => this.mapsWizard(false));
        }
        let selectedWizardBtn = this.app.getElement('.selected-to-maps-wizard-btn');
        if(selectedWizardBtn){
            selectedWizardBtn.addEventListener('click', () => this.mapsWizard(true));
        }
    }

    mapsWizard(selectedOnly)
    {
        let analyzer = document.querySelector('.tileset-analyzer');
        let wizardPath = analyzer ? analyzer.dataset.mapsWizardPath : '/maps-wizard';
        let confirmMessage = selectedOnly
            ? 'Save and generate the SELECTED elements before opening Maps Wizard?'
            : 'Save and generate ALL elements before opening Maps Wizard? Unsaved changes will be included.'
                +' Warning: this may fail for very large sessions due to a JSON size limit (~512MB)'
                +' in Node.js. If generation fails, use "Selected to Maps Wizard" instead.';
        this.app.modals.show(
            confirmMessage,
            async () => {
                await this.app.sessions.autoSave();
                let succeeded = await this.runGenerate(this.getSerializableState(selectedOnly), false);
                if(!succeeded){
                    return;
                }
                let sid = this.lastGeneratedSessionId || this.app.sessionId;
                let wizardUrl = new URL(wizardPath, window.location.origin);
                wizardUrl.searchParams.set('tilesetSessionId', sid);
                window.location.href = wizardUrl.toString();
            },
            null,
            'button-success'
        );
    }

    bindTileset(row, tilesetIndex)
    {
        let message = 'Are you sure? This will save this tileset and generate the files.';
        this.bindGenerateConfirm(
            row.querySelector('.tileset-generate-btn'), message, () => this.generateSingle(tilesetIndex, false)
        );
        this.bindGenerateConfirm(
            row.querySelector('.tileset-generate-selected-btn'), message, () => this.generateSingle(tilesetIndex, true)
        );
        this.app.strategyEditor.bind(row);
    }

    readSessionNameValue()
    {
        return this.app.getElement('.session-name-input')?.value || '';
    }

    isOverrideChecked()
    {
        return Boolean(this.app.getElement('.override-files-checkbox')?.checked);
    }

    buildNewSessionId()
    {
        return SharedUtils.buildSessionId(this.app.sessionId, false, this.readSessionNameValue());
    }

    buildSessionId()
    {
        return SharedUtils.buildSessionId(
            this.app.sessionId, this.isOverrideChecked(), this.readSessionNameValue()
        );
    }

    async generate(selectedOnly)
    {
        let fullState = this.getSerializableState(selectedOnly);
        this.lastFullSerialized = selectedOnly ? null : fullState;
        await this.runGenerate(fullState, false);
    }

    async generateSingle(tilesetIndex, selectedOnly)
    {
        await this.runGenerate(
            [this.serializeTileset(
                this.app.state[tilesetIndex],
                selectedOnly,
                tilesetIndex,
                this.app.refs[tilesetIndex] ? this.app.refs[tilesetIndex].row : null
            )],
            true
        );
    }

    extractErrorMessage(bodyText, fallback)
    {
        if(!bodyText || !bodyText.length){
            return fallback;
        }
        try {
            let parsed = JSON.parse(bodyText);
            if(parsed && parsed.error){
                return parsed.error;
            }
        } catch(error) {
            return bodyText.slice(0, 300)+' ('+error.message+')';
        }
        return bodyText.slice(0, 300);
    }

    async runGenerate(tilesets, forceNewSession)
    {
        if(!this.app.sessionId){
            return false;
        }
        let sessionId = forceNewSession ? this.buildNewSessionId() : this.buildSessionId();
        this.app.modals.showGenerate('Generating files...');
        let fullTilesets = tilesets === this.lastFullSerialized ? tilesets : this.getSerializableState(false);
        let data = null;
        try {
            let response = await fetch('generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, tilesets, fullTilesets, globalTileOptions: this.app.globalTileOptions || null })
            });
            if(!response.ok){
                let body = await response.text();
                this.app.modals.hideGenerate();
                this.app.sessions.showStatus(
                    'Generate failed (HTTP '+response.status+'): '+this.extractErrorMessage(body, response.statusText),
                    true
                );
                return false;
            }
            data = await response.json();
        } catch(error) {
            this.app.modals.hideGenerate();
            this.app.sessions.showStatus('Network error: '+error.message, true);
            return false;
        }
        this.app.modals.hideGenerate();
        if(!data || !data.files){
            this.app.sessions.showStatus('Error: '+((data && data.error) || 'Unknown error'), true);
            return false;
        }
        this.lastGeneratedSessionId = sessionId;
        this.app.sessions.addSession(sessionId, data.files);
        this.app.sessions.showStatus('Files successfully generated', false);
        this.app.showMapsWizardBtn();
        this.showResults(sessionId, data.files);
        return true;
    }

    showResults(sessionId, files)
    {
        let resultsSection = this.app.getElement('.results-section');
        if(!resultsSection){
            return;
        }
        let zipLink = this.app.getElement('.download-zip-link');
        if(zipLink){
            zipLink.href = 'download-zip/'+encodeURIComponent(sessionId);
        }
        let resultsList = this.app.getElement('.results-list');
        if(resultsList){
            resultsList.textContent = '';
            for(let file of files){
                let li = document.createElement('li');
                let a = document.createElement('a');
                a.href = file.downloadUrl;
                a.textContent = file.name;
                a.download = file.name;
                li.appendChild(a);
                resultsList.appendChild(li);
            }
        }
        resultsSection.classList.remove('hidden');
    }

    serializeElement(element)
    {
        return {
            name: element.name,
            type: element.type,
            approved: element.approved,
            colorIndex: element.colorIndex,
            quantity: element.quantity,
            freeSpaceAround: element.freeSpaceAround,
            allowPathsInFreeSpace: element.allowPathsInFreeSpace,
            bulkSelected: element.bulkSelected || false,
            layers: element.layers
        };
    }

    resolveGeneratorTypeFromRow(row)
    {
        return row?.querySelector('.tileset-generator-type')?.value || SharedUtils.DEFAULT_GENERATOR_TYPE;
    }

    resolveMapFieldFromRow(row, selector, fallback)
    {
        return row ? (row.querySelector(selector).value || fallback) : fallback;
    }

    serializeTileset(tileset, selectedOnly, tilesetIndex, row)
    {
        let elements = [];
        for(let element of tileset.elements){
            if(selectedOnly && !element.bulkSelected){
                continue;
            }
            elements.push(this.serializeElement(element));
        }
        let serialized = SharedUtils.copyTilesetFields({}, tileset);
        serialized.filteredTiles = tileset.filteredTiles || [];
        serialized.originalTileWidth = tileset.originalTileWidth;
        serialized.originalTileHeight = tileset.originalTileHeight;
        serialized.resizeOption = tileset.resizeOption || 0;
        serialized.mapName = this.resolveMapFieldFromRow(row, '.tileset-map-name', 'tileset-elements');
        serialized.mapTitle = this.resolveMapFieldFromRow(row, '.tileset-map-title', 'Tileset Elements');
        serialized.generatorType = this.resolveGeneratorTypeFromRow(row);
        serialized.associationsProperties = row ? this.app.strategyEditor.readAssociationsProperties(row) : null;
        serialized.tileOptions = tileset.tileOptions || null;
        serialized.spots = tileset.spots || [];
        serialized.collapsed = Boolean(tileset.collapsed);
        serialized.elements = elements;
        return serialized;
    }

    getSerializableState(selectedOnly)
    {
        let result = [];
        for(let i = 0; i < this.app.state.length; i++){
            let refs = this.app.refs[i];
            result.push(this.serializeTileset(
                this.app.state[i],
                selectedOnly,
                i,
                refs ? refs.row : null
            ));
        }
        return result;
    }

    forEachTilesetRow(callback)
    {
        for(let i = 0; i < this.app.state.length; i++){
            let refs = this.app.refs[i];
            if(!refs || !refs.row){
                continue;
            }
            callback(refs.row, i);
        }
    }

    updateTilesetGenerateVisibility()
    {
        let show = 1 < this.app.state.length;
        let rows = document.querySelectorAll('.tileset-generate-config-row');
        for(let row of rows){
            row.classList.toggle('hidden', !show);
        }
    }

    updateMergeButtonState()
    {
        let checkedCount = 0;
        this.forEachTilesetRow((row) => {
            let checkbox = row.querySelector('.tileset-merge-checkbox');
            if(checkbox && checkbox.checked){
                checkedCount++;
            }
        });
        let mergeBtn = this.app.getElement('.merge-btn');
        if(mergeBtn){
            mergeBtn.disabled = 2 > checkedCount;
        }
    }

    updateGenerateButtonState()
    {
        let hasErrors = document.querySelectorAll('.element-name-invalid').length > 0;
        let hasSelected = 0 < document.querySelectorAll('.element-bulk-select:checked').length;
        this.app.getElement('.generate-btn').disabled = hasErrors;
        this.app.getElement('.generate-selected-btn').disabled = hasErrors || !hasSelected;
        this.updateTilesetGenerateVisibility();
        this.updateMergeButtonState();
        this.forEachTilesetRow((row) => {
            let rowErrors = row.querySelectorAll('.element-name-invalid').length > 0;
            let rowSelected = 0 < row.querySelectorAll('.element-bulk-select:checked').length;
            row.querySelector('.tileset-generate-btn').disabled = rowErrors;
            row.querySelector('.tileset-generate-selected-btn').disabled = rowErrors || !rowSelected;
        });
    }
}
window.TilesetGenerator = TilesetGenerator;
