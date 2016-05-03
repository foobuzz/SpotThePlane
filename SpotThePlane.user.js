// ==UserScript==
// @name        SpotThePlane
// @namespace   https://github.com/foobuzz/SpotThePlane
// @description Add a cell in the plane info grid to help user spot the actual plane in the sky
// @include     https://www.flightradar24.com/*
// @version     2
// @grant       none
// ==/UserScript==



var STYLES = "\
#userInputsContainer {\
	position: fixed;\
	left: 280px;\
	top: 63px;\
	z-index: 999;\
	background: transparent;\
}\
#userInputsContainer input {\
	background: rgba(0,0,0,0.33);\
	border: none;\
	color: white;\
	font-family: 'Open Sans', Arial;\
	font-size: 13px;\
	padding: 5px;\
	width: 100px;\
}";

/* User's coordinates. Will be set by setUserData using local storage or
   default values.
*/
var userLat;
var userLon;

/* Don't touch that, this is the Earth's radius. */
var R = 6371000;

var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
		       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];


/* Notes:
	- Angles are immediatly converted to rad when getting the data
      and converted back to deg just before returning them to the user.
      => All the work is done in rad
	- The terminology used for the 3D coordinates system of the program is:
		- azimuth (angle from North. e.g. North = 0° ; Est = 90°)
		- elevation (angle from the horizon e.g. horizon = 0° ; zenith = 90°)
		- distanceFromObserver (distance between the observer and the plane)
*/

/* CONVERSIONS, PARSING */


function safeParseCoords(string) {
	if (/^-?\d+(\.\d+)?$/.test(string)) {
		return parseFloat(string);
	}
	else {
		return NaN;
	}
}

function toRad(degrees){
	return degrees * Math.PI/180;
}

function toDeg(radians){
	return radians * (180/Math.PI);
}

/* Take a coordinate (an int) and render a string limited to 4 characters
	e.g. 3.14159265 -> '3.14...'
   It is used for displaying user's coordinate. See functions toSpan and
   createSpotThePlaneLine.
*/
function reduceCoord(coordinate){
	var my_string = coordinate.toString();
	if (my_string.length > 4){
		my_string = my_string.slice(0,4) + '...';
	}
	return my_string;
}

/* Parse a flightradar24 string representing altitude in feet and return the
   altitude in meters (a float).
	e.g. '10,000 ft' -> 3048,037064...
*/
function parseAlt(altitude){
	var useful = altitude.split(' ')[0];
	useful = useful.replace(',','');
	return parseInt(useful)/3.2808; // 1 foot = 1/3.2808 meters
}

/* Take the azimuth and return a user-friendly string representating it using
   the compass's strings given by compass (a tab).
*/
function interpretAzimuth(angle, compass){
	var len = compass.length;
	var closest = compass[0];
	var min = angle;
	for (var k=1 ; k <= len ; k++){
		var dist = Math.abs(angle - k*2*Math.PI/len);
		if (dist < min){   /* Getting closer to the optimum */
			min = dist;
			closest = compass[k%len];
			/* We let k reach len so that something like 358° will be detected
	           as close to 360°. In such a case, we actually want: North =
			   compass[0].
			*/
		}
		else{   /* Optimum already passed. No need to investigate further. */
			break;
		}
	}
	return closest;
}


/* MATH COMPUTATIONS */

/* Formulas used to compute bearing and distance were found at:
   http://www.movable-type.co.uk/scripts/latlong.html
*/

/* Azimuth of 2 where the reference is 1. */
function azimuthBetween(lat1, lon1, lat2, lon2){
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) -
			Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	return (Math.atan2(y, x) + 2*Math.PI) % (2*Math.PI);
}

function distanceBetween(lat1, lon1, lat2, lon2){
	var dlat = lat2 - lat1;
	var dlon = lon2 - lon1;
	var slat = lat1 + lat2;
	var x = dlon * Math.cos(slat/2);
	var result = Math.sqrt(x*x + dlat*dlat) * R;
	return result;
}

/* Assuming the ground is flat between the observer and the projection of
   the plane on the ground, the distance between the observer and the plane
   is obtained with the Pythagorean theorem.
*/
function distanceFromObserver(groundDistance, altitude){
	return Math.sqrt(altitude*altitude + groundDistance*groundDistance);
}

/* With the same assumption as in the previous function, the angle between
   the horizon and the plane is obtained with the arctan function.
*/
function elevation(groundDistance, altitude){
	return Math.atan(altitude/groundDistance);
}

/* Contrails appear when temperature is below -39°C and humidity above
   68% and with some chance. Below ~30 000 feet (9144 m), air is too hot to
   allow contrails, so we can assure with reasonable certainty that a plane
   this low leaves 'No trails'.
*/
function trailsInfos(altitude){
	if (altitude < 9144){
		return 'No trails';
	}
	else{
		return '';
	}
}


/* FINAL INFO LINE */

/* Take all the data and return the SpotThePlane string.
   1 is observer. 2 is plane.
   Returns something like 'ENE 22° 25km, No trails'
*/
function getSTPLine(lat1, lon1, lat2, lon2, altitude){
	var groundDistance = distanceBetween(lat1, lon1, lat2, lon2);
	var angle = elevation(groundDistance, altitude);
	var trails = trailsInfos(altitude);
	if (angle < Math.PI/60){  // Twist: Earth isn't flat
		return 'Below the horizon';
	}
	else{
		var dObs = distanceFromObserver(groundDistance, altitude);
		var line = interpretAzimuth(azimuthBetween(lat1, lon1, lat2, lon2),
									COMPASS)
				+ ' ' + Math.round(toDeg(angle)).toString() + '°'
				+ ' ' + Math.round(dObs/1000) + 'km';
		if (trails){
			line += ', ' + trails;
		}
		return line;
	}
}


/* DATA GATHERING */

/* Here we capture the latitude, longitude and altitude of the selected
   plane.
*/
function getPlaneData(){
	var latitude = document.getElementById('latVal').innerHTML;
	var longitude = document.getElementById('lonVal').innerHTML;
	var altitude = document.querySelector('#altitudeVal .hasTooltip').innerHTML;
	return {'lat': toRad(parseFloat(latitude)),
			'lon': toRad(parseFloat(longitude)),
			'alt': parseAlt(altitude)};
}

/* Set the globals userLat and userLon by looking into the browser's local
   storage. By default, set the globals to the Greenwitch observatory's
   coordinates.
*/
function setUserData(){
	userLat = safeParseCoords(localStorage.getItem('userLat'));
	userLon = safeParseCoords(localStorage.getItem('userLon'));
}


/* DOM */

function setStyles() {
	var styleElem = document.createElement('style')
	styleElem.innerHTML = STYLES;
	document.head.appendChild(styleElem);
}

/* Making of the new line in the plane info grid. */
function createSpotThePlaneLine(value){
	var newLine = document.createElement('div');
	newLine.setAttribute('class', 'longitem');
	newLine.innerHTML = '<h4>SpotThePlane</h4>\
		<div id="SpotThePlane" class="attrText">Initializing...</div>';
	return newLine;
}


function setUpUserInputs() {
	var container = document.createElement('div');
	container.setAttribute('id', 'userInputsContainer');
	container.innerHTML = '\
		<input type="text" id="userLat" placeholder="Latitude" value="'+
		(isNaN(userLat) ? '': userLat)+'"></input>\
		<input type="text" id="userLon" placeholder="Longitude" value="'+
		(isNaN(userLon) ? '': userLon)+'"></input>';
	container.addEventListener('keyup', function() {
		var inputUserLat = document.getElementById('userLat');
		var inputUserLon = document.getElementById('userLon');
		userLat = safeParseCoords(inputUserLat.value);
		userLon = safeParseCoords(inputUserLon.value);
		updateSTPLine();
	});
	document.querySelector('div.bootstrap').appendChild(container);
}


function attachNewLine(newLine){
	var ctx = document.querySelector(
		'#aircraftInfoGridContainer \
		.aircraft-info-location \
		.data');
	ctx.appendChild(newLine);
}


/* FIELD UPDATING */

function updateSTPLine(){
	var stpValue = document.getElementById('SpotThePlane');
	var message;
	if (isNaN(userLon) || isNaN(userLat)) {
		message = 'Awaiting valid coordinates';
	}
	else {
		var data = getPlaneData();
		message = getSTPLine(toRad(userLat), toRad(userLon), data.lat, 
									data.lon, data.alt);
	}
	stpValue.innerHTML = message;
}


/* MAIN PROGRAM */

function run(){
	setStyles();
	setUserData();
	setUpUserInputs();

	var spotThePlane = createSpotThePlaneLine('Initializing...');
	attachNewLine(spotThePlane);

	/* The event DOMSubtreeModified will detect any change in the altitude,
	   longitude or altitude of the plane and the SpotThePlane line will be
	   updated everytime there is such a change.
	*/
	document.getElementById('latVal').addEventListener("DOMSubtreeModified", updateSTPLine, false);
	document.getElementById('lonVal').addEventListener("DOMSubtreeModified", updateSTPLine, false);
	document.getElementById('altitudeVal').addEventListener("DOMSubtreeModified", updateSTPLine, false);
	
	window.onbeforeunload = function(){
		localStorage.setItem('userLat', userLat);
		localStorage.setItem('userLon', userLon);	
	};
}

run();