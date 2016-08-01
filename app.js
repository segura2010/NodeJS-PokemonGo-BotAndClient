
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
// Post HTTP request body parser
var bodyParser = require('body-parser');

// Requests
var request = require('request');

var async = require('async');

// Initialize HTTP Server
app.use(express.static('public_html'));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(bodyParser.json());


// Pokemon Go Lib
var PokemonGO = require('../Pokemon-GO-node-api/poke.io.js'); // for tests..
//var PokemonGO = require('pokemon-go-node-api')

var Pokeio = null;

// Geolocation libs 
var geolib = require('geolib');
var googlemaps = require('googlemaps');
var GMAPS_API_KEY = "AIzaSyDcpD9RZNVJJfxf3rwqrETr4ochoHMApGc";
var gm = new googlemaps({key:GMAPS_API_KEY});

// Listen on port
http.listen(PORT, function(){
	console.log('listening on *:'+ PORT);
});

var inProgressEncounters = []; // to save encounters

var catchWildPokemons = false; // tell the bot if he must catch or not pokemons
var catchOnly = []; // if catchWildPokemons = false, we will catch only pokemons on catchOnly array
var pokestops = []; // save near pokestops
var farmingActivated = false;
var waitingTime = 500; // 1 sec of interval to go to the next waypoint in a route
var minDistanceToFort = 100; // in meters
var pokeballType = 1; // pokeball type the bot will use to catch pokemons

// Items info
var itemsInfo = require('./resources/items.json');

function catchPokemon(pokemon, pokedexInfo, cb)
{
    var myEncounterId = pokemon.pokemonId + "" + pokemon.SpawnPointId;
    //if(inProgressEncounters.indexOf(myEncounterId) < 0)
    //{   
        //var ind = inProgressEncounters.push(myEncounterId) - 1;
        Pokeio.EncounterPokemon(pokemon, function(suc, dat) {
            //console.log(pokemon);
            console.log('Encountering pokemon ' + pokedexInfo.name + '...');
            Pokeio.CatchPokemon(pokemon, 1, 1.950, 1, pokeballType, function(xsuc, xdat) {
                // Encounter finished
                //inProgressEncounters.splice(ind, 1); // remove
                console.log(xdat);
                cb(xsuc, xdat);
            });
        });
    //}
}


// Initialize PokemonGo

app.post('/api/start/:lng/:lat', (req, res) => {

    var location = {
        type: 'coords',
        coords:
        {
            latitude: parseFloat(req.params.lat),
            longitude: parseFloat(req.params.lng)
        }
    };

    Pokeio = new PokemonGO.Pokeio(); // Init

    var actUsername = req.body.username || USERNAME;
    var actPassword = req.body.password || PASSWORD;

    Pokeio.init(actUsername, actPassword, location, PROVIDER, (err) => {
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
                if(err || !hb)
                {
                    return console.log(err);
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

app.get('/api/inventory', (req, res) => {
    if( !Pokeio )
    {
        return res.json([]);
    }

    Pokeio.GetInventory((err, inv)=>{
        if(err)
            return console.log(err);

        var inventory = inv.inventory_delta.inventory_items;
        var items = [];
        for(var i in inventory)
        {
            var item = inventory[i].inventory_item_data.item;
            if(item && item.item)
            {
                item.name = itemsInfo[item.item];
                items.push(item);
            }
        }
        res.send(items);
    });
});

app.get('/api/profile', (req, res) => {
    if( !Pokeio )
    {
        return res.json({});
    }

    Pokeio.GetProfile((err, prof)=>{
        if(err)
            console.log(err);

        res.send(prof);
    });
});

app.post('/api/inventory/drop/:id/:count', (req, res) => {
    if( !Pokeio )
    {
        return res.json([]);
    }

    var item_id = parseInt(req.params.id);
    var count = parseInt(req.params.count);

    Pokeio.DropItem(item_id, count, (err, data)=>{
        if(err)
            console.log(err);

        res.send(data);
    });
});


// SocketIO Events
io.on('connection', function (socket) {
    console.log("New connection!");

    socket.on('togglecatchpokemons', function (data) {
        catchWildPokemons = !catchWildPokemons;
        console.log("Catch pokemons set to: ", catchWildPokemons);
        io.emit('togglecatchpokemons', catchWildPokemons);
    });

    socket.on('catchonlychange', function (data) {
        // data must be an string separated with commas
        // example: bulbasur,charmander,pikachu
        catchOnly = data.toLowerCase().split(",");
        io.emit('catchonlychanged', data);
    });

    socket.on('farmingchange', function (data) {
        farmingActivated = !farmingActivated;
        console.log("Farming set to: ", farmingActivated);
        io.emit('farmingchanged', farmingActivated);
        farmPokestops();
    });

    socket.on('pokeballchange', function (type) {
        pokeballType = parseInt(type);
        console.log("Pokeball type set to: ", pokeballType);
        io.emit('pokeballchanged', pokeballType);
    });

    socket.on('walk', function (data) {
        // test
        var points = data;

        async.eachSeries(points, (p, cb)=>{
            console.log("Going to ", p);
            io.emit("locationchanged", p); // send new location

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

                Pokeio.Heartbeat(function(err, hb){
                    HeartbeatBotLogic(err, hb, function(){
                        setTimeout(cb, waitingTime);
                    });
                });
            });

        }, ()=>{
            console.log("OK!");
            socket.emit('walkdone');
        });
    });
});


function getRoute(olat, olng, dlat, dlng, cb)
{
    var params = {
        origin: olat + "," + olng,
        destination: dlat + "," + dlng,
        mode: 'walking'
    };

    gm.directions(params, (err, data)=>{
        //console.log(JSON.stringify(data));
        var steps = data.routes[0].legs[0].steps;
        var points = [];
        for(var i in steps)
        {
            var p = {
                lat: steps[i].end_location.lat,
                lng: steps[i].end_location.lng
            };
            points.push(p);
        }
        //console.log(points);
        cb(points);
    });
}

function getNearestPokestop()
{

    var min_dist = 9999999, min_p = 0;

    for(var p in pokestops)
    {
        var ps = pokestops[p];
        var playerLocation = Pokeio.GetLocationCoords();
        var distance = geolib.getDistance(
            {latitude: ps.Latitude, longitude: ps.Longitude},
            {latitude: playerLocation.latitude, longitude: playerLocation.longitude}
        );
        if(distance < min_dist)
        {
            min_p = p;
            min_dist = distance;
        }
    }

    return min_p;
}

function updatePokestops(cb)
{
    Pokeio.Heartbeat(function(err,hb) {
        if(err)
        {
            console.log(err);
        }

        var forts = [];

        for (var i = hb.cells.length - 1; i >= 0; i--)
        {
            for (var j = hb.cells[i].Fort.length - 1; j >= 0; j--)
            {
                var fort = hb.cells[i].Fort[j];
                if(fort.FortType == 1)
                    forts.push( fort );
            }
        }

        pokestops = forts;
        cb();

    });
}

function farmPokestops()
{
    if(!farmingActivated)
    {
        return;
    }

    if(pokestops.length <= 0)
    {
        return updatePokestops(farmPokestops);
    }

    var nearestPokestopIndex = getNearestPokestop();
    var nearestPokestop = pokestops[nearestPokestopIndex];
    var playerLocation = Pokeio.GetLocationCoords();
    getRoute(playerLocation.latitude, playerLocation.longitude, nearestPokestop.Latitude, nearestPokestop.Longitude, (points)=>{
        async.eachSeries(points, (p, cb)=>{
            console.log("Going to ", p);
            io.emit("locationchanged", p); // send new location

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

                Pokeio.Heartbeat(function(err, hb){
                    HeartbeatBotLogic(err, hb, function(){
                        setTimeout(cb, waitingTime);
                    });
                });
            });

        }, ()=>{
            console.log("OK!");
            pokestops.splice(nearestPokestopIndex, 1); // delete pokestop!
            farmPokestops();
        });
    });
}


function HeartbeatBotLogic(err, hb, cb) {
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
            pokemon.Latitude = currentPokemon.Latitude;
            pokemon.Longitude = currentPokemon.Longitude;

            io.emit("wildpokemonfound", pokemon);
            
            if(catchWildPokemons || catchOnly.indexOf(pokemon.name.toLowerCase()) >= 0)
            {
                catchPokemon( currentPokemon, pokemon, function(err, catchresult){
                    if(!catchresult)
                    {
                        console.log("Catch pokemon failed!");
                        return asCb();
                    }
                    var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
                    console.log(status[catchresult.Status]);

                    pokemon.result = status[catchresult.Status];
                    io.emit("pokemoncatchresult", pokemon);

                    asCb();
                });
            }
            else
            {
                asCb();
            }

        }, function(err){
            if(err)
                console.log("Errors: ", err);
        });

        // Show Forts and Farm pokestops (check points)
        async.each(hb.cells[i].Fort, function(fort, asCb){

            
            //console.log('[+] There is a Fort, ID: ' + fort.FortId + ' near!! I can try to farm it!');
            
            if(fort.FortType == 1 && fort.Enabled)
            {   // 1 = PokeStop; 0 = GYM

                var playerLocation = Pokeio.GetLocationCoords();
                var distance = geolib.getDistance(
                    {latitude: fort.Latitude, longitude: fort.Longitude},
                    {latitude: playerLocation.latitude, longitude: playerLocation.longitude}
                );
                if(distance <= minDistanceToFort)
                {   // Check distance to fort before use it
                    Pokeio.GetFort(fort.FortId, fort.Latitude, fort.Longitude, function(err, fortresponse){
                        //console.log("FORT result:");
                        //console.log(fortresponse);
                        if(!fortresponse)
                        {
                            console.log("Fort farming failed!");
                            return asCb();
                        }
                        if(fortresponse.result == 1)
                        {
                            console.log(fort.FortId + " farmed!!");
                            //console.log(fortresponse);
                            io.emit("pokestopfarmed", fort);
                            asCb();
                        }
                        else if(fortresponse.result == 4)
                        {
                            console.log(fort.FortId + " Inventory Full!!");
                            //console.log(fortresponse);
                            io.emit("inventoryfull", fort);
                            asCb();
                        }
                        else
                        {
                            asCb();
                        }
                    });
                }
                else
                {
                    asCb();
                }
            }
            else
            {
                asCb();
            }

        }, function(err){
            if(err)
                console.log("Errors: ", err);
        });
    }

    cb();
}





