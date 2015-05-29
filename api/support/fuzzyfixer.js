
function distance(a,b){
		return Math.sqrt( distSquared(a,b) );
	}

function distSquared(a,b){
	return  ( a[0] - b[0] ) * ( a[0] - b[0] ) + ( a[1] - b[1] ) * ( a[1] - b[1] );
}


var square = function(x){ return x*x;}

var triDist = function(p1,p2,q){
	var ssideA = square(p1[0]-p2[0]) +square(p1[1] - p2[1]);
	var ssideB = square(q[0]-p2[0]) +square(q[1] - p2[1]);
	var ssideC = square(q[0]-p1[0]) +square(q[1] - p1[1]);

	return ssideA/(ssideB + ssideC);
}


/**
	edited version from user:joshua
	http://stackoverflow.com/questions/849211/
	shortest-distance-between-a-point-and-a-line-segment
*/
var closestPoint = function(p1,p2,q){

	/*
	*	Theoretic formula
	*	proj_a_bvec = (Av.Bv/(||B||^2))Bv
	*
	*/

	qvec = [q[0] - p1[0],q[1] - p1[1]];     //vector from start to point
	bvec = [p2[0] - p1[0],p2[1] - p1[1]];	//vector from start to end line segment

	dotprod = qvec[0]*bvec[0] + qvec[1]*bvec[0]; //calc numerator of cos(theta)
	normB   = square(bvec[0]) + square(bvec[1]); //divide by square of magnitude of 
												 //vec from start to point
	
	proj_a_b = 0;								//magnitude of cos vector
	///keep the closest point in the linesegment
	if (normB !== 0) {
		proj_a_b = dotprod/normB;
	}
	var checkPoint;
	if(proj_a_b <= 0)							//if its negative closest point p1
		checkPoint = p1;
	else if(proj_a_b >= 1)						//if its longer than p2-p1 closest is p2
		checkPoint = p2;
	else
		checkPoint = [proj_a_b*bvec[0] + p1[0],proj_a_b*bvec[1]+p1[1] ]; 	//otherwise it's the component of p2
	
	return checkPoint
}

var min = function(a,b){
	if(a<b)
		return a;
	else
		return b;
}

var closestPointInRoute = function(route,point){
	var minDist = Infinity, minPoint = [],insert = [];
	route.geometry.coordinates.forEach(function(line,j){//for each line string
		var dist2;										
		for( var k =0; k < line.length - 1; k++){			//for every point in the line 							
															//if zero distance or last point
			var cpoint = closestPoint(line[k],line[k+1],point);		//find closest point
			dist2 = distSquared(point,cpoint);				//get square of the distance
			if((minDist = min(minDist,dist2)) === dist2){	//if it has the shortest distance
				minPoint = cpoint;							//set it as the closest point
				if(distSquared(cpoint,line[k+1] ===0))
					insert = [j,k+1];						//if it was inserted into the last point
				else
					insert = [j,k];							//if it wasn't the end insert somewhere b4
			}
		}
	})
	return [minPoint,insert];
}

var cloneStop = function(stopobj,route){
	return {							
		geometry:{
				type:"Point",
				coordinates:stopobj.geometry.coordinates
				},
		properties:{
				routes:[route.properties.route_id],
				stop_code:stopobj.properties.stop_code,
				stop_id:stopobj.properties.stop_id,
				stop_name:stopobj.properties.stop_name
				},
		type:'Feature'
		};
}

var associatedRoutes = function(stopobj,rdata){
	var routeList = [];
	stopobj
	.properties
	.routes
	.forEach(
		function(routeid){  
			rdata.features.forEach(function(route){         //search for the route
				if(route.properties.route_id === routeid && route.geometry.coordinates.length >0)
					routeList.push(route);					//add it to the list
			});
		});
	return routeList;
}

var getClosestPoints = function(routeList,point,stopobj){
	var retlist = [];
	routeList.forEach(function(route,i){			//for each associated route
		if(route.geometry.coordinates.length > 0)
			var temp,coor,lineNum,coorNum,cp;
			temp = closestPointInRoute(route,point);
			coor = temp[0], lineNum = temp[1][0],coorNum = temp[1][1];
			//instantiate a new stop that will be paired with this route
			var newStop = cloneStop(stopobj,route);
			newStop.geometry.coordinates = coor; 	//set the new stop to closest point on route
			cp = route.geometry.coordinates[lineNum][coorNum];
			if(distSquared(cp,coor) !== 0){			//if the new coordinate wasn't an end point
													//insert it into the route
				route.geometry.coordinates[lineNum].splice(coorNum,0,coor);
			}
			retlist.push(newStop);
	})
	return retlist;
}

var fuzzyfixer = function(rdata,sdata){
				//create a new stop data structure
				newStops = {type:sdata.type,features:[],bbox:sdata.bbox,transform:sdata.transform};

				sdata.features.forEach(function(stopobj){ //for each existing stop
					var routeList = associatedRoutes(stopobj,rdata); //get its routes						
					var stopcoor = stopobj.geometry.coordinates;  //get current stop coordinates			
					var addTrack = {};
					if(stopobj.properties.stop_id==='6098')
						console.log('here')
					var adjStops = getClosestPoints(routeList,stopcoor,stopobj);
					adjStops.forEach(function(stop){
						newStops.features.push(stop);
					})
				})
							
					return newStops;
			}

if(typeof module !== 'undefined' && typeof require !== 'undefined')
	module.exports = fuzzyfixer;