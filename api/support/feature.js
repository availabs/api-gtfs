var Feature = function(feat){
	this.feat = feat;
	this.get = function(attName){
		switch(attName){
			case "stop_id":
				return this.feat.getId();
				break;
			case "geo":
				return this.feat.getGeoFeat();
				break;
			case "lat":
				return this.feat.getLat();
				break;
			case "lon":
				return this.feat.getLon();
				break;
			case "stop_name":
				return this.feat.getName();
				break;
			case "file":
				return this.feat.file;
				break;
			case "sequence":
				return this.feat.getSequence();
				break;
			case "trips":
				return this.feat.trips;
				break;	
			case "deleted":
				return this.feat.isDeleted();
				break;
			case "new":
				return this.feat.isNew();
				break;
		}
	}
}

module.exports=Feature;