

var MAP  = null;
var userMarker = null;
var directionsService = null;
var socket = null;
var SOCKETIO_URL = location.protocol + "//" + location.host;

function init()
{
	socket = io(SOCKETIO_URL);
	socket.on('walkdone', function (data) {
		console.log(data);
		alert("Wlak finished!!");
	});
	socket.on('locationchanged', function (data) {
		console.log("Location changed!", data);
		var latlng = new google.maps.LatLng(data.lat, data.lng);
    	userMarker.setPosition(latlng);

    	// save new location
    	localStorage.setItem("lng", data.lng);
		localStorage.setItem("lat", data.lat);
	});

	socket.on('wildpokemonfound', function (pokemon) {
		console.log("wild pokemon found!", pokemon);
		
		$("#log").append("<br><img src='"+ pokemon.img +"' style='width: 45px;'> Wild " + pokemon.name + " found! Trying to catch!");
	});

	socket.on('pokemoncatchresult', function (pokemon) {
		console.log("pokemon catch result: ", pokemon);
		
		$("#log").append("<br><img src='"+ pokemon.img +"' style='width: 45px;'> Wild " + pokemon.name + " catch result: " + pokemon.result);
	});

	socket.on('pokestopfarmed', function (fort) {
		console.log("pokestop farmed: ", fort);
		
		$("#log").append("<br> <img src='/img/pokestop.png' style='width: 45px;'> PokeStop " + fort.FortId + " farmed! ");
	});
}

function initMap() {
	/*
	map = new google.maps.Map(document.getElementById('map'), {
	center: {lat: -34.397, lng: 150.644},
	zoom: 8
	});
	*/

	getLocation(function(pos){
		var lng = pos.coords.longitude;
		var lat = pos.coords.latitude;

		localStorage.setItem("lng", lng);
		localStorage.setItem("lat", lat);
		showMap(lat, lng);
	});
}

function updateLocation()
{
	getLocation(function(pos){
		var lng = pos.coords.longitude;
		var lat = pos.coords.latitude;

		localStorage.setItem("lng", lng);
		localStorage.setItem("lat", lat);
		showMap(lat, lng);
	});
}


function getLocation(cb)
{
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(cb);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}


function showMap(lat, lng)
{
	MAP = new google.maps.Map(document.getElementById('map'), {
	  center: {lat: lat, lng: lng},
	  zoom: 19
	});
	// Add map events
	google.maps.event.addListener(MAP, 'click', function(evt) {
		
		var sure = confirm("Do you want to go?");
		if(sure)
		{
			var lat = evt.latLng.lat();
			var lng = evt.latLng.lng();
			
			var actlng = localStorage.getItem("lng");
			var actlat = localStorage.getItem("lat");
			var start = new google.maps.LatLng(actlat, actlng);
			var end = evt.latLng;
			getRoute(start, end, function(points){
				console.log(points);
				walkTo(points);
			});
		}
	});
	userMarker = new google.maps.Marker({
		position: {lat: lat, lng: lng},
		label: "",
		map: MAP
	});
	directionsService = new google.maps.DirectionsService();
}


function getRoute(start, end, cb)
{
	var request = {
		origin:start,
		destination:end,
		travelMode: google.maps.TravelMode.WALKING
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK)
		{
			console.log(status);

			console.log(response);

			var points = response.routes[0].overview_path;
			var returnPoints = [];
			for(p in points)
			{
				console.log( points[p].lng(), points[p].lat() );
				returnPoints.push({lng:points[p].lng(), lat:points[p].lat()});
			}

			cb( returnPoints );
		}
	});
}



function startBot()
{
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/start/"+lng+"/"+lat, function(res){
		console.log(res);
	});
}

function addPokemonToMap(imageUrl, pokemonName, lng, lat)
{
	var image = {
		url: imageUrl,
		// This marker is 20 pixels wide by 32 pixels high.
		size: new google.maps.Size(120, 120),
		// The origin for this image is (0, 0).
		origin: new google.maps.Point(0, 0),
		// The anchor for this image is the base of the flagpole at (0, 32).
		anchor: new google.maps.Point(0, 120)
	};

	var marker = new google.maps.Marker({
		position: {lat: lat, lng: lng},
		label: pokemonName,
		title: pokemonName,
		icon: image,
		map: MAP
	});
}

function getNearbyPokemons()
{
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearbypokemons/"+lng+"/"+lat, function(pokemons){
		console.log(pokemons);

		for(var p in pokemons)
		{
			addPokemonToMap(pokemons[p].pokedexinfo.img, pokemons[p].pokedexinfo.name, pokemons[p].location.Longitude, pokemons[p].location.Latitude);
		}
	});
}

function getNearObjects()
{
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearobjects/"+lng+"/"+lat, function(objects){
		console.log(objects);
	});
}

function getNearPokeStops()
{
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearpokestops/"+lng+"/"+lat, function(objects){
		console.log(objects);

		for(var i in objects)
		{
			var fort = objects[i];
			var mapMarker = new google.maps.Marker({
				position: {lat: fort.Latitude, lng: fort.Longitude},
				label: "PokeStop",
				title: "PokeStop",
				icon: "/img/pokestop.png",
				map: MAP
			});
		}
	});
}


function walkTo(points)
{
	//$.post("/api/walk", function(res){});
	socket.emit("walk", points);
}



init();

