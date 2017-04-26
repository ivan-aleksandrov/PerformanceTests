var http = require('http');
var sleep = require('system-sleep');
var keypress = require('keypress');

keypress(process.stdin);
process.stdin.on('keypress', function (ch, key) {
  if (key && key.name == 'i') {
	console.log();
	console.log('-------------------');
    console.log((counter) + ' successful requests.\r\nAverage response time: ' + takenSum/counter + ' ms');
	console.log('Min. response: ' + minResponse + ' ms');
	console.log('Max. response: ' + maxResponse + ' ms');
	console.log('-------------------');
	console.log();
  }
  if (key && key.ctrl && key.name == 'c') {
	console.log();
	console.log('-------------------');
    console.log((counter) + ' successful requests.\r\nAverage response time: ' + takenSum/counter + ' ms');
	console.log('Min. response: ' + minResponse + ' ms');
	console.log('Max. response: ' + maxResponse + ' ms');
	console.log('-------------------');
    process.exit(0) 
  }
});

process.stdin.setRawMode(true);
process.stdin.resume();

//////////\\\\\\\\\\
//CUSTOMIZABLE AREA\\

//select how many requests should be processed
var repeats = 10;
//select desired peak TPS
var tps = 500;
//select how many request templates are available
var rollDie = getRandomizer( 1, 1 );
//socket timeout in ms
var myTimeout = 1800000;
//UT5 server details
var requestParameters = {
	// host: "192.168.128.60",
	// port: "8009",
	host: "testapp1",
	port: "8010",
	path: "/rpc",
	method: "POST",
	headers: {
		"content-type": "application/json; charset=utf-8"
	},
};

//END OF CUSTOMIZABLE AREA\\
//////////\\\\\\\\\\

//counts if the responses equal the requests count
var counter = 0;
//number of errors
var counterFailed = 0;
//sum of response times
var takenSum = 0;
var minResponse = 0;
var maxResponse = 0;
//stopwatch for response times
var stopwatch = {};
for (var a = 1; a<=repeats; a++){

	stopwatch[a]={ "start": null, "stop": null };
}
//array that keeps the order of picking request templates
var randomArray = [];
for (var a = 0; a<repeats; a++){
	{
		randomArray[a] = 1;
	}
	// else if(a==1){
	// 	randomArray[a] = 2;
	// }
	// else if(a==2){
	// 	randomArray[a] = 3;
	// }
	// else if(a==3){
	// 	randomArray[a] = 4;
	// }
	// else if(a==4){
	// 	randomArray[a] = 5;
	// }
	//randomArray[a] = rollDie();
}
//delay between each request
// var msDelay = 1000/tps;
var msDelay = 5000;

for (var i = 1; i<=repeats; i++) {
	var requestBody = JSON.parse(require('fs').readFileSync('./requests/GK/'+randomArray[i-1]+'.txt', 'utf8'));
	//change id of every request so it can be unique
	requestBody.id = i;	
	var request = http.request( requestParameters, function ( response ) {		
		var responseBody = "";
		response.setEncoding( "utf8" );
		response.on( "data", function ( chunk ) {
			responseBody += chunk.toString();
		} );
		response.on( "end", function () {
			try {
				var resp = JSON.parse(responseBody);
				var responseId = resp.id;
				stopwatch[responseId].stop = new Date().getTime();
				// takenSum += (stopwatch[responseId].stop - stopwatch[responseId].start);
				if(resp.error){
					var resposeError = resp.error;
					console.log(responseId + " -> " + resp.error.message + " -> " + (stopwatch[responseId].stop - stopwatch[responseId].start) + ' ms');
					counterFailed++;
				}
				else{
					// stopwatch[responseId].stop = new Date().getTime();
					takenSum += (stopwatch[responseId].stop - stopwatch[responseId].start);
					if(minResponse == 0){
						minResponse = (stopwatch[responseId].stop - stopwatch[responseId].start);
					}
					else if(minResponse > (stopwatch[responseId].stop - stopwatch[responseId].start)){
						minResponse = (stopwatch[responseId].stop - stopwatch[responseId].start);
					}
					if(maxResponse == 0){
						maxResponse = (stopwatch[responseId].stop - stopwatch[responseId].start);
					}
					else if(maxResponse < (stopwatch[responseId].stop - stopwatch[responseId].start)){
						maxResponse = (stopwatch[responseId].stop - stopwatch[responseId].start);
					}
					
					console.log(responseId + ' processed for ' + (stopwatch[responseId].stop - stopwatch[responseId].start) + ' ms');
					counter++;
					// [responseId].stop - stopwatch[responseId].start) + ' ms');
				}
				require('fs').writeFile('./results/' + 'Response_id_' + responseId + '_'+ momentTime() +'.txt', responseBody + '\r\nTime taken: ' + '' + (stopwatch[responseId].stop - stopwatch[responseId].start) + ' ms');
				// counter++;
				if ((counter+counterFailed) === repeats){
					console.log('\r\n'+(repeats-counterFailed) + ' successful requests.\r\nAverage response time: ' + takenSum/(repeats-counterFailed) + ' ms');
					console.log('Min. response: ' + minResponse + ' ms');
					console.log('Max. response: ' + maxResponse + ' ms');
				}
			} catch ( error ) {
				console.log(error);
				require('fs').writeFile('./results/' + 'ERROR_Response_id_' + responseId + '_'+ momentTime() +'.txt', error);
				counterFailed++;
				if ((counter+counterFailed) === repeats){
					console.log((repeats-counterFailed) + ' successful requests.\r\nAverage response time: ' + takenSum/(repeats-counterFailed) + ' ms');
					console.log('Min. response: ' + minResponse + ' ms');
					console.log('Max. response: ' + maxResponse + ' ms');
				}
			}
			
		} );
	} );
	
	request.on('socket', function (socket) {
    
	socket.setTimeout(myTimeout);  
    socket.on('timeout', function() {
        request.abort();
    });
});
	request.on( "error", function ( error ) {
		console.log(error);
		require('fs').writeFile('./results/' + 'ERROR_' + JSON.parse(requestBody).id + '_' + momentTime() +'.txt', error + '\r\n' + requestBody);
		counterFailed++;
		if ((counter+counterFailed) === repeats){
			console.log((repeats-counterFailed) + ' successful requests.\r\nAverage response time: ' + takenSum/(repeats-counterFailed) + ' ms');
			console.log('Min. response: ' + minResponse + ' ms');
			console.log('Max. response: ' + maxResponse + ' ms');
		}
	} );
	goRequest(i);
}

//function that is sending the request
function goRequest(i){
	var requestId = requestBody.id;
	//parses it to string so it can be used
	requestBody = JSON.stringify(requestBody);
	request.write(requestBody);
	//starts stopwatch for current request
	stopwatch[i].start = new Date().getTime();
	console.log('Login Sent ' + requestId);
	require('fs').writeFile('./results/' + 'Request_id_' + requestId + '_' + momentTime() +'.txt', requestBody);
	request.end();
	//delay that is calculated by the desired tps
	sleep(msDelay);
}

//function that get current UTC time in readable format - yyyyMMddHHmmssfff
function momentTime(){
	var d = new Date();
	var ms='';
	var utcTimeReadable='';
	if(d.getUTCMilliseconds()<10){
			ms = '00'+d.getUTCMilliseconds();
		}
	else if((d.getUTCMilliseconds()>=10)&&(d.getUTCMilliseconds()<100)){
			ms='0'+d.getUTCMilliseconds();
		}
	else{
			ms=d.getUTCMilliseconds();
	}
	utcTimeReadable = d.getUTCFullYear()+''
		+((d.getUTCMonth()+1)<10?('0'+(d.getUTCMonth()+1)):(d.getUTCMonth()+1))+''
		+(d.getUTCDate()<10?('0'+d.getUTCDate()):d.getUTCDate())+''
		+(d.getUTCHours()<10?('0'+d.getUTCHours()):d.getUTCHours())+''
		+(d.getUTCMinutes()<10?('0'+d.getUTCMinutes()):d.getUTCMinutes())+''
		+(d.getUTCSeconds()<10?('0'+d.getUTCSeconds()):d.getUTCSeconds())+''+ms;
		return utcTimeReadable;
}

//function that picks a random number in a interval
function getRandomizer(bottom, top) {
    return function() {
        return Math.floor( Math.random() * ( 1 + top - bottom ) ) + bottom;
    }
}