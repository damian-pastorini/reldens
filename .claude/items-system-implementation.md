# Items System Implementation - Complete Documentation

## Overview

The Reldens Items System manages player inventory, equipment, and item modifiers. It uses the `@reldens/items-system` package for core functionality and integrates with the `@reldens/modifiers` package for stat modifications.

## Architecture

### Core Components

1. **ItemsServer** (`@reldens/items-system`) - Server-side inventory manager
2. **Inventory** (`@reldens/items-system`) - Base inventory container
3. **ItemBase** - Base class for all items
4. **ItemEquipment** - Specialized item type for equippable items
5. **Modifier** (`@reldens/modifiers`) - Handles stat modifications
6. **StorageObserver** - Persists inventory changes to database

### Directory Structure

**lib/inventory/**
- **client/** - Client-side inventory UI and rendering
- **server/** - Server-side inventory logic
  - items-factory.js - Creates item instances from database models
  - items-modifiers-enricher.js - Adds the modifiers display data to the items sent by the trader objects
  - resolve-operation.js - Resolves the display prefix and suffix for each modifier operation
  - message-actions.js - Handles equip/unequip/trade messages
  - models-manager.js - Database operations
  - storage-observer.js - Event listeners for persistence
  - plugin.js - Inventory feature plugin
  - group-hot-plug-callbacks.js - Admin hot-plug callbacks for the items groups (update and delete)
  - groups-data-remover.js - Removes the items groups data from the config manager
  - entities-config.js - Admin entities overrides map (itemsInventory, itemsItem, itemsGroup)
  - entities-translations.js - Admin entities labels
  - **entities/** - Admin entities overrides for the items, groups and inventory
  - **exchange/** - Trade processors
    - processor.js - Exchange operations (init, add, remove, confirm)
    - player-processor.js - Extends the processor with the player-to-player confirm/disconfirm operations
  - **subscribers/** - Event subscribers
    - player-subscriber.js - Creates player inventory on login
    - player-death-subscriber.js - Drops the player items on death
    - server-subscriber.js - Initializes the inventory configuration on server ready
- constants.js

## Item Creation Flow

### When Player Logs In

**Entry Point**: `lib/inventory/server/plugin.js` `InventoryPlugin.setup()`
```javascript
this.events.on('reldens.createPlayerStatsAfter', async (client, userModel, currentPlayer, room) => {
    await PlayerSubscriber.createPlayerInventory(client, currentPlayer, room, this.events, this.modelsManager);
});
```

**Sequence**:

1. **Player Stats Loaded** (`lib/users/server/plugin.js` `UsersPlugin.onCreatePlayerAfterAppendStats()`, listening to `reldens.createPlayerAfter`)
   - Stats loaded from `players_stats` table
   - Set on `currentPlayer.stats` and `currentPlayer.statsBase`
   - Event `reldens.createPlayerStatsAfter` fires

2. **Inventory Creation** (`lib/inventory/server/subscribers/player-subscriber.js` `PlayerSubscriber.createPlayerInventory()`)
   ```javascript
   let serverProps = {
       owner: currentPlayer,
       client: new ClientWrapper({client, room}),
       persistence: true,
       ownerIdProperty: 'player_id',
       eventsManager: events,
       modelsManager: modelsManager,
       itemClasses: room.config.getWithoutLogs('server/customClasses/inventory/items', {}),
       groupClasses: room.config.getWithoutLogs('server/customClasses/inventory/groups', {}),
       itemsModelData: room.config.inventory.items
   };
   // @TODO - BETA - Add new event here for the server properties.
   let inventoryServer = new ItemsServer(serverProps);
   inventoryServer.dataServer = new StorageObserver(inventoryServer.manager, modelsManager);
   inventoryServer.dataServer.listenEvents();
   ```

3. **Items Loading** (`lib/inventory/server/storage-observer.js` `StorageObserver.loadOwnerItems()`)
   ```javascript
   async loadOwnerItems()
   {
       let itemsModels = await this.modelsManager.loadOwnerItems(this.manager.getOwnerId());
       if(0 === itemsModels.length){
           return false;
       }
       let itemsInstances = await ItemsFactory.fromModelsList(itemsModels, this.manager);
       if(false === itemsInstances){
           return false;
       }
       await this.manager.fireEvent(ItemsEvents.LOADED_OWNER_ITEMS, this, itemsInstances, itemsModels);
       await this.manager.setItems(itemsInstances);
       return true;
   }
   ```

4. **Item Instance Creation** (`lib/inventory/server/items-factory.js` `ItemsFactory.fromModel()`)

   The item class is resolved from `manager.itemClasses` by the item key, falling back to the class of the item type. The item props (id, key, qty, group_id, limits, customData, etc.) are built from the `items_inventory` row and its `related_items_item` relation, then:
   ```javascript
   let itemObj = new itemClass(itemProps);
   if(itemObj.isType(ItemsConst.TYPES.EQUIPMENT)){
       itemObj.equipped = (1 === itemInventoryModel.is_active);
   }
   await this.enrichWithModifiers(itemInventoryModel, itemObj, manager);
   return itemObj;
   ```

5. **Modifier Creation** (`lib/inventory/server/items-factory.js` `ItemsFactory.enrichWithModifiers()`)
   ```javascript
   let modifiers = {};
   for(let modifierData of loadedModifiers){
       if(modifierData.operation !== ModifierConst.OPS.SET){
           modifierData.value = Number(modifierData.value);
       }
       modifierData.target = manager.owner;
       modifiers[modifierData.id] = new Modifier(modifierData);
   }
   itemObj.modifiers = modifiers;
   ```

   Each modifier target is `manager.owner`, the player schema (`currentPlayer`).

### Critical Timing

- **BEFORE items load**: `currentPlayer.stats` is set (fresh object from database)
- **DURING item creation**: Modifiers get `target = manager.owner = currentPlayer`
- **AFTER items load**: Modifiers have correct reference to `currentPlayer.stats`

## Equipment Flow

### Manual Equip (User Action)

**Entry Point**: User clicks equip button, client sends message, server receives

1. **Message Reception** (`lib/inventory/server/message-actions.js` `InventoryMessageActions.executeMessageActions()`)
   ```javascript
   if(InventoryConst.ACTIONS.EQUIP === data.act){
       return await this.executeEquipAction(playerSchema, data);
   }
   ```

2. **Execute Equip Action** (`lib/inventory/server/message-actions.js` `InventoryMessageActions.executeEquipAction()`)

   If the item is not equipped, the equipped item of the same group is unequipped first (`unEquipPrevious()`), then the item is equipped. If it is already equipped, it is unequipped:
   ```javascript
   let item = playerSchema.inventory.manager.items[data.idx];
   if(!item.equipped){
       this.unEquipPrevious(item.group_id, playerSchema.inventory.manager.items);
       await item.equip();
       return true;
   }
   await item.unequip();
   return true;
   ```

3. **Item Equip Method** (`@reldens/items-system` `lib/item/type/equipment.js` `Equipment.equip()`)
   ```javascript
   async equip(applyMods)
   {
       this.equipped = true;
       await this.manager.fireEvent(ItemsEvents.EQUIP_ITEM, this);
       // apply modifiers automatically or not:
       if(applyMods === false || this.manager.applyModifiersAuto === false){
           return false;
       }
       await this.applyModifiers();
   }
   ```

4. **Apply Modifiers** (`@reldens/items-system` `lib/item/type/item-base.js` `ItemBase.changeModifiers()`)

   `this.target` is `false` on the item, so each modifier uses its own target (set to `currentPlayer` in the factory):
   ```javascript
   async changeModifiers(revert)
   {
       if(this.hasError){
           return false;
       }
       await this.manager.fireEvent(ItemsEvents.EQUIP_BEFORE+(revert ? 'Revert': 'Apply')+'Modifiers', this);
       let modifiersKeys = Object.keys(this.modifiers);
       if(0 >= modifiersKeys.length){
           return;
       }
       let methodName = revert ? 'revert' : 'apply';
       for(let i of modifiersKeys){
           this.modifiers[i][methodName](this.target);
       }
       return this.manager.fireEvent(ItemsEvents.EQUIP+(revert ? 'Reverted' : 'Applied')+'Modifiers', this);
   }
   ```

5. **Modifier Execute** (`node_modules/@reldens/modifiers/lib/modifier.js` `Modifier.execute()`)

   After the target and conditions checks, the new value is calculated and set on the target property (for example `currentPlayer.stats.atk`):
   ```javascript
   // override target if provided:
   if(target){
       this.target = target;
   }
   // calculate a new value, set on the owner and change state:
   let newValue = this.getModifiedValue(revert, useBasePropertyToGetValue);
   if(this.state === ModifierConst.MOD_MODIFIER_ERROR){
       return false;
   }
   let applyToProp = applyOnBaseProperty ? this.basePropertyKey : this.propertyKey;
   this.setOwnerProperty(applyToProp, newValue);
   this.state = revert ? ModifierConst.MOD_REVERTED : ModifierConst.MOD_APPLIED;
   return true;
   ```

6. **Property Manager Sets Value** (`node_modules/@reldens/modifiers/lib/property-manager.js` `PropertyManager.manageOwnerProperty()`)

   The path is split by `/` (for example `stats/atk`), the parent object (`stats`) is resolved and the last part (`atk`) is set:
   ```javascript
   manageOwnerProperty(propertyOwner, propertyString, value)
   {
       let propertyPathParts = propertyString.split('/');
       let childPropertyOwner = this.extractChildPropertyOwner(propertyOwner, propertyPathParts);
       let propertyKey = propertyPathParts[propertyPathParts.length-1];
       if('undefined' === typeof value && !sc.hasOwn(childPropertyOwner, propertyKey)){
           ErrorManager.error('Invalid property "'+propertyKey+'" from path: "'+propertyPathParts.join('/')+'"].');
       }
       if('undefined' !== typeof value){
           childPropertyOwner[propertyKey] = value;
       }
       return childPropertyOwner[propertyKey];
   }
   ```

7. **Stats Persistence** (`lib/inventory/server/storage-observer.js` `StorageObserver.listenEvents()` and `StorageObserver.updateAppliedModifiers()`)
   ```javascript
   this.manager.listenEvent(
       ItemsEvents.EQUIP+'AppliedModifiers',
       this.updateAppliedModifiers.bind(this),
       this.manager.getOwnerUniqueEventKey('modifiersAppliedStore'),
       masterKey
   );
   ```
   ```javascript
   async updateAppliedModifiers(item)
   {
       return await this.modelsManager.onChangedModifiers(item, ModifierConst.MOD_APPLIED);
   }
   ```

8. **Persist Data** (`lib/inventory/server/models-manager.js` `ModelsManager.onChangedModifiers()`)
   ```javascript
   async onChangedModifiers(item, action)
   {
       // owners will persist their own data after the modifiers were applied:
       return await item.manager.owner.persistData({act: action, item: item});
   }
   ```

9. **Save Player Stats** (`lib/rooms/server/scene.js` `RoomScene.createPlayerOnScene()`)
   ```javascript
   currentPlayer.persistData = async (params) => {
       await this.events.emit('reldens.playerPersistDataBefore', client, userModel, currentPlayer, params, this);
       await this.savePlayedTime(currentPlayer);
       await this.savePlayerState(currentPlayer.sessionId);
       await this.savePlayerStats(currentPlayer, client);
       await this.events.emit('reldens.playerPersistDataAfter', client, userModel, currentPlayer, params, this);
   };
   ```

10. **Client Update** (`lib/rooms/server/scene.js` `RoomScene.savePlayerStats()`)
    ```javascript
    await this.events.emit('reldens.savePlayerStatsUpdateClient', client, playerSchema, this);
    client.send('*', {
        act: GameConst.PLAYER_STATS,
        stats: playerSchema.stats,
        statsBase: playerSchema.statsBase
    });
    ```

## Modifier Operations

From `@reldens/modifiers/lib/constants.js`:

**1. INC - Increase (flat)**
- Apply: `value + operand`
- Revert: `value - operand`

**2. DEC - Decrease**
- Apply: `value - operand`
- Revert: `value + operand`

**3. DIV - Divide**
- Apply: `value / operand`
- Revert: `value * operand`

**4. MUL - Multiply**
- Apply: `value * operand`
- Revert: `value / operand`

**5. INC_P - Increase by %**
- Apply: `value + Math.round(value * operand / 100)`
- Revert: `Math.round(value / (1 + operand / 100))`

**6. DEC_P - Decrease by %**
- Apply: `value - Math.round(value * operand / 100)`
- Revert: `Math.round(value / (1 - operand / 100))`

**7. SET - Set value**
- Apply: `operand`
- Revert: `false`

**8. METHOD - Custom method**
- Apply: Calls custom method on modifier
- Revert: Calls custom method

**9. SET_N - Set (alt)**
- Apply: `operand`
- Revert: `false`

### INC_P (Increase Percentage) Calculation

From `node_modules/@reldens/modifiers/lib/calculator.js` `Calculator.calculateNewValue()`:

**Apply**:
```javascript
return originalValue + Math.round(originalValue * operationValue / 100);
```
Example: atk=100, value=5 results in 100 + Math.round(100 * 5 / 100) = 100 + 5 = 105

**Revert**:
```javascript
return Math.round(originalValue / (1 + operationValue / 100));
```
Example: atk=105, value=5 results in Math.round(105 / 1.05) = 100

## Database Schema

### items_item (Item Definitions)
```sql
CREATE TABLE `items_item` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `key` varchar(255) NOT NULL,
    `type` int NOT NULL DEFAULT '0',
    `group_id` int unsigned DEFAULT NULL,
    `label` varchar(255) NOT NULL,
    `description` varchar(255) DEFAULT NULL,
    `qty_limit` int NOT NULL DEFAULT '0',
    `uses_limit` int NOT NULL DEFAULT '1',
    `useTimeOut` int DEFAULT NULL,
    `execTimeOut` int DEFAULT NULL,
    `customData` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);
```

### items_item_modifiers (Item Modifier Definitions)
```sql
CREATE TABLE `items_item_modifiers` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `item_id` int unsigned NOT NULL,
    `key` varchar(255) NOT NULL,
    `property_key` varchar(255) NOT NULL,
    `operation` int unsigned NOT NULL,
    `value` varchar(255) NOT NULL,
    `maxProperty` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`)
);
```

- `item_id`: References the item this modifier belongs to
- `key`: Modifier identifier (e.g., 'atk')
- `property_key`: Path to property to modify (e.g., 'stats/atk')
- `operation`: Operation ID (1-9, see Modifier Operations)
- `value`: Value to apply (stored as string, `ItemsFactory.enrichWithModifiers()` converts it with `Number()` for every operation except SET, and the `Modifier` default type `ModifierConst.TYPES.INT` converts it with `Number()` in `Modifier.parseValue()`)
- `maxProperty`: Optional max value property path (e.g., 'statsBase/hp')

### items_inventory (Player Item Instances)
```sql
CREATE TABLE `items_inventory` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `owner_id` int unsigned NOT NULL,
    `item_id` int unsigned NOT NULL,
    `qty` int NOT NULL DEFAULT '0',
    `remaining_uses` int DEFAULT NULL,
    `is_active` tinyint DEFAULT NULL,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`owner_id`) REFERENCES `players` (`id`),
    FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`)
);
```

- `owner_id`: Player ID who owns this item instance
- `item_id`: References the item definition
- `qty`: Quantity
- `remaining_uses`: Uses left (if item has uses limit)
- `is_active`: 1 if equipped, 0 if not (for equipment items only)

## Event Flow

### Equipment Events Sequence

1. `ItemsEvents.EQUIP_ITEM` - Fired when equip() starts
   - **Listener**: `StorageObserver.saveEquippedItemAsActive()` - Updates `is_active=1` in database

2. `ItemsEvents.EQUIP_BEFORE+'Apply'+'Modifiers'` - Before modifiers are applied
   - No default listeners

3. `ItemsEvents.EQUIP+'Applied'+'Modifiers'` - After modifiers are applied
   - **Listener**: `StorageObserver.updateAppliedModifiers()` - Calls `persistData()` to save stats

4. `reldens.playerPersistDataBefore` - Before data persistence
   - Custom hooks can intercept here

5. `reldens.savePlayerStatsUpdateClient` - After stats saved, before client update
   - **Listener**: `UsersPlugin.updateClientsWithPlayerStats()` - Updates life bar UI (registered in `UsersPlugin.activateLifeBar()` when `client/ui/lifeBar/enabled` is on)

6. Client receives `GameConst.PLAYER_STATS` message with updated stats

### Unequip Events Sequence

1. `ItemsEvents.UNEQUIP_ITEM` - Fired when unequip() starts
   - **Listener**: `StorageObserver.saveUnequippedItemAsInactive()` - Updates `is_active=0` in database

2. `ItemsEvents.EQUIP_BEFORE+'Revert'+'Modifiers'` - Before modifiers are reverted
   - No default listeners

3. `ItemsEvents.EQUIP+'Reverted'+'Modifiers'` - After modifiers are reverted
   - **Listener**: `StorageObserver.updateRevertedModifiers()` - Calls `persistData()` to save stats

4-6. Same persistence and client update flow as equip

## Testing Checklist

- Equip item - Stats increase correctly
- Unequip item - Stats revert to base value
- Logout with equipped item - Stats saved correctly
- Login with equipped item - Stats loaded with modifiers applied
- Unequip after login - Stats revert to base value correctly
- Multiple items in same group - Only one equipped at a time
- Percentage modifiers - Calculate correctly for different base values
- Flat modifiers - Add/subtract exact values
- Max/min property limits - Respect statsBase maximums

## Performance Considerations

- Modifiers are applied synchronously in a loop (`@reldens/items-system` `lib/item/type/item-base.js` `ItemBase.changeModifiers()`)
- For items with many modifiers, this could cause brief delay
- Stats are saved to database after every equip/unequip operation
- Consider batching stats updates if players frequently swap equipment

## Extension Points

### Custom Item Types

Create custom item class extending ItemBase or ItemEquipment:
```javascript
const { ItemEquipment } = require('@reldens/items-system');

class MagicWeapon extends ItemEquipment {
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

The METHOD operation (8) calls a method named by the modifier `value`, from `node_modules/@reldens/modifiers/lib/modifier.js` `Modifier.getModifiedValue()`:
```javascript
if(this.operation === ModifierConst.OPS.METHOD){
    // this allows you to extend a modifier and set your own calculation/application method:
    if(!sc.hasOwn(this, this.value) || 'function' !== typeof this[this.value]){
        Logger.error(['Modifier error:', this, 'Undefined method:', this.value]);
        this.state = ModifierConst.MOD_MODIFIER_ERROR;
        return false;
    }
    propertyValue = this[this.value](this, propertyValue);
}
```

A METHOD row in `items_item_modifiers` does not work with the default loader:
- `ItemsFactory.enrichWithModifiers()` always builds the base `Modifier` class, there is no `customClasses` entry to replace it.
- The method name is converted with `Number()` (by the factory for every operation except SET, and by the `Modifier` default INT type), so it becomes `NaN`.
- `sc.hasOwn(this, this.value)` only finds own properties (or getters), a method declared on a subclass prototype is not found.

To use METHOD modifiers, custom code must replace the `ItemsFactory.enrichWithModifiers()` logic (used by `StorageObserver.loadOwnerItems()` and the trader objects) to build a `Modifier` subclass, keep the method name as a string (pass `type: ModifierConst.TYPES.STRING`) and assign the method on the instance (for example in the subclass constructor).

### Event Hooks

Hook into any event for custom logic:
```javascript
events.on('reldens.createdPlayerSchema', async (client, userModel, currentPlayer, room) => {
    // Custom logic when player is created
});

let manager = inventoryServer.manager;
manager.listenEvent(
    ItemsEvents.EQUIP_ITEM,
    async (item) => {
        // Custom logic when an item of this inventory is equipped
    },
    manager.getOwnerUniqueEventKey('myEquipItemKey'),
    manager.getOwnerEventKey()
);
```

Always pass the unique key and the owner master key like `lib/inventory/server/storage-observer.js` does: `listenEvent()` uses `EventsManager.onWithKey()`, which skips the registration when the remove key already exists, so a listener registered without keys is only added once (for the first inventory).

## References

- `@reldens/items-system` package: `node_modules/@reldens/items-system`
- `@reldens/modifiers` package: `node_modules/@reldens/modifiers`
- Sample data: `migrations/production/reldens-sample-data-v4.0.0.sql`
