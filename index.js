var admin = require('firebase-admin');
var readline = require('readline');
const botconfig = require("./botconfig.json");
const Discord = require("discord.js");
const fs = require('fs');
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

// db.child("log").on("child_added", function(snapshot, prevChildKey) {
//     var log = snapshot.val();
// });

// db.child("users").on("child_added", function(snapshot, prevChildKey) {
//     var user = snapshot.val();
//     if (user.roles.includes("Advisor")) {
//         // New advisor account created
//         client.channels.cache.get('721607003927085206').send(new Discord.MessageEmbed()
//             .setAuthor(user.firstName + ' ' + user.lastName)
//             // .setColor('#0073CE')
//             .setDescription(`${client.user.username} is online!`)
//         );
//     }
//     else {
//         // New user account created
//     }
// });