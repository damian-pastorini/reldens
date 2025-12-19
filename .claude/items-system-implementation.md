# Items System Implementation - Complete Documentation

## Overview

The Reldens Items System manages player inventory, equipment, and item modifiers. It uses the `@reldens/items-system` package for core functionality and integrates with the `@reldens/modifiers` package for stat modifications.

## Architecture

### Core Components

1. **ItemsServer** (`@reldens/items-system`) - Server-side inventory manager
2. **Inventory** (`@reldens/items-system`) - Base inventory container
3. **ItemBase** - Base class for all items
4. **Equipment** - Specialized item type for equippable items
5. **Modifier** (`@reldens/modifiers`) - Handles stat modifications
6. **StorageObserver** - Persists inventory changes to database

### Directory Structure

```
lib/inventory/
├── client/           # Client-side inventory UI and rendering
├── server/           # Server-side inventory logic
│   ├── items-factory.js           # Creates item instances from database models
│   ├── message-actions.js         # Handles equip/unequip/trade messages
│   ├── models-manager.js          # Database operations
│   ├── storage-observer.js        # Event listeners for persistence
│   ├── plugin.js                  # Inventory feature plugin
│   └── subscribers/               # Event subscribers
│       ├── player-subscriber.js   # Creates player inventory on login
│       └── player-death-subscriber.js
└── constants.js
```

## Item Creation Flow

### When Player Logs In

**Entry Point**: `lib/inventory/server/plugin.js` line 50-51
```javascript
this.events.on('reldens.createPlayerStatsAfter', async (client, userModel, currentPlayer, room) => {
    await PlayerSubscriber.createPlayerInventory(client, currentPlayer, room, this.events, this.modelsManager);
});
```

**Sequence**:

1. **Player Stats Loaded** (`lib/users/server/plugin.js` lines 289-309)
   - Stats loaded from `players_stats` table
   - Set on `currentPlayer.stats` and `currentPlayer.statsBase`
   - Event `reldens.createPlayerStatsAfter` fires

2. **Inventory Creation** (`lib/inventory/server/subscribers/player-subscriber.js` lines 30-63)
   ```javascript
   let serverProps = {
       owner: currentPlayer,              // The player schema instance
       client: new ClientWrapper({client, room}),
       persistence: true,
       ownerIdProperty: 'player_id',
       eventsManager: events,
       modelsManager: modelsManager,
       itemClasses: {...},
       groupClasses: {...},
       itemsModelData: room.config.inventory.items
   };
   let inventoryServer = new ItemsServer(serverProps);
   inventoryServer.dataServer = new StorageObserver(inventoryServer.manager, modelsManager);
   ```

3. **Items Loading** (`lib/inventory/server/storage-observer.js` lines 169-182)
   ```javascript
   async loadOwnerItems(){
       let itemsModels = await this.modelsManager.loadOwnerItems(this.manager.getOwnerId());
       let itemsInstances = await ItemsFactory.fromModelsList(itemsModels, this.manager);
       await this.manager.fireEvent(ItemsEvents.LOADED_OWNER_ITEMS, this, itemsInstances, itemsModels);
       await this.manager.setItems(itemsInstances);
   }
   ```

4. **Item Instance Creation** (`lib/inventory/server/items-factory.js` lines 40-71)
   ```javascript
   static async fromModel(itemInventoryModel, manager){
       let itemClass = sc.get(
           manager.itemClasses,
           itemInventoryModel.related_items_item.key,
           manager.types.classByTypeId(itemInventoryModel.related_items_item.type)
       );
       let itemObj = new itemClass(itemProps);
       if (itemObj.isType(ItemsConst.TYPES.EQUIPMENT)) {
           itemObj.equipped = (1 === itemInventoryModel.is_active);  // Mark as equipped if active
       }
       await this.enrichWithModifiers(itemInventoryModel, itemObj, manager);
       return itemObj;
   }
   ```

5. **Modifier Creation** (`lib/inventory/server/items-factory.js` lines 79-93)
   ```javascript
   static async enrichWithModifiers(itemInventoryModel, itemObj, manager){
       let modifiers = {};
       for(let modifierData of itemInventoryModel.related_items_item.related_items_item_modifiers){
           if(modifierData.operation !== ModifierConst.OPS.SET){
               modifierData.value = Number(modifierData.value);
           }
           modifierData.target = manager.owner;  // Set target to currentPlayer
           modifiers[modifierData.id] = new Modifier(modifierData);
       }
       itemObj.modifiers = modifiers;
   }
   ```

### Critical Timing

- **BEFORE items load**: `currentPlayer.stats` is set (fresh object from database)
- **DURING item creation**: Modifiers get `target = manager.owner = currentPlayer`
- **AFTER items load**: Modifiers have correct reference to `currentPlayer.stats`

## Equipment Flow

### Manual Equip (User Action)

**Entry Point**: User clicks equip button → Client sends message → Server receives

1. **Message Reception** (`lib/inventory/server/message-actions.js` lines 71-73)
   ```javascript
   if(InventoryConst.ACTIONS.EQUIP === data.act){
       return await this.executeEquipAction(playerSchema, data);
   }
   ```

2. **Execute Equip Action** (`lib/inventory/server/message-actions.js` lines 360-373)
   ```javascript
   async executeEquipAction(playerSchema, data){
       let item = playerSchema.inventory.manager.items[data.idx];
       if(!item.equipped){
           this.unEquipPrevious(item.group_id, playerSchema.inventory.manager.items);  // Unequip same group
           await item.equip();  // Equip new item
           return true;
       }
       await item.unequip();  // If already equipped, unequip
       return true;
   }
   ```

3. **Item Equip Method** (`npm-packages/reldens-items/lib/item/type/equipment.js` lines 26-35)
   ```javascript
   async equip(applyMods){
       this.equipped = true;
       await this.manager.fireEvent(ItemsEvents.EQUIP_ITEM, this);
       if(applyMods === false || this.manager.applyModifiersAuto === false){
           return false;
       }
       await this.applyModifiers();  // Apply modifiers automatically
   }
   ```

4. **Apply Modifiers** (`npm-packages/reldens-items/lib/item/type/item-base.js` lines 90-105)
   ```javascript
   async changeModifiers(revert){
       await this.manager.fireEvent(ItemsEvents.EQUIP_BEFORE+(revert ? 'Revert': 'Apply')+'Modifiers', this);
       let modifiersKeys = Object.keys(this.modifiers);
       let methodName = revert ? 'revert' : 'apply';
       for(let i of modifiersKeys){
           this.modifiers[i][methodName](this.target);  // this.target is false, but modifier has its own target
       }
       return this.manager.fireEvent(ItemsEvents.EQUIP+(revert ? 'Reverted' : 'Applied')+'Modifiers', this);
   }
   ```

5. **Modifier Execute** (`npm-packages/reldens-modifiers/lib/modifier.js` lines 84-108)
   ```javascript
   execute(target, revert = false, useBasePropertyToGetValue = false, applyOnBaseProperty = false){
       // If target param is false, use this.target (set to currentPlayer in factory)
       if(target){
           this.target = target;
       }
       let newValue = this.getModifiedValue(revert, useBasePropertyToGetValue);
       let applyToProp = applyOnBaseProperty ? this.basePropertyKey : this.propertyKey;
       this.setOwnerProperty(applyToProp, newValue);  // Sets currentPlayer.stats.atk
       this.state = revert ? ModifierConst.MOD_REVERTED : ModifierConst.MOD_APPLIED;
       return true;
   }
   ```

6. **Property Manager Sets Value** (`npm-packages/reldens-modifiers/lib/property-manager.js` lines 22-32)
   ```javascript
   manageOwnerProperty(propertyOwner, propertyString, value){
       let propertyPathParts = propertyString.split('/');  // ['stats', 'atk']
       let property = this.extractDeepProperty(propertyOwner, propertyPathParts);  // Get stats object
       let propertyKey = propertyPathParts.pop();  // 'atk'
       if('undefined' !== typeof value){
           property[propertyKey] = value;  // Sets stats.atk = newValue
       }
       return property[propertyKey];
   }
   ```

7. **Stats Persistence** (`lib/inventory/server/storage-observer.js` lines 68-79)
   ```javascript
   this.manager.listenEvent(
       ItemsEvents.EQUIP+'AppliedModifiers',
       this.updateAppliedModifiers.bind(this),
       ...
   );

   async updateAppliedModifiers(item){
       return await this.modelsManager.onChangedModifiers(item, ModifierConst.MOD_APPLIED);
   }
   ```

8. **Persist Data** (`lib/inventory/server/models-manager.js` lines 127-131)
   ```javascript
   async onChangedModifiers(item, action){
       return await item.manager.owner.persistData({act: action, item: item});
   }
   ```

9. **Save Player Stats** (`lib/rooms/server/scene.js` lines 228-234)
   ```javascript
   currentPlayer.persistData = async (params) => {
       await this.savePlayedTime(currentPlayer);
       await this.savePlayerState(currentPlayer.sessionId);
       await this.savePlayerStats(currentPlayer, client);  // Saves stats to database
   };
   ```

10. **Client Update** (`lib/rooms/server/scene.js` lines 759-763)
    ```javascript
    client.send('*', {
        act: GameConst.PLAYER_STATS,
        stats: playerSchema.stats,
        statsBase: playerSchema.statsBase
    });
    ```

## Modifier Operations

From `@reldens/modifiers/lib/constants.js`:

| ID | Operation | Description | Apply Formula | Revert Formula |
|----|-----------|-------------|---------------|----------------|
| 1  | INC       | Increase (flat) | `value + operand` | `value - operand` |
| 2  | DEC       | Decrease | `value - operand` | `value + operand` |
| 3  | DIV       | Divide | `value / operand` | `value * operand` |
| 4  | MUL       | Multiply | `value * operand` | `value / operand` |
| 5  | INC_P     | Increase by % | `value + (value * operand / 100)` | Complex percentage revert |
| 6  | DEC_P     | Decrease by % | `value - (value * operand / 100)` | Complex percentage revert |
| 7  | SET       | Set value | `operand` | `false` |
| 8  | METHOD    | Custom method | Calls custom method on modifier | Calls custom method |
| 9  | SET_N     | Set (alt) | `operand` | `false` |

### INC_P (Increase Percentage) Calculation

From `@reldens/modifiers/lib/calculator.js` lines 30-37:

**Apply**:
```javascript
return originalValue + Math.round(originalValue * operationValue / 100);
```
Example: atk=100, value=5 → 100 + Math.round(100 * 5 / 100) = 100 + 5 = 105

**Revert**:
```javascript
let revertValue = Math.ceil(originalValue - (originalValue / (100 - operationValue)) * 100);
return originalValue + revertValue;
```
Example: atk=105, value=5 → Math.ceil(105 - (105/95)*100) = Math.ceil(-5.26) = -5 → 105 + (-5) = 100

## Database Schema

### items_item (Item Definitions)
```sql
CREATE TABLE `items_item` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `key` varchar(255) NOT NULL,
    `type` int(11) NOT NULL,
    `group_id` int(10) unsigned DEFAULT NULL,
    `label` varchar(255) DEFAULT NULL,
    `description` text,
    `qty_limit` int(11) DEFAULT NULL,
    `uses_limit` int(11) DEFAULT NULL,
    `useTimeOut` int(11) DEFAULT NULL,
    `execTimeOut` int(11) DEFAULT NULL,
    `customData` text,
    PRIMARY KEY (`id`)
);
```

### items_item_modifiers (Item Modifier Definitions)
```sql
CREATE TABLE `items_item_modifiers` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `item_id` int(10) unsigned NOT NULL,
    `key` varchar(255) NOT NULL,
    `property_key` varchar(255) NOT NULL,
    `operation` int(11) NOT NULL,
    `value` varchar(255) NOT NULL,
    `maxProperty` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`)
);
```

- `item_id`: References the item this modifier belongs to
- `key`: Modifier identifier (e.g., 'atk')
- `property_key`: Path to property to modify (e.g., 'stats/atk')
- `operation`: Operation ID (1-9, see Modifier Operations table)
- `value`: Value to apply (as string, converted to number if not SET operation)
- `maxProperty`: Optional max value property path (e.g., 'statsBase/hp')

### items_inventory (Player Item Instances)
```sql
CREATE TABLE `items_inventory` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `owner_id` int(10) unsigned NOT NULL,
    `item_id` int(10) unsigned NOT NULL,
    `qty` int(11) NOT NULL,
    `remaining_uses` int(11) DEFAULT NULL,
    `is_active` tinyint(1) DEFAULT 0,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`),
    FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`)
);
```

- `owner_id`: Player ID who owns this item instance
- `item_id`: References the item definition
- `qty`: Quantity (-1 for unlimited)
- `remaining_uses`: Uses left (if item has uses limit)
- `is_active`: 1 if equipped, 0 if not (for equipment items only)

## Event Flow

### Equipment Events Sequence

1. `ItemsEvents.EQUIP_ITEM` → Fired when equip() starts
   - **Listener**: `StorageObserver.saveEquippedItemAsActive()` → Updates `is_active=1` in database

2. `ItemsEvents.EQUIP_BEFORE+'Apply'+'Modifiers'` → Before modifiers are applied
   - No default listeners

3. `ItemsEvents.EQUIP+'Applied'+'Modifiers'` → After modifiers are applied
   - **Listener**: `StorageObserver.updateAppliedModifiers()` → Calls `persistData()` to save stats

4. `reldens.playerPersistDataBefore` → Before data persistence
   - Custom hooks can intercept here

5. `reldens.savePlayerStatsUpdateClient` → After stats saved, before client update
   - **Listener**: `UsersPlugin.updateClientsWithPlayerStats()` → Updates life bar UI

6. Client receives `GameConst.PLAYER_STATS` message with updated stats

### Unequip Events Sequence

1. `ItemsEvents.UNEQUIP_ITEM` → Fired when unequip() starts
   - **Listener**: `StorageObserver.saveUnequippedItemAsInactive()` → Updates `is_active=0` in database

2. `ItemsEvents.EQUIP_BEFORE+'Revert'+'Modifiers'` → Before modifiers are reverted
   - No default listeners

3. `ItemsEvents.EQUIP+'Reverted'+'Modifiers'` → After modifiers are reverted
   - **Listener**: `StorageObserver.updateRevertedModifiers()` → Calls `persistData()` to save stats

4-6. Same persistence and client update flow as equip

## Known Issues

### Issue: Item Modifiers Not Applied on Manual Equip

**Problem**: When a player manually equips an item, the modifiers should be applied to their stats immediately and saved to the database. However, the stats are not being modified.

**Status**: Under investigation

**Location**: TBD - analyzing modifier application flow

## Testing Checklist

- [ ] Equip item → Stats increase correctly
- [ ] Unequip item → Stats revert to base value
- [ ] Logout with equipped item → Stats saved correctly
- [ ] Login with equipped item → Stats loaded with modifiers applied
- [ ] Unequip after login → Stats revert to base value correctly
- [ ] Multiple items in same group → Only one equipped at a time
- [ ] Percentage modifiers → Calculate correctly for different base values
- [ ] Flat modifiers → Add/subtract exact values
- [ ] Max/min property limits → Respect statsBase maximums

## Performance Considerations

- Modifiers are applied synchronously in a loop (item-base.js line 101-103)
- For items with many modifiers, this could cause brief delay
- Stats are saved to database after every equip/unequip operation
- Consider batching stats updates if players frequently swap equipment

## Extension Points

### Custom Item Types

Create custom item class extending ItemBase or Equipment:
```javascript
const Equipment = require('@reldens/items-system').ItemBase;

class MagicWeapon extends Equipment {
    async equip(applyMods){
        // Custom equip logic
        await super.equip(applyMods);
        // Post-equip custom logic
    }
}
```

Register in `server/customClasses/inventory/items`:
```javascript
itemClasses: {
    'magic_sword': MagicWeapon
}
```

### Custom Modifiers

Create custom modifier with METHOD operation:
```javascript
const { Modifier } = require('@reldens/modifiers');

class CustomModifier extends Modifier {
    customCalculation(modifier, propertyValue){
        // Your custom logic
        return newValue;
    }
}
```

Set in database:
```sql
INSERT INTO items_item_modifiers VALUES (
    NULL, item_id, 'custom', 'stats/custom', 8, 'customCalculation', NULL
);
```

### Event Hooks

Hook into any event for custom logic:
```javascript
events.on('reldens.createdPlayerSchema', async (client, userModel, currentPlayer, room) => {
    // Custom logic when player is created
});

inventoryServer.manager.listenEvent(ItemsEvents.EQUIP_ITEM, async (item) => {
    // Custom logic when any item is equipped
});
```

## References

- `@reldens/items-system` package: D:\dap\work\reldens\npm-packages\reldens-items
- `@reldens/modifiers` package: D:\dap\work\reldens\npm-packages\reldens-modifiers
- Sample data: D:\dap\work\reldens\src\migrations\production\reldens-sample-data-v4.0.0.sql
