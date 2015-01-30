// /*This  file will contain the main plotting logic for the transit maps */
var HOST = "http://localhost:1337"
var W_height=window.outerHeight,
	W_width=window.outerWidth;

var currentAgency;
var projection, path,
geoJson, GeoData,Stops=[],Routes,pathcoll;

var Day = "TUESDAY";

function getGraphData(Element,AgencyID){
	//We use the availabs api to retrieve route data of specified id
	var routeUrl = /*'sampleRoutes.json';//*/HOST+"/agency/"+AgencyID+"/routes";
	
	currentAgency = AgencyID;
	d3.json(routeUrl,function(err,data){
		if(err) console.log(err);
		routeGeo = data;
		Routes = plotGraph(Element,routeGeo);
		getStopData(Element,AgencyID);
	});
}

function getStopData(Element,AgencyID){
	var stopUrl = /*'sampleStops.json';//*/HOST+"/agency/"+AgencyID+"/stops";
	var stops;
	d3.json(stopUrl,function(err,data){
		if(err) console.log(err);
		stopGeo = data;
		Stops = plotStops(stopGeo);
		pathcoll = getPathCollection(Routes,Stops);
		Routes.forEach(function(route){
			if(route.geometry.coordinates.length > 0 && (/*route.properties.route_id==="2" || */ route.properties.route_id==="5")){
				tripSetter.setRequired(1);
				getTripData(route.properties.route_id,Day,AgencyID,Element);	
			}
		 	
		})
		
	});	
}

function plotStops(StopData){

	var group = d3.select("#plot");
	var stops = topojson.feature(StopData,StopData.objects.stops);
	stops.features[1174].geometry.coordinates = Routes[15].geometry.coordinates[0][635];
	stops.features[1175] = stops.features[1174];
//	return stops.features;

	for(var i = 0; i< Stops.length; i++){
		var junc = Stops[i].geometry.coordinates;
		var exists = false;
		stops.features.forEach(function(d,i){
			if(distance(d.geometry.coordinates,junc) === 0)
				exists = true;
		})
		if(!exists)
			stops.features.push(Stops[i]);
	}
	
	var tip = d3.tip()
				.attr("class",'station')
				.offset([-10,0])
				.html(function(d){
					return "<strong>Station: </strong><span style='color:red'>" +d.properties.stop_id+"</span>";
				})

	group.selectAll(".stationLabel")
					.data(stops.features).enter().append("circle").filter(function(d){return d.properties.stop_id.indexOf("2")===0})
					.attr("class",function(d){
						var everyStation = " stationLabel";
						var classes ="";
						for(i in d.properties.routes)
							classes += " route_"+d.properties.routes[i];
						classes += everyStation;
						return classes
					})
					.attr("id",function(d){return "station_"+d.properties.stop_id;})
					.attr("transform",function(d){
						return "translate("+projection(d.geometry.coordinates)+")"
					})
					.attr("r",function(d){
						if(d.properties.stop_id.indexOf('j') <0)
							return 3;
						else 
							return 0;
					})
					.style("fill","white")
					.style("stroke","black");

	group.call(tip);

		d3.selectAll(".stationLabel")
					.on("mouseover",tip.show)
					.on("mouseout",tip.hide)

	return stops.features;					
}

/*{type:'Feature',properties:{}, geometry:test}*/
function plotGraph(Element,GeoData){
	var bbox = GeoData.bbox;
	var scale = .95/ Math.max( (bbox[3] - bbox[1])/W_width, (bbox[2] - bbox[0])/W_height  );
	
	geoJson = GeoData;
	projection = d3.geo.mercator()
            .center(GeoData.transform.translate)
            .scale(50*scale)
            
    path = d3.geo.path().projection(projection);
    var x1,x2,y1,y2,bounds;
    bounds = path.bounds(geoJson);
    /*Here we want to resize the image of the paths to fit the svg
    /*get the bounds of the figure*/
    x1 = bounds[0][0], x2 = bounds[1][0],y1 = bounds[0][1], y2 = bounds[1][1];
    /*set the frame of the svg to fit the size of our figure*/
    var height = y2-y1;
    var width = x2-x1;
	var svg = Element.append("svg")
				.attr("height",height+0.1*height)
				.attr("width", width + 0.1*width)
				.style("float","left");
	var group = svg.append("g").attr("id","plot");
				//translate our figure in the svg to upper left corner*/
				group.attr("transform",function(){return "translate("+(0-x1+0.05*width)+","+(0-y1+0.05*height)+")";  });

	var eqpts = findJunctions(geoJson);
	console.log(eqpts);
	var circs ={type:'FeatureCollection',features:[]}

	eqpts.forEach(function(d){
		Stops.push(d);
		circs.features.push(d);
	});
	console.log(Stops);
	
	return geoJson.features;
}




function getTripData(Route_ID,Day,AgencyID,Element){
	var tripURL = HOST+"/agency/routeSchedule?id="+AgencyID+"&day="+Day+"&route_id="+Route_ID;
	d3.json(tripURL,function(err,data){
		if(err) console.log(err);
		var tripData = {};
		var route_id = Route_ID;
		var beenPlotted = false;
			data.forEach(function(d){
				var trip_id = d.trip_id.replace(d.trip_id.substring(d.trip_id.lastIndexOf('_'),d.trip_id.indexOf('.')+1),'_'+Route_ID+'.');
				if(!tripData[trip_id])
					tripData[trip_id] = []
				tripData[trip_id].push(d);				
			})
		var ids = Object.keys(tripData);
		var trip_id = ids[0];
		var trip_id2 = ids[1];
		var froute = plotter(route_id);
		tripSetter.setTrip(route_id,tripData,Element,froute,trip_id,trip_id2);
	})
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

function distance(a,b){
	return Math.sqrt( ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] ) );
}

function plotter(id){
	var newRoutes = [];
	var	newroute = getStops(id, Routes, pathcoll);
	var finalRoute = setShapes(newroute);
	return finalRoute;
}