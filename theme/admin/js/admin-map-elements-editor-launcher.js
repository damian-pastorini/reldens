class AdminMapElementsEditorLauncher
{
    bind()
    {
        let buttons = document.querySelectorAll('.edit-elements-btn:not(.edit-map-elements-entity-btn)');
        for(let button of buttons){
            button.addEventListener('click', (event) => this.launch(event));
        }
        this.bindEntityButton();
    }

    bindEntityButton()
    {
        let entityButton = document.querySelector('.edit-map-elements-entity-btn');
        if(!entityButton){
            return;
        }
        let container = entityButton.closest('.extra-content-container');
        if(!container){
            return;
        }
        let entityData = this.parseEntityData(container);
        if(!entityData){
            return;
        }
        let mapName = this.deriveMapName(entityData);
        if(!mapName){
            return;
        }
        entityButton.dataset.mapName = mapName;
        entityButton.dataset.mapElementsFile = entityData.mapElementsFile ? entityData.mapElementsFile : '';
        entityButton.dataset.imageKey = entityData.firstSceneImage ? entityData.firstSceneImage : '';
        if(!this.placeButtonBesideMapField(entityButton, entityData)){
            container.appendChild(entityButton);
        }
        entityButton.classList.remove('hidden');
        entityButton.addEventListener('click', (event) => this.launch(event));
        this.createPublishedBadge(entityButton);
    }

    placeButtonBesideMapField(entityButton, entityData)
    {
        let mapFieldValue = entityData.map_filename || entityData.mapName;
        if(!mapFieldValue){
            return false;
        }
        for(let fieldRow of document.querySelectorAll('.entity-view .view-field')){
            let fieldValue = fieldRow.querySelector('.field-value');
            if(!fieldValue){
                continue;
            }
            if(-1 === fieldValue.textContent.indexOf(mapFieldValue)){
                continue;
            }
            fieldValue.classList.add('with-view-button');
            fieldValue.appendChild(entityButton);
            return true;
        }
        return false;
    }

    parseEntityData(container) // HOFF
    {
        let raw = container.dataset.entitySerializedData;
        if(!raw){
            return null;
        }
        try {
            return JSON.parse(raw); // HOFF
        } catch(error){
            container.dataset.entityDataError = error.message;
            return null;
        }
    }

    deriveMapName(entityData)
    {
        if(entityData.mapName){
            return entityData.mapName;
        }
        let mapFilename = entityData.map_filename;
        if(!mapFilename){
            return '';
        }
        return mapFilename.replace(/\.json$/i, '');
    }

    launch(event)
    {
        let button = event.currentTarget;
        if(button.editorInstance){
            this.closeEditor(button);
            return;
        }
        this.openEditor(button);
    }

    openEditor(button)
    {
        let mapName = button.dataset.mapName;
        let canvas = this.resolveCanvas(button, mapName);
        if(!canvas){
            return;
        }
        canvas = this.detachExternalListeners(canvas);
        let tileset = new Image();
        tileset.src = button.dataset.imageKey || canvas.dataset.imageKey || '';
        tileset.onerror = () => {
            tileset.dataset.loadError = '1';
        };
        tileset.onload = async () => {
            let editor = new MapsElementsEditor(canvas, this.buildOptions(button, mapName, tileset));
            canvas.mapsElementsEditor = editor;
            button.editorInstance = editor;
            button.dataset.openLabel = button.textContent;
            await editor.load();
            if(editor.ui && editor.ui.container){
                editor.ui.container.scrollIntoView({behavior: 'smooth', block: 'start'});
            }
            button.textContent = 'Close Map Editor';
        };
    }

    closeEditor(button)
    {
        button.editorInstance.dispose();
        button.editorInstance = null;
        button.textContent = button.dataset.openLabel ? button.dataset.openLabel : 'Edit Map Elements';
    }

    resolveCanvas(button, mapName)
    {
        let existing = this.findCanvas(button, mapName);
        if(existing){
            return existing;
        }
        if('room' !== button.dataset.context){
            return null;
        }
        return this.createRoomCanvas(button, mapName);
    }

    createRoomCanvas(button, mapName)
    {
        let host = document.querySelector('.edit-map-elements-host');
        if(!host){
            host = this.createRoomHost(button);
        }
        if(!host){
            return null;
        }
        host.innerHTML = '';
        let canvas = document.createElement('canvas');
        canvas.className = 'mapCanvas';
        canvas.dataset.mapName = mapName;
        host.appendChild(canvas);
        return canvas;
    }

    createRoomHost(button)
    {
        let host = document.createElement('div');
        host.className = 'edit-map-elements-host';
        let fieldRow = button.closest('.view-field');
        if(fieldRow){
            fieldRow.after(host);
            return host;
        }
        let container = button.closest('.extra-content-container');
        if(!container){
            container = document.querySelector('.extra-content-container');
        }
        if(!container){
            return null;
        }
        container.appendChild(host);
        return host;
    }

    buildOptions(button, mapName, tileset) // HOFF
    {
        return {
            mapName,
            sessionId: button.dataset.sessionId || '',
            mapElementsFile: button.dataset.mapElementsFile || (mapName+'-room-map-elements.json'),
            context: button.dataset.context || 'wizard',
            tileset,
            onPublishedState: (unpublished) => this.setPublishedBadge(button, unpublished)
        };
    }

    createPublishedBadge(entityButton)
    {
        let badge = document.createElement('span');
        badge.className = 'map-unpublished-badge hidden';
        badge.textContent = 'Unpublished - restart required to publish';
        entityButton.before(badge);
        entityButton.publishedBadge = badge;
        this.refreshPublishedBadge(entityButton).catch((error) => {
            entityButton.dataset.publishedBadgeError = error.message;
        });
    }

    async refreshPublishedBadge(entityButton)
    {
        let mapName = entityButton.dataset.mapName;
        if(!mapName){
            return;
        }
        let url = '/reldens-admin/maps-elements-editor/api/list-backups?mapName='+encodeURIComponent(mapName);
        let response = await fetch(url, {cache: 'no-store'});
        if(!response.ok){
            return;
        }
        let data = await response.json();
        this.setPublishedBadge(entityButton, this.computeUnpublished(data));
    }

    computeUnpublished(data)
    {
        let backups = data && data.backups ? data.backups : [];
        if(0 === backups.length){
            return false;
        }
        let publishedTimestamp = data && data.publishedTimestamp ? data.publishedTimestamp : '';
        return backups[0].timestamp !== publishedTimestamp;
    }

    setPublishedBadge(entityButton, unpublished) // HOFF
    {
        if(!entityButton.publishedBadge){
            return;
        }
        entityButton.publishedBadge.classList.toggle('hidden', !unpublished);
    }

    detachExternalListeners(canvas)
    {
        let clone = canvas.cloneNode(false);
        canvas.removeAttribute('data-toggle');
        clone.removeAttribute('data-toggle');
        canvas.parentNode.replaceChild(clone, canvas);
        return clone;
    }

    findCanvas(button, mapName) // HOFF
    {
        if(mapName){
            let byName = document.querySelector('.mapCanvas[data-map-name="'+mapName+'"]');
            if(byName){
                return byName;
            }
        }
        for(let prev = button.previousElementSibling; prev; prev = prev.previousElementSibling){
            if(prev.classList && prev.classList.contains('mapCanvas')){
                return prev;
            }
        }
        return null;
    }
}
window.AdminMapElementsEditorLauncher = AdminMapElementsEditorLauncher;
