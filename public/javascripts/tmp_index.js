/* ============	*/
/* 	CONSTANTES 	*/
/* ============	*/

const CONV_IMG_TO_M = 152.873984;

/* ===========	*/
/* 	FONCTIONS 	*/
/* ===========	*/

/**
 * bindData
 * ========
 *
 * @param {element} that 	=> this
 *
 * fonction utilisée pour afficher, à chaque modification 
 * de l'un des champs "hauteur" et "largeur de la carte",
 * les dimensions de la carte générée en px, m, et nombre d'images
 */
 function bindData(that){
 	var val = that.value;
 	var name = that.getAttribute('name');
 	var val_px = parseInt(val, 10) * 256;
 	var val_m = Math.round(val * CONV_IMG_TO_M);
 	that.previousElementSibling.innerHTML = name+": <span>"+val_px+"px / "+val_m +"m / "+val+" images</span>";
 }

/**
 * getUrls
 * =======
 *
 * @param {int} ign_init_larg 	=> l'abcisse sur laquelle centrer la carte (unité: tile)
 * @param {int} vlarg 			=> la largeur en nombre d'images de 256px x 256px de la carte
 * @param {int} ign_init_haut 	=> l'ordonnée laquelle centrer la carte (unité: tile)
 * @param {int} vhaut 			=> la hauteur de la carte en nombre d'images
 *
 * @return {array} urls
 *
 * fonction renvoyant un tableau avec les URLs des images à assembler pour constituer la carte
 */
 function getURLs(ign_init_larg, vlarg, ign_init_haut, vhaut, nvZoom){
 	var urls = [];
 	var total_larg = ign_init_larg + vlarg;
 	var ign = "https://wxs.ign.fr/an7nvfzojv5wa96dsga5nk8w/geoportail/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/jpeg&TileMatrix="+nvZoom+"&TileCol="
 	var before_larg = "&TileRow=";
 	vhaut = vhaut >= 1? vhaut : 1;

 	for(var k=1; k <= vhaut; k++){

 		for(var i = ign_init_larg; i < total_larg ; i++){

 			var dest = ign+i+before_larg+ign_init_haut;
 			urls.push(dest);

 		}
 		ign_init_haut++;

 	}

 	return urls;


 }

/**
 * buildCanvas
 * ===========
 *
 * @param {int} index 	=> l'indice de l'image parmis toutes les autres
 * @param {int}  total 	=> le nombre total d'images à assembler pour constituer la carte
 * @param {int}  vlarg 	=> nombre d'image en largeur de la carte
 * @param {int}  vhaut 	=> nombre d'images en hauteur de la carte
 *
 * @return {file} jpeg 	=> la carte au format image/jpeg
 *
 * fonction qui, une fois toutes les images chargées dans le DOM, les assemble au sein d'un <canvas>
 * puis convertit le <canvas> en image/jpeg
 */
 function buildCanvas(index, total, vlarg, vhaut){
 	if(index == (total-1)){
 		var canvas = document.createElement('canvas');
 		var ctx = canvas.getContext('2d');
 		canvas.width = vlarg * 256;
 		canvas.height = vhaut * 256;
 		var x = 0;
 		var y = 0;
 		var imgs = document.getElementsByTagName('img');
 		for(var indice = 0; indice < imgs.length; indice++){
 			if(x == canvas.width){
 				x = 0;
 				y+=256;
 			}
 			ctx.drawImage(imgs[indice], x, y);
 			x+=256;
 		}
 		var jpeg = canvas.toDataURL("image/jpeg");
 		return jpeg;
 	}else{
 		return false;
 	}
 }

/**
 * save
 * ====
 *
 * @param {blob} blob 		=> l'image de la carte générée à l'aide de buildCanvas()
 *
 * @return {string} text 	=> message d'erreur
 *
 * fonction qui transmet l'image de la carte, une fois qu'elle est complète, au serveur afin de l'enregistrer
 */
 function save(blob){

 	fetch('/save', {
 		method: 'post',
 		headers: {
 			'Accept': 'application/json',
 			'Content-Type': 'application/json'
 		},
 		body: JSON.stringify({
 			image: blob
 		})
 	})
 	.then(function(response) {
 		if (response.status >= 200 && response.status < 300) {
 			return response.text()
 		}
 		throw new Error(response.statusText)
 	})
 	.then(function(text) {
 		console.log(text);
 	});
 }

/**
 * getLongLat
 * ==========
 *
 * @param {string} adresse 	=> le lieu, l'adresse sur lequel on souhaite centrer notre carte
 *
 * @return {array} longLat 	=> tableau de la forme [latitude, longitude] 
 *
 * fonction faisant appel au web service de Google Map afin d'obtenir des
 * coordonnées GPS (longitude, latitude - format décimal) à partir d'une adresse
 */
 function getLongLat(adresse){
 	var adresse = adresse != "" ? adresse : "nimes";
 	adresse = adresse.replace(/ /g, '%20');
 	var url = 'http://maps.googleapis.com/maps/api/geocode/json?address='+adresse+'&sensor=false';
 	fetch(url)
 	.then(function(response){
 		return response.json();
 	})
 	.then(function(res){

 		if(res.results && res.results.length == 1){
 			var longLat = [];
 			var lat = res.results[0].geometry.location.lat;
 			var lng = res.results[0].geometry.location.lng;
 			var abc = document.querySelector('input[name=abcisse]');
 			var ord = document.querySelector('input[name=ordonnee]');
 			abc.value = lng || '';
 			ord.value = lat || '';

 		}else{
 			return false;
 		}
 	});
 }


/**
 * long2tile
 *
 * @param {float} lon 	=> longitude (au format décimal) à convertir
 * @param {int} zoom 	=> niveau de zoom demandé.
 *
 * @return {} tile 		=> la longitude convertie en tile
 *
 * pour obtenir les images nécessaires à la fabrication de notre carte, nous utilisons une API qui 
 * nécessite des coordonnées géographies au format tile. Cette fonction a donc pour but de convertir une longitude en tile
 */
 function long2tile(lon,zoom) { 
 	return (Math.floor((lon+180)/360*Math.pow(2,zoom))); 
 }

/**
 * lat2tile
 *
 * @param {float} lat 	=> latitude (au format décimal) à convertir
 * @param {int} zoom 	=> niveau de zoom demandé.
 *
 * @return {} tile 		=> la latitude convertie en tile
 *
 * convertie une latitude en tile
 */
 function lat2tile(lat,zoom)  { 
 	return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); 
 }

 function addZoomOptions(){
 	var select = document.getElementById('zoom');
 	var opt;
 	for(var i=6; i<17; i++){
 		opt = document.createElement('option');
 		opt.value=i;
 		opt.innerHTML = i;
 		if(i==16) opt.setAttribute('selected', 'selected');
 		select.appendChild(opt);
 	}
 }

 /* =======================================	*/
 /* 	TRAITEMENT DES ACTIONS UTILISATEUR 	*/
 /* =======================================	*/

// On attend que le contenu HTML soit complètement chargé
document.addEventListener("DOMContentLoaded", function(){

	addZoomOptions();
	var select = document.getElementById('zoom');

	// lors d'un changement dans le champs "adresse de départ", on demande à Google les coordonnées GPS du lieu indiqué
	var adr_depart = document.querySelector('input[name=adr_depart]');
	adr_depart.onclick = adr_depart.onchange = adr_depart.onkeyup = function(){
		var adresse = this.value;
		getLongLat(adresse);
	};

	// on prend en compte les largeur et hauteur de la carte demandées
	var larg = document.querySelector('input[name=largeur]');
	var haut = document.querySelector('input[name=hauteur]');

	// puis on attend un click sur le bouton valider pour déclencher le traitement
	var submit = document.querySelector('input[type=submit]');
	submit.onclick = function(){

		var nvZoom = select.value || 16;

		if(!adr_depart.value){
			alert('Préciser un lieu sur lequel centrer la carte');
		}else{


		/* INITIALISATION DES VARIABLES: 
		================================ */

		/* nom donnée à la carte */
		var image_name = document.getElementById('image_name').value;

		/* récupère les valeurs saisies (largeur et hauteur) */
		var vlarg =  parseInt(larg.value, 10);
		var vhaut =  parseInt(haut.value, 10);

		var total = vlarg * vhaut;

		/* points de départ */
		var abcisse = parseFloat(document.querySelector('input[name=abcisse]').value);
		var ordonnee = parseFloat(document.querySelector('input[name=ordonnee]').value);
		var ign_init_larg = abcisse ? Math.round(long2tile(abcisse, nvZoom) - (vlarg/2) +1) :23870; // point de départ (largeur)
		var ign_init_haut = ordonnee ? Math.round(lat2tile(ordonnee, nvZoom) - (vhaut/2) + 1): 33556; // point de départ (hauteur)
		
		/* crée balise <div> dans laquelle on génèrera l'aperçu des images téléchargées */
		var apercu = document.createElement('div');//getElementById('apercu');

		/* DÉBUT: 
		========= */

		/* appel de la fonction principale getURLs() afin de récupérer un tableau
		contenant les urls des images que l'on veut capturer */

		var urls = getURLs(ign_init_larg, vlarg, ign_init_haut, vhaut, nvZoom);

		/* une fois que l'on a les urls des images, on requête sur leur adresse afin d'en récupérer le contenu
		puis, une fois le téléchargement terminé, on crée un aperçu sur la page HTML */
		var promises = urls.map(url => fetch(url).then(y => y.blob()));
		Promise.all(promises).then(images => {

			// on parcourt les images téléchargées
			for(var i = 0; i < images.length; i++){

				// création d'un élément HTML <img> et d'un lien <a> qui permettra le téléchargement
				var img = document.createElement('img');
				var a = document.createElement('a');

				// ajout de l'attribut src="url de l'image"
				img.src = URL.createObjectURL(images[i]); 
				a.href = ""; 

				// gestion de la largeur d'affichage de l'image dans le navigateur
				img.style.width = (100/vlarg)+"%";

				// donne un nom unique à l'image
				img.alt =  'image_'+i;
				a.download = image_name ? image_name : 'image';

				// on accroche l'image fraichement créée à la balise <div id="apercu">
				a.appendChild(img);
				apercu.appendChild(a);

				// Enfin on place un évènement qui se déclenchera lorsque l'image sera affichée dans l'aperçu
				img.onload = function(){
					// on récupère l'indice de la photo
					var indice = parseInt(this.getAttribute('alt').split('_')[1],10);
					
					// et on crée, une fois que toutes les photos sont chargées, une carte dans une balise canvas
					// que l'on pourra facilement transformer en image jpeg
					var jpeg = buildCanvas(indice, total, vlarg, vhaut);
					// Une fois que l'on a notre jpeg
					if(jpeg){
						// on modifie la cible des liens créés précédemment afin qu'ils pointent vers notre image (la carte)
						var liens = document.getElementsByTagName('a');
						for(var link of liens){ 
							link.setAttribute('href', jpeg);
						}
						// et on enregistre la carte côté serveur si demandé
						if(document.getElementById('saveMap').value=="1") save(jpeg, name);
					}

				}
			}

			var div_apercu = document.getElementById('apercu');
			div_apercu.innerHTML = "";
			div_apercu.appendChild(apercu);
			document.getElementById('apercu_label').innerHTMl = "cliquer sur la carte pour la télécharger";

		})
	}
}

larg.onchange = larg.onclick = larg.onkeyup = haut.onchange = haut.onkeyup = haut.onclick = function(){
	bindData(this); 
}

var reset = document.querySelector('input[type=reset]');
reset.onclick = function(){
	window.location.reload();
}

})

