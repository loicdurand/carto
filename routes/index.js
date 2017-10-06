var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { recu: false });
});

// router.post('/save', function(req, res, next) {
// 	var image = req.body.image;

// 	var base64Data = image;//.split(',')[1];

// 	var n=(new Date().getTime()).toString(16)

// 	require("fs").writeFile("public/temp/carte_"+n+".jpeg", base64Data, 'base64', function(err) {
// 		if(err) res.send('err: '+err); else res.send("/temp/carte_"+n+".jpeg");
// 	});
// });

module.exports = router;
