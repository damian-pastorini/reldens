class AdminMapElementsEditorLauncher
{
    bind()
    {
        let buttons = document.querySelectorAll('.edit-elements-btn');
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
        let mapFilenameInput = document.querySelector('[name="map_filename"]');
        if(!mapFilenameInput || !mapFilenameInput.value){
            return;
        }
        let fieldValueSpan = mapFilenameInput.parentElement;
        fieldValueSpan.classList.add('with-inline-button');
        fieldValueSpan.appendChild(entityButton);
        entityButton.classList.remove('hidden');
        entityButton.addEventListener('click', (event) => this.launch(event));
    }

    launch(event)
    {
        let button = event.currentTarget;
        let mapName = button.dataset.mapName;
        let canvas = this.findCanvas(button);
        if(!canvas){
            return;
        }
        if(canvas.mapsElementsEditor){
            canvas.mapsElementsEditor.dispose();
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
            await editor.load();
        };
    }

    buildOptions(button, mapName, tileset)
    {
        return {
            mapName,
            sessionId: button.dataset.sessionId || '',
            mapElementsFile: button.dataset.mapElementsFile || (mapName+'-room-map-elements.json'),
            context: button.dataset.context || 'wizard',
            tileset
        };
    }

    detachExternalListeners(canvas)
    {
        let clone = canvas.cloneNode(false);
        canvas.removeAttribute('data-toggle');
        clone.removeAttribute('data-toggle');
        canvas.parentNode.replaceChild(clone, canvas);
        return clone;
    }

    findCanvas(button)
    {
        let mapName = button.dataset.mapName;
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
