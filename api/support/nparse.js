//nparse.js
module.exports = {	nparse:function(string){
						var q = string[string.length-1];
						var regex = /[^0-9]/g;
						if(q.match(regex)){
							return string.slice(0,string.length-1);
						}
						else{
							return string;
						}
					}
				}