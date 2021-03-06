$(function start() {
    var map;
    var markers_list = [];

    var current_count = 0;
    var list_steps = '';
    // place the user, and calculate the distance to Le due Torri
    var Oldpos, pos;
    Oldpos = {
            lat: 0,
            lng: 0
    };
    // Automatic get from wordpress
    var features = [];
    var API_BASE_URL = "https://zambonits.limpica.net/wp/wp-json/wp/v2/" //https for online

    // General info about Zamboni Touch Street
    var infoPage = $('.info');
	infoPage.on('click', function (e) {
		window.location.hash = '#i';

		if (infoPage.hasClass('visible')) {

			var clicked = $(e.target);

			// If the close button or the background are clicked go to the previous page.
			if (clicked.hasClass('close-info') || clicked.hasClass('overlay')) {
				// Change the url hash
                window.location.hash = '';
			}

		}

	});

    var panoPage = $('.pano');
	panoPage.on('click', function (e) {

		if (panoPage.hasClass('visible')) {

			var clicked = $(e.target);

			// If the close button or the background are clicked go to the previous page.
			if (clicked.hasClass('close') || clicked.hasClass('overlay')) {
				// Change the url hash with the last used filters.
				window.location.hash = '';
			}

		}

	});



    // NB: Here it's a bit tricky as the google map has to be created before we inject the steps markers in it, so maybe the nesting of callbacks is different from the following
    //initMap();
    $.getJSON( API_BASE_URL+"listings/", function( data ) {
        for (var i=0; i< data.length; i++) {
            var listing = data[i];
            var new_feature = {
                "pos_lat": listing.acf.loc_lat,
                "pos_lng": listing.acf.loc_lng,
                "title": listing.title.rendered,
                "listing_id": String(listing.id),
                "label": (listing.title.rendered).substring(0, 1),
            }
            features.push(new_feature);
        }
        // Sorting the stages according the label
        features.sort(function(a, b){
            var a1= a.label, b1= b.label;
            if(a1== b1) return 0;
            return a1> b1? 1: -1;
        });
        console.log("Got it!",features.length);

        ///// 1)
        renderMapPage();

        ///// 2)
        for (var i = 0, feature; feature = features[i]; i++) {
            generateStepsMarkers(feature);
        }


        // Geolocation
        var infoWindow_ = new google.maps.InfoWindow({
            map: map,
            maxWidth: 250
        });
        var geolocation = null;
        if (window.navigator && window.navigator.geolocation) {
            geolocation = true;
        };
        console.log("geolocation= "+geolocation);
        function compute_distance_and_set_position(pos){

            // Compute distance to "Due Torri" (latitude = 44.4944304; longitude = 11.346510399999943)
            var loc1 = new google.maps.LatLng(features[0].pos_lat, features[0].pos_lng);
            var loc2 = new google.maps.LatLng(pos.lat, pos.lng);
            var spherical = google.maps.geometry.spherical;
            var distance = spherical.computeDistanceBetween(loc1, loc2);

            infoWindow_.setPosition(loc1);//loc_info);
            // InfoWindow content
            var content = '<div style="font-size:10px; font-weight:lighter">' +
                      '<p>Siete ' + Math.round(distance) + ' metri lontani da Le due Torri</p>'+
                  '</div>';
            infoWindow_.setContent(content);

        };
        if (geolocation) {

            // Now watch position change
            var identifier = window.navigator.geolocation.watchPosition(function(position) {
                pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                if((Oldpos.lat != pos.lat && Oldpos.lng != pos.lng) || Oldpos.lat==0) {

                    Oldpos = pos;
                    //console.log("new: " + pos+" / old: "+Oldpos);
                    console.log(" Position change ! lat: "+pos.lat+" lng: "+pos.lng);

                    compute_distance_and_set_position(pos);
                } else {
                    console.log("no update position");
                }
                // To avoid sliding map!!!
                $('#map').css("position", "fixed");
                $('#map').css("width", "100%");
                $('#map').css("overflow", "hidden !important");


            },
            function( error ){
                console.log( "Something went wrong: ", error );
            },
            {
                timeout: (10 * 1000),
                maximumAge: (1000 * 60 * 15),
                enableHighAccuracy: true
            }
        );
        }

    });



    function injectStepMarkersInMap(marker) {
        marker.addListener('click', function() {
            var id = this.listing_id;
            var label = this.label;
            console.log("id"+id);
            console.log(features[0].listing_id);
            //opens another window
    		window.location.hash = '#step/'+id;
        });
    };

    function generateStepsMarkers(data){
        // Uses Handlebars to create all steps markers using the provided data.
        // This function is called only once on page load.
        var infoWindow = new google.maps.InfoWindow({
            map: map
        });
        //infoWindow.setOptions({strokeWeight: 2.0, strokeColor: 'green', fillColor: 'green'});
        infoWindow.close();
        //var currentMark;
        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: new google.maps.LatLng(data.pos_lat,data.pos_lng), //f.position,
            icon: { //icon color according to step type?
                //url: 'assets/images/marker.svg',
                //scaledSize: new google.maps.Size(32, 38),
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: 'grey',
                labelOrigin: new google.maps.Point(0, -2),
                fillOpacity: 0.2,
                strokeColor: 'black',
                strokeWeight: 1,
            },//f.icon,//pinSymbol('red')
            title: data.title,
            listing_id: data.listing_id,
            label: {
                text: data.label,
                fontSize:'12px'
            }
        });
        //console.log(marker.title + " // "+ marker.label + " // " + marker.listing_id);
        list_steps+=marker.listing_id;
        list_steps+="_";
        markers_list.push(marker);
        google.maps.event.addListener(marker, 'mouseover', function() {
            marker.setOptions({'opacity': 0.5})
        });
        google.maps.event.addListener(marker, 'mouseout', function() {
            marker.setOptions({'opacity': 1.0})
        });
        injectStepMarkersInMap(marker);
    }

    $(window).on('hashchange', function(){
        // On every hash change the render function is called with the new hash.
        // This is how the navigation of our app happens.
        render(decodeURI(window.location.hash));
    });

    function render(url) {
        // This function decides what type of page to show
        // depending on the current url hash value.
        // Get the keyword from the url.
        var temp = url.split('/')[0];
        // Hide whatever page is currently shown.
        $('.main-content .page').removeClass('visible');
        var routes = {
            // The Homepage.
            '': function() {
                //renderMapPage();
                window.location.href = window.location.href.split('#')[0];
            },

            // Page info about ZamboniTS
			'#i': function() {
				renderInfoPage();
			},
            // Step info panorama page.
            '#stepinfo': function() {
                // Get the index of which step we want to show and call the appropriate function.
                var stepid = url.split('#stepinfo/')[1].trim();
                //renderStepPanoramaPage(stepid);
                renderStepInfoPanoramaPage(stepid);
            },

            // Step panorama page.
            '#step': function() {
                // Get the index of which step we want to show and call the appropriate function.
                var stepid = url.split('#step/')[1].trim();
                renderStepPanoramaPage(stepid);
            }
        };
        // Execute the needed function depending on the url keyword (stored in temp).
        if(routes[temp]){
            routes[temp]();
        }
        // If the keyword isn't listed in the above - render the error page.
        else {
            renderErrorPage();
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // MAP PAGE
    ///////////////////////////////////////////////////////////////////////////////////
    function renderMapPage() {
        // shows the main map page
        // OPTIONAL : take list of visited steps in input and alter the corresponding marker (color, shape, etc.)

        // Styles a map in night mode.
        map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 44.4962284,
                lng: 11.350587899999937
            },
            zoom: 16,
            disableDefaultUI: true,
            scrollwheel: false,
            navigationControl: false,
            mapTypeControl: false,
            scaleControl: false,
            draggable: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [{
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#ebe3cd"
                    }]
                },
                {
                    "elementType": "geometry.fill",
                    "stylers": [{
                        "color": "#ffeb3b"
                    }]
                },
                {
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#523735"
                    }]
                },
                {
                    "elementType": "labels.text.stroke",
                    "stylers": [{
                        "color": "#f5f1e6"
                    }]
                },
                {
                    "featureType": "administrative",
                    "elementType": "geometry",
                    "stylers": [{
                        "visibility": "off"
                    }]
                },
                {
                    "featureType": "administrative",
                    "elementType": "geometry.stroke",
                    "stylers": [{
                        "color": "#c9b2a6"
                    }]
                },
                {
                    "featureType": "administrative.land_parcel",
                    "elementType": "geometry.stroke",
                    "stylers": [{
                        "color": "#dcd2be"
                    }]
                },
                {
                    "featureType": "administrative.land_parcel",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#ae9e90"
                    }]
                },
                {
                    "featureType": "administrative.neighborhood",
                    "elementType": "geometry.fill",
                    "stylers": [{
                            "color": "#ffeb3b"
                        },
                        {
                            "visibility": "on"
                        },
                        {
                            "weight": 4.5
                        }
                    ]
                },
                {
                    "featureType": "administrative.neighborhood",
                    "elementType": "labels.text",
                    "stylers": [{
                        "visibility": "on"
                    }]
                },
                {
                    "featureType": "landscape.natural",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#dfd2ae"
                    }]
                },
                {
                    "featureType": "poi",
                    "stylers": [{
                        "visibility": "off"
                    }]
                },
                {
                    "featureType": "poi",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#dfd2ae"
                    }]
                },
                {
                    "featureType": "poi",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#93817c"
                    }]
                },
                {
                    "featureType": "poi.park",
                    "elementType": "geometry.fill",
                    "stylers": [{
                        "color": "#a5b076"
                    }]
                },
                {
                    "featureType": "poi.park",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#447530"
                    }]
                },
                {
                    "featureType": "road",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#f5f1e6"
                    }]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.icon",
                    "stylers": [{
                        "visibility": "off"
                    }]
                },
                {
                    "featureType": "road.arterial",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#fdfcf8"
                    }]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#f8c967"
                    }]
                },
                {
                    "featureType": "road.highway",
                    "elementType": "geometry.stroke",
                    "stylers": [{
                        "color": "#e9bc62"
                    }]
                },
                {
                    "featureType": "road.highway.controlled_access",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#e98d58"
                    }]
                },
                {
                    "featureType": "road.highway.controlled_access",
                    "elementType": "geometry.stroke",
                    "stylers": [{
                        "color": "#db8555"
                    }]
                },
                {
                    "featureType": "road.local",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#806b63"
                    }]
                },
                {
                    "featureType": "transit",
                    "stylers": [{
                        "visibility": "off"
                    }]
                },
                {
                    "featureType": "transit.line",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#dfd2ae"
                    }]
                },
                {
                    "featureType": "transit.line",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#8f7d77"
                    }]
                },
                {
                    "featureType": "transit.line",
                    "elementType": "labels.text.stroke",
                    "stylers": [{
                        "color": "#ebe3cd"
                    }]
                },
                {
                    "featureType": "transit.station",
                    "elementType": "geometry",
                    "stylers": [{
                        "color": "#dfd2ae"
                    }]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry.fill",
                    "stylers": [{
                            "color": "#b9d3c2"
                        },
                        {
                            "weight": 4.5
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "labels.text.fill",
                    "stylers": [{
                        "color": "#92998d"
                    }]
                }
            ]
        });


        google.maps.event.addDomListener(window, "resize", function() {
            var center = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
        });

        // MAsk to focus on Zamboni street
        // Define the LatLng coordinates for the polygon's path.
        var outerCoords = [
            {lat: 44.4,lng: 11.3},
            {lat: 44.6,lng: 11.3},
            {lat: 44.6,lng: 11.4},
            {lat: 44.4,lng: 11.4},
        ];

        // Define the LatLng coordinates for the polygon's inner path.
        // Note that the points forming the inner path are wound in the
        // opposite direction to those in the outer path, to form the hole.
        var innerCoords = [
            {lat: 44.49428597518099, lng: 11.346087455749512},
            {lat: 44.49440842460528,lng: 11.347653865814209},
            {lat: 44.49489821973133,lng: 11.348834037780762},
            {lat: 44.4954492343308,lng: 11.350829601287842},
            {lat: 44.49626044079391,lng: 11.352524757385254},
            {lat: 44.49675022036458,lng: 11.354176998138428},
            {lat: 44.49740835518457,lng: 11.356065273284912},
            {lat: 44.49838789092852,lng: 11.356322765350342},
            {lat: 44.49881643264208,lng: 11.354155540466309},
            {lat: 44.49806648257639,lng: 11.352567672729492},
            {lat: 44.49728591205956,lng: 11.351323127746582},
            {lat: 44.49673491481525,lng: 11.349992752075195},
            {lat: 44.496382886072254,lng: 11.348190307617188},
            {lat: 44.49567882221063,lng: 11.3468599319458},
            {lat: 44.49514311575167,lng: 11.345744132995605},
            {lat: 44.494454343073116,lng: 11.345658302307129}
        ];


        // Construct the polygon.
        var zone = new google.maps.Polygon({
            paths: [innerCoords, outerCoords],
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FFFFFF',
            fillOpacity: 0.55
        });
        zone.setMap(map);

        // Create the DIV to hold the control
        var centerControlDiv = document.createElement('div');

        centerControlDiv.index = 1;
        map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);


    }


    ///////////////////////////////////////////////////////////////////////////////////
    // STEP PANORAMA PAGE
    ///////////////////////////////////////////////////////////////////////////////////
    function renderStepPanoramaPage(step_id){

        // Grab data from backend
        var page = $('.pano'),
			container = $('.viewPano');
        // Info for each pano
        var infoPanoPage = $('.btn-info');
        // Empty the interest points each time we go to another StepPanoramaPage, empty attribute for width
        $('.interest_points').empty();
        $('.modal_i').empty();
        $('div.viewPano').css('width','');
        // Show stepinfo on click
        infoPanoPage.on('click', function (e) {
    		window.location.hash = '#stepinfo/'+step_id;
    	});

        // Render the navigation steps, on top right
        renderNavigationSteps(step_id);

        $.getJSON( API_BASE_URL+"listings/"+step_id, function( data ) {
            //console.log("got listing details", data);
            var interestPoints = data.acf.pint;
            var $loadingIndicator = $('#loading-indicator');
            $('.interest_points').css('opacity',0.0);
            $("#steps_nav" ).css('opacity',0.0);
            infoPanoPage.css('opacity',0.0);
            // Loader indicator
            $loadingIndicator.show();
            // Call pano.js
            $("#panorama").pano({
                img: data.acf.panoramica.url
            });
            // tracking of the loading process
            $('#panorama').imagesLoaded({
                background: true
            }, function( imgLoad ) {
                console.log( ' image loaded!!' );
                $loadingIndicator.hide();
                $('.interest_points').css('opacity',1.0);
                $("#steps_nav" ).css('opacity',1.0);
                infoPanoPage.css('opacity',1.0);
                $('.interest_points').css('width', scaledImageWidth );
            }
        );


        var ratio = parseInt($('#panorama').css("height").replace("px", ""))*1.0/data.acf.panoramica.height;
        console.log("ratio "+ratio);
        var scaledImageWidth = data.acf.panoramica.width * ratio;
        console.log("background-position: "+ $('#panorama').css("background-position"));
        // BE sure that when switching from map to panorama the interest points remain well located
        if($('#panorama').css("background-position")!=0) $('#panorama').css('background-position',0);

        // Listen for resize changes (landscape to portrait and vice versa)
        window.addEventListener("resize", function() {
            // Get screen size (inner/outerWidth, inner/outerHeight)
            ratio = parseInt($('#panorama').css("height").replace("px", ""))*1.0/data.acf.panoramica.height;
            scaledImageWidth = data.acf.panoramica.width * ratio;
            var delta = parseInt($('#panorama').css('background-position-x').replace("px", ""));
            console.log(delta);
            $('.interest_points').css('width', scaledImageWidth);
            $(panorama).find(".ipoint").each(function(index, ip){
                current_left = parseInt($(ip).attr('data-left').replace("%", ""))*scaledImageWidth/100;
                console.log("cur-left " + current_left);
                $(ip).css('left', current_left +delta +'px');
            })
            console.log("ALERT");
            console.log("ratio changed: "+ratio);
        }, false);

        // go through all ip and add annotations and modal window
        for (var i = 0; i < interestPoints.length; i++) {
            ip = interestPoints[i]; var index=i;
            $.getJSON( API_BASE_URL+"posts/"+ip.ID, function( data ) {

                renderStepInterestPointPanoramaPage(data.id);

            });
        };

    });

		// Show the page.
		page.addClass('visible');
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // INSIDE PANORAMA, RENDER THE NAVIGATION STEPS ON TOP RIGHT
    ///////////////////////////////////////////////////////////////////////////////////
    function renderNavigationSteps(step_id){

        var steps = list_steps.split('_');
        var p; var n; var s;
        for (var i=0; i< steps.length-1; i++) {
            if(step_id==steps[i]){
                s=i+1;
                if(i==0) {
                    p=" ";
                    n=steps[i+1];
                    //console.log("previous: "+ p + " / next: "+ n);
                } else if(i==(steps.length-2)) {
                    p=steps[i-1];
                    n=" ";
                    console.log("previous: "+ p + " / next: "+ n);
                } else {
                    p=steps[i-1];
                    n=steps[i+1];
                    //console.log("previous: "+ p + " / next: "+ n);
                }

            }
        }

        var new_content1 = "";
        if(p==" "){
            new_content1 += '    '
                        + '<a class="next" href="#step/'+n+'">'
                        + ''+(s+1)+' >'
                        + '</a>';
        } else if(n==" "){
            new_content1 += '<a class="previous" href="#step/'+p+'">'
                        + '< '+(s-1)+''
                        + '</a>';
        } else {
            new_content1 += '<a class="previous" href="#step/'+p+'">'
                        + '< '+(s-1)+''
                        + '</a>'
                        + ' '
                        + '<a class="next" href="#step/'+n+'">'
                        + ''+(s+1)+' >'
                        + '</a>';
        }
        $("#steps_nav" ).html(new_content1);
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // INSIDE PANORAMA, MODAL WINDOW FOR INTEREST POINT
    ///////////////////////////////////////////////////////////////////////////////////
    function renderStepInterestPointPanoramaPage(pointid){

        $.getJSON( API_BASE_URL+"posts/"+pointid, function( data ) {

            $.get('assets/templates/interest_points_annotation.mst', function(template) {
                console.log("ip data", data);
                var rendered = Mustache.render(template, data);
                $('.interest_points').append(rendered);

                $.get('assets/templates/interest_points_content.mst', function(template) {

                    var content = Mustache.render(template, data);
                    $('#modal_ip').append(content);

                    // Dismiss when clicking outside the modal window
                    $('.modal').on('click', function(e) {
                        if (!$(e.target).closest(".modal-content").length) {
                            $(".modal").fadeOut(175);
                            console.log("close audio!!");
                            $('audio').each(function(){
                                this.pause(); // Stop playing
                                this.currentTime = 0; // Reset time
                            });
                        }
                    });

                    var pi_ = 'pi'+data.id+'.ipoint';
                    $('#'+pi_).on('click touchstart', function() {
                        // render modal window
                        console.log('click!!!');
                        var target = ($(this).attr('data-target'));
                        $(target).fadeIn(175);
                    });
                });
            });

        });

    }

    ///////////////////////////////////////////////////////////////////////////////////
    // INSIDE PANORAMA, INTRO FOR PANORAMA
    ///////////////////////////////////////////////////////////////////////////////////
    function renderStepInfoPanoramaPage(step_id){

        var container_header = $('.modal-header'),
			container_body = $('.modal-body');
        $.getJSON( API_BASE_URL+"listings/"+step_id, function( data ) {
            console.log("info for pano", step_id);

            // Here a random video has been set, should be replaced by the adequate one got from REST API
            $('#myModal').html('<div class="modal-dialog">' +
            '<div class="modal-content">' +
            '<span class="close-modal" data-dismiss="modal">&times;</span>' +
            '<h3>'+data.title.rendered+'</h3>' +
            '<div class="modal-body">' +
            '<iframe id="videoContent" width="100%" height="100%" src="//www.youtube.com/embed/YE7VzlLtp-4" frameborder="0" allowfullscreen></iframe>' + //video could a feature!!
            '</div></div></div>')

            var url = $('#myModal iframe')[0].src;

            // When modal window is closed, video and audio are stopped
            $('#myModal').on('hide.bs.modal', function(){
                jQuery('#myModal iframe')[0].src="";
            });

            $('#myModal').on('show.bs.modal', function(){
                $('#myModal iframe').attr('src', url);
                window.location.hash = 'stepinfo/'+step_id;
            });

        });

    }

    ///////////////////////////////////////////////////////////////////////////////////
    // PAGE INFORMATION
    ///////////////////////////////////////////////////////////////////////////////////
	function renderInfoPage(){
		var page = $('.info'),
			container = $('.viewInfo');

        // HERE a random audio content has been set, should be replace with adequate audio got from REST API
		container.find('h3').text("Zamboni Touch Street: Un percorso in 7 Tappe");
		container.find('audio').attr('src', 'assets/sounds/Event2.wav');

		// Show the page.
		page.addClass('visible');
	}

    ///////////////////////////////////////////////////////////////////////////////////
    // ERROR PAGE
    ///////////////////////////////////////////////////////////////////////////////////
    function renderErrorPage(){
        // Shows the error page.
    }
});
