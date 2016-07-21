

var MAP  = null;


function initMap() {
	/*
	map = new google.maps.Map(document.getElementById('map'), {
	center: {lat: -34.397, lng: 150.644},
	zoom: 8
	});
	*/

	updateLocation();
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
	var marker = new google.maps.Marker({
		position: {lat: lat, lng: lng},
		label: "",
		map: MAP
	});
}


function getRoute(start, end)
{
	var request = {
		origin:start,
		destination:end,
		travelMode: google.maps.TravelMode.DRIVING
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK)
		{
			console.log(status);
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

	updateLocation();

	$.get("/api/nearbypokemons/"+lng+"/"+lat, function(pokemons){
		console.log(pokemons);

		for(var p in pokemons)
		{
			addPokemonToMap(pokemons[p].pokedexinfo.img, pokemons[p].pokedexinfo.name, pokemons[p].location.Longitude, pokemons[p].location.Latitude);
		}
	});
}


