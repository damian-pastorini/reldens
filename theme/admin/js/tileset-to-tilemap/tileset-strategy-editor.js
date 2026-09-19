class TilesetStrategyEditor
{
    constructor(app)
    {
        this.app = app;
        this.MULTIPLE_ASSOC = 'multiple-with-association-by-loader';
    }

    getSelect(row)
    {
        return row.querySelector('.tileset-generator-type');
    }

    getEditor(row)
    {
        return row.querySelector('.tileset-associations-editor');
    }

    withSelect(row, callback)
    {
        let select = this.getSelect(row);
        if(!select){
            return false;
        }
        callback(select);
        return true;
    }

    bind(row)
    {
        this.withSelect(row, (select) => {
            select.addEventListener('change', () => this.onStrategyChange(row));
        });
    }

    syncEditorVisibility(row)
    {
        let select = this.getSelect(row);
        let editor = this.getEditor(row);
        if(!select || !editor){
            return false;
        }
        let isAssoc = this.MULTIPLE_ASSOC === select.value;
        editor.classList.toggle('hidden', !isAssoc);
        return isAssoc;
    }

    onStrategyChange(row)
    {
        this.syncEditorVisibility(row);
    }

    readAssociationsProperties(row)
    {
        let select = this.getSelect(row);
        if(!select || this.MULTIPLE_ASSOC !== select.value){
            return null;
        }
        return {
            generateElementsPath: row.querySelector('.assoc-generate-elements-path').checked,
            blockMapBorder: row.querySelector('.assoc-block-map-border').checked,
            freeSpaceTilesQuantity: SharedUtils.toNumber(row.querySelector('.assoc-free-space-tiles').value, 0),
            variableTilesPercentage: SharedUtils.toNumber(row.querySelector('.assoc-variable-tiles-pct').value, 0),
            placeElementsOrder: row.querySelector('.assoc-place-elements-order').value,
            orderElementsBySize: row.querySelector('.assoc-order-by-size').checked,
            randomizeQuantities: row.querySelector('.assoc-randomize-quantities').checked,
            applySurroundingPathTiles: row.querySelector('.assoc-apply-surrounding-path-tiles').checked,
            automaticallyExtrudeMaps: row.querySelector('.assoc-automatically-extrude-maps').checked
        };
    }

    applyToRow(row, generatorType, associationsProperties)
    {
        let applied = this.withSelect(row, (select) => {
            if(generatorType){
                select.value = generatorType;
            }
        });
        if(!applied){
            return;
        }
        let isAssoc = this.syncEditorVisibility(row);
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
window.TilesetStrategyEditor = TilesetStrategyEditor;
