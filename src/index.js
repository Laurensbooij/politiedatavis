/* __________ AUTOMATIC RELOAD __________ */

require('./assets/styles/index.scss');
import * as d3 from 'd3';

/* __________ VARIABLES __________ */

var height = 800;
var colorNormal = "#ff694f";
var colorEdited = "#ff9c06";
var colorRemoved = "#ffcc34";
var colorInactive = "#e2e2e2";
var responsiveCheck;
var circleClickedCheck = false;
var popupCheck = false;
var circleSize = d3.scaleLinear().domain([0, 8]).range([8, 36]); //Scales between two number ranges
var circleTimelineDeviation = 12;
var circleTimelinePosition = d3.scaleLinear().domain([0, 150, 450, 750, 1050, 1350, 1650, 1950, 2250, 2550, 2850, 3150, 3450, 3750, 4050, 4350, 4650, 4950, 5100]).range([0, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, circleTimelineDeviation, -circleTimelineDeviation, 0]); //Scales between multiple number ranges

d3.select(window).on('resize', onResize);

var svg = d3.select(".svg-container")
	.append("svg")
	.attr("height", height)
	.attr("width", window.innerWidth)
	.append("g");

var simulation = d3.forceSimulation()
	.force("r", d3.forceRadial(10).strength(0.005)) //This force makes sure every circle is in a radius
	.force("collide", d3.forceCollide(function(d) {
		return circleSize(d.totaleSchendingen) + 2; //Ensures the circles don't go on top of each other, this force is different for each circle
	}));

onResize();

/* __________ LOADING DATA __________ */

d3.tsv("data/data.tsv", function(error, data) {

	data = d3.nest()
		.key(function(d) {
			return d.videoID; //Adds the dataset into objects in arrays
		})
		.entries(data)
		.map(function(d) {
			return {
				fragmenten: d.values //Change the name from 'values' to 'fragmenten'
			};
		});

	data.forEach(function(d) { //Adds a 'totaleSchendingen' property to the video object
		d.totaleSchendingen = 0;
		d.totaleEvents = 0;

		for (var i = 0; i < d.fragmenten.length; i++) {
			d.status = d.fragmenten[i].status;
			d.titel = d.fragmenten[i].titel;
			d.totaleSchendingen += Number(d.fragmenten[i].totaleSchendingen);
			d.totaleEvents += Number(d.fragmenten[i].totaleEvents);
		}
	});

	var circles = svg.selectAll(".bubble")
		.data(data)
		.enter().append("circle")
		.attr("class", "bubble")
		.attr("r", function(d) {
			return circleSize(d.totaleSchendingen);
		})
		.attr("fill", function(d) {
			if (d.status == "Normaal") {
				return colorNormal;
			} else if (d.status == "Aangepast") {
				return colorEdited;
			} else if (d.status == "Verwijderd") {
				return colorRemoved;
			} else if (d.status == "Inactief") {
				return colorInactive;
			}
		})
		.on("click", function(d) {
			circleClickEvent(this, d);
		});

	//Run a simulation on every circle (node)
	simulation.nodes(data)
		.on('tick', movingIn) //Run movingIn on every "tick" of the clock
		.on('end', function() {});

	/* __________ FUNCTIONS __________ */

	function movingIn() {
		circles
			.attr("cx", function(d) {
				return d.x;
			})

			.attr("cy", function(d) {
				return d.y;
			});
	}

	function circleClickEvent(_this, d) {

		circleClickedCheck = true;

		if (window.innerWidth < 500 && circleClickedCheck == true) {
			responsiveCheck = 5;
		} else {
			responsiveCheck = 2;
		}

		var circleIndex = d.index; //Index of clicked circle
		var circleTotaleEvents = d.totaleEvents; //Save the totaleSchendingen to another varible for later use

		if (d.status !== "Inactief" && d.status !== "Verwijderd") {

			//Trigger the scroll function so the circle moves back and forth
			document.querySelector('body').onscroll = function() {
				scroll(_this);
			};

			//Change the size of the clicked circle
			d3.select(_this)
				.on('click', null)
				.transition()
				.duration(1000)
				.ease(d3.easeCubicOut)
				.attr("r", function(d) {
					return circleSize(0);
				});

			//Place the clicked circle in the middle and hide the rest
			simulation
				.force("r", d3.forceRadial(function(d) {
					if (d.index == circleIndex) {
						return 0;
					} else {
						return 1000;
					}
				}))
				.alpha(0.4)
				.alphaDecay(0.01) //Makes sure the alpha doesn't decay too quickly so the clicked circle gets to the middle
				.restart();

			//Insert timeline
			d3.select(".svg-container").insert('div', 'svg')
				.data(data)
				.attr('class', 'line')
				.transition()
				.delay(850)
				.duration(1000)
				.style("height", function(d) {
					return (circleTotaleEvents * 300) + "px";
				});

			createEvents(circleTotaleEvents, d);

			//Insert backbutton
			d3.select(".svg-container").insert('button', 'svg')
				.text('Terug')
				.attr('class', 'back-button')
				.on('click', function(d) {

					circleClickedCheck = false;

					if (window.innerWidth < 500 && circleClickedCheck == true) {
						responsiveCheck = 5;
					} else {
						responsiveCheck = 2;
					}

					//Removes the function on scroll
					document.querySelector('body').onscroll = function() {};

					d3.selectAll(".bubble")
						.on("click", function(d) {
							circleClickEvent(this, d);
						})
						.transition()
						.duration(1000)
						.ease(d3.easeCubicOut)
						.attr("r", function(d) {
							return circleSize(d.totaleSchendingen);
						});

					d3.select(".line").remove(); //Remove timeline
					d3.select(".back-button").remove(); //Remove backbutton

					simulation
						.force("r", d3.forceRadial(function(d) {
							return 0;
						}))
						.alpha(0.25)
						.alphaDecay(0.015) //Makes sure the alpha doesn't decay too quickly so the clicked circle gets to the middle
						.restart();

					d3.select("g")
						.transition()
						.duration(1000)
						.ease(d3.easeCubicOut)
						.attr("transform", "translate(" + window.innerWidth / responsiveCheck + "," + height / 2 + ")"); //Place the <g> element in the middle

				});

			//Position the timeline accordingly
			d3.select("g")
				.transition()
				.duration(1000)
				.attr("transform", "translate(" + window.innerWidth / responsiveCheck + "," + height / 2 + ")"); //Place the <g> element in the middle

			if (responsiveCheck == 5) {
				d3.select(".svg-container")
					.style("width", "40%");
			}

		} else {
			shakeAnimation(_this);
		}
	} // End circleClickEvent

	function shakeAnimation(_this) {

		//Shake animation
		var horizontalPosition = Number(_this.getAttribute("cx")),
			shakeDuration = 80,
			shakeDeviation = 4,
			shakeEasing = d3.easeCubicOut;

		d3.select(_this)
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition + shakeDeviation;
			})
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition - shakeDeviation;
			})
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition + shakeDeviation;
			})
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition - shakeDeviation;
			})
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition + shakeDeviation;
			})
			.transition()
			.duration(shakeDuration)
			.ease(shakeEasing)
			.attr("cx", function(d) {
				return horizontalPosition;
			});
	}

	function scroll(_this, d) {

		if (window.pageYOffset >= 0 && window.pageYOffset <= 5100) {
			var circleWiggle;
			circleWiggle = (window.innerWidth / responsiveCheck) + circleTimelinePosition(window.pageYOffset);
			d3.select("g")
				.attr("transform", "translate(" + circleWiggle + "," + height / 2 + ")"); //Wiggle the g element back and forth
		}

		if (window.pageYOffset >= 300 && popupCheck == false) {
			return createEventPopup(_this, d);
		}

		d3.select(_this)
			.transition()
			.duration(200)
			.ease(d3.easeCubicOut)
			.attr("r", function() {
				if (window.pageYOffset < 300) {
					return circleSize(0);
				} else if (window.pageYOffset >= 300 && window.pageYOffset < 600) {
					return circleSize(1);
				} else if (window.pageYOffset >= 600 && window.pageYOffset < 900) {
					return circleSize(2);
				} else if (window.pageYOffset >= 900 && window.pageYOffset < 1200) {
					return circleSize(3);
				} else if (window.pageYOffset >= 1200 && window.pageYOffset < 1500) {
					return circleSize(4);
				} else if (window.pageYOffset >= 1500 && window.pageYOffset < 1800) {
					return circleSize(5);
				} else if (window.pageYOffset >= 1800 && window.pageYOffset < 2100) {
					return circleSize(6);
				} else if (window.pageYOffset >= 2100 && window.pageYOffset < 2400) {
					return circleSize(7);
				} else if (window.pageYOffset >= 2400) {
					return circleSize(8);
				}
			});
	}

	// create div elements on the timeline at the event points
	function createEvents(circleTotaleEvents, d) {

		var selectedFragment = 0;
		var selectedSchending = 0;

		for (var i = 0; i < circleTotaleEvents; i++) {
			//An array to loop through all the 'schendingen'
			var schendingenIndex = [d.fragmenten[selectedFragment].eersteSchendingCategorie, d.fragmenten[selectedFragment].tweedeSchendingCategorie, d.fragmenten[selectedFragment].derdeSchendingCategorie, d.fragmenten[selectedFragment].vierdeSchendingCategorie, d.fragmenten[selectedFragment].vijfdeSchendingCategorie, d.fragmenten[selectedFragment].zesdeSchendingCategorie];

			var eventDiv = document.createElement("div"); //Create a div for the events

			eventDiv.setAttribute("class", "line__event line__event--hidden line__event--" + schendingenIndex[selectedSchending]);

			selectedSchending++;

			if (schendingenIndex[selectedSchending] == undefined ) {
				selectedFragment++;
				selectedSchending = 0;
			}

			eventDiv.style.cssText = "top: " + ((i * 300 + 300) + (window.innerHeight / 2 - 20)) + "px; left:" + (window.innerWidth / responsiveCheck - 20)+ "px;"; //Style the eventDiv
			document.querySelector(".line").appendChild(eventDiv); //Add the eventDiv's to .line
		}

		setTimeout(function() {triggerEventAnimation();}, 1000);
		function triggerEventAnimation (){
			var events = document.querySelectorAll(".line__event");
			for (i = 0; i < events.length; i++) {
				events[i].classList.toggle("line__event--hidden");
			}
		}
	}

	function createEventPopup(_this,d) {
		popupCheck = true;
		var popup = document.createElement("p"); //Create a div for the events'
		document.querySelector(".line__event").appendChild(popup); //Add the eventDiv's to .line
		popup.innerHTML = "Scroll de tijdlijn om het verloop van de video te bekijken.";
		console.log('yo');

	}
});

function onResize() {

	if (window.innerWidth < 500 && circleClickedCheck == true) {
		responsiveCheck = 5;
	} else {
		responsiveCheck = 2;
	}

	if (responsiveCheck == 5) {
		d3.select(".svg-container")
			.style("width", "40%");
	} else {
		d3.select(".svg-container")
			.style("width", "100%");
	}

	d3.select("svg")
		.attr("width", window.innerWidth);

	d3.select("g")
		.attr("transform", "translate(" + window.innerWidth / responsiveCheck + "," + height / 2 + ")"); //Place the <g> element in the middle

	var events = document.querySelectorAll(".line__event");
	for (var i = 0; i < events.length; i++) {
		events[i].style.cssText = "top: " + ((i * 300 + 300) + (window.innerHeight / 2 - 20)) + "px; left:" + (window.innerWidth / responsiveCheck - 20)+ "px;";
	}
}
