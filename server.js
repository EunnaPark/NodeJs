//---------------------------------------------------
//---------Initialize--------------------------------
//---------------------------------------------------

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const async = require('async');
	
const util = require('util')
const request = require('request');   
const cacheManager = require('cache-manager');
const memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10/*seconds*/});
const ttl = 5;
 
const err_ness  = "Tags parameter is required";
const err_sb    = "sortBy parameter is invalid";   
const err_dir   = "direction parameter is invalid"
   
var dicResult = {};
var arrResult = [];

//---------------------------------------------------
//----------Route 1 ---------------------------------
//---------------------------------------------------
app.get('/api/ping', function (req, res) {
 
   return res.status(200).json({success:true})
});

//---------------------------------------------------
//----------Route 2 ---------------------------------
//---------------------------------------------------
app.get('/api/posts', function (req, res) {
	
   var tag       = req.query.tags;
   var sortBy    = (req.query.sortBy != '' && req.query.sortBy != undefined) ? req.query.sortBy:"id";
   var direction = (req.query.direction != '' && req.query.direction != undefined) ? req.query.direction:"asc";
   
   if (tag == '' || tag == undefined){

		return res.status(400).json({err:err_ness})
   }
   
   if(direction != 'asc' &&  direction != 'desc' ){
      
		return res.status(400).json({err:err_dir})
   }
   
   if(sortBy != 'id' &&  sortBy != 'reads' && sortBy != 'likes' && sortBy != 'popularity'){
	   
		return res.status(400).json({err:err_sb})
   }

    fn_get_data(tag, sortBy, direction);
    res.json({posts:arrResult});
	
    dicResult = {};//init the array after recalled this function.
    arrResult = [];//init the array after recalled this function.
   
});

//---------------------------------------------------
//---------getting data with synchronized------------
//---------------------------------------------------
function fn_get_data(tag, sortBy, direction){
   var arrTag = tag.split(",");
   
    for(i = 0 ; i < arrTag.length ; i++){
      if(arrTag[i].length > 0) {
		fn_get_data_detail(arrTag[i])	
      }
    }
   
	for (var key in dicResult) {
		if (dicResult.hasOwnProperty(key)) {
			arrResult.push(dicResult[key]);			
		}
	}
	
	sortResults(sortBy, direction=="asc"?true:false);
	
	fn_cache(tag, sortBy, direction);
	return arrResult;
}

//---------------------------------------------------
//---------getting and input data into map-----------
//---------------------------------------------------
async function fn_get_data_detail(strTag){

	var url = 'https://api.hatchways.io/assessment/blog/posts?tag='+strTag;	
	const requestPromise = util.promisify(request);
	const response = await requestPromise(url);
	var bodyR = JSON.parse(response.body);
	var bodyPost = bodyR.posts;
	
	for (i = 0; i < bodyPost.length; i++) {		
		var id = String(bodyPost[i].id)
		dicResult[id] = bodyPost[i];		  
	}  
}

function fn_cache(tag, sortBy, direction){
	memoryCache.set('resultList', arrResult, {ttl: ttl}, function(err) {
    if (err) { throw err; }
 
    memoryCache.get('resultList', function(err, result) {
			memoryCache.del('resultList', function(err) {});
		});
	});
}

//---------------------------------------------------
//---------getting sorted array----------------------
//---------------------------------------------------
function sortResults(prop, asc) {
    arrResult.sort(function(a, b) {
        if (asc) {
            return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
        } else {
            return (b[prop] > a[prop]) ? 1 : ((b[prop] < a[prop]) ? -1 : 0);
        }
    });
}

//---------------------------------------------------
// Create application/x-www-form-urlencoded parser---
//---------------------------------------------------
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(express.static('public'));
app.get('/index.htm', function (req, res) {
   res.sendFile( __dirname + "/" + "index.htm" );
})


//---------------------------------------------------
//---------server listner----------------------------
//---------------------------------------------------
var server = app.listen(8800, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})