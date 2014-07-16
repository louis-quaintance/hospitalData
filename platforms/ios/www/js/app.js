

//cordova emulate ios --target="iPad" 
//**, HospitalDataProcessor, HospitalAppCache*/


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

angular.module('HospitalDataApp', ['countTo']).controller('HospitalDataController', ['$scope', function($scope) {

    $scope.hospitalName = "Ealing";

    $scope.procedureStats = aModel.data.Ealing;

    $scope.overallRevenue = 100;
    $scope.overallRevenueForecast = 120;

    $scope.overallConsumerables = 200;
    $scope.overallConsumerablesForecast = 210;

    $scope.netRevenue = 800;
    $scope.netRevenueForecast = 900;

    $scope.upliftInIncome = 100;
    $scope.upliftInIncomePercentage = 10;

    setTimeout(function(){
            $('.bxslider').bxSlider({
                pager: false
            });
    }, 1500);

}]);
