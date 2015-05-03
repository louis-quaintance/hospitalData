// cordova emulate ios --target="iPad"
//cordova emulate ios --target="iPad-Air"


window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);

var HApp = {

    DATA_URL: "http://localhost:8111/",

    substringMatcher: function(strs) {

        return function findMatches(q, cb) {
            var matches, substrRegex;

            // an array that will be populated with substring matches
            matches = [];

            if (q === "*" || q === "" || q === " ") {
                $.each(strs, function(i, str) {
                    matches.push({
                        value: str
                    });
                });
                cb(matches);
                $(".typeahead").val("");
                return;
            }

            // regex used to determine if a string contains the substring `q`
            substrRegex = new RegExp(q, 'i');

            // iterate through the pool of strings and for any string that
            // contains the substring `q`, add it to the `matches` array
            $.each(strs, function(i, str) {
                if (substrRegex.test(str)) {
                    // the typeahead jQuery plugin expects suggestions to a
                    // JavaScript object, refer to typeahead docs for more info
                    matches.push({
                        value: str
                    });
                }
            });

            cb(matches);
        };
    }
};

angular.module('HospitalDataApp', ['countTo']).controller('HospitalDataController', ['$scope', '$compile', '$http', function($scope, $compile, $http) {

    HApp.cache = function(data) {

        HApp.openDb().transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS CACHEDDATA');
            tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency REAL, frequencyForecast REAL, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');

            var count = 0;

            var dateOfCache = moment().format("YYYY[-]MM[-]DD");

            for (var hospitalName in data) {

                data[hospitalName].forEach(function(record) {

                    tx.executeSql('INSERT INTO CACHEDDATA (id, dateOfCache, hospitalName,trust,description,opcs,hrg,tariffNow,tariffForecast,frequency,frequencyForecast,revenue,revenueForecast,costOfConsumerablesNow,costOfConsumerablesForecast)' + 'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [count, dateOfCache, hospitalName, hospitalName, record.description, record.opcs, record.hrg, parseFloat(record.tariffNow), parseFloat(record.tariffForecast), parseFloat(record.frequency), parseFloat(record.frequencyForecast), parseFloat(record.revenue), parseFloat(record.revenueForecast), parseFloat(record.costOfConsumerablesNow), parseFloat(record.costOfConsumerablesForecast)]);
                    count++;
                });
            }
        }, HApp.errorCB, function() {});
    };

    HApp.isDataCached = function() {

        HApp.openDb().transaction(function(tx) {

            tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency REAL, frequencyForecast REAL, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');

            tx.executeSql('SELECT DISTINCT dateOfCache FROM CACHEDDATA', [], function(tx, results) {

                if (results.rows.length === 0) {
                    HApp.loadDataFromServer();
                } else {
                    for (var i = 0; i < results.rows.length; i++) {

                        var row = results.rows.item(i);

                        if (row.dateOfCache === moment().format("YYYY[-]MM[-]DD")) {
                            HApp.bindModelToView();
                        } else {
                            HApp.loadDataFromServer();
                        }
                        break;
                    }
                }
            });
        });
    };

    HApp.lookupHospitalNames = function() {

        HApp.openDb().transaction(function(tx) {

            tx.executeSql('SELECT DISTINCT hospitalName FROM CACHEDDATA order by hospitalName asc', [], function(tx, results) {

                var hospitalNames = [];

                for (var i = 0; i < results.rows.length; i++) {
                    hospitalNames.push(results.rows.item(i).hospitalName);
                }

                $('.typeahead').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 0,
                }, {
                    name: 'hospitalNames',
                    displayKey: 'value',
                    source: HApp.substringMatcher(hospitalNames)
                }).on('typeahead:selected', function($e, datum) {
                    toggleNav();
                    if (HApp.hospitalCurrentlySelected !== datum.value) {
                        HApp.bindModelToView(datum.value);
                        HApp.hospitalCurrentlySelected = datum.value;
                    }
                });

                HApp.triggerSearchForAllHospitals();
            });
        });
    };

    HApp.triggerSearchForAllHospitals = function() {
        $(".typeahead").val("*").trigger("input");
    };

    HApp.openDb = function() {
        return window.openDatabase("HospitalData", "1.0", "HospitalData", 200000);
    };

    HApp.bindModelToView = function(hospitalNameSelected) {

        if (hospitalNameSelected) {

            HApp.lookupDataForHospital(hospitalNameSelected);

        } else {

            HApp.openDb().transaction(function(tx) {

                tx.executeSql('SELECT DISTINCT hospitalName FROM CACHEDDATA order by hospitalName', [], function(tx, results) {
                    // grab first hospital and init everything with that
                    var hospitalName = results.rows.item(0).hospitalName;
                    HApp.lookupDataForHospital(hospitalName);
                    HApp.hospitalCurrentlySelected = hospitalName;
                    return;

                }, HApp.errorCB);

            }, HApp.errorCB);
        }
    };

    HApp.lookupDataForHospital = function(hospitalNameSelected) {

        HApp.openDb().transaction(function(tx) {

            tx.executeSql('SELECT * FROM CACHEDDATA where hospitalName = ? order by hospitalName', [hospitalNameSelected], function(tx, results) {

                var hospitalRows = [];

                for (var i = 0; i < results.rows.length; i++) {
                    hospitalRows.push(results.rows.item(i));
                }

                $scope.hospitalName = hospitalNameSelected;

                $scope.procedureStats = hospitalRows;

                HApp.lookupTotals(hospitalNameSelected, $scope);

                if (!HApp.searchInitialised) {
                    HApp.lookupHospitalNames();
                    HApp.searchInitialised = true;
                }

                HApp.resetSlider();

            }, HApp.errorCB);

        }, HApp.errorCB);
    };

    $(window).bind("webkitAnimationEnd", function() {
        $(".number-field").css("-webkit-animation", "");
        $(".number-field").css("opacity", "1");
    });

    HApp.errorCB = function(err) {
        alert("Error processing SQL: " + err.message);
        return false;
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
                    pager: false
                });
            }, 700);
        }
    };

    HApp.lookupTotals = function(hospitalName, $scope) {

        HApp.openDb().transaction(function(tx) {

            tx.executeSql('SELECT SUM(frequency) as f, SUM(frequencyForecast) as ff, SUM(revenue) as r, SUM(revenueForecast) as rf, SUM(costOfConsumerablesNow) as ccn, SUM(costOfConsumerablesForecast) as ccf FROM CACHEDDATA where hospitalName = ?', [hospitalName], function(tx, results) {

                for (var i = 0; i < results.rows.length; i++) {

                    var row = results.rows.item(i);

                    $scope.overallRevenue = row.r;
                    $scope.overallRevenueForecast = row.rf;

                    $scope.overallConsumerables = row.ccn;
                    $scope.overallConsumerablesForecast = row.ccf;

                    $scope.netRevenue = row.r - row.ccn;
                    $scope.netRevenueForecast = row.rf - row.ccf;

                    var canvas = document.getElementById("bar-canvas");
                    var ctx = canvas.getContext("2d");

                    canvas.width = 180;
                    canvas.height = 200;

                    HApp.barChart = new Chart(ctx).Bar({
                        labels: [""],
                        datasets: [{
                            fillColor: "#223975",
                            strokeColor: "rgba(220,220,220,0)",
                            highlightFill: "#223975",
                            highlightStroke: "rgba(220,220,220,1)",
                            data: [$scope.netRevenue]
                        }, {
                            fillColor: "#d9af01",
                            strokeColor: "rgba(220,220,220,0)",
                            highlightFill: "#d9af01",
                            highlightStroke: "rgba(220,220,220,1)",
                            data: [$scope.netRevenueForecast]
                        }]
                    }, {
                        responsive: true
                    });

                    canvas.style.height = "180px";
                    canvas.style.width = "200px";

                    $scope.totalNumberOfProcs = row.f;
                    $scope.totalNumberOfProcsForecast = row.ff;

                    $scope.upliftInIncome = $scope.netRevenueForecast - $scope.netRevenue;
                    $scope.upliftInIncomePercentage = ($scope.upliftInIncome * 100) / $scope.netRevenue;

                    $scope.$apply();

                    var barMoreWidth = ((row.f * 100 / (row.ff + row.f)) * 0.85);
                    var barLessWidth = ((row.ff * 100 / (row.ff + row.f)) * 0.85);

                    $(".proc-number").css("left", (barMoreWidth + 2) + "%");
                    $(".proc-number-last").css("left", (barLessWidth + 2) + "%");

                    $(".barmore").animate({
                        width: barMoreWidth + "%"
                    }, 1500, function() {
                        $(".barless").animate({
                            width: barLessWidth + "%"
                        }, 1500, function() {});
                    });

                    var pieCanvas = document.getElementById("chart-area");
                    var pieCtx = pieCanvas.getContext("2d");

                    pieCanvas.width = 160;
                    pieCanvas.height = 120;

                    var nowRev = ($scope.netRevenue > 0) ? $scope.netRevenue : 0;
                    var forecastRev = ($scope.netRevenueForecast > 0) ? $scope.netRevenueForecast : 0;

                    var upliftPortionNow, upliftPortionForecast;

                    if ($scope.upliftInIncomePercentage === 0) {
                        upliftPortionNow = 1;
                        upliftPortionForecast = 1;
                    } else if ($scope.upliftInIncomePercentage > 0) {
                        upliftPortionNow = 1;
                        upliftPortionForecast = 1 + ($scope.upliftInIncomePercentage / 100);
                    } else {
                        upliftPortionNow = 1 + (($scope.upliftInIncomePercentage * -1) / 100);
                        upliftPortionForecast = 1;
                    }

                    HApp.pieChart = new Chart(pieCtx).Pie([{
                        value: nowRev,
                        color: "#223975",
                        label: "Current",
                    }, {
                        value: forecastRev,
                        color: "#d9af01",
                        label: "Forecast"
                    }]);

                    pieCanvas.style.width = "160px";
                    pieCanvas.style.height = "120px";

                    $(".number-field").css("-webkit-animation", "fade-in-figures 7s");
                }
            }, HApp.errorCB);
        }, HApp.errorCB);
    };

    HApp.init = function() {

        HApp.isDataCached();
    };

    HApp.serverLoadInProgress = false;

    HApp.loadDataFromServer = function() {

        if (HApp.serverLoadInProgress) {
            return;
        }

        HApp.serverLoadInProgress = true;

        HApp.spinner = new Spinner().spin(document.getElementById('preview'));

        $http({
                method: 'GET',
                url: "http://thehaemorrhoidcentre.co.uk/data.json"
            })
            .success(function(data, status, headers, config) {

                if (data.data) {
                    HApp.cache(data.data);
                    HApp.bindModelToView();
                    HApp.spinner.stop();
                    HApp.serverLoadInProgress = false;
                } else {
                    HApp.httpErrorHandler();
                }

            }).error(function(data, status, headers, config) {
                HApp.httpErrorHandler();
            });
    };

    HApp.init();

}]);

HApp.httpErrorHandler = function() {
    HApp.spinner.stop();
    alert("We are currently unable to retrieve the data from the server, please check your internet connection and click the refresh button in the top left hand corner or try again later");
};

$(".refresh").click(function() {
    HApp.loadDataFromServer();
});

$("#clear-wrapper").click(function() {
    if ($('.typeahead').val() !== HApp.hospitalCurrentlySelected) {
        $('.typeahead').val("");
        HApp.triggerSearchForAllHospitals();
    }
});