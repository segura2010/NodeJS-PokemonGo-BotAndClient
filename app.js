
// Get config from enviroment vars
var PORT = process.env.PORT || 3000;
var URI = process.env.URI || "localhost";

var USERNAME = process.env.USERNAME || "";
var PASSWORD = process.env.PASSWORD || "";
var PROVIDER = process.env.PROVIDER || "google";

// Libs for HTTP Server (Web)
var express = require('express');
var app = express();
var http = require('http').Server(app);

// Requests
var request = require('request');

var async = require('async');

// Initialize HTTP Server
app.use(express.static('public_html'));


// Pokemon Go Lib
var Pokeio = require('pokemon-go-node-api')

// Listen on port
http.listen(PORT, function(){
	console.log('listening on *:'+ PORT);
});


// Initialize PokemonGo

app.get('/api/start/:lng/:lat', function(req, res){

    var location = {
        type: 'coords',
        coords:
        {
            latitude: req.params.lat,
            longitude: req.params.lng
        }
    };

    Pokeio.init(USERNAME, PASSWORD, location, PROVIDER, function(err) {
        if (err) throw err;

        console.log('[i] Current location: ' + Pokeio.playerInfo.locationName);
        console.log('[i] lat/long/alt: ' + Pokeio.playerInfo.latitude + ' ' + Pokeio.playerInfo.longitude + ' ' + Pokeio.playerInfo.altitude);

        Pokeio.GetProfile(function(err, profile) {
            if (err) throw err;

            console.log('[i] Username: ' + profile.username);
            console.log('[i] Poke Storage: ' + profile.poke_storage);
            console.log('[i] Item Storage: ' + profile.item_storage);

            var poke = 0;
            if (profile.currency[0].amount) {
                poke = profile.currency[0].amount;
            }

            console.log('[i] Pokecoin: ' + poke);
            console.log('[i] Stardust: ' + profile.currency[1].amount);

            console.log('[i] Getting PokeStops...');
            Pokeio.GetPokeStops();

        });
    });

});


