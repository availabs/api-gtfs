var batchmod = function(template,paramlist){
	var paramMatching = {};
	var minion = (function(){var t = template.trim(); return (t[t.length-1] === ';') ? t:(t+';') })();

	if(!paramlist.length && Object.keys(paramlist).length !== (minion.split('?').length-1) ){
		throw {"error":"Error", "message":"number of parameters and substitutions don't match"}
	}
	else if(paramlist.length && paramlist.length !== 0 && Object.keys(paramlist[0]).length !== (minion.split('?').length -1) ){
		throw {"error":"Error", "message":"number of parameters and substitutions don't match"}
	} //if number of attributes != number of input params throw error
	this.setParam = function(key,index){
		paramMatching[index] = key;
		return this;
	}
	this.setMapping = function(map){
		paramMatching = map;
	}
	this.getQuery = function(){
		var query = '';
		var re = /\?/
		if(!paramlist.length){
			obj = paramlist;
			Object.keys(paramMatching).sort().forEach(function(key){
				var value = obj[paramMatching[key]];
				minion = minion.replace(re,value);
			})
			query += (minion+';');
		}else{
			paramlist.forEach(function(obj){
				var minion = template; //copy the template waiting for substitutions
				Object.keys(paramMatching).sort().forEach(function(key){
					var value = obj[paramMatching[key]];
					minion = minion.replace(re,value);
				})
				query += (minion+';');
			});	
		}
		

		return query;
	}
}


module.exports = batchmod;
// var datafile ='hello', geojson={type:"Point",coordinates:[86,79]}, lat = 86, lon = 79, stopId = '00001';
// var template = 'UPDATE "?".stops ' 
// 							+ 'SET geom = ST_SetSRID(ST_GeomFromGeoJSON(\'?\'),4326), '
// 							+ 'stop_lon=?, stop_lat=? WHERE stop_id=\'?\'';
// var data = {file:datafile,geo:JSON.stringify(geojson),lat:lat,lon:lon,stopId:stopId};
// var map  = ['file','geo','lon','lat','stopId'];
// t = new batchmod(template,data)
// t.setMapping(map);
// console.log(t.getQuery());

// var myList = [];
// for(var i = 0; i< 81; i+=3){
// 	var tobj = {data1:i, data2:i+1, data3:i+2};
// 	myList.push(tobj);
// }
// var template = 'select "?" from ? where x > ?'
// t = new batchmod(template,myList);

// t.setParam('data1',1).setParam('data2',2).setParam('data3',3);
// console.log(t.getQuery());