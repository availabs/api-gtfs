	if(typeof newRGraph =='undefined' && typeof require !=='undefined'){ //if we are in the server version
		newRGraph = require('./graphstruct.js').newRGraph;
		nparse = require('./nparse.js');
	}
var pather = (function(){


	var graph = newRGraph()

	var getPathCollection = function getPathCollection(routes,stations){
		var pathCollection = []

		routes.forEach(function(d){  //for each route
			var pathElement = {pathID:d.properties.route_id, stations: []} //create a element for the collection
			stations.forEach(function(station){   //search through the stations 
				station.properties.routes.forEach(function(route){
					if(route === d.properties.route_id)             //if one has the same id
						pathElement.stations.push(station);   //add it to the element list	
				})
				
			})
			pathCollection.push(pathElement);			 //add the current element to the collection
		})
		return pathCollection
	}

	var getStops = function getStops(route_id, Routes,pathCollection){
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
	}

	
	var deepCopy = function deepCopy(obj){
					return JSON.parse(JSON.stringify(obj));
				}

	var mergeSegments = function mergeSegments(SegmentList){
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
	var toMultiLineString = function toMultiLineString(FeatureCollection){
					var features = FeatureCollection.features;
					var mlsObj = {geometry:{coordinates:[]},type:"MultiLineString"};
					features.forEach(function(feature){
						mlsObj.geometry.coordinates.push(feature.geometry.coordinates);
					})
					return mlsObj;
				}

	var getStations = function getStations(stops){
					var uniqueStations = [];
					var exists = false;
					for(var i = 0; i< stops.length; i++){
						var station = {'type':'Feature','properties':{'station_name':'' , 'stop_ids':[]}, 'geometry':stops[i].geometry};
						for(var j=0; j< uniqueStations.length; j++){
							exists = false;
							if(nparse(uniqueStations[j].properties.stop_ids[0] ) === nparse(stops[i].properties.stop_id) ){
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

	var getRange = function getRange(array,start,stop){
					if(start < 0){
						start = 0;
					}
					var retArray = [];
					   //must include endpoints if it needs to interpolate!!!!!!
					retArray = array.slice(start,stop+1);
					
					return retArray;
				}


	var findStop = function findStop(stopcoor,lineString){
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

	var findStopsAtPoint = function findStopsAtPoint(point,stoplist){
					var list = [];
					stoplist.forEach(function(d,i){	
						if(distance(d.geometry.coordinates,point)===0)
							{
								list.push(i);
							}
							
						})
					return list;
				}

	var getSet = function getSet(lineString,realStops){
				   		var listOfStops = [];
				   		realStops.forEach(function(d){
				   			if(findStop(d.geometry.coordinates,lineString) >= 0)
				   				listOfStops.push(d);
				   		})
				   		return listOfStops;
				   	}

	var getRouteSegs = function setShapes(newRoute){
		var currentBin,index;
		var routeSegments = {
								type:'FeatureCollection',
								features:[]
							};
		var splitList = [];
		var realStops = getStations(newRoute.stops);
		//trueStops = getTrueStops(newRoute.geometry,realStops);

		var ret = getAllLines(newRoute.geometry,realStops);
		var segmentsArr = ret.list;
		var plotObj;
		routeSegments = mergeSegments(segmentsArr);
		

		return {routeSegments:routeSegments};

		function getAllLines(MultiLineString,stops){
					var LIST = []   
					var lines;
					var ret;
					MultiLineString.coordinates.forEach(function(d,i){
						if(d.length != 0){
							ret = getLines(d,stops,graph); 
							LIST.push(ret.lines);
						}
					})
					return {list:LIST};
				}

		function builder(newRoute,range,start,end,graph){
						var obj = {
									'type':'Feature',
									'properties':newRoute.properties,
									'geometry':{
										'type':'LineString',
										'coordinates':range
									},
									
								};
								obj.properties.start = start;
								obj.properties.end = end;
								graph.addEdgeToRoute(newRoute.properties.route_id,
													nparse(start.properties.stop_ids[0]),
													nparse(end.properties.stop_ids[0])
													);
								return obj;
					}
		function endPoint(routes,end,coors,dir){
						return	{
									'properties':{
									'routes':routes,
									'stop_code':null,
									'stop_ids':[nparse(end.properties.stop_ids[0])+(dir===1)?'end':'start'],
									'stop_name':'end'},
									'geometry':{type:'Point',coordinates:coors} 
								};
		}
		function getLines(lineString, realStops,graph){
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
					var lastIndex = 0;
					var rcode = newRoute.properties.route_id;
						for(var i = 0; i< lineString.length; i++){ //run through every point on the line string;
							var tempIndexes;					//create temp vars to hold immediately subsequent stops
							var temps = [];
							if( (tempIndexes = findStopsAtPoint(lineString[i],trueStops)).length !== 0 ){ //find the stops at our current point if they exist
								
								tempIndexes.forEach(function(index){
									temps.push(trueStops[index]);			//push them on the stack
								})
								var range = getRange(lineString,lastIndex, i);//get the range of points on the lineString that lie between start and end points
								lastIndex = i;
								if(starts.length != 0){
									starts.forEach(function(start){			  //for each stop in the starting points
										temps.forEach(function(end){		  //for each stop in the ending points   ... i.e. cross product
											//create a lineString Feature object with the same properties as the route with current start and stop stations.
											var obj = deepCopy(builder(newRoute,range,start,end,graph));
											routeSegments.features.push(obj);   //add that path to our list of segments;
										})
									});
								}else{
									temps.forEach(function(end){
										range = getRange(lineString,0,i)
										var start = endPoint([rcode],end,lineString[0],1);
										var obj = deepCopy(builder(newRoute,range,start,end,graph));
										routeSegments.features.push(obj);	
									});
									
								}
								starts = temps;   //set the new starting node
								startIndexes = tempIndexes;
							}
						}
						// we have broken out of the loop so if there was a stop at the end
						// last index should be the last point in the linestring
						
						if(lastIndex !== lineString.length-1){ // if not
							range = getRange(lineString,lastIndex,i);
							starts.forEach(function(start){
								var end = endPoint([rcode],start,lineString[lineString.length-1],0);
								var obj = deepCopy(builder(newRoute,range,start,end,graph));
								routeSegments.features.push(obj);   //add that path to our list of segments;
							})									
						}	
						return {'lines':routeSegments};	
					}
		}			

	var nrGen = function(routes,stops,type){
			pathcoll = getPathCollection(routes,stops);
			return function(id){
					var	newroute = getStops(id, routes, pathcoll);
					var routeSegments = getRouteSegs(newroute).routeSegments;
					if(typeof type !== 'undefined'){ // patch for working with intervals again
						return {routeSegments:routeSegments};
					}
					var route = {geometry:{},properties:{},type:'Feature'};
					var stationList = [],lineList = [];
					var temp = routeSegments.features[0].properties;
					var props = {
							route_color:temp.route_color,
							route_id:temp.route_id,
							route_long_name: temp.route_long_name,
							route_short_name:temp.route_short_name
						}
					routeSegments.features.forEach(function(route){
						stationList.push([route.properties.start,route.properties.end]);
						lineList.push(route.geometry.coordinates);
					})
					route.properties = props;
					route.geometry ={type:'MultiLineString',coordinates:lineList};
					route.stations = stationList;
					return route;
			};
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

	var junctionUtil = {};
	junctionUtil.getJuncs = function getJuncs(RouteData){
		return findJunctions(RouteData.features);
	};
	junctionUtil.mergeJuncs = function mergeJuncs(stops,junctions){
		for (var i =0; i< junctions.length; i++){
			var junc = junctions[i].geometry.coordinates;
			var exists = false;
			stops.features.forEach(function(d,i){
				if (distance(d.geometry.coordinates,junc) === 0){
					exists = true;
				} 
			})
			//if (!exists){
				stops.features.push(junctions[i]);
			//}
		}
	}

	function distance(a,b){
		var d =  Math.sqrt( ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] ) );
		return d;
	}
	return {junctionUtil:junctionUtil,getPathCollection:getPathCollection,getStops:getStops,getRouteSegs:getRouteSegs,nrGen:nrGen,graph:graph}
})();

if(typeof module !== 'undefined'){
	var patherbuilder = function(){
		return pather;
	}
	module.exports = {patherbuilder:patherbuilder};
}