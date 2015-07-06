var maxRange = function(ranges){
  var max = 0, maxi = 0, dists = ranges.map(function(d){
    return d[1]-d[0];
  });
  dists.forEach(function(d,i){
    if(d > max){
      max = d;
      maxi = i;
    }
  });
  return maxi;
};
var buildRanges = function(List,dif){
  var deltaList = []; //initialize a list of deltas between times
  deltaRanges = [];
  var delIx  = 0,lastdel,rangeIx=0;
  List.reduce(function(p,c,i,a){
    var del = dif(p,c); //calculate ti difference of the values
    deltaList.push(del);//populate the list of deltas
    if(delIx === 0){    //if this is the first one
      lastdel = del;    //set the last delta seen
      deltaRanges[rangeIx] = [0];//set the start of the range
    }
    else if(delIx > 0){ //if this is not the first delta seen
      if(lastdel !== del){ //and its different than the previous one
        deltaRanges[rangeIx].push(delIx); //mark the end of the current range
        deltaRanges[rangeIx].push(lastdel);
        deltaRanges.push([delIx]); // add a new range
        rangeIx++;                 //increment the range index
        lastdel = del;             //set the new indicator
      }
    }
    if(i === a.length-1){ //if we've reached the last element
      deltaRanges[rangeIx].push(a.length-1);//set the end of the last range
      deltaRanges[rangeIx].push(lastdel);
    }
    delIx++;
    return c;
  });
  // console.log('List',List);
  // console.log('Deltas',deltaList);
  // console.log('ranges',deltaRanges);
  return deltaRanges;
};

var buildSegments = function(List,ranges){
  var segments = [],crange,cseg,ix,len = ranges.length;
  while(len >0){
    ix = maxRange(ranges);
    crange = ranges.splice(ix,1)[0];//get the current largest range

    //update the other ranges if necessary
    console.log(ix,crange,len);
    if(ix === 0 && len > 1){  //if its the first element of the list increment
      if(ranges[ix][0] === crange[1])         //the beginning of range in front
        ranges[ix][0]++;
    }
    else if(ix === len-1 && len > 1){  //if its the last element of the list
      if(ranges[ix-1][1] === crange[0])
        ranges[ix-1][1]--;    //decrement the end of the range before it
    }
    else if(len > 1){ //if its not at the end or beginning
      if(ranges[ix-1][1] === crange[0])
        ranges[ix-1][1]--;    //decrement end of range before it
      if(ranges[ix][0] === crange[1])
        ranges[ix][0]++;    //increment beginning of range after it
    }
    if(crange[0] <= crange[1]){
      cseg = List.slice(crange[0],crange[1]+1);
      segments.push({seg:cseg,del:crange[2]});
    }
    len--;
  }
  return segments;
};

var segmentFinder = function(List,dif){
  var ranges,segments;
  if(List.length <= 1)//if the list of times is less than 2 don't bother
    return [{seg:List,del:0}];
  if(!dif){
    dif = function(a,b){return a-b;};
  }
  ranges = buildRanges(List,dif);
  segments = buildSegments(List,ranges);
  segments.sort(function(a,b){
    return dif(a.seg[0],b.seg[0]);
  });
  return segments;
  //now that the ranges have been created
};

module.exports = segmentFinder;
