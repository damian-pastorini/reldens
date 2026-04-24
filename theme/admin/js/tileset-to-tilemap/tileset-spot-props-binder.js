class TilesetSpotPropsBinder
{
    constructor(events)
    {
        this.events = events;
    }

    bind(spotRow, tilesetIndex, spotName)
    {
        let props = spotRow.querySelectorAll('.spot-prop');
        for(let prop of props){
            let key = prop.dataset.prop;
            if(!key){
                continue;
            }
            prop.addEventListener('change', () => {
                let spot = this.events.binder.findSpot(tilesetIndex, spotName);
                if(!spot){
                    return;
                }
                if('checkbox' === prop.type){
                    this.applyCheckboxProp(spot, key, prop, spotRow);
                    return;
                }
                if('number' === prop.type){
                    spot[key] = prop.value === '' ? null : +prop.value;
                    return;
                }
                spot[key] = prop.value;
            });
        }
    }

    applyCheckboxProp(spot, key, prop, spotRow)
    {
        spot[key] = prop.checked;
        if('isElement' === key){
            this.events.binder.toggleIsElementFields(spotRow, prop.checked);
        }
    }
}
