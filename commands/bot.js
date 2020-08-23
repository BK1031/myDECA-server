  
const Discord = require('discord.js');
var admin = require('firebase-admin');

var db = admin.database().ref();

module.exports = {
	name: 'bot',
    description: 'Get info about the myDECA Bot',
    dev: false,
	execute(snapshot, message, args) {
        if (message != null) {
            // Discord message
            message.channel.send(new Discord.MessageEmbed()
                .setAuthor('myDECA Bot')
                .setColor('#0073CE')
                .setDescription('Hello, I am the myDECA Bot!')
		    );
        }
        else if (snapshot != null) {
            // VC DECA App ChatMessage
            console.log(snapshot.ref.path.pieces_[1]);
            db.child("chat").child(snapshot.ref.path.pieces_[1]).push().set({
                "author": "VC DECA Bot",
                "color": "#0073CE",
                "date": "",
                "message": "Hello " + snapshot.val().author + ", I am the VC DECA Bot!",
                "nsfw": false,
                "profileUrl": "https://github.com/Equinox-Initiative/VC-DECA-flutter/blob/master/images/logo_white/ios/iTunesArtwork@3x.png?raw=true",
                "role": "Bot",
                "type": "text",
                "userID": "bot1"
            });
        }
        else {
            // Console time!
            console.log('Hello, I am the VC DECA Bot!');
        }
	},
};