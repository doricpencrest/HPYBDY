console.log("hpybdy.js loaded");  // Just to check your file is loading!

const config = {
    type: Phaser.AUTO,      // Phaser picks WebGL or Canvas automatically
    width: 700,             // Width of the game
    height: 500,            // Height of the game
    parent: 'renderDiv',    // Tell Phaser to put the game inside this div
    scene: {
        create: function() {
            // This runs when the game starts. Let's add some text to check
            this.add.text(100, 100, 'Hello Phaser!', { fontSize: '32px', fill: '#fff' });
        }
    }
};

const game = new Phaser.Game(config);
