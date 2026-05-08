class TilesetStrategyEditor
{
    constructor(app)
    {
        this.app = app;
        this.MULTIPLE_ASSOC = 'multiple-with-association-by-loader';
    }

    bind(row)
    {
        let select = row.querySelector('.tileset-generator-type');
        if(!select){
            return;
        }
        select.addEventListener('change', () => this.onStrategyChange(row));
    }

    onStrategyChange(row)
    {
        let select = row.querySelector('.tileset-generator-type');
        let editor = row.querySelector('.tileset-associations-editor');
        if(!select || !editor){
            return;
        }
        let isAssoc = this.MULTIPLE_ASSOC === select.value;
        editor.classList.toggle('hidden', !isAssoc);
    }

    readAssociationsProperties(row)
    {
        let select = row.querySelector('.tileset-generator-type');
        if(!select || this.MULTIPLE_ASSOC !== select.value){
            return null;
        }
        return {
            generateElementsPath: row.querySelector('.assoc-generate-elements-path').checked,
            blockMapBorder: row.querySelector('.assoc-block-map-border').checked,
            freeSpaceTilesQuantity: Number(row.querySelector('.assoc-free-space-tiles').value),
            variableTilesPercentage: Number(row.querySelector('.assoc-variable-tiles-pct').value),
            placeElementsOrder: row.querySelector('.assoc-place-elements-order').value,
            orderElementsBySize: row.querySelector('.assoc-order-by-size').checked,
            randomizeQuantities: row.querySelector('.assoc-randomize-quantities').checked,
            applySurroundingPathTiles: row.querySelector('.assoc-apply-surrounding-path-tiles').checked,
            automaticallyExtrudeMaps: row.querySelector('.assoc-automatically-extrude-maps').checked
        };
    }

    applyToRow(row, generatorType, associationsProperties)
    {
        let select = row.querySelector('.tileset-generator-type');
        if(!select){
            return;
        }
        if(generatorType){
            select.value = generatorType;
        }
        let editor = row.querySelector('.tileset-associations-editor');
        if(!editor){
            return;
        }
        let isAssoc = this.MULTIPLE_ASSOC === select.value;
        editor.classList.toggle('hidden', !isAssoc);
        if(!isAssoc || !associationsProperties){
            return;
        }
        let q = (cls) => row.querySelector(cls);
        q('.assoc-generate-elements-path').checked = !!associationsProperties.generateElementsPath;
        q('.assoc-block-map-border').checked = !!associationsProperties.blockMapBorder;
        q('.assoc-free-space-tiles').value = associationsProperties.freeSpaceTilesQuantity || 0;
        q('.assoc-variable-tiles-pct').value = associationsProperties.variableTilesPercentage || 0;
        q('.assoc-place-elements-order').value = associationsProperties.placeElementsOrder || 'inOrder';
        q('.assoc-order-by-size').checked = !!associationsProperties.orderElementsBySize;
        q('.assoc-randomize-quantities').checked = !!associationsProperties.randomizeQuantities;
        q('.assoc-apply-surrounding-path-tiles').checked = !!associationsProperties.applySurroundingPathTiles;
        q('.assoc-automatically-extrude-maps').checked = !!associationsProperties.automaticallyExtrudeMaps;
    }
}
