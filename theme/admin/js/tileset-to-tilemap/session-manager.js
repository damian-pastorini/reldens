class TilesetSessionManager
{
    constructor(app)
    {
        this.app = app;
        this.itemBuilder = new SessionItemBuilder(this);
    }

    async load()
    {
        let response = await fetch('sessions');
        let data = await response.json();
        if(!data.sessions || !data.sessions.length){
            return;
        }
        data.sessions.map(session => this.addSession(session.sessionId, session.files, false));
        this.app.getElement('.generated-files').classList.remove('hidden');
        if(!this.app.state.length){
            this.app.getElement('.generated-files-list').classList.remove('hidden');
            this.app.getElement('.generated-files-search').classList.remove('hidden');
        }
    }

    addSession(sessionId, files, prepend = true)
    {
        let list = this.app.getElement('.generated-files-list');
        let existing = list.querySelector('[data-session-id="'+sessionId+'"]');
        if(existing){
            existing.remove();
        }
        let li = this.buildSessionItem(sessionId, files, prepend);
        if(prepend){
            list.prepend(li);
            list.classList.remove('hidden');
            this.app.getElement('.generated-files').classList.remove('hidden');
            return;
        }
        list.appendChild(li);
        this.app.getElement('.generated-files').classList.remove('hidden');
    }

    buildSessionItem(sessionId, files, expanded)
    {
        return this.itemBuilder.build(sessionId, files, expanded);
    }

    showStatus(msg, isError)
    {
        let el = this.app.getElement('.generate-status');
        el.textContent = msg;
        el.className = 'generate-status'+(isError ? ' generate-status-error' : ' generate-status-success');
    }

    buildSaveSessionId()
    {
        let overrideCheckbox = document.querySelector('.override-files-checkbox');
        let nameInput = document.querySelector('.session-name-input');
        let name = nameInput ? nameInput.value.trim() : '';
        if(overrideCheckbox && overrideCheckbox.checked){
            if(!name){
                return this.app.sessionId;
            }
            return (this.app.sessionId.match(/^(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/) || [null, this.app.sessionId])[1]+'-'+name;
        }
        let timestamp = SharedUtils.buildSessionTimestamp();
        if(!name){
            return timestamp;
        }
        return timestamp+'-'+name;
    }

    async doSave(tilesets, sessionId, oldSessionId)
    {
        let saveId = sessionId || this.app.sessionId;
        let body = { sessionId: saveId, tilesets };
        if(oldSessionId && oldSessionId !== saveId){
            body.oldSessionId = oldSessionId;
        }
        if(this.app.globalTileOptions){
            body.globalTileOptions = this.app.globalTileOptions;
        }
        return (await fetch('sessions/'+saveId+'/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })).json();
    }

    async doSaveTileset(tileset)
    {
        return (await fetch('sessions/'+this.app.sessionId+'/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: this.app.sessionId, tileset })
        })).json();
    }

    async autoSave()
    {
        await this.doSave(this.app.generator.getSerializableState(false));
    }

    async refreshSessionInList(sessionId)
    {
        let response = await fetch('sessions');
        let data = await response.json();
        if(!data.sessions){
            return;
        }
        let session = data.sessions.find(s => s.sessionId === sessionId);
        if(session){
            this.addSession(session.sessionId, session.files);
        }
    }

    removeOldSessionItem(oldSessionId)
    {
        let list = this.app.getElement('.generated-files-list');
        let oldItem = list.querySelector('[data-session-id="'+oldSessionId+'"]');
        if(oldItem){
            oldItem.remove();
        }
    }

    updateStateReferences(oldSessionId, saveId)
    {
        for(let ts of this.app.state){
            ts.sessionId = saveId;
            if(ts.filePath){
                ts.filePath = ts.filePath
                    .split('/input/'+oldSessionId+'/')
                    .join('/input/'+saveId+'/')
                    .split('\\input\\'+oldSessionId+'\\')
                    .join('\\input\\'+saveId+'\\');
            }
            if(ts.imageUrl){
                ts.imageUrl = ts.imageUrl
                    .split('tileset-image/'+oldSessionId+'/')
                    .join('tileset-image/'+saveId+'/');
            }
        }
    }

    saveAll()
    {
        let overrideCheckbox = document.querySelector('.override-files-checkbox');
        let isOverride = overrideCheckbox && overrideCheckbox.checked;
        let overrideMsg = isOverride ? 'This will overwrite the current saved state.' : 'A new session will be saved.';
        this.app.modals.show(
            'Are you sure you want to save the session? '+overrideMsg,
            async () => {
                let oldSessionId = this.app.sessionId;
                let saveId = this.buildSaveSessionId();
                let overrideCheckbox = document.querySelector('.override-files-checkbox');
                let isOverride = overrideCheckbox && overrideCheckbox.checked;
                let idChanged = saveId !== oldSessionId;
                let data = await this.doSave(
                    this.app.generator.getSerializableState(false),
                    saveId,
                    isOverride && idChanged ? oldSessionId : null
                );
                if(!data.success){
                    this.showStatus('Error saving session: '+(data.error || 'Unknown error'), true);
                    return;
                }
                if(idChanged){
                    this.updateStateReferences(oldSessionId, saveId);
                    if(isOverride){
                        this.removeOldSessionItem(oldSessionId);
                    }
                }
                this.app.sessionId = saveId;
                let nameMatch = saveId.match(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-?(.*)$/);
                let nameInputEl = document.querySelector('.session-name-input');
                if(nameInputEl && nameMatch){
                    nameInputEl.value = nameMatch[1];
                }
                this.showStatus('Session saved successfully', false);
                await this.refreshSessionInList(saveId);
            }
        );
    }

    saveTileset(tilesetIndex)
    {
        this.app.modals.show(
            'Are you sure you want to save this tileset?',
            async () => {
                let tileset = this.app.generator.serializeTileset(
                    this.app.state[tilesetIndex],
                    false,
                    tilesetIndex,
                    document.querySelector('[data-tileset-index="'+tilesetIndex+'"]')
                );
                let data = await this.doSaveTileset(tileset);
                if(!data.success){
                    this.showStatus('Error saving tileset: '+(data.error || 'Unknown error'), true);
                    return;
                }
                this.showStatus('Tileset saved successfully', false);
                await this.refreshSessionInList(this.app.sessionId);
            }
        );
    }

    async withSessionData(sessionId, onSuccess)
    {
        let response = await fetch('sessions/'+sessionId+'/load');
        let data = await response.json();
        if(!data.tilesets){
            this.showStatus('Error: '+(data.error || 'Unknown error'), true);
            return;
        }
        await onSuccess(data);
    }

    loadSession(sessionId)
    {
        let replaceMsg = this.app.state.length > 0 ? ' This will replace the current session.' : '';
        this.app.modals.show(
            'Load session "'+sessionId+'"?'+replaceMsg,
            async () => {
                await this.withSessionData(sessionId, async (data) => {
                    this.app.stateBuilder.loadFromSession(data);
                    this.app.sessionId = sessionId;
                    this.app.generator.lastGeneratedSessionId = sessionId;
                    let nameInput = document.querySelector('.session-name-input');
                    if(nameInput){
                        let nameMatch = sessionId.match(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-?(.*)$/);
                        nameInput.value = nameMatch ? nameMatch[1] : '';
                    }
                    let sessionItem = this.app.getElement('[data-session-id="'+sessionId+'"]');
                    if(sessionItem && sessionItem.querySelector('.generated-file-wizard-btn')){
                        this.app.showMapsWizardBtn();
                    }
                    this.showStatus('Session loaded successfully', false);
                });
            },
            null,
            'button-success'
        );
    }

    appendSession(sessionId)
    {
        this.app.modals.show(
            'Append session "'+sessionId+'"? Only tilesets not already present will be added.',
            async () => {
                await this.withSessionData(sessionId, async (data) => {
                    this.app.stateBuilder.appendFromSession(data);
                    this.showStatus('Session appended successfully', false);
                });
            },
            null,
            'button-primary'
        );
    }

    delete(sessionId, listItem)
    {
        this.app.modals.show(
            'Delete session '+sessionId+'? This will remove all generated files.',
            async () => {
                let response = await fetch('sessions/'+sessionId, { method: 'DELETE' });
                let data = await response.json();
                if(!data.success){
                    return;
                }
                listItem.remove();
                let list = this.app.getElement('.generated-files-list');
                if(!list.children.length){
                    this.app.getElement('.generated-files').classList.add('hidden');
                }
            },
            null,
            'button-danger'
        );
    }
}
