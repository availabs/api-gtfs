
var d3 = require('d3')
function parseTime(s) {  //parses time like "00:00:00" and creates a new Date Object
   	  var formatTime = d3.time.format("%X");
	  var t = formatTime.parse(s);
	  // if (t != null && t.getHours() < 5) t.setDate(t.getDate() + 1);
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
		this.length=0;
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
	var findStop = function(stopPrefix){
		for(var i =0; i< Stops.length; i++){
			if(nparse(Stops[i].properties.stop_id) === stopPrefix)
				return i;
		}
		return -1;
	}
	
	
	var findSegmentLength = function(stopid,endid,RouteData){
		var segments = RouteData.routeSegments.features;
		var RADIUSOFEARTH_METERS = 6731000;
		var seg;
		var prod =0;
		segments.forEach(function(seg){
			var s1 = nparse(seg.properties.start.properties.stop_ids[0]);
			var s2 = nparse(seg.properties.end.properties.stop_ids[0]);
			if( (stopid === s1  && endid === s2) || (stopid === s2 && endid === s1) ){
				var len = d3.geo.length(seg);
				prod = len*RADIUSOFEARTH_METERS 
			}	

		});
		if(prod === 0)
			console.log(stopid,endid);
		return prod;
	
	}
	
	var intervals = [];
	for(var i =0; i< oneTripsData.length-1; i++){
		var timeObj = new TimeObj();						//instantiate a time object
		timeObj.start_id = nparse(oneTripsData[i].stop_id); // set the start id of the first stop
		timeObj.start = oneTripsData[i].departure_time;		// get the departure and arrival time
		for(i; oneTripsData[i+1].stop_id === timeObj.start_id; i++) //skip data errors of redundant stops
			console.log('Data Error',oneTripsData[i+1].stop_id,route_id);


		for(i; oneTripsData[i+1].arrival_time === null || oneTripsData[i+1].arrival_time === ''; i++)
			console.log('Skip');	//skip data errors of bad arrival times
		
		timeObj.stop = oneTripsData[i+1].arrival_time;		
		timeObj.stop_id = nparse(oneTripsData[i+1].stop_id);//get the id of the second stop
		timeObj.lineID = "_s_" + timeObj.start_id +"_e_"+timeObj.stop_id; // create the line label
		timeObj.lineClass = route_id						//set the route class

		var timeArr = []; //prepare an array of time objects;
		//find the set of stops that lie between these two stops
		var realRoute = graph.getShortestPath(route_id.substring(route_id.indexOf('_')+1,route_id.length),
																	 timeObj.start_id,timeObj.stop_id);
				
		var voyageLength =0;
			for(var j =0; j< realRoute.length-1; j++){  //for every pair create an new time obj
				var timeObja = new TimeObj();
				timeObja.start_id = realRoute[j];
				timeObja.stop_id = realRoute[j+1];
				timeObja.lineID = "_s_" + timeObja.start_id + "_e_" + timeObja.stop_id;
				timeObja.lineClass = route_id;
				
				timeObja.length = findSegmentLength(realRoute[j],realRoute[j+1],RouteData); //get the length of the path between points
				voyageLength += timeObja.length;
				timeArr.push(timeObja);					//and push it to the time array
			}

			var len = timeArr.length;					//get the length of the array
			var start = parseTime(timeObj.start);		//get the start time
			var end = parseTime(timeObj.stop);			//get the end time
			var tmap = d3.scale.linear().domain([0,voyageLength]).range([start.getTime(),end.getTime() ]); //create a time map
			var form = d3.time.format("%X");			//to interpolate the time objects
														//to give smooth transition between unspecified 
														//line segments in the original data
			var tally =0;
			for (var j = 0; j< len; j++){
				
				timeArr[j].start = form(new Date(Math.round(tmap(tally))) );
				if(timeArr[j].start ==='07:33:52')
					debugger;
				timeArr[j].stop = form(new Date(Math.round(tmap(tally+timeArr[j].length))) );
				tally += timeArr[j].length;
				intervals.push(timeArr[j]);
			}

	}

	return function(){ return intervals};
}

//Best option might be to have a graph datastructure and then a method that 
//will convert the datastructure to a FeatureColllection after initial processing.

module.exports = {'intervalStructure':intervalStructure};