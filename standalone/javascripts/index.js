const CONV_IMG_TO_M = 152.873984;
const GEO = "https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?layer=";
const PROXY = "https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/proxy/?layer=";
const NORMAL = "&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix=";
const BDPARCEL = "&style=bdparcellaire&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png&TileMatrix=";

var BASES_URL = {
	0: GEO + 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR' + NORMAL,
	1: PROXY + 'OPEN_STREET_MAP' + NORMAL, 
	2: GEO + 'ORTHOIMAGERY.ORTHOPHOTOS' + NORMAL,
	3: GEO + 'CADASTRALPARCELS.PARCELS' + BDPARCEL
};

var BASE_URL = BASES_URL[0];

const LIMIT_DO_IT_AT_ONCE = 1601;
const LIMIT_MAX_TOTAL = 10000;
const LIMIT_MAX_WIDTH = 100;

var compteur = 0;

function showModal(selector){
	selector = selector ? selector : '.modal';
	var modal = document.querySelector(selector);
	modal.style.display = "block";
	var span = modal.getElementsByClassName("close")[0];
	span.onclick = function() {
		modal.style.display = "none";
	}
	window.onclick = function(event) {
		if (event.target == modal) {
			modal.style.display = "none";
		}
	}
}

function bindData(that){
	var val = that.value,
	name = that.getAttribute('name'),
	val_px = parseInt(val, 10) * 256,
	val_m = Math.round(val * CONV_IMG_TO_M);
	that.previousElementSibling.innerHTML = name+": <span>"+val_px+"px / "+val_m +"m / "+val+" images</span>";
}

function getURLs(firstCol, vlarg, firstRow, vhaut, nvZoom){
	var urls = [],
	total_larg = firstCol + vlarg,
	before_larg = "&TileRow=",
	vhaut = vhaut >= 1? vhaut : 1,
	k=1, i=firstCol;

	for(var k=1; k <= vhaut; k++){

		for(var i = firstCol; i < total_larg ; i++){
			var dest = ""+nvZoom+"&TileCol="+i+before_larg+firstRow;
			urls.push(dest);
		}
		firstRow++;

	}

	return urls;
}

function getLongLat(adresse, zoom){
	if(adresse != ""){
		adresse = adresse.replace(/ /g, '%20');
		var url = 'http://maps.googleapis.com/maps/api/geocode/json?address='+adresse+'&sensor=false';
		fetch(url)
		.then(function(response){
			return response.json();
		})
		.then(function(res){

			if(res.results && res.results.length == 1){
				var base = res.results[0].geometry.location;
				document.querySelector('input[name=abcisse]').value=long2tile(base.lng, zoom) || '';
				document.querySelector('input[name=ordonnee]').value=lat2tile(base.lat, zoom) || '';
			}else{
				return false;
			}
		});
	}
}

function long2tile(lon,zoom) { 
	return (Math.floor((lon+180)/360*Math.pow(2,zoom))); 
}

function lat2tile(lat,zoom)  { 
	return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); 
}

function addZoomOptions(){
	for(var i=6; i<17; i++){
		var opt = document.createElement('option');
		opt.value=i;
		opt.innerHTML = i;
		if(i==16) opt.setAttribute('selected', 'selected');
		document.getElementById('zoom').appendChild(opt);
	}
}

function blob2canvas(canvas, blob, x, y, image_name, loop){
	var image_name = image_name ? image_name : "image",
	img = new Image();
	img.crossOrigin = "Anonymous";
	var ctx = canvas.getContext('2d');
	img.onload = function () {
		ctx.drawImage(img,x,y);

		var cvs = document.getElementsByTagName('canvas')[0];
		if(x==cvs.width-256 && y==(cvs.height-256)){
			setTimeout(function(){
				cvs.toBlob(function(blob) {
					var a = document.getElementsByTagName('a')[0];
					if(loop[6]) a.onclick = function(e){ 
						compteur +=10;
						image_name=image_name.replace(/--[0-9]+/g, '');
						var reste = parseInt(loop[6] - compteur, 10) > 0 ? parseInt(loop[6] - compteur, 10) : parseInt(10 + (loop[6] - compteur), 10); // 6 - 10 = -4 ? __ : 6
						var hautRestant = reste <= 10 ? reste : 10;
						if(reste >= 0 ) buildMap(loop[0], loop[1], loop[2] + 10, hautRestant, loop[4], image_name, loop[6]);
						else{
							e.preventDefault();
							showModal('#finished');
						}
					}
					a.href=URL.createObjectURL(blob);
					var dwl = compteur==0 ? image_name+'--0'+compteur : image_name+'--'+compteur;
					a.download=dwl.replace(/(\s+)?.$/, '')
					a.style.cursor="pointer";
					
					showModal('#ready_map');

				}, "image/jpeg");
			},2000);
		}
	}
	img.src = blob;
}

function buildMap(firstCol, vlarg, firstRow, vhaut, nvZoom, image_name, loop) {
	var apercu = document.createElement('div');
	apercu.innerHTML="";

	if(loop) vhaut = vhaut >= 40 ? 40 : vhaut;
	var urls = getURLs(firstCol, vlarg, firstRow, vhaut, nvZoom);

	if(urls.length){

		var canvas = document.createElement('canvas');
		canvas.width=vlarg*256;
		canvas.height=vhaut*256;

		var x=0, y=0;

		urls.map(

			url => {
				if(x == canvas.width){
					x = 0;
					y+=256;
				}
				blob2canvas(canvas,BASE_URL+url, x, y, image_name, arguments);
				x+=256;
			}
			);

		canvas.style.width="100%";

		var div_apercu = document.getElementById('apercu');
		div_apercu.innerHTML = "";
		div_apercu.appendChild(canvas);
	}
}

document.addEventListener("DOMContentLoaded", function(){

	addZoomOptions();
	document.getElementById('limit_total_photos').innerHTML = LIMIT_MAX_TOTAL;
	document.getElementById('limit_max_width').innerHTML = LIMIT_MAX_WIDTH;
	document.getElementById('limit_max_width_in_px').innerHTML = LIMIT_MAX_WIDTH * 256;

	var adr_depart = document.querySelector('input[name=adr_depart]'),
	larg = document.querySelector('input[name=largeur]'),
	haut = document.querySelector('input[name=hauteur]'),
	typeCarte = document.querySelector('select[name=typeCarte]');

	adr_depart.onclick = adr_depart.onchange = adr_depart.onkeyup = function(){
		var nvZoom = document.getElementById('zoom').value || 16;
		getLongLat(this.value, nvZoom );
	};

	larg.onchange = larg.onclick = larg.onkeyup = haut.onchange = haut.onkeyup = haut.onclick = function(){
		bindData(this); 
	}

	typeCarte.onchange = function(){
		var n = this.value;
		BASE_URL = BASES_URL[n];
	}

	var reset = document.querySelector('input[type=reset]');
	reset.onclick = function(){
		window.location.reload();
	}

	var centered = document.querySelector('select[name=centered]');
	centered.onchange = function(){
		var adr = document.querySelector('input[name=adr_depart]');
		var abc = document.querySelector('input[name=abcisse]');
		var ord = document.querySelector('input[name=ordonnee]');
		if(this.value=="O"){
			abc.disabled = true;
			ord.disabled = true;
			adr.disabled = false;
		}else{
			abc.disabled = false;
			ord.disabled = false;
			adr.disabled = true;
		}
	}

	var submit = document.querySelector('input[type=submit]');
	submit.onclick = function(){

		var decallage = {},
		vlarg =  parseInt(larg.value, 10),
		vhaut =  parseInt(haut.value, 10),
		total = vlarg * vhaut,
		nvZoom = document.getElementById('zoom').value || 16,
		abcisse = parseFloat(document.querySelector('input[name=abcisse]').value),
		ordonnee = parseFloat(document.querySelector('input[name=ordonnee]').value),
		image_name = document.getElementById('image_name').value || 'image';

		decallage.larg = document.querySelector('select[name=centered]').value=="O" ? (vlarg/2) +1 : 0;
		decallage.haut = document.querySelector('select[name=centered]').value=="O" ? (vhaut/2) + 1 : 0;

		var firstCol = Math.round(abcisse - decallage.larg),
		firstRow = Math.round(ordonnee - decallage.haut); 

		if(!adr_depart.value && !abcisse && !ordonnee){
			showModal('#no_point');
		}else{
			if(total <= LIMIT_DO_IT_AT_ONCE){
				buildMap(firstCol, vlarg, firstRow, vhaut, nvZoom, image_name);
			}else{
				if(total <= LIMIT_MAX_TOTAL && vlarg <= LIMIT_MAX_WIDTH){
					showModal('#is_big');
					buildMap(firstCol, vlarg, firstRow, vhaut, nvZoom, image_name, vhaut);
				}else{ showModal('#too_big');
			}
		}
	}
}

})