

var MAP  = null;
var directionsService = null;


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
	var marker = new google.maps.Marker({
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

	updateLocation();

	$.get("/api/nearbypokemons/"+lng+"/"+lat, function(pokemons){
		console.log(pokemons);

		for(var p in pokemons)
		{
			addPokemonToMap(pokemons[p].pokedexinfo.img, pokemons[p].pokedexinfo.name, pokemons[p].location.Longitude, pokemons[p].location.Latitude);
		}
	});
}


function walkTo(points)
{
	$.post("/api/walk", function(res){
	});
}


