1) GameManager (reldens)

- Crea una sola instancia de driver (game engine - Phaser, Pixi.JS, Babylon, etc)
    - UI
    - Preloading
    - Rendering
    - AudioPlayer
    - RoomScene
        - Mapas / TileSet
    - Controles / Input
        - ****** Targeting (NPC, Other player, enemies) ******
    - Animaciones / Interacciones
        - ****** Targeting (NPC, Other player, enemies) ******
    - CamaraScreen


- Cada funcionalidad dentro de driver engine debe tener un base driver.
- En cada clases de estas funcionalidades vamos a implementar los métodos más genéricos que vamos a usar desde todo reldens.
  - Por ejemplo: UI.createDialog(), UI.createOptions(), setOptionInteraction(), etc.
