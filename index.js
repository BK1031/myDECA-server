var admin = require('firebase-admin');
var readline = require('readline');
const botconfig = require("./botconfig.json");
const nodemailer = require("nodemailer");
const Discord = require("discord.js");
const fs = require('fs');
var https = require('https');
const express = require('express')

const app = express()
const port = 5000

const client = new Discord.Client();
client.commands = new Discord.Collection();

var serviceAccount = require("./serviceAccountKey.json");

app.use(express.static('web'))

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mydeca-app.firebaseio.com"
});

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); 

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: botconfig.email,
      pass: botconfig.password
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    // Parse user input
    const args = input.split(/ +/);
    const command = args.shift().toLowerCase();
    // Check if command exists
    if (!client.commands.has(command)) {
        console.log(`Command ${command} does not exist`);
        return;
    };
    client.commands.get(command).execute(null, null, args);
});
  
var db = admin.database().ref();

client.login(botconfig.token);

client.on("ready", () => {
    console.log(`${client.user.username} is online!`);
    client.channels.cache.get('721607003927085206').send(new Discord.MessageEmbed()
        .setAuthor('myDECA Bot')
        .setColor('#0073CE')
        .setDescription(`${client.user.username} is online!`)
    );
    db.child("users").once("value", (data) => {
        var keys = Object.keys(data.val());
        var tokens = [];
        for (var i = 0; i < keys.length; i++) {
            if (data.val()[keys[i]]["roles"].includes("Developer")) {
                if (data.val()[keys[i]]["onesignalToken"] != null) {
                    tokens.push(data.val()[keys[i]]["onesignalToken"]);
                }
            }
        }
        var message = { 
            app_id: botconfig.onesignal_app_id,
            // headings: {"en": "English Message"},
            contents: {"en": "Server online!"},
            include_player_ids: tokens
          };
        sendNotification(message);
    });
});

client.on("message", (message) => {
    if (!message.content.startsWith(botconfig.dev_prefix + botconfig.prefix) || message.author.bot) return;
    // Parse user input
    const args = message.content.slice((botconfig.dev_prefix + botconfig.prefix).length).split(/ +/);
    const command = args.shift().toLowerCase();
    // Check if command exists
    if (!client.commands.has(command)) {
        console.log(`Command ${command} does not exist`);
        return;
    };
    client.commands.get(command).execute(null, message, args);
    if (botconfig.dev_prefix != "") {
        message.channel.send(new Discord.MessageEmbed().setFooter('NOTE: This is a Dev Command. Some things may be broken.'));
    }
});

db.child("chapters").on("child_added", (snapshot) => {
    db.child("chapters").child(snapshot.key).child("chat").on("child_added", (snapshot2) => {
        db.child("chapters").child(snapshot.key).child("chat").child(snapshot2.key).on("child_added", (snapshot3) => {
            if (botconfig.notify && snapshot3.val()["message"] != null) {
                var chatMessage = snapshot3.val();
                db.child("users").child(chatMessage.author).once("value", (snapshot4) => {
                    var author = snapshot4.val();
                    console.log(snapshot.key + "/" + snapshot2.key + " - " + author.firstName + ": " + chatMessage.message);
                    db.child("users").once("value", (data) => {
                        var keys = Object.keys(data.val());
                        var tokens = [];
                        for (var i = 0; i < keys.length; i++) {
                            if (data.val()[keys[i]]["chapterID"] == author.chapterID && snapshot2.key == "General") {
                                if (data.val()[keys[i]]["onesignalToken"] != null) {
                                    tokens.push(data.val()[keys[i]]["onesignalToken"]);
                                }
                            }
                            else if (data.val()[keys[i]]["chapterID"] == author.chapterID && data.val()[keys[i]]["roles"] != null && data.val()[keys[i]]["roles"].includes(snapshot2.key)) {
                                if (data.val()[keys[i]]["onesignalToken"] != null) {
                                    tokens.push(data.val()[keys[i]]["onesignalToken"]);
                                }
                            }
                            else if (data.val()[keys[i]]["chapterID"] == author.chapterID && data.val()[keys[i]]["groups"] != null && data.val()[keys[i]]["groups"].includes(snapshot2.key)) {
                                if (data.val()[keys[i]]["onesignalToken"] != null) {
                                    tokens.push(data.val()[keys[i]]["onesignalToken"]);
                                }
                            }
                        }
                        var message = { 
                            app_id: botconfig.onesignal_app_id,
                            headings: {"en": author.firstName + " [" + snapshot2.val()["name"] + " Chat]"},
                            contents: {"en": chatMessage.message},
                            include_player_ids: tokens
                        };
                        if (tokens.length > 0) sendNotification(message);
                    });
                });
            }
        });
    });
});

db.child("users").on("child_added", function(snapshot, prevChildKey) {
    var user = snapshot.val();
    if (botconfig.notify) {
        db.child("chapters").child(user.chapterID).child("school").once("value", (data) => {
            client.channels.cache.get('721607003927085206').send(new Discord.MessageEmbed()
                .setAuthor(user.firstName + ' ' + user.lastName, user.profileUrl)
                .setTitle("New account created")
                .addField("Role", user.roles.includes("Advisor") ? "Advisor" : "Member", true)
                .addField("Chapter", data.val(), true)
                .addField("Email", user.email, false)
                .setFooter("ID: " + snapshot.key)
                .setTimestamp()
            );
            if (user.roles.includes("Advisor")) client.channels.cache.get('721607003927085206').send("<@348220961155448833> <@627633981231202304> New Advisor Registration");
        });
    }
});

db.child("dataExport").on("child_added", function(snapshot, prevChildKey) {
    if (botconfig.notify) {
        db.child("users").child(snapshot.val()).once("value", (data) => {
            var dataExport = "";
            var user = data.val();

            dataExport += "USER INFO\n-------------\n";
            dataExport += "userID: " + data.key + "\n";
            var userInfo = Object.keys(user);
            for (var i = 0; i < userInfo.length; i++) {
                dataExport += userInfo[i] + ": " + user[userInfo[i]] + "\n";
            }
            
            dataExport += "\n\nCHAT INFO\n-------------\n";
            db.child("chapters").child(user.chapterID).child("chat").once('value', (chat) => {
                var chats = Object.keys(chat.val());
                for (var i = 0; i < chats.length; i++) {
                    if (chats[i] != "Developer" || user.roles.includes("Developer")) {
                        db.child("chapters").child(user.chapterID).child("chat").child(chats[i]).once("value", (chat2) => {
                            if (chat2.val() != null) {
                                dataExport += "\n[" + chat2.val()["name"] + " CHAT]\n\n";
                                var keys = Object.keys(chat2.val());
                                for (var i = 0; i < keys.length; i++) {
                                    if (keys[i] != "name") {
                                        if (chat2.val()[keys[i]]["author"] == data.key || user.roles.includes("Developer")) {
                                            db.child("users").child(chat2.val()[keys[i]]["author"]).once("value", (author) => {
                                                var author = author.val();
                                                dataExport += author.firstName + " " + author.lastName + ' (' + chat2.val()[keys[i]]["date"] + ') ' + chat2.val()[keys[i]]["message"] + "\n";
                                            });
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            });

            if (user.roles.includes("Advisor") || user.roles.includes("Developer")) {
                // db.child("chapters").child(user.chapterID).once('value', (chapter) => {
                //     dataExport += "\n\nCHAPTER INFO\n-------------\n";
                //     dataExport += JSON.stringify(chapter.val(), null, 4) + "\n";
                // });
                dataExport += "\n\nCHAPTER MEMBERS\n-------------\n";
                db.child("users").once('value', (data) => {
                    var keys = Object.keys(data.val());
                    for (var i = 0; i < keys.length; i++) {
                        if (data.val()[keys[i]]["chapterID"] == user.chapterID) {
                            dataExport += "\nuserID: " + keys[i] + "\n";
                            var userInfo = Object.keys(data.val()[keys[i]]);
                            for (var j = 0; j < userInfo.length; j++) {
                                dataExport += userInfo[j] + ": " + data.val()[keys[i]][userInfo[j]] + "\n";
                            }
                        }
                    }
                });
            }

            const mailOptions = {
                to: user.email,
                subject: 'Personal Data Request',
                text: 'Hi ' + user.firstName + ',\n\nWe have finished proccessing your request for a copy of your personal information. Attached is a text file with all of the relevant data. Please let us know if you have any questions or concerns.\n\nThanks,\nmyDECA Team',
                attachments: [{
                    filename: 'export.txt',
                    content: dataExport
                }]
              };
              transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                  console.log(error);
                } else {
                    client.channels.cache.get('721607003927085206').send(new Discord.MessageEmbed()
                        .setAuthor(user.firstName + ' ' + user.lastName, user.profileUrl)
                        .setTitle("New data export")
                        .addField("Role", user.roles[0], true)
                        .addField("Email", user.email, false)
                        .setFooter("ID: " + snapshot.key)
                        .setTimestamp()
                    );
                    console.log('Email sent: ' + info.response);
                    client.channels.cache.get('721607003927085206').send('Email sent: ' + info.response);
                }
              });
        });
    }
});

// OneSignal Notification Boilerplate

var sendNotification = function(data) {
    var headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": "Basic " + botconfig.onesignal_api_key
    };
    
    var options = {
      host: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: headers
    };
    
    var req = https.request(options, function(res) {  
      res.on('data', function(data) {
        console.log("Response:");
        console.log(JSON.parse(data));
      });
    });
    
    req.on('error', function(e) {
      console.log("ERROR:");
      console.log(e);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  };
