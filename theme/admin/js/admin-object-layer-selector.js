class AdminObjectLayerSelector
{
    bind(entityData)
    {
        let layerNameInput = document.querySelector('[name="layer_name"]');
        let roomSelector = document.querySelector('[name="room_id"]');
        if(!layerNameInput || !roomSelector){
            return false;
        }
        let roomsList = entityData?.extraData?.roomsList;
        if(!roomsList){
            return false;
        }
        let layerSelector = this.createLayerSelector(layerNameInput);
        roomSelector.addEventListener('change', () => {
            this.populateRoomLayers(layerSelector, layerNameInput, roomsList, roomSelector);
        });
        this.populateRoomLayers(layerSelector, layerNameInput, roomsList, roomSelector);
        return true;
    }

    createLayerSelector(layerNameInput)
    {
        let layerSelector = document.createElement('select');
        layerSelector.classList.add('layer-name-selector');
        layerSelector.classList.add('hidden');
        layerNameInput.parentElement.insertBefore(layerSelector, layerNameInput);
        layerSelector.addEventListener('change', () => {
            layerNameInput.value = layerSelector.value;
        });
        return layerSelector;
    }

    populateRoomLayers(layerSelector, layerNameInput, roomsList, roomSelector)
    {
        let selectedRoom = adminMapRenderer.findRoomById(roomsList, roomSelector.value);
        let roomLayers = selectedRoom ? selectedRoom.layers : false;
        if(!roomLayers || 0 === roomLayers.length){
            this.activateLayerNameInput(layerSelector, layerNameInput);
            return false;
        }
        layerSelector.innerHTML = '';
        this.appendLayersOptions(layerSelector, roomLayers, layerNameInput.value);
        layerSelector.classList.remove('hidden');
        layerNameInput.type = 'hidden';
        layerNameInput.value = layerSelector.value;
        return true;
    }

    appendLayersOptions(layerSelector, roomLayers, currentLayerName)
    {
        let layersNames = [...roomLayers];
        if(currentLayerName && -1 === layersNames.indexOf(currentLayerName)){
            layersNames.unshift(currentLayerName);
        }
        for(let layerName of layersNames){
            let option = document.createElement('option');
            option.text = layerName;
            option.value = layerName;
            option.selected = layerName === currentLayerName;
            layerSelector.add(option);
        }
    }

    activateLayerNameInput(layerSelector, layerNameInput)
    {
        layerSelector.innerHTML = '';
        layerSelector.classList.add('hidden');
        layerNameInput.type = 'text';
    }
}
window.AdminObjectLayerSelector = AdminObjectLayerSelector;
