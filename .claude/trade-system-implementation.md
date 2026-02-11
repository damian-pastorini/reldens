# Trade System Flow - Player-to-Player Trading

## Server to Client Data Flow

**Server sends to each player (via TRADE_SHOW message):**

- `playerToExchangeKey`: The OTHER player's exchange key ('A' or 'B')
- `playerConfirmed`: The OTHER player's confirmation status (for display message)
- `myConfirmed`: THIS player's confirmation status (for button state logic)
- `items`: THIS player's available inventory items (for column 1)
- `traderItemsData`: The OTHER player's item data (for column 3 display)
- `exchangeData`: Complete exchange object with structure: `{ 'A': {itemUid: qty}, 'B': {itemUid: qty} }`
- `isTradeEnd`: Boolean indicating if both players confirmed (triggers trade completion)

**Server determines playerToExchangeKey:**

Line 305 in `lib/inventory/server/message-actions.js`:
```javascript
let playerToExchangeKey = ownerSessionId === playerTo.sessionId ? 'A' : 'B';
```

This identifies which exchange key belongs to the OTHER player (the one being sent data about in the message).

## Three Column Structure

The trade UI displays three columns:

- **Column 1** (`.my-items`): My available inventory items - items I can add to trade
- **Column 2** (`.pushed-to-trade`): Items I'M SENDING to the other player
- **Column 3** (`.got-from-trade`): Items I'M RECEIVING from the other player

**HTML Structure:**

- `.trade-container`
  - `.trade-row.trade-items-boxes`
    - `.trade-player-col.trade-col-1.my-items` (My Items)
    - `.trade-player-col.trade-col-2.pushed-to-trade` (Sending)
    - `.trade-player-col.trade-col-3.got-from-trade` (Receiving)
  - `.trade-row.trade-confirm-actions`
    - `.confirm-action` button
    - `.disconfirm-action` button
    - `.cancel-action` button

## Client Processing Flow

**When client receives TRADE_SHOW message:**

Line 136-141 in `trade-message-handler.js`:
```javascript
let traderExchangeKey = sc.get(this.message, 'playerToExchangeKey', 'A');
let myExchangeKey = 'A' === traderExchangeKey ? 'B' : 'A';
this.updateItemsList(items, container, exchangeData[myExchangeKey]);
this.updateMyExchangeData((exchangeData[myExchangeKey] || {}), items, myExchangeKey);
this.updateTraderExchangeData((exchangeData[traderExchangeKey] || {}), traderItemsData, traderExchangeKey);
```

**Processing steps:**

1. Extract exchange keys:
   - `traderExchangeKey` = value from `playerToExchangeKey` (OTHER player's key)
   - `myExchangeKey` = opposite of `traderExchangeKey` (THIS player's key)

2. Update Column 1 (my available items):
   - Call `updateItemsList(items, container, exchangeData[myExchangeKey])`
   - Passes MY exchange data to check which items to hide (items with full qty in trade)

3. Update Column 2 (items I'm sending):
   - Call `updateMyExchangeData(exchangeData[myExchangeKey], items, myExchangeKey)`
   - Shows items from MY exchange key

4. Update Column 3 (items I'm receiving):
   - Call `updateTraderExchangeData(exchangeData[traderExchangeKey], traderItemsData, traderExchangeKey)`
   - Shows items from TRADER's exchange key

## HTML Recreation Pattern

**Every TRADE_SHOW message triggers full HTML recreation:**

Line 181 in `trade-message-handler.js`:
```javascript
container.innerHTML = this.createTradeContainer(tradeItems);
```

Server sends TRADE_SHOW to BOTH players simultaneously when:
- Item added/removed
- Player confirms/disconfirms
- ANY trade state change

**Implications:**
- All buttons and DOM elements are DESTROYED and RECREATED each time
- Event listeners must be re-attached after every update (lines 182-183)
- Server state is the ONLY source of truth
- No client-side state should be maintained between updates

## Button State Logic

**Server sends confirmation statuses:**
- `playerConfirmed`: OTHER player's confirmation status (for display message "Player X CONFIRMED")
- `myConfirmed`: THIS player's confirmation status (for button state logic)

**Button States Calculation:**

Line 183 in `trade-message-handler.js`:
```javascript
this.activateConfirmButtonAction(sc.get(this.message, 'exchangeData', {}));
```

Lines 193-200 in `activateConfirmButtonAction`:
```javascript
let myExchangeKey = sc.get(this.message, 'playerToExchangeKey', 'A');
let traderExchangeKey = 'A' === myExchangeKey ? 'B' : 'A';
let myExchangeData = exchangeData[myExchangeKey] || {};
let traderExchangeData = exchangeData[traderExchangeKey] || {};
let myHasItems = 0 < Object.keys(myExchangeData).length;
let traderHasItems = 0 < Object.keys(traderExchangeData).length;
let hasAnyItems = myHasItems || traderHasItems;
let iConfirmed = sc.get(this.message, 'myConfirmed', false);
```

**Confirm Button:**
- `disabled = iConfirmed || !hasAnyItems`
- Disabled when: Player already confirmed OR no items in trade
- Enabled when: Player not confirmed AND items exist in trade

**Disconfirm Button:**
- `disabled = !iConfirmed`
- Disabled when: Player not confirmed
- Enabled when: Player already confirmed

**Each player sees their own button states based on their own confirmation status from `myConfirmed` field.**

## Example Data Flow

**Scenario: Player A (key='A') adds itemX to trade, then confirms**

**Server state after adding item:**
```javascript
exchangeData = {
  'A': {itemX: 1},
  'B': {}
}
confirmations = {
  'A': false,
  'B': false
}
```

**Message sent to Player A:**
```javascript
{
  playerToExchangeKey: 'B',
  playerConfirmed: false,
  myConfirmed: false,
  exchangeData: { 'A': {itemX: 1}, 'B': {} },
  items: {...},
  traderItemsData: {}
}
```

**Player A UI state:**
- Column 1: Shows Player A's available items (itemX hidden if full qty placed)
- Column 2: Shows `exchangeData['A']` = {itemX: 1} (sending to Player B)
- Column 3: Shows `exchangeData['B']` = {} (receiving from Player B - empty)
- Confirm button: ENABLED (myConfirmed=false, hasAnyItems=true)
- Disconfirm button: DISABLED (myConfirmed=false)

**Message sent to Player B:**
```javascript
{
  playerToExchangeKey: 'A',
  playerConfirmed: false,
  myConfirmed: false,
  exchangeData: { 'A': {itemX: 1}, 'B': {} },
  items: {...},
  traderItemsData: {itemX: {...}}
}
```

**Player B UI state:**
- Column 1: Shows Player B's available items
- Column 2: Shows `exchangeData['B']` = {} (sending to Player A - empty)
- Column 3: Shows `exchangeData['A']` = {itemX: 1} (receiving from Player A)
- Display message: No confirmation message (playerConfirmed=false)
- Confirm button: ENABLED (myConfirmed=false, hasAnyItems=true)
- Disconfirm button: DISABLED (myConfirmed=false)

**After Player A clicks confirm:**

Server updates confirmations:
```javascript
confirmations = {
  'A': true,
  'B': false
}
```

**Message sent to Player A:**
```javascript
{
  playerToExchangeKey: 'B',
  playerConfirmed: false,
  myConfirmed: true,
  // ... rest same
}
```

**Player A UI state:**
- Confirm button: DISABLED (myConfirmed=true)
- Disconfirm button: ENABLED (myConfirmed=true)

**Message sent to Player B:**
```javascript
{
  playerToExchangeKey: 'A',
  playerConfirmed: true,
  myConfirmed: false,
  // ... rest same
}
```

**Player B UI state:**
- Display message: "Player A CONFIRMED" (playerConfirmed=true)
- Confirm button: ENABLED (myConfirmed=false)
- Disconfirm button: DISABLED (myConfirmed=false)

## Toggle Actions (Column 1 Only)

**CSS Behavior (lines 373-405 in items-system.scss):**

```scss
.my-items .trade-item {
    .actions-container.trade-actions {
        display: none;  // Hidden by default

        &.trade-actions-expanded {
            display: block;  // Visible when toggled
            position: absolute;  // Float below item
            top: 54px;
            left: 0;
            z-index: 3;
            background: $cBlack;
            border: 1px solid $cWhite;
            border-radius: 6px;
            padding: 4px;
        }
    }
}
```

**Important:** Toggle behavior with absolute positioning applies ONLY to column 1 (`.my-items`). Columns 2 and 3 do not have toggle behavior - their actions are always visible.

## Files Involved

**Client:**
- `lib/inventory/client/trade-message-handler.js` - Main trade UI handler
- `lib/inventory/client/trade-items-helper.js` - Item instance creation
- `theme/default/css/items-system.scss` - Trade UI styles

**Server:**
- `lib/inventory/server/message-actions.js` - Trade message handling
- `lib/inventory/server/trade.js` - Trade logic

**Constants:**
- `lib/objects/constants.js` - Trade action constants (ADD, REMOVE, CONFIRM, DISCONFIRM)
- `lib/inventory/constants.js` - Inventory action constants (TRADE_START, TRADE_SHOW, etc.)

**Translations:**
- `lib/inventory/client/snippets/en_US.js` - UI labels (trade.actions.disconfirm)

## CSS Styling

**Player Confirmed Message** (lines 268-284 in items-system.scss):
- Styled block with border and background
- Empty state handling with transparent background

**Button Layout** (lines 303-310):
- Flexbox with center justification
- No float positioning

**Remove Button** (lines 358-366):
- Absolute positioning at `right: -10px`
- Icon size 20px

**Toggle Actions** (lines 373-405):
- Scoped to `.my-items` column only
- Absolute positioning with floating styles
- Other columns display actions inline without toggle
