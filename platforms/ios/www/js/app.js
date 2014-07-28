window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);

//cordova emulate ios --target="iPad" 
//**, HospitalDataProcessor, HospitalAppCache*/
//count-to="{{procedureStat.frequency | number:0}}" value="0" duration="3"

angular.module('HospitalDataApp', ['countTo']).controller('HospitalDataController', ['$scope', '$http', function($scope, $http) {
	
	var spinner;
	
    function cache(data){

        function populateDB(tx) {
             tx.executeSql('DROP TABLE IF EXISTS CACHEDDATA');
             tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency INTEGER, frequencyForecast INTEGER, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');
             
             var count = 0;

             var dateOfCache = moment().format("YYYY[-]MM[-]DD");

             for(var hospitalName in data){

                data[hospitalName].forEach(function(record){
                   
                    tx.executeSql('INSERT INTO CACHEDDATA (id, dateOfCache, hospitalName,trust,description,opcs,hrg,tariffNow,tariffForecast,frequency,frequencyForecast,revenue,revenueForecast,costOfConsumerablesNow,costOfConsumerablesForecast)' + 
                        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [count, dateOfCache, hospitalName, hospitalName, record.description, record.opcs,record.hrg,parseFloat(record.tariffNow),
                        parseFloat(record.tariffForecast),parseInt(record.frequency),parseInt(record.frequencyForecast),
                        parseFloat(record.revenue),parseFloat(record.revenueForecast),
                        parseFloat(record.costOfConsumerablesNow),parseFloat(record.costOfConsumerablesForecast)]);

                    count++;

                });
             }
        }

        function errorCB(err) {
            alert("Error processing SQL: "+err.message);
        }

        function successCB() {
            
        }

        openDb().transaction(populateDB, errorCB, successCB);
    }

    function isDataCached(httpFetchCallback){

        openDb().transaction(function(tx){

                tx.executeSql('CREATE TABLE IF NOT EXISTS CACHEDDATA (id INTEGER PRIMARY KEY, dateOfCache TEXT, hospitalName TEXT, trust TEXT, description TEXT, opcs TEXT, hrg TEXT, tariffNow REAL, tariffForecast REAL, frequency INTEGER, frequencyForecast INTEGER, revenue REAL, revenueForecast REAL, costOfConsumerablesNow REAL, costOfConsumerablesForecast REAL)');
            
                tx.executeSql('SELECT DISTINCT dateOfCache FROM CACHEDDATA', [], function(tx, results){

                    if(results.rows.length === 0){
                        httpFetchCallback();
                    } else {
                        for(var i = 0; i < results.rows.length; i++){

                            var row = results.rows.item(i);
       
                            if(row.dateOfCache === moment().format("YYYY[-]MM[-]DD")){
                                bindModelToView();
                            } else {
                                httpFetchCallback();
                            }

                            break;
                        }
                    }                    
                });  
        });
    }

    function lookupHospitalNames(){

        openDb().transaction(function(tx){

            tx.executeSql('SELECT DISTINCT hospitalName FROM CACHEDDATA', [], function(tx, results){

                var hospitalNames = [];

                for(var i = 0; i < results.rows.length; i++){
                    hospitalNames.push(results.rows.item(i).hospitalName);
                }
                $('.typeahead').typeahead({
                        	  hint: true,
                        	  highlight: true,
                        	  minLength: 1
                        	},
                        	{
                        	  name: 'hospitalNames',
                        	  displayKey: 'value',
                        	  source: substringMatcher(hospitalNames)
               }).on('typeahead:selected', function($e, datum){
            	   	bindModelToView(datum.value);
	              }
	           );
            });
        });
    }

    function openDb(){
        return window.openDatabase("HospitalData", "1.0", "HospitalData", 200000);
    }

    function bindModelToView(hospitalNameSelected){

        var querySuccess = function(tx, results){
        	
            var hospitalName;
            if(hospitalNameSelected){
            	hospitalName = hospitalNameSelected;
            } else {
            	hospitalName = results.rows.item(0).hospitalName;  
            }

            var hospitalRows = [];

            for(var i = 0; i < results.rows.length; i++){

                var row = results.rows.item(i);

                if(row.hospitalName != hospitalName){
                    break;
                }
                hospitalRows.push(row);
            }

            $scope.hospitalName = hospitalName;

            $scope.procedureStats = hospitalRows;
                    
            lookupTotals(hospitalName, $scope);

            lookupHospitalNames();

            $scope.$apply();

            resetSlider();  
        };       

        function queryDB(tx){
            tx.executeSql('SELECT * FROM CACHEDDATA order by hospitalName', [], querySuccess, errorCB);
        }

        openDb().transaction(queryDB, errorCB);
    }

    function errorCB(err) {
            alert("Error processing SQL: " + err.message);
        }

    function resetSlider(){
            setTimeout(function(){
                        $('.bxslider').bxSlider({
                            pager: false
                        });
                }, 1500);
        }

    function lookupTotals(hospitalName, $scope){

        openDb().transaction(function(tx){

            tx.executeSql('SELECT SUM(frequency) as f, SUM(frequencyForecast) as ff, SUM(revenue) as r, SUM(revenueForecast) as rf, SUM(costOfConsumerablesNow) as ccn, SUM(costOfConsumerablesForecast) as ccf FROM CACHEDDATA where hospitalName = ?', [hospitalName], function(tx, results){

                for(var i = 0; i < results.rows.length; i++){

                    var row = results.rows.item(i);

                    $scope.overallRevenue = row.r;
                    $scope.overallRevenueForecast = row.rf;

                    $scope.overallConsumerables = row.ccn;
                    $scope.overallConsumerablesForecast = row.ccf;

                    $scope.netRevenue = row.r - row.ccn;
                    $scope.netRevenueForecast = row.rf - row.ccf;

                    $scope.totalNumberOfProcs = row.f;
                    $scope.totalNumberOfProcsForecast = row.ff;

                    $scope.upliftInIncome = $scope.netRevenueForecast - $scope.netRevenue
                    $scope.upliftInIncomePercentage = ($scope.upliftInIncome * 100) / $scope.netRevenue;

                    $scope.$apply();

                    $( ".barmore" ).animate({
                        width: (row.f * 100 / (row.ff + row.f)) + "%"
                    }, 1500, function() {
                          $( ".barless" ).animate({
                            width: (row.ff * 100 / (row.ff + row.f)) + "%"
                          }, 1500, function() {
                            // Animation complete.
                          });
                    });                  
                }
            }, errorCB);
        }, errorCB);
    }



    isDataCached(function(){  
    	
    	spinner = new Spinner().spin(document.getElementById('preview'));
    	
        $http({method: 'GET', url: 'http://localhost:8111/'}).
            success(function(data, status, headers, config) {
            	cache(data.data);
                bindModelToView();
                spinner.stop();
            }).
            error(function(data, status, headers, config) {
            	spinner.stop();
            	alert("We are currently unable to retrieve the data from the server, please try again later");
            }
        );
    });
}]);


var aModel = {
    "data" : {
        "Ealing" : [{
            "description" : "Haemorrhoidectomy",
            "opcs" : "H51.1",
            "hrg" : "FZ22A",
            "tariffNow" : "£854.00",
            "tariffForecast" : "£854.00",
            "frequency" : "38",
            "frequencyForecast" : "9.5",
            "revenue" : "£32",
            "revenueForecast" : "452.00",
            "costOfConsumerablesNow" : "£8",
            "costOfConsumerablesForecast" : "113.00"
        }, {
            "description" : "Stapled Haemorrhoidectomy",
            "opcs" : "H51.3",
            "hrg" : "FZ22A",
            "tariffNow" : "£854.00",
            "tariffForecast" : "£854.00",
            "frequency" : "0",
            "frequencyForecast" : "0",
            "revenue" : "£0.00",
            "revenueForecast" : "£0.00",
            "costOfConsumerablesNow" : "0",
            "costOfConsumerablesForecast" : "0"
        }, {
            "description" : "Rubberband Ligation of Haemorrhoids",
            "opcs" : "H52.4",
            "hrg" : "FZ23Z",
            "tariffNow" : "£611.00",
            "tariffForecast" : "£611.00",
            "frequency" : "21",
            "frequencyForecast" : "5.25",
            "revenue" : "£12",
            "revenueForecast" : "831.00",
            "costOfConsumerablesNow" : "£3",
            "costOfConsumerablesForecast" : "207.75"
        }, {
            "description" : "Haemorrhoidal Artery Ligation",
            "opcs" : "L70.3",
            "hrg" : "QZ05a",
            "tariffNow" : "£1",
            "tariffForecast" : "539.00",
            "frequency" : "£1",
            "frequencyForecast" : "539.00",
            "revenue" : "1",
            "revenueForecast" : "45.25",
            "costOfConsumerablesNow" : "£1",
            "costOfConsumerablesForecast" : "539.00"
        }],
        "East Kent" : [{
            "description" : "Haemorrhoidectomy",
            "opcs" : "H51.1",
            "hrg" : "FZ22A",
            "tariffNow" : "£854.00",
            "tariffForecast" : "£854.00",
            "frequency" : "82",
            "frequencyForecast" : "20.5",
            "revenue" : "£70",
            "revenueForecast" : "028.00",
            "costOfConsumerablesNow" : "£17",
            "costOfConsumerablesForecast" : "507.00"
        }, {
            "description" : "Stapled Haemorrhoidectomy",
            "opcs" : "H51.3",
            "hrg" : "FZ22A",
            "tariffNow" : "£854.00",
            "tariffForecast" : "£854.00",
            "frequency" : "20",
            "frequencyForecast" : "5",
            "revenue" : "£17",
            "revenueForecast" : "080.00",
            "costOfConsumerablesNow" : "£4",
            "costOfConsumerablesForecast" : "270.00"
        }, {
            "description" : "Rubberband Ligation of Haemorrhoids",
            "opcs" : "H52.4",
            "hrg" : "FZ23Z",
            "tariffNow" : "£611.00",
            "tariffForecast" : "£611.00",
            "frequency" : "0",
            "frequencyForecast" : "0",
            "revenue" : "£0.00",
            "revenueForecast" : "£0.00",
            "costOfConsumerablesNow" : "0",
            "costOfConsumerablesForecast" : "0"
        }, {
            "description" : "Haemorrhoidal Artery Ligation",
            "opcs" : "L70.3",
            "hrg" : "QZ05a",
            "tariffNow" : "£1",
            "tariffForecast" : "539.00",
            "frequency" : "£1",
            "frequencyForecast" : "539.00",
            "revenue" : "4",
            "revenueForecast" : "80.5",
            "costOfConsumerablesNow" : "£6",
            "costOfConsumerablesForecast" : "156.00"
        }]
    }
};

var substringMatcher = function(strs) {
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
	        matches.push({ value: str });
	      }
	    });
	 
	    cb(matches);
	  };
	};
