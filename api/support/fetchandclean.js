//fetch and clean .js

var db = require('./dbmod.js').DB;
var fetchmod = {
	

	fetch: function(route,callback){
		//get all the data it needs via local functiosn
		//calculate things
		var fuzzyfixer = function(rdata,sdata){
				sdata.features.forEach(function(stopobj){

							stopobj.properties.routes.forEach(function(routeid){
								var routeList = [];
								var stopcoor = stopobj.geometry.coordinates;
								var mindist = Infinity; 
								var minpoint = [0,0,0];
								rdata.features.forEach(function(route){
									if(route.properties.route_id === routeid)
										routeList.push(route);
								});
								var transfer = 0;
								routeList.forEach(function(route,i){
									transfer = transfer || route.geometry.coordinates.length
									route.geometry.coordinates.forEach(function(line,j){
										line.forEach(function(point,k){
											var dist = distance(stopcoor,point);
											if(dist < mindist){
												minpoint = [i,j,k];
												mindist = dist;
											} 
										})
									})
								})
								if(transfer)
									stopobj.geometry.coordinates = routeList[minpoint[0]].geometry.coordinates[minpoint[1]][minpoint[2]];

							})
						})
			}
		var id = route.agency_id, day= route.day, routeId=route.route_id,format= route.format;
		var patherbuilder = require('../support/pather.js');    //import the pather object for cleaning data and graph build
		var pather = patherbuilder.patherbuilder().pather;
		var intervalStructure= require('../support/intervals.js').intervalStructure;//interval generator object;
		var geoJson,stopData;
		var Stops=[],Routes=[],RDict = {};
		var routeCb = function(data,err){  					//on retreival of route data
			geoJson = data;									//store it in geoJson variable
			Routes = geoJson.features;						//store the array in Routes variable
			Routes.forEach(function(route){
				RDict[route.properties.route_id] = route;
			})
			var eqpts = findJunctions(geoJson);				//find all junction points in the route topology
			eqpts.forEach(function(d){						//treat them as psuedo stops
				Stops.push(d);
			});
			console.log("fetching stops data");
			db.getStops(id,stopCb,routeId,format); //then get all the stops with this agency
		}
		var stopCb = function(data,err){					//on retreival of the stop data	
			stopData = data;								//store it in stopData variable
			var topojson = require('topojson'); 			//load topojson library to extract features from stops object
			var stops = topojson.feature(stopData,stopData.objects.stops);

			fuzzyfixer(geoJson,stops);
			for(var i = 0; i< Stops.length; i++){        		//look at every junction
				var junc = Stops[i].geometry.coordinates;		//get the current junction point
				var exists = false;
				stops.features.forEach(function(d,i){			//look at every stop data point
					if(distance(d.geometry.coordinates,junc) === 0) //if the junction lies on an existing stop
						exists = true;	
				})
				if(!exists)										//don't add it to the final list
					stops.features.push(Stops[i]);
			}
			Stops = stops.features;								//store its features array in Stops variable
			var multCb = tripCb(Routes.length,afterCb);
			Routes.forEach(function(route){						//for each 'interesting' route					
				//getRouteSchedule(agencyID,day,route_id,cb)
				db.getRouteSchedule(id,day,route.properties.route_id,multCb); //retrieve its trip info for the given day
			 	
			});
		}

		var tripCb =function(numCalls,afterCallback){
			var count = 0;
			return function(route_id,data){
				console.log("fetching trip data for " + route_id);
				debugger;
				var tripData = {};
				data.forEach(function(d){
					var trip_id = d.trip_id.replace(d.trip_id.substring(d.trip_id.lastIndexOf('_'),d.trip_id.indexOf('.')+1),'_'+route_id+'.');
					if(!tripData[trip_id])
						tripData[trip_id] = []
					tripData[trip_id].push(d);				
				});
				var pathcoll = pather.getPathCollection(Routes,Stops);
				var newRoute = pather.getStops(route_id,Routes,pathcoll);
				newRoute = pather.setShapes(newRoute);
				var graph = pather.graph;
				console.log
				intervalStructure.addIntervals(tripData,newRoute,'route_'+route_id,Stops,graph);
				count += 1;
				if(count >= numCalls)
					return afterCallback()
				return;
			};
		}
		
		var afterCb = function(){
			callback(intervalStructure);
		}
		db.getRoute(id,routeCb,format); //initial call getting routeData
	}
}

module.exports={'fetchmod':fetchmod}

function distance(a,b){
		return Math.sqrt( ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] ) );
}


function findJunctions(geoJson){
	var eqpts = [];
	geoJson.features.forEach(function(d){
		var matrix = d.geometry.coordinates; 					//we have a multiline string so we start with a matrix of points
		for(var i = 0; i < matrix.length; i++){  		//loop through each linestring
			for(var j = i+1; j< matrix.length; j++){	//compare it with all linestrings ahead of it
				for(var irunner=0; irunner < matrix[i].length; irunner++){ //compare each point in i's linestring
					for(var jrunner=0; jrunner< matrix[j].length; jrunner++){ //to each point of j's linestring
						var a = matrix[i][irunner];
						var b = matrix[j][jrunner];
						if( distance(a,b) === 0){
							var index = -1;
							eqpts.forEach(function(junc,i){
								if(distance(junc.geometry.coordinates,a) === 0){
									index = i;
								}
							})
							if(index >= 0){
								eqpts[index].properties.routes.push(d.properties.route_id); 
							}else{
								var k =eqpts.length;
								var f = {type:"Feature",geometry:{type:'Point',coordinates:a},properties:{station_name:'j'+k,stop_id:'j'+k,stop_name:'junction'+k,routes:[d.properties.route_id]}};
								eqpts.push(f);	
							}
							
						}
					}
				}
			}
		}	
	})

	
	return eqpts;
}