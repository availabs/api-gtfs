//example pather.js
//pather.js




var patherbuilder = function(){
	return {pather:{

	graph: require('./graphstruct.js').newRGraph(),

	getPathCollection: function(routes,stations){
			var pathCollection = []

			routes.forEach(function(d,i,array){  //for each route
				var pathElement = {pathID:d.properties.route_id, stations: []} //create a element for the collection
				stations.forEach(function(station,i,array){   //search through the stations 
					station.properties.routes.forEach(function(route){
						if(route == d.properties.route_id)             //if one has the same id
							pathElement.stations.push(station);   //add it to the element list	
					})
					
				})
				pathCollection.push(pathElement);			 //add the current element to the collection
			})
			return pathCollection
		},
	getStops: function(route_id, Routes,pathCollection){
			var curRoute;
			Routes.forEach(function(route){
				if(route.properties.route_id == route_id)
					curRoute = route;
			})

			var stops = [];
			pathCollection.forEach(function(path){
				if(path.pathID == route_id)
					stops = path.stations;
			})

			curRoute["stops"] = stops;
			return curRoute;
		},

	reverseSegments: function(Segments){
			var revsegs = JSON.parse(JSON.stringify(Segments));// make deep copy of segments
			revsegs.features.forEach(function(feature){
				feature.geometry.coordinates.reverse(); //reverse the ordering of the points
				var temp = feature.end;
				feature.end = feature.start;
				feature.start = temp;
			})
			return revsegs;

		},				

	setShapes: function(newRoute){
			var nparse = require('./nparse.js').nparse;
			var graph = this.graph;
			var currentBin,index;
			var routeSegments = {
				type:'FeatureCollection',
				features:[]
			};
			var splitList = [];
			var realStops = getStations(newRoute.stops);
			//trueStops = getTrueStops(newRoute.geometry,realStops);

			var segmentsArr = getAllLines(newRoute.geometry,realStops);
			

			routeSegments = mergeSegments(segmentsArr);

			//plotNewRoute(routeSegments);

			return routeSegments;

					function mergeSegments(SegmentList){
						var mergedFeatureCollection = {
							type:'FeatureCollection',
							features:[]
						};
						SegmentList.forEach(function(d){
							d.features.forEach(function(feature){
								mergedFeatureCollection.features.push(feature);
							})
						})
						return mergedFeatureCollection
					}

					function getAllLines(MultiLineString,stops){
						var LIST = []   
						MultiLineString.coordinates.forEach(function(d,i){
							if(d.length != 0)
								LIST.push(getLines(d,stops));
						})
						//var collection = mergeSegments(LIST);
						return LIST;
					}
	
					function getStations(stops){
						var uniqueStations = [];
						var exists = false;
						for(var i = 0; i< stops.length; i++){
							var station = {'type':'Feature','properties':{'station_name':'' , 'stop_ids':[]}, 'geometry':stops[i].geometry};
							for(var j=0; j< uniqueStations.length; j++){
								exists = false;
								if(nparse(uniqueStations[j].properties.stop_ids[0] ) === nparse(stops[i].properties.stop_id)){
									uniqueStations[j].properties.stop_ids.push(stops[i].properties.stop_id)
									exists = true;
									break;
								}
							}
							if(!exists){
								station.properties.station_name = stops[i].properties.stop_name;
								station.properties.stop_ids.push(stops[i].properties.stop_id);
								uniqueStations.push(station);
							}
							
						}
						return uniqueStations;
					}
					

					function getRange(array,start,stop){
						if(start < 0){
							start = 0;
						}
						retArray = [];
						   //must include endpoints if it needs to interpolate!!!!!!
						retArray = array.slice(start,stop+1);
						
						return retArray;
					}
					function findStop(stopcoor,lineString){
						var index = -1;
							for(var i =0; i< lineString.length; i++){
								var coor = lineString[i];
									var d = distance(coor,stopcoor);
									if(d === 0){
										index = i;
										break;

									}
							}
						
						return index;
					}
					function findStopsAtPoint(point,stoplist){
						var list = [];
						stoplist.forEach(function(d,i){	
							if(distance(d.geometry.coordinates,point)===0)
								{
									list.push(i);
								}
								
							})
						return list;
					}

					function getSet(lineString,realStops){
					   		var listOfStops = [];
					   		realStops.forEach(function(d){
					   			if(findStop(d.geometry.coordinates,lineString) >= 0)
					   				listOfStops.push(d);
					   		})
					   		return listOfStops;
					   	}

					function getLines(lineString, realStops){
				 		var trueStops = getSet(lineString,realStops);  ///get all stops that lie and the current lineString
						var startIndexes = findStopsAtPoint(lineString[0],trueStops); //find all stops that lie and the initial point
						var starts = [];
						startIndexes.forEach(function(index){			
							starts.push(trueStops[index]);				//for each one push it onto the stack of stops that need to be addressed
						})
						var routeSegments = {
							type:'FeatureCollection',
							features:[]
						};

						var lines = []     						//array of linestrings
						var i = 0;							 	
						var len = trueStops.length;				//the number of stops on this lineString;
																//get initial points
							var lastIndex = 0;
							for(i = 0; i< lineString.length; i++){ //run through every point on the line string;
								var tempIndexes;					//create temp vars to hold immediately subsequent stops
								var temps = [];
								if( (tempIndexes = findStopsAtPoint(lineString[i],trueStops)).length !== 0 ){ //find the stops at our current point if they exist
									
									tempIndexes.forEach(function(index){
										temps.push(trueStops[index]);			//push them on the stack
									})
									
									var range;									//create a range array to store points that lie between stops
									if(trueStops === [])
										range = [];
									else
										range = getRange(lineString,lastIndex, i);//get the range of points on the lineString that lie between start and end points
									lastIndex = i;
									startIndexes.forEach(function(s,j){			  //for each stop in the starting points
										tempIndexes.forEach(function(e,k){		  //for each stop in the ending points   ... i.e. cross product
											//create a lineString Feature object with the same properties as the route with current start and stop stations.
											var obj = {'type':'Feature','properties':newRoute.properties,'geometry':{'type':'LineString','coordinates':range},'start':starts[j]};
											obj['end'] = temps[k];
											graph.addEdgeToRoute(newRoute.properties.route_id, nparse(obj.start.properties.stop_ids[0]),nparse(obj.end.properties.stop_ids[0]));
											routeSegments.features.push(obj);   //add that path to our list of segments;
										})
									});
									starts = temps;   //set the new starting node
									startIndexes = tempIndexes;
									
								}
							}
												
							return routeSegments;	
						}

						//for right now bruteforce, there is a better algorithm to do this however
						//see closest pair of points algorithm
						
		}//end of setShapes.

	}};
}
 





function distance(a,b){
	var d =  Math.sqrt( ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] ) );
	// if(d === 0)
	// 	return d;
	// if(d < 0.002){
	// 	console.log("anomoly");
	// 	return 0;
	// }
	return d;
}


module.exports = {'patherbuilder':patherbuilder};