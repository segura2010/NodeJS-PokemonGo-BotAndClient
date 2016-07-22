
// Get config from enviroment vars
var PORT = process.env.PORT || 3000;
var URI = process.env.URI || "localhost";

var USERNAME = process.env.POKEMON_USERNAME || "";
var PASSWORD = process.env.POKEMON_PASSWORD || "";
var PROVIDER = process.env.PROVIDER || "google";

// Libs for HTTP Server (Web)
var express = require('express');
var app = express();
var http = require('http').Server(app);
// SocketIO
var io = require('socket.io')(http);

// Requests
var request = require('request');

var async = require('async');

// Initialize HTTP Server
app.use(express.static('public_html'));


// Pokemon Go Lib
var Pokeio = require('../Pokemon-GO-node-api/poke.io.js'); // for tests..
//var Pokeio = require('pokemon-go-node-api')

// Listen on port
http.listen(PORT, function(){
	console.log('listening on *:'+ PORT);
});

var inProgressEncounters = []; // to save encounters

function catchPokemon(pokemon, pokedexInfo, cb)
{
    var myEncounterId = pokemon.pokemonId + "" + pokemon.SpawnPointId;
    if(inProgressEncounters.indexOf(myEncounterId) < 0)
    {   
        var ind = inProgressEncounters.push(myEncounterId) - 1;
        Pokeio.EncounterPokemon(pokemon, function(suc, dat) {
            //console.log(pokemon);
            console.log('Encountering pokemon ' + pokedexInfo.name + '...');
            Pokeio.CatchPokemon(pokemon, 1, 1.950, 1, 1, function(xsuc, xdat) {
                // Encounter finished
                inProgressEncounters.splice(ind, 1); // remove
                console.log(xdat);
                cb(xsuc, xdat);
            });
        });
    }
}


// Initialize PokemonGo

app.get('/api/start/:lng/:lat', (req, res) => {

    var location = {
        type: 'coords',
        coords:
        {
            latitude: parseFloat(req.params.lat),
            longitude: parseFloat(req.params.lng)
        }
    };

    Pokeio.init(USERNAME, PASSWORD, location, PROVIDER, (err) => {
        if (err) throw err;

        console.log('[i] Current location: ' + Pokeio.playerInfo.locationName);
        console.log('[i] lat/long/alt: ' + Pokeio.playerInfo.latitude + ' ' + Pokeio.playerInfo.longitude + ' ' + Pokeio.playerInfo.altitude);

        Pokeio.GetProfile((err, profile) => {
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

            Pokeio.Heartbeat(function(err,hb) {
                if(err)
                {
                    console.log(err);
                }

                for (var i = hb.cells.length - 1; i >= 0; i--)
                {
                    if(hb.cells[i].NearbyPokemon[0])
                    {
                        //console.log(Pokeio.pokemonlist[0])
                        var pokemon = Pokeio.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[0].PokedexNumber)-1]
                        console.log('[+] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[0].DistanceMeters.toString() + ' meters')
                    }
                }

                res.json(hb);

            });

        });
    })

});


app.get('/api/nearbypokemons/:lng/:lat', (req, res) => {

    var location = {
        type: 'coords',
        coords:
        {
            latitude: parseFloat(req.params.lat),
            longitude: parseFloat(req.params.lng)
        }
    };

    Pokeio.SetLocation(location, (err) => {
        if (err) throw err;

        Pokeio.Heartbeat(function(err,hb) {
            if(err)
            {
                console.log(err);
            }

            var nearbyPokemons = [];
            for (var i = hb.cells.length - 1; i >= 0; i--)
            {
                for (var j = hb.cells[i].NearbyPokemon.length - 1; j >= 0; j--)
                {
                    //console.log(Pokeio.pokemonlist[0])
                    var pokemon = Pokeio.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[j].PokedexNumber)-1]
                    console.log('[+] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[j].DistanceMeters.toString() + ' meters')
                    // Set pokedex info
                    hb.cells[i].NearbyPokemon[j].pokedexinfo = pokemon;
                    hb.cells[i].NearbyPokemon[j].location = hb.cells[i].DecimatedSpawnPoint[0];
                    nearbyPokemons.push(hb.cells[i].NearbyPokemon[j]);
                }
            }

            res.json(nearbyPokemons);

        });
    });

});

app.get('/api/nearobjects/:lng/:lat', (req, res) => {

    var location = {
        type: 'coords',
        coords:
        {
            latitude: parseFloat(req.params.lat),
            longitude: parseFloat(req.params.lng)
        }
    };

    Pokeio.SetLocation(location, (err) => {
        if (err) throw err;

        Pokeio.Heartbeat(function(err,hb) {
            if(err)
            {
                console.log(err);
            }

            res.json(hb);

        });
    });

});

app.get('/api/nearpokestops/:lng/:lat', (req, res) => {

    var location = {
        type: 'coords',
        coords:
        {
            latitude: parseFloat(req.params.lat),
            longitude: parseFloat(req.params.lng)
        }
    };

    Pokeio.SetLocation(location, (err) => {
        if (err) throw err;

        Pokeio.Heartbeat(function(err,hb) {
            if(err)
            {
                console.log(err);
            }

            var forts = [];

            for (var i = hb.cells.length - 1; i >= 0; i--)
            {
                // Show nearby pokemons
                for (var j = hb.cells[i].Fort.length - 1; j >= 0; j--)
                {
                    var fort = hb.cells[i].Fort[j];
                    if(fort.FortType == 1)
                        forts.push( fort );
                }
            }

            res.json(forts);

        });
    });

});


// SocketIO Events
io.on('connection', function (socket) {
    console.log("New connection!");

    socket.on('walk', function (data) {
        // test
        var points = data;

        async.eachSeries(points, (p, cb)=>{
            console.log("Going to ", p);
            socket.emit("locationchanged", p); // send new location

            var location = {
                type: 'coords',
                coords:
                {
                    latitude: parseFloat(p.lat),
                    longitude: parseFloat(p.lng)
                }
            };

            Pokeio.SetLocation(location, (err) => {
                if (err) throw err;

                Pokeio.Heartbeat(function(err,hb) {
                    if(err)
                    {
                        console.log(err);
                    }

                    var nearbyPokemons = [];
                    for (var i = hb.cells.length - 1; i >= 0; i--)
                    {
                        // Show nearby pokemons
                        for (var j = hb.cells[i].NearbyPokemon.length - 1; j >= 0; j--)
                        {
                            var currentPokemon = hb.cells[i].NearbyPokemon[j];
                            //console.log(Pokeio.pokemonlist[0])
                            var pokemon = Pokeio.pokemonlist[parseInt(currentPokemon.PokedexNumber)-1]
                            console.log('[+] There is a ' + pokemon.name + ' at ' + currentPokemon.DistanceMeters.toString() + ' meters');
                            // Set pokedex info
                            hb.cells[i].NearbyPokemon[j].pokedexinfo = pokemon;
                            hb.cells[i].NearbyPokemon[j].location = hb.cells[i].DecimatedSpawnPoint[0];
                            nearbyPokemons.push(hb.cells[i].NearbyPokemon[j]);
                        }

                        // Show WildPokemons (catchable)
                        async.each(hb.cells[i].WildPokemon, function(currentPokemon, asCb){

                            var pokemon = Pokeio.pokemonlist[parseInt(currentPokemon.pokemon.PokemonId)-1]
                            console.log('[+] There is a ' + pokemon.name + ' near!! I can try to catch it!');
                            //console.log(currentPokemon);

                            socket.emit("wildpokemonfound", pokemon);
                            
                            catchPokemon( currentPokemon, pokemon, function(err, catchresult){
                                var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
                                console.log(status[catchresult.Status]);

                                pokemon.result = status[catchresult.Status];
                                socket.emit("pokemoncatchresult", pokemon);
                            });

                        }, function(err){
                            if(err)
                                console.log("Errors: ", err);
                        });

                        // Show Forts and Farm pokestops (check points)
                        async.each(hb.cells[i].Fort, function(fort, asCb){

                            
                            //console.log('[+] There is a Fort, ID: ' + fort.FortId + ' near!! I can try to farm it!');
                            
                            if(fort.FortType == 1 && fort.Enabled)
                            {   // 1 = PokeStop; 0 = GYM
                                Pokeio.GetFort(fort.FortId, fort.Latitude, fort.Longitude, function(err, fortresponse){
                                    if(fortresponse.result == 1)
                                    {
                                        console.log(fort.FortId + " farmed!!");
                                        //console.log(fortresponse);
                                        socket.emit("pokestopfarmed", fort);
                                    }
                                });
                            }

                        }, function(err){
                            if(err)
                                console.log("Errors: ", err);
                        });
                    }

                    cb();

                });
            });

        }, ()=>{
            console.log("OK!");
            socket.emit('walkdone');
        });
    });
});



