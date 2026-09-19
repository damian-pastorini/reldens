class AdminMapGridToggle
{

    fetchTileSize(sourceCanvas)
    {
        let tileWidth = Number(sourceCanvas.dataset.tileWidth || 0);
        let tileHeight = Number(sourceCanvas.dataset.tileHeight || 0);
        if(0 < tileWidth && 0 < tileHeight){
            return {tileWidth: tileWidth, tileHeight: tileHeight};
        }
        let mapData = adminMapRenderer.loadedMapsData[sourceCanvas.dataset.mapJson];
        if(!mapData){
            return false;
        }
        return {tileWidth: mapData.tilewidth, tileHeight: mapData.tileheight};
    }

    redraw(sourceCanvas, modalCanvas, showGrid)
    {
        let modalContext = modalCanvas.getContext('2d');
        modalContext.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
        modalContext.drawImage(sourceCanvas, 0, 0);
        if(!showGrid){
            return;
        }
        let tileSize = this.fetchTileSize(sourceCanvas);
        if(!tileSize){
            return;
        }
        adminMapCanvasDrawer.drawTiles(
            modalContext,
            modalCanvas.width,
            modalCanvas.height,
            tileSize.tileWidth,
            tileSize.tileHeight
        );
    }

    toggle(button, sourceCanvas, modalCanvas)
    {
        let showGrid = !button.classList.contains('button-primary');
        button.classList.toggle('button-primary', showGrid);
        button.classList.toggle('button-secondary', !showGrid);
        this.redraw(sourceCanvas, modalCanvas, showGrid);
    }

    buildButton(sourceCanvas, modalCanvas)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-sm button-secondary show-grid-button';
        button.textContent = 'Show grid';
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggle(button, sourceCanvas, modalCanvas);
        });
        return button;
    }

    buildHeader(sourceCanvas, modalCanvas)
    {
        let header = document.createElement('div');
        header.classList.add('modal-header');
        header.appendChild(this.buildButton(sourceCanvas, modalCanvas));
        return header;
    }

    appendHeaderTo(dialog, sourceCanvas, modalCanvas)
    {
        if(!(sourceCanvas instanceof HTMLCanvasElement)){
            return false;
        }
        if(!(modalCanvas instanceof HTMLCanvasElement)){
            return false;
        }
        dialog.appendChild(this.buildHeader(sourceCanvas, modalCanvas));
        return true;
    }

}
window.adminMapGridToggle = new AdminMapGridToggle();
