

function parseTime(s) {
	  d3 = require('d3')
   	  var formatTime = d3.time.format("%X");
	  var t = formatTime.parse(s);
	  if (t != null && t.getHours() < 5) t.setDate(t.getDate() + 1);
	  return t;
}



function getInitialTrips(Intervals){
	var tripArray; 
}

function getAllRouteIntervals(tripData,RouteData,route_id,Stops,graph){
	var keys = Object.keys(tripData);
	var tripIntervals = {};
	keys.forEach(function(id){
		current = tripData[id];
		tripIntervals[id] = {
							 'intervals':getIntervals(current,RouteData,route_id,Stops,graph)(),
							 'range': {begin:current[0].departure_time,end:current[current.length-1].arrival_time}
							};

	})
	return function(){return tripIntervals};

}

var TimeObj = function(){
		this.start_id='';
		this.stop_id = '';
		this.start='';
		this.stop = '';
		this.lineID = '';
		this.lineClass='';
	}

var intervalStructure = function(){
	return {
		intervalObj:{},
		addIntervals:function (tripData,RouteData,route_id,Stops,graph){
			this.intervalObj[route_id] = {id:route_id,trips:getAllRouteIntervals(tripData,RouteData,route_id,Stops,graph)()};
		},

		getIntervals:function(){
			return this.intervalObj;
		},
	};
}

var nparse = require('./nparse.js');

function getIntervals(oneTripsData,RouteData,route_id,Stops,graph){

	function findStop(stopPrefix){
		for(var i =0; i< Stops.length; i++){
			if(nparse(Stops[i].properties.stop_id) === stopPrefix)
				return i;
		}
		return -1;
	}
	
	var intervals = [];
	for(var i =0; i< oneTripsData.length-1; i++){
		var timeObj = new TimeObj();						//instantiate a time object
		timeObj.start_id = nparse(oneTripsData[i].stop_id); // set the start id of the first stop
		timeObj.start = oneTripsData[i].departure_time;		// get the departure and arrival time
		for(i; oneTripsData[i+1].arrival_time === null || oneTripsData[i+1].arrival_time === ''; i++)
			console.log('skip');
		timeObj.stop = oneTripsData[i+1].arrival_time;		
		timeObj.stop_id = nparse(oneTripsData[i+1].stop_id);//get the id of the second stop
		timeObj.lineID = "_s_" + timeObj.start_id +"_e_"+timeObj.stop_id; // create the line label
		timeObj.lineClass = route_id						//set the route class

		var timeArr = []; //prepare an array of time objects;
		//find the set of stops that lie between these two stops
		var realRoute = graph.getShortestPath(route_id.substring(route_id.indexOf('_')+1,route_id.length),
																	 timeObj.start_id,timeObj.stop_id);
				
			for(var j =0; j< realRoute.length-1; j++){  //for every pair create an new time obj
				var timeObja = new TimeObj();
				timeObja.start_id = realRoute[j];
				timeObja.stop_id = realRoute[j+1];
				timeObja.lineID = "_s_" + timeObja.start_id + "_e_" + timeObja.stop_id;
				timeObja.lineClass = route_id;
				timeArr.push(timeObja);					//and push it to the time array
			}
			var len = timeArr.length;					//get the length of the array
			var start = parseTime(timeObj.start);		//get the start time
			var end = parseTime(timeObj.stop);			//get the end time
			var tmap = d3.time.scale().domain([0,len]).range([start,end]); //create a time map
			var form = d3.time.format("%X");			//to interpolate the time objects
														//to give smooth transition between unspecified 
														//line segments in the original data
			for (var j = 0; j< len; j++){
				timeArr[j].start = form(new Date(tmap(j)) );
				timeArr[j].stop = form(new Date(tmap(j+1)) );
				intervals.push(timeArr[j]);
			}

	}

	return function(){ return intervals};
}

//Best option might be to have a graph datastructure and then a method that 
//will convert the datastructure to a FeatureColllection after initial processing.

module.exports = {'intervalStructure':intervalStructure};