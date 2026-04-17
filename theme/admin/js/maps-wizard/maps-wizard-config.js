let commonGeneratorConfig = {
    factor: 2,
    mainPathSize: 3,
    blockMapBorder: true,
    freeSpaceTilesQuantity: 2,
    minimumElementsFreeSpaceAround: 1,
    freeSpaceMultiplier: 1,
    freeTilesMultiplier: 2,
    variableTilesPercentage: 15,
    collisionLayersForPaths: ['change-points', 'collisions', 'tree-base'],
    automaticallyExtrudeMaps: '1'
};

let configurationsState = {
    'elements-object-loader': JSON.stringify(Object.assign({
        tileSize: 32,
        tileSheetPath: 'tilesheet.png',
        tileSheetName: 'tilesheet.png',
        imageHeight: 578,
        imageWidth: 612,
        tileCount: 306,
        columns: 18,
        margin: 1,
        spacing: 2,
        groundTile: 116,
        pathTile: 121,
        randomGroundTiles: [26, 27, 28, 29, 30, 36, 37, 38, 39, 50, 51, 52, 53],
        elementsQuantity: {house1: 3, house2: 2, tree: 6},
        elementsFreeSpaceAround: {},
        elementsAllowPathsInFreeSpace: {},
        mapCenteredElements: {},
        surroundingTiles: {'-1,-1': 127, '-1,0': 124, '-1,1': 130, '0,-1': 126, '0,1': 129, '1,-1': 132, '1,0': 131, '1,1': 133},
        corners: {'-1,-1': 285, '-1,1': 284, '1,-1': 283, '1,1': 282},
        layerElementsFiles: {house1: 'house-001.json', house2: 'house-002.json', tree: 'tree.json'},
        bordersTiles: {top: 0, right: 0, bottom: 0, left: 0},
        borderCornersTiles: {'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0},
        groundSpots: {},
        mapSize: {mapWidth: 0, mapHeight: 0}
    }, commonGeneratorConfig)),
    'elements-composite-loader': JSON.stringify(Object.assign({
        compositeElementsFile: 'reldens-town-composite.json'
    }, commonGeneratorConfig)),
    'multiple-by-loader': JSON.stringify(Object.assign({
        mapNames: ['map-001', 'map-002', 'map-003'],
        compositeElementsFile: 'reldens-town-composite.json'
    }, commonGeneratorConfig)),
    'multiple-with-association-by-loader': JSON.stringify(Object.assign({
        compositeElementsFile: 'reldens-town-composite-with-associations.json',
        mapsInformation: [
            {mapName: 'town-001', mapTitle: 'Town 1'},
            {mapName: 'town-002', mapTitle: 'Town 2'},
            {mapName: 'town-003', mapTitle: 'Town 3'},
            {mapName: 'town-004', mapTitle: 'Town 4'}
        ],
        associationsProperties: {
            generateElementsPath: false,
            blockMapBorder: true,
            freeSpaceTilesQuantity: 0,
            variableTilesPercentage: 0,
            placeElementsOrder: 'inOrder',
            orderElementsBySize: false,
            randomizeQuantities: true,
            applySurroundingPathTiles: false,
            automaticallyExtrudeMaps: true
        }
    }, commonGeneratorConfig))
};
