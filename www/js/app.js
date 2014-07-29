// cordova emulate ios --target="iPad"
// **, HospitalDataProcessor, HospitalAppCache*/
// count-to="{{procedureStat.frequency | number:0}}" value="0" duration="3"

window.addEventListener('load', function() {
	FastClick.attach(document.body);
}, false);

Chart.defaults.global.showScale = false;
Chart.defaults.global.showTooltips = false;

var HApp = {
		
	DATA_URL: "http://localhost:8111/",

	substringMatcher : function(strs) {

		return function findMatches(q, cb) {
			var matches, substrRegex;

			// an array that will be populated with substring matches
			matches = [];

			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
					// the typeahead jQuery plugin expects suggestions to a
					// JavaScript object, refer to typeahead docs for more info
					matches.push({
						value : str
					});
				}
			});

			cb(matches);
		};
	}
};

angular.module('HospitalDataApp', ['countTo']).controller('HospitalDataController', ['$scope', '$compile', '$http', function($scope, $compile, $http) {

	// clear search on click
	$(".search-input").click(function() {
		$(this).val("");
	});

	HApp.cache = function(data) {

		HApp.openDb().transaction(function(tx) {
			tx.executeSql('DROP TABLE IF EXISTS CACHEDDATA');
			tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency INTEGER, frequencyForecast INTEGER, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');

			var count = 0;

			var dateOfCache = moment().format("YYYY[-]MM[-]DD");

			for ( var hospitalName in data) {

				data[hospitalName].forEach(function(record) {

					tx.executeSql('INSERT INTO CACHEDDATA (id, dateOfCache, hospitalName,trust,description,opcs,hrg,tariffNow,tariffForecast,frequency,frequencyForecast,revenue,revenueForecast,costOfConsumerablesNow,costOfConsumerablesForecast)' + 'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [count, dateOfCache, hospitalName, hospitalName, record.description, record.opcs, record.hrg, parseFloat(record.tariffNow), parseFloat(record.tariffForecast), parseInt(record.frequency), parseInt(record.frequencyForecast), parseFloat(record.revenue), parseFloat(record.revenueForecast), parseFloat(record.costOfConsumerablesNow), parseFloat(record.costOfConsumerablesForecast)]);
					count++;
				});
			}
		}, HApp.errorCB, function() {
		});
	};

	HApp.isDataCached = function(httpFetchCallback) {

		HApp.openDb().transaction(function(tx) {

			tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency INTEGER, frequencyForecast INTEGER, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');

			tx.executeSql('SELECT DISTINCT dateOfCache FROM CACHEDDATA', [], function(tx, results) {

				if (results.rows.length === 0) {
					httpFetchCallback();
				} else {
					for ( var i = 0; i < results.rows.length; i++) {

						var row = results.rows.item(i);

						if (row.dateOfCache === moment().format("YYYY[-]MM[-]DD")) {
							HApp.bindModelToView();
						} else {
							httpFetchCallback();
						}
						break;
					}
				}
			});
		});
	};

	HApp.lookupHospitalNames = function() {

		HApp.openDb().transaction(function(tx) {

			tx.executeSql('SELECT DISTINCT hospitalName FROM CACHEDDATA', [], function(tx, results) {

				var hospitalNames = [];

				for ( var i = 0; i < results.rows.length; i++) {
					hospitalNames.push(results.rows.item(i).hospitalName);
				}

				$('.typeahead').typeahead({
					hint : true,
					highlight : true,
					minLength : 1
				}, {
					name : 'hospitalNames',
					displayKey : 'value',
					source : HApp.substringMatcher(hospitalNames)
				}).on('typeahead:selected', function($e, datum) {
					toggleNav();
					HApp.bindModelToView(datum.value);
				});
			});
		});
	};

	HApp.openDb = function() {
		return window.openDatabase("HospitalData", "1.0", "HospitalData", 200000);
	};

	HApp.bindModelToView = function(hospitalNameSelected) {

		if (!hospitalNameSelected) {
			hospitalNameSelected = "Ealing";
		}

		HApp.openDb().transaction(function(tx) {

			tx.executeSql('SELECT * FROM CACHEDDATA where hospitalName = ? order by hospitalName', [hospitalNameSelected], function(tx, results) {

				var hospitalRows = [];

				for ( var i = 0; i < results.rows.length; i++) {
					hospitalRows.push(results.rows.item(i));
				}

				$scope.hospitalName = hospitalNameSelected;

				$scope.procedureStats = hospitalRows;

				HApp.lookupTotals(hospitalNameSelected, $scope);

				if (!HApp.searchInitialised) {
					HApp.lookupHospitalNames();
					HApp.searchInitialised = true;
				}

				$scope.$apply();

				HApp.resetSlider();

			}, HApp.errorCB);

		}, HApp.errorCB);
	};

	HApp.errorCB = function(err) {
		alert("Error processing SQL: " + err.message);
	};

	HApp.resetSlider = function() {
		if (HApp.slider) {
			HApp.slider.destroySlider();
			HApp.slider = null;
			$("#procedures-div").empty();
			$("#procedures-div").append($compile('<ng-include src="\'sliderLoop.html\'"></ng-include>')($scope));
			HApp.resetSlider();
		} else {
			setTimeout(function() {
				HApp.slider = $('.bxslider').bxSlider({
					pager : false
				});
			}, 700);
		}
	};

	HApp.lookupTotals = function(hospitalName, $scope) {

		HApp.openDb().transaction(function(tx) {

			tx.executeSql('SELECT SUM(frequency) as f, SUM(frequencyForecast) as ff, SUM(revenue) as r, SUM(revenueForecast) as rf, SUM(costOfConsumerablesNow) as ccn, SUM(costOfConsumerablesForecast) as ccf FROM CACHEDDATA where hospitalName = ?', [hospitalName], function(tx, results) {

				for ( var i = 0; i < results.rows.length; i++) {

					var row = results.rows.item(i);

					$scope.overallRevenue = row.r;
					$scope.overallRevenueForecast = row.rf;

					$scope.overallConsumerables = row.ccn;
					$scope.overallConsumerablesForecast = row.ccf;

					$scope.netRevenue = row.r - row.ccn;
					$scope.netRevenueForecast = row.rf - row.ccf;

					var canvas = document.getElementById("bar-canvas");
					var ctx = canvas.getContext("2d");
					if (HApp.barChart) {
						HApp.barChart.removeData();
					}
					HApp.barChart = new Chart(ctx).Bar({
						labels : [""],
						datasets : [{
							fillColor : "green",
							strokeColor : "rgba(220,220,220,0.8)",
							highlightFill : "green",
							highlightStroke : "rgba(220,220,220,1)",
							data : [$scope.netRevenue]
						}, {
							fillColor : "red",
							strokeColor : "rgba(220,220,220,0.8)",
							highlightFill : "red",
							highlightStroke : "rgba(220,220,220,1)",
							data : [$scope.netRevenueForecast]
						}]
					}, {
						responsive : true
					});

					$scope.totalNumberOfProcs = row.f;
					$scope.totalNumberOfProcsForecast = row.ff;

					$scope.upliftInIncome = $scope.netRevenueForecast - $scope.netRevenue;
					$scope.upliftInIncomePercentage = ($scope.upliftInIncome * 100) / $scope.netRevenue;

					$scope.$apply();

					$(".barmore").animate({
						width : (row.f * 100 / (row.ff + row.f)) + "%"
					}, 1500, function() {
						$(".barless").animate({
							width : (row.ff * 100 / (row.ff + row.f)) + "%"
						}, 1500, function() {
							// Animation complete.
						});
					});

					var canvas = document.getElementById("chart-area");
					var ctx = canvas.getContext("2d");

					if (HApp.pieChart) {
						HApp.pieChart.removeData();
					}

					HApp.pieChart = new Chart(ctx).Pie([{
						value : $scope.netRevenue,
						color : "green",
						label : "Current"
					}, {
						value : $scope.netRevenueForecast,
						color : "red",
						label : "Forecast"
					}]);
					
				}
			}, HApp.errorCB);
		}, HApp.errorCB);
	};

	HApp.isDataCached(function() {

		HApp.spinner = new Spinner().spin(document.getElementById('preview'));

		$http({
			method : 'GET',
			url : HApp.DATA_URL
		}).success(function(data, status, headers, config) {
			HApp.cache(data.data);
			HApp.bindModelToView();
			HApp.spinner.stop();
		}).error(function(data, status, headers, config) {
			HApp.spinner.stop();
			alert("We are currently unable to retrieve the data from the server, please try again later");
		});
	});
}]);
