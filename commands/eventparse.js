  
const Discord = require('discord.js');
var admin = require('firebase-admin');
var db = admin.database().ref();
const axios = require('axios');
const botconfig = require("../botconfig.json");

module.exports = {
	name: 'eventparse',
    description: 'Parse and upload a competitve event JSON',
    dev: false,
	execute(snapshot, message, args) {

        if (message != null) {
            // Discord message
            if (args.length == 2) {
                axios.get(args[1]).then(response => {
                    var events = JSON.parse(response.data);
                    
                }).catch(error => {
                    console.log(error);
                });
            }
            else {
                message.channel.send('Command Usage: ```' + botconfig.dev_prefix + botconfig.prefix + 'eventparse [type] [url]```');
            }
        }
        else if (snapshot != null) {
            // myDECA App ChatMessage
        }
        else {
            // Console time!   
        }
	},
};