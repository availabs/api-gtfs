var Stops = function(){
	this.list = [];
	this.ids  =	[];
};
Stops.prototype.addStop = function(stop){
	this.ids.push(stop.getId());
	this.list.push(stop);
}
Stops.prototype.addStops = function(stps){
	var stopc = this;
	stps.forEach(function(d){
		stopc.addStop(d);
	})
}
Stops.prototype.delStop = function(id){
	var ix = this.ids.indexOf(id);
	this.ids.splice(id,1);
	this.list.splice(id,1);
}
Stops.prototype.getStop = function(id){
	var ix = this.ids.indexOf(id);
	return this.list[ix]
}
Stops.prototype.getStops = function(){
	return this.list;
}
Stops.prototype.getNoAssociates = function(){
	this.list.filter(function(d){
		return d.hasNoGroups();
	})
}
Stops.prototype.getStopsByRoute = function(rid){
	return this.list.filter(function(d){
		return d.inRoute(rid);
	});
}
Stops.prototype.getStopsByTrip = function(tid){
	return this.list.filter(function(d){
		return d.inGroup(tid);
	});
}
Stops.prototype.getSubColl = function(id,method){
	var subColl = new Stops(),
	sublist     = method(id);
	sublist.forEach(function(d){
		subColl.addStop(d);
	})
	return subColl;
}
Stops.prototype.getSubCollByRoute = function(rid){
	return this.getSubColl(rid,this.getStopsByRoute);
}
Stops.prototype.getSubCollByTrip =function(tid){
	return this.getSubColl(tid,this.getStopsByTrip);
}
Stops.prototype.hasStop = function(sid){
	return this.ids.indexOf(sid) >=0;
}
Stops.prototype.containsStop = function(stop){
	return this.ids.index(stop.getId());
}
Stops.prototype.deleteStop = function(id){
	var ix = this.ids.indexOf(id);
	if(ix >=0){
		this.ids.splice(ix,1);
		this.list.splice(ix,1);
	}
}
Stops.prototype.getEdited = function(){
	return this.list.filter(function(d){
		return d.isEdited();
	})
}
module.exports=Stops;