/**
 *
 * Reldens - Admin Client JS
 *
 */

if(window.trustedTypes?.createPolicy){
    trustedTypes.createPolicy('default', {
        createHTML: s => s,
        createScriptURL: s => s
    });
}

// @TODO - BETA - Refactor, split, clean up, bundle.
window.addEventListener('DOMContentLoaded', () => {

    // helpers:
    let location = window.location;
    let currentPath = location.pathname;
    let queryString = location.search;
    let urlParams = new URLSearchParams(queryString);

    function getCookie(name)
    {
        let value = `; ${document.cookie}`;
        let parts = value.split(`; ${name}=`);
        if(2 === parts.length){
            return parts.pop().split(';').shift()
        }
    }

    function deleteCookie(name)
    {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    function escapeHTML(str)
    {
        return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function cloneElement(element)
    {
        if(element instanceof HTMLCanvasElement){
            let clonedCanvas = document.createElement('canvas');
            clonedCanvas.width = element.width;
            clonedCanvas.height = element.height;
            let ctx = clonedCanvas.getContext('2d');
            ctx.drawImage(element, 0, 0);
            return clonedCanvas
        }
        return element.cloneNode(true);
    }

    function fetchMapFileAndDraw(mapJson, tileset, mapCanvas, withTileHighlight, tileClickCallback)
    {
        if(!mapJson){
            return false;
        }
        fetch(mapJson)
            .then(response => response.json())
            .then(data => {
                mapCanvas.width = data.width * data.tilewidth;
                mapCanvas.height = data.height * data.tileheight;
                let mapCanvasContext = mapCanvas.getContext('2d');
                drawMap(mapCanvasContext, tileset, data);
                drawTiles(mapCanvasContext, mapCanvas.width, mapCanvas.height, data.tilewidth, data.tileheight);
                if(withTileHighlight){
                    mapCanvas.addEventListener('mousemove', (event) => {
                        let mouseX = event.offsetX;
                        let mouseY = event.offsetY;
                        // @TODO - BETA - Refactor to only re-draw the highlight area not the entire grid.
                        // highlightTile(mouseX, mouseY, data.tilewidth, data.tileheight, mapCanvasContext);
                        redrawWithHighlight(mapCanvasContext, mapCanvas.width, mapCanvas.height, data, mouseX, mouseY);
                    });
                }
                if(tileClickCallback){
                    mapCanvas.addEventListener('click', (event) => {
                        tileClickCallback(event, data);
                    });
                }
            })
            .catch(error => console.error('Error fetching JSON:', error));
    }

    function drawMap(mapCanvasContext, tileset, mapData)
    {
        // we are assuming there is only one tileset in mapData.tilesets since the maps are coming from the optimizer:
        let tilesetInfo = mapData.tilesets[0];
        let tileWidth = tilesetInfo.tilewidth;
        let tileHeight = tilesetInfo.tileheight;
        let margin = tilesetInfo.margin;
        let spacing = tilesetInfo.spacing;
        let columns = tilesetInfo.imagewidth / (tilesetInfo.tilewidth + tilesetInfo.spacing);
        for(let layer of mapData.layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            let width = layer.width;
            for(let index = 0; index < layer.data.length; index++){
                let tileIndex = Number(layer.data[index]);
                if(0 === tileIndex){
                    continue;
                }
                let colIndex = index % width;
                let rowIndex = Math.floor(index / width);
                // adjusting for 0-based index:
                let tileId = tileIndex - 1;
                let sx = margin + (tileId % columns) * (tileWidth + spacing);
                let sy = margin + Math.floor(tileId / columns) * (tileHeight + spacing);
                mapCanvasContext.drawImage(
                    tileset,
                    sx,
                    sy,
                    tileWidth,
                    tileHeight,
                    colIndex * tileWidth,
                    rowIndex * tileHeight,
                    tileWidth,
                    tileHeight
                );
            }
        }
    }

    function drawTiles(canvasContext, canvasWidth, canvasHeight, tileWidth, tileHeight)
    {
        canvasContext.save();
        canvasContext.globalAlpha = 0.4;
        canvasContext.strokeStyle = '#ccc';
        canvasContext.lineWidth = 2;
        for(let x = 0; x < canvasWidth; x += tileWidth){
            for(let y = 0; y < canvasHeight; y += tileHeight){
                canvasContext.strokeRect(x, y, tileWidth, tileHeight);
            }
        }
        canvasContext.restore();
    }

    function highlightTile(mouseX, mouseY, tileWidth, tileHeight, canvasContext)
    {
        let tileCol = Math.floor(mouseX / tileWidth);
        let tileRow = Math.floor(mouseY / tileHeight);
        let highlightX = tileCol * tileWidth;
        let highlightY = tileRow * tileHeight;
        canvasContext.save();
        canvasContext.strokeStyle = 'red';
        canvasContext.lineWidth = 2;
        canvasContext.strokeRect(highlightX, highlightY, tileWidth, tileHeight);
        canvasContext.restore();
    }

    function redrawWithHighlight(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData, mouseX, mouseY)
    {
        drawTiles(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData.tilewidth, mapData.tileheight);
        highlightTile(mouseX, mouseY, mapData.tilewidth, mapData.tileheight, mapCanvasContext);
    }

    function loadAndCreateMap(mapJsonFileName, mapSceneImages, appendOnElement, tileClickCallback) {
        let mapCanvas = document.createElement('canvas');
        mapCanvas.classList.add('mapCanvas');
        appendOnElement.appendChild(mapCanvas);
        let sceneImages = mapSceneImages.split(',');
        if (1 === sceneImages.length) {
            let tileset = new Image();
            // for now, we will only handle 1 image cases:
            tileset.src = '/assets/maps/' + sceneImages[0];
            tileset.onload = () => {
                fetchMapFileAndDraw(
                    '/assets/maps/' + mapJsonFileName,
                    tileset,
                    mapCanvas,
                    true,
                    tileClickCallback
                );
            }
            tileset.onerror = () => {
                console.error('Error loading tileset image');
            };
        }
        if (1 < sceneImages.length) {
            console.error('Maps link is not available for tilesets with multiple images for now.');
        }
    }

    function calculateTileData(event, data)
    {
        let positionX = event.offsetX;
        let positionY = event.offsetY;
        let tileCol = Math.floor(positionX / data.tilewidth);
        let tileRow = Math.floor(positionY / data.tileheight);
        let positionTileX = (tileCol * data.tilewidth) + (data.tilewidth / 2);
        let positionTileY = (tileRow * data.tileheight) + (data.tileheight / 2);
        let cols = data.width;
        let rows = data.height;
        let tileIndex = tileRow * cols + tileCol;
        return {tileCol, tileRow, positionTileX, positionTileY, tileIndex, positionX, positionY, cols, rows};
    }

    // error codes messages map:
    let errorMessages = {
        saveBadPatchData: 'Bad patch data on update.',
        saveEntityStorageError: 'Entity storage error.',
        saveEntityError: 'Entity could not be saved.',
        shutdownError: 'Server could not be shutdown, missing "shutdownTime".',
        mapsWizardImportDataError: 'Map could not be imported, missing generated map data.',
        mapsWizardImportError: 'Map could not be imported.',
        objectsImportMissingDataError: 'Object could not be imported, missing JSON files.',
        objectsImportDataError: 'Object could not be imported, missing data in JSON files.',
        objectsImportError: 'Object could not be imported.',
        skillsImportMissingDataError: 'Skills could not be imported, missing JSON files.',
        skillsImportDataError: 'Skills could not be imported, missing data in JSON files.',
        skillsImportError: 'Skills could not be imported.',
        errorView: 'Could not render view page.',
        errorEdit: 'Could not render edit page.',
        errorId: 'Missing entity ID on POST.',
        errorMissingTileIndex: 'Missing tile index to create change point.',
        errorMissingNextRoom: 'Missing next room selection.',
        errorMissingRoomX: 'Missing return point X.',
        errorMissingRoomY: 'Missing return point Y.',
        errorSaveChangePoint: 'Error saving change point.',
        errorSaveReturnPoint: 'Error saving return point.',
    };

    // activate expand/collapse elements
    let expandCollapseButtons = document.querySelectorAll('[data-expand-collapse]');
    if(expandCollapseButtons){
        for(let expandCollapseButton of expandCollapseButtons){
            expandCollapseButton.addEventListener('click', (event) => {
                let expandCollapseElement = document.querySelector(event.currentTarget.dataset.expandCollapse);
                if(expandCollapseElement){
                    expandCollapseElement.classList.toggle('hidden');
                }
            });
        }
    }

    // activate modals on click
    let modalElements = document.querySelectorAll('[data-toggle="modal"]');
    if(modalElements){
        for(let modalElement of modalElements){
            modalElement.addEventListener('click', () => {
                let overlay = document.createElement('div');
                overlay.classList.add('modal-overlay');
                let modal = document.createElement('div');
                modal.classList.add('modal');
                modal.classList.add('clickable');
                let clonedElement = cloneElement(modalElement);
                clonedElement.classList.add('clickable');
                modal.appendChild(clonedElement);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                clonedElement.addEventListener('click', () => {
                    document.body.removeChild(overlay);
                });
                modal.addEventListener('click', (e) => {
                    if(e.target === modal){
                        document.body.removeChild(modal.parentNode);
                    }
                });
                overlay.addEventListener('click', (e) => {
                    if(e.target === overlay) {
                        document.body.removeChild(overlay);
                    }
                });
            });
        }
    }

    // login errors:
    if('true' === urlParams.get('login-error')){
        let loginErrorBox = document.querySelector('form.login-form .response-error');
        if(loginErrorBox){
            loginErrorBox.innerHTML = 'Login error, please try again.';
        }
    }

    // forms behavior:
    let forms = document.querySelectorAll('form');
    if(forms){
        for(let form of forms){
            form.addEventListener('submit', (event) => {
                let submitButton = document.querySelector('input[type="submit"]');
                submitButton.disabled = true;
                let loadingImage = document.querySelector('.submit-container .loading');
                if(loadingImage){
                    loadingImage.classList.remove('hidden');
                }
                if(form.classList.contains('form-delete') || form.classList.contains('confirmation-required')){
                    if(!confirm('Are you sure?')){
                        event.preventDefault();
                        submitButton.disabled = false;
                        loadingImage.classList.add('hidden');
                    }
                }
            });
        }
    }

    // sidebar headers click behavior:
    let sideBarHeaders = document.querySelectorAll('.with-sub-items h3');
    if(sideBarHeaders){
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
    }

    // expand menu on load:
    let subItemContainers = document.querySelectorAll('.with-sub-items');
    if(subItemContainers){
        let done = false;
        for(let container of subItemContainers){
            let links = container.querySelectorAll('.side-bar-item a');
            for(let link of links){
                let linkWithoutHost = link.href.replace(location.host, '').replace(location.protocol+'//', '');
                if(currentPath === linkWithoutHost || 0 === currentPath.indexOf(linkWithoutHost+'/')){
                    link.parentNode.classList.add('active');
                    container.classList.add('active');
                    done = true;
                    break;
                }
            }
            if(done){
                break;
            }
        }
    }

    // filters toggle visibility:
    let filtersToggle = document.querySelector('.filters-toggle');
    let filtersToggleContent = document.querySelector('.filters-toggle-content');
    if(filtersToggle && filtersToggleContent){
        filtersToggle.addEventListener('click', () => {
            filtersToggleContent.classList.toggle('hidden');
        });
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        let activeFilters = Array.from(allFilters).filter(input => '' !== input.value);
        if(0 < activeFilters.length){
            filtersToggleContent.classList.remove('hidden');
            let paginationLinks = document.querySelectorAll('.pagination a');
            let filtersForm = document.querySelector('#filter-form');
            if(paginationLinks && filtersForm){
                for(let link of paginationLinks){
                    link.addEventListener('click', (event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        filtersForm.action = link.href;
                        filtersForm.submit();
                        return false;
                    })
                }
            }
        }
    }

    // list select all:
    let listSelect = document.querySelector('.list-select');
    if(listSelect){
        listSelect.addEventListener('click', (event) => {
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = 1 === Number(event.currentTarget.dataset.checked);
            }
            event.currentTarget.dataset.checked = 1 === Number(event.currentTarget.dataset.checked) ? 0 : 1;
        });
    }

    // list delete selection:
    let listDeleteSelection = document.querySelector('.list-delete-selection');
    let deleteSelectionForm = document.getElementById('delete-selection-form');
    let hiddenInput = document.querySelector('.hidden-ids-input');
    if(listDeleteSelection && deleteSelectionForm && hiddenInput){
        listDeleteSelection.addEventListener('click', () => {
            if(!confirm('Are you sure?')){
                return;
            }
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            let ids = [];
            for(let checkbox of checkboxes){
                if(checkbox.checked){
                    ids.push(checkbox.value);
                }
            }
            hiddenInput.value = ids.join(',');
            deleteSelectionForm.submit();
        });
    }

    // display notifications from query params:
    let notificationElement = document.querySelector('.notification');
    if(notificationElement){
        let closeNotificationElement = document.querySelector('.notification .close');
        closeNotificationElement?.addEventListener('click', () => {
            notificationElement.classList.remove('success', 'error');
        });
        let queryParams = new URLSearchParams(location.search);
        let result = queryParams.get('result');
        if(!result){
            result = getCookie('result');
        }
        let notificationMessageElement = document.querySelector('.notification .message');
        if(result && notificationMessageElement){
            let notificationClass = 'success' === result ? 'success' : 'error';
            notificationMessageElement.innerHTML = '';
            notificationElement.classList.add(notificationClass);
            notificationMessageElement.innerHTML = 'success' === result
                ? 'Success!'
                : 'There was an error: '+escapeHTML(errorMessages[result] || result);
            deleteCookie('result');
        }
    }

    // shutdown timer:
    let shuttingDownTimeElement = document.querySelector('.shutting-down .shutting-down-time');
    if(shuttingDownTimeElement){
        let shuttingDownTime = shuttingDownTimeElement.getAttribute('data-shutting-down-time');
        if(shuttingDownTime){
            shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
            shuttingDownTime = Number(shuttingDownTime);
            let shuttingDownTimer = setInterval(
                () => {
                    shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
                    shuttingDownTime--;
                    if(0 === Number(shuttingDownTime)){
                        clearInterval(shuttingDownTimer);
                    }
                },
                1000
            );
        }
    }

    // create rooms link function:
    let entityDataElement = document.querySelector('[data-entity-serialized-data]');
    let mapLoadElement = document.querySelector('[data-map-loader]');
    if(entityDataElement){
        let entityData = entityDataElement?.dataset.entitySerializedData
            ? JSON.parse(entityDataElement.dataset.entitySerializedData)
            : false;
        let elementCurrentRoomChangePointTileIndex = document.querySelector('#currentRoomChangePointTileIndex');
        let roomsSelector = document.querySelector('.nextRoomSelector');
        let elementNextRoomPositionX = document.querySelector('#nextRoomPositionX');
        let elementNextRoomPositionY = document.querySelector('#nextRoomPositionY');
        let nextRoomMapContainer = document.querySelector('.next-room-return-position-container');
        let roomsList = entityData?.extraData?.roomsList;
        if(roomsList && nextRoomMapContainer && roomsSelector instanceof HTMLSelectElement){
            let roomListKey = Object.keys(roomsList);
            for(let key of roomListKey){
                let roomListData = roomsList[key];
                let option = document.createElement('option');
                option.text = roomListData.name;
                option.value = roomListData.id;
                option.dataset.mapFile = roomListData.mapFile;
                option.dataset.mapImages = roomListData.mapImages;
                roomsSelector.add(option)
            }
            roomsSelector.addEventListener('change', (event) => {
                let selectedOption = event.target.options[event.target.selectedIndex];
                nextRoomMapContainer.innerHTML = '';
                elementNextRoomPositionX.value = '';
                elementNextRoomPositionY.value = '';
                loadAndCreateMap(
                    selectedOption.dataset.mapFile,
                    selectedOption.dataset.mapImages,
                    nextRoomMapContainer,
                    (event, data) => {
                        let tileData = calculateTileData(event, data);
                        elementNextRoomPositionX.value = tileData.positionTileX;
                        elementNextRoomPositionY.value = tileData.positionTileY;
                    }
                );
            });
        }
        if(mapLoadElement){
            loadAndCreateMap(
                entityData.map_filename,
                entityData.scene_images,
                mapLoadElement,
                (event, data) => {
                    let tileData = calculateTileData(event, data);
                    if(elementCurrentRoomChangePointTileIndex){
                        elementCurrentRoomChangePointTileIndex.value = tileData.tileIndex;
                    }
                }
            );
        }
    }

    // maps wizard functions:
    let mapsWizardsOptions = document.querySelectorAll('.maps-wizard-form .map-wizard-option.with-state');
    for(let option of mapsWizardsOptions){
        option.addEventListener('click', (event) => {
            let wizardOptionsContainer = document.querySelectorAll('.wizard-option-container');
            for(let container of wizardOptionsContainer){
                container.classList.remove('active');
            }
            event.currentTarget.parentNode.parentNode.classList.add('active');
        });
    }

    let mapCanvasElements = document.querySelectorAll('.mapCanvas');
    for(let mapCanvas of mapCanvasElements){
        if(!mapCanvas.dataset?.mapJson){
            continue;
        }
        let tileset = new Image();
        // for now, we will only handle 1 image cases:
        tileset.src = mapCanvas.dataset.imageKey;
        tileset.onload = () => {
            fetchMapFileAndDraw(mapCanvas.dataset.mapJson, tileset, mapCanvas);
        }
        tileset.onerror = () => {
            console.error('Error loading tileset image');
        };
    }

});
