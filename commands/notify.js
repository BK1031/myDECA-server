  
const Discord = require('discord.js');
var admin = require('firebase-admin');
var botconfig = require("../botconfig.json");

var db = admin.database().ref();

module.exports = {
	name: 'notify',
    description: 'Toggle notification server status',
    dev: false,
	execute(snapshot, message, args) {
        if (message != null) {
            // Discord message
            botconfig.notify = !botconfig.notify;
            message.channel.send("Set notify to `" + botconfig.notify + "`");
        }
        else if (snapshot != null) {
            // myDECA App ChatMessage
        }
        else {
            // Console time!
            botconfig.notify = !botconfig.notify;
            console.log("Set notify to `" + botconfig.notify + "`");
        }
	},
};