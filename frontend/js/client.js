var host = window.document.location.host.replace(/:.*/, '');

var client = new Colyseus.Client(location.protocol.replace("http", "ws") + host + (location.port ? ':' + location.port : ''));
var room = client.join("game_room");

var players = {};
var colors = ['red', 'green', 'yellow', 'blue', 'cyan', 'magenta'];

// listen to patches coming from the server
room.listen("players/:id", function (change) {
    if (change.operation === "add") {
        var dom = document.createElement("div");
        dom.className = "player";
        dom.style.left = change.value.x + "px";
        dom.style.top = change.value.y + "px";
        dom.style.background = colors[Math.floor(Math.random() * colors.length)];
        dom.innerHTML = "Player " + change.path.id;

        players[change.path.id] = dom;
        document.body.appendChild(dom);

    } else if (change.operation === "remove") {
        document.body.removeChild(players[change.path.id]);
        delete players[change.path.id];
    }
});

room.listen("players/:id/:axis", function (change) {
    var dom = players[change.path.id];

    var styleAttribute = (change.path.axis === "x")
        ? "left"
        : "top";

    dom.style[styleAttribute] = change.value + "px";
});

window.addEventListener("keydown", function (e) {
    console.log(e.which);
    if (e.which === 38) {
        up();

    } else if (e.which === 39) {
        right();

    } else if (e.which === 40) {
        down();

    } else if (e.which === 37) {
        left();
    }
});

function up() {
    room.send({y: -1});
}

function right() {
    room.send({x: 1});
}

function down() {
    room.send({y: 1})
}

function left() {
    room.send({x: -1})
}
