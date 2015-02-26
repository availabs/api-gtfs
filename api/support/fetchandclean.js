//fetch and clean .js
var assetCache = require('./assetCache.js')
var db = require('./dbmod.js');
var fetchmod = {
	
	fetchSegs: function(struct,callback){
		var fuzzyfixer = require('./fuzzyfixer.js'), pather = require('../support/pather.js').patherbuilder();
		var Routes, eqpts, id = struct.id, routeId = struct.routeId, format = struct.format;
		var routeCb = function(data,err){
			Routes = data;
			eqpts = pather.junctionUtil.getJuncs(Routes);
			db.getStops(id,stopCb,routeId,format);
		};
		var stopCb = function(data,err){
			var topojson = require('topojson');
			var stops = topojson.feature(data,data.objects.stops);
			stops = fuzzyfixer(Routes,stops);
			pather.junctionUtil.mergeJuncs(stops,eqpts);
			var generator = pather.nrGen(Routes.features,stops.features);
			var segmentCollection = {};
			Routes.features.forEach(function(route){
				var id = route.properties.route_id;
				segmentCollection[id] = generator(id);	
			})
			stops.bbox = data.bbox, stops.transform = data.transform
			var retObj = {segments:segmentCollection,stops:stops}
			callback(retObj);
		};
		db.getRoute(id,routeCb,format);
	},

	fetch: function(route,callback){
		//get all the data it needs via local functions
		//calculate things
		var fuzzyfixer = require('./fuzzyfixer.js');
		var id = route.agency_id, day= route.day, routeId=route.route_id,format= route.format;
		var patherbuilder = require('../support/pather.js');    //import the pather object for cleaning data and graph build
		var pather = patherbuilder.patherbuilder();
		var intervalStructure= require('../support/intervals.js').intervalStructure();//interval generator object;
		var geoJson,stopData;
		var Stops=[],Routes=[],RDict = {};
		var routeCb = function(data,err){  					//on retreival of route data
			geoJson = data;									//store it in geoJson variable
			Routes = geoJson.features;						//store the array in Routes variable
			Routes.forEach(function(route){
				RDict[route.properties.route_id] = route;
			})
			var eqpts = findJunctions(Routes);				//find all junction points in the route topology
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

			stops = fuzzyfixer(geoJson,stops);
			for(var i = 0; i< Stops.length; i++){        		//look at every junction
				var junc = Stops[i].geometry.coordinates;		//get the current junction point
				var exists = false;
				stops.features.forEach(function(d,i){			//look at every stop data point
					if(distance(d.geometry.coordinates,junc) === 0) //if the junction lies on an existing stop
						exists = true;	
				})
				//if(!exists)										//don't add it to the final list
					stops.features.push(Stops[i]);
			}
			Stops = stops.features;								//store its features array in Stops variable
			var multCb = tripCb(Routes.length,afterCb);
			Routes.forEach(function(route){						//for each 'interesting' route					
					db.getRouteSchedule(id,day,route.properties.route_id,multCb); //retrieve its trip info for the given day
			 	
			});
		}

		var tripCb =function(numCalls,afterCallback){
			var count = 0;
			return function(route_id,data){
				console.log("fetching trip data for " + route_id);
				var tripData = {};
				data.forEach(function(d){
					var trip_id = d.trip_id.replace(d.trip_id.substring(d.trip_id.lastIndexOf('_'),d.trip_id.indexOf('.')+1),'_'+route_id+'.');
					if(!tripData[trip_id])
						tripData[trip_id] = []
					tripData[trip_id].push(d);				
				});
				
				var pathcoll = pather.getPathCollection(Routes,Stops);
				var newRoute = pather.getStops(route_id,Routes,pathcoll);
				newRoute = pather.getRouteSegs(newRoute);
				var graph = pather.graph;
				intervalStructure.addIntervals(tripData,newRoute,'route_'+route_id,Stops,graph);
				count += 1;
				if(count >= numCalls){
					return afterCallback()
				}
				return;
			};
		}
		
		var afterCb = function(){
			callback(intervalStructure);
		}
		db.getRoute(id,routeCb,format); //initial call getting routeData
	}
}

module.exports=fetchmod;

function distance(a,b){
		return Math.sqrt( ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] ) );
}


function findJunctions(feats){
		var eqpts = [];
		feats.forEach(function(d){
			var matrix = d.geometry.coordinates; 			//we have a multiline string so we start with a matrix of points
			for(var i = 0; i < matrix.length; i++){  		//loop through each linestring
				for(var j = 0; j< matrix.length; j++){	//compare it with all linestrings ahead of it
					for(var irunner=0; irunner < matrix[i].length; irunner++){ //compare each point in i's linestring
						start = (i !== j)? 0:irunner+1 
						for(var jrunner=start; jrunner< matrix[j].length; jrunner++){ //to each point of j's linestring
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
									if(eqpts[index].properties.routes.indexOf(d.properties.route_id)<0)
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