var myRootRef = new Firebase('https://ilecture.firebaseio.com/') , timeVar , initCount = 0;
var update_online_stu = {time : 5000};	//Timestamp update interval
var offline_limit = {time : 10000};		//Delete students who are offline(not online for 10s

// Check if Auth code is correct
function checkAuth(tInfo, auth){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.once('value', function(data){
		console.log(data.val());
		if( data.val() !== null ){
			if( data.val().code === tInfo['roomCode'] && data.val().auth === auth ){
				tInfo.params = 'room_id='+tInfo['roomId']+'&code='+tInfo['roomCode']+'&auth='+auth;
				localStorage.setItem('tInfo', JSON.stringify(tInfo));
				// Init DB info
				init(tInfo);
			}else{
				alert('參數錯誤。');
				window.location.replace('../error/index.html');
			}
		}else{
			alert('找不到教室。');
			window.location.replace('../error/index.html');
		}
	});
}

// Switch showing or not showing the result
function switch_display_result(flag){
	var tInfo = JSON.parse(localStorage.tInfo) || null;
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	if(flag == "not_show"){
		roomRef.child('show_result').set(flag);
	}else{
		roomRef.child('show_result').set(flag);
	}
}

// Monitoring data in FireBase
function bindRoom(tInfo){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.on('child_changed', function(snapshot, prevChildName){
		//console.log(snapshot.name());
		if( snapshot.name() === 'mood' ){  // Mood update
			setMoodInfo( $('#roomInfo nav'), snapshot.val() );
		}else if( snapshot.name() === 'speed' ){  // Speed update
			setSpeedInfo( $('#roomInfo nav'), snapshot.val() );
		}else if( snapshot.name() === 'messages' ){  // Messages update
			addMessages( tInfo, JSON.parse(snapshot.val()) );
		}else if( snapshot.name().indexOf('_') === 1 ){  // Question update
			var tInfo = JSON.parse(localStorage.tInfo), qId = tInfo.question;
			if( snapshot.name() === qId ){  // Get vote result
				console.log(snapshot.val());
				localStorage.setItem('tlatestQuesInfo', snapshot.val());
				// Later use showResult: showResult({});
				setResult(snapshot.val());
			}
		}else if( snapshot.name() === 'question' ){ // Teacher asked question
			console.log(snapshot.val());
			var tInfo = JSON.parse(localStorage.tInfo);
			if( tInfo.question !== snapshot.val() ){ // there is a new question
				tInfo.question = snapshot.val();
				localStorage.setItem('tInfo', JSON.stringify(tInfo));
				roomRef.child(snapshot.val()).once('value', function(data){
					localStorage.setItem('tlatestQuesInfo', data.val());
					setResult(data.val());
				});
			}
			getHistoryQues(tInfo);
		}else if ( snapshot.name() === 'answer' ) {
			showResult(snapshot.val());
		}
	});
}

// Update the list of Student
function updateOnline_s(){ 
	var _GET = getUrlVars(),
	roomId = _GET['room_id'] || null,
	roomCode = _GET['code'] || null,
	roomAuth = _GET['auth'],
	tInfo = JSON.parse(localStorage.tInfo) || null,
	num = 0;
	if( roomId === null || roomCode === null || roomAuth === null ){
		alert('參數缺失。');
		localStorage.removeItem('tInfo');
		localStorage.removeItem('tlatestQuesInfo');
		window.location.replace('../error/index.html');
		return 0;
	}
	if( tInfo.roomCode !== roomCode || tInfo.roomId !== roomId ){
		alert('一個瀏覽器，只能夠同時使用一間教室。');
		window.location.replace('../error/index.html');
		return 0;
	}
	var online_sRef = myRootRef.child('rooms').child(roomId).child('online_s');
	online_sRef.once('value', function(data){
		var ary = data.val() || null, num = 0, time;
		var now_time = myRootRef.child('rooms').child(roomId).child('Time');
		now_time.set(Firebase.ServerValue.TIMESTAMP);
		now_time.once('value',function(data){
			time = data.val();
		});
		if( ary !== null ){  
			for( var i in ary ){
				// Delete students who are offline(not online for 10s)
				if( time - ary[i]  > offline_limit.time ){
					// remove offline students
					online_sRef.child(i).remove();
				}
			}
		}
	});
		
	online_sRef.once('value', function(data){
		var ary=data.val() || null;
		for(var i in ary){
				num+=1;
			}
		$('#show-onlineNum').text(num);
		var tInfo = JSON.parse(localStorage.tInfo);
		tInfo.online_s = num;
		localStorage.setItem('tInfo', JSON.stringify(tInfo));
		initIsCompleted();
	});

	timeVar = setTimeout(function(){updateOnline_s();}, update_online_stu.time);
}

// Init DB infos
function init(tInfo){
	updateOnline_s();
	bindRoom(tInfo);
	getLog(tInfo);
	getLatestQuestion(tInfo);
	getHistoryQues(tInfo);
}

// get the newest question
function getLatestQuestion(tInfo){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.child('question').once('value', function(data1){
		console.log(data1.val());
		var tInfo = JSON.parse(localStorage.tInfo);
		tInfo.question = data1.val();
		localStorage.setItem('tInfo', JSON.stringify(tInfo));
		if( data1.val() !== 'null' ){ // this room have questioned ever
			roomRef.child(data1.val()).once('value', function(data2){ // get the newest question's info
				console.log( data2.val() );
				localStorage.setItem('tlatestQuesInfo', data2.val());
				setResult(data2.val());
				$('#roomResult').removeClass('null');
				initIsCompleted();
			});
		}else{
			localStorage.setItem('tlatestQuesInfo', JSON.stringify(''));
			initIsCompleted();
		}
	});
}

// Init all EasyPieChart
function initPieChart(roomId, _){
	var roomRef = myRootRef.child('rooms').child(roomId), $a = $('#roomInfo nav'), mode = (_.w>980)?'desktop':'mobile', size = (_.w>980)?104:75, lineWidth = (_.w>980)?15:10, barColor = (_.w>980)?'rgb(231,76,60)':'rgb(241,196,15)', trackColor = (_.w>980)?'rgba(231,76,60,.3)':'rgba(255,255,255,.2)';
	$a.find('div.chart-canvas').addClass(mode).easyPieChart({
		lineWidth: lineWidth,
		size: size,
		barColor: barColor,
		trackColor: trackColor,
		animate: 1500,
		scaleColor: !1,
		lineCap: 'square'
	});
	roomRef.child('mood').once('value', function(data){ setMoodInfo($a, data.val()); });
	roomRef.child('speed').once('value', function(data){ setSpeedInfo($a, data.val()); });
}

// Set Mood's percentage
function setMoodInfo($a, a){
	var scores = parseInt(a.split('_')[0]), times = parseInt(a.split('_')[1]), percent = ( times === 0 ) ? 0 : Math.floor(100*((scores+3*times))/(6*times));
	$a.find('div[pieChart=mood]').children('div.chart-number').text(percent+'%').end().children('div.chart-canvas').attr('data-percent', percent).data('easyPieChart').update(percent);
}

// Set Speed's percentage
function setSpeedInfo($a, a){
	var scores = parseInt(a.split('_')[0]), times = parseInt(a.split('_')[1]), percent = ( times === 0 ) ? 0 : Math.floor(100*((scores+3*times))/(6*times));
	$a.find('div[pieChart=speed]').children('div.chart-number').text(percent+'%').end().children('div.chart-canvas').attr('data-percent', percent).data('easyPieChart').update(percent);
}

// Get Message's logs
function getLog(tInfo){
	var messagesRef = myRootRef.child('rooms').child(tInfo['roomId']).child('messages');
	messagesRef.once('value', function( data ){
		var ary = JSON.parse(data.val()) || null, tLog = [];
		if( ary !== null && ary.length > 0 ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				tLog.unshift(ary[i]);
			}
			console.log(tLog);
			showLogs(tLog, tInfo);
		}
		initIsCompleted();
	});
}

function getHistoryQues(tInfo){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	var QuesAry = {}, ResultAry = [];
	roomRef.once('value', function(snapshot){
		for(var i in snapshot.val()){
			if ( i[0] === 'q' && i[1] === '_' ) {
				QuesAry[i] = {};
				QuesAry[i]['num'] = parseInt(JSON.parse(snapshot.val()[i])['num']);
				QuesAry[i]['type'] = JSON.parse(snapshot.val()[i])['type'];
				QuesAry[i]['title'] = JSON.parse(snapshot.val()[i])['title'];
			}
		}
		if ( !QuesAry ) {
			return;
		}
		roomRef.child('answer').once('value', function(result){
			// i means question, QuesAry[i] means numbers of option, j means student id
			for(var i in QuesAry){
				var A_num = 0; // The number of students who answered the question
				for ( var a = 0; a < QuesAry[i]['num']; a++ ) {
					ResultAry[a] = 0;
				}	
				for(var j in result.val()){
					if(result.val()[j][i]){
						A_num++;
						for( var k in result.val()[j][i]){
							ResultAry[result.val()[j][i][k]]++;
						}
					}
				}
				addQLog(i, QuesAry[i], A_num, ResultAry);
			}
		});
	});
}

// Get question and sent to FireBase
function createQuestion(e, title, tInfo, num){
	$('body').addClass('blur');
	var o_ques = {
		title : title,
		num : num,
		type : $(e).parents('#roomQues').attr('_type'),
		count: 0,
		s : [],
		answer : []
	}, qId = 'q_'+timestamp.get().num;
	console.log(o_ques.answer);
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']), json_ques = JSON.stringify(o_ques);
	roomRef.child(qId).set(json_ques, function(error){
		if(error){
			alert('Synchronization failed');
			$('body').removeClass('blur');
		}else{
			roomRef.child('question').set(qId, function(error){
				if(error){
					alert('Synchronization failed');
					$('body').removeClass('blur');
				}else{
					tInfo.question = qId;
					localStorage.setItem('tInfo', JSON.stringify(tInfo));
					localStorage.setItem('tlatestQuesInfo', json_ques);
					$('body').removeClass('blur');
					setResult(json_ques);
					$('#navigation').find('section.mobile > div[_nav=roomResult]').trigger('click');
				}
			});
		}
	});
}

// Send the text of teacher's reply
function sendText(e, tInfo, text){
	$('body').addClass('blur');
	var messagesRef = myRootRef.child('rooms').child(tInfo['roomId']).child('messages');
	messagesRef.once('value', function( data ){
		var ary = JSON.parse(data.val()) || null, o_send = {}, time = timestamp.get().read;
		o_send['teacher'] = 'text_'+time+'_'+text;
		if( ary === null ){
			ary = [];
			ary.push(o_send);
		}else{
			ary.unshift(o_send);
		}
		console.log(ary);
		messagesRef.set(JSON.stringify(ary), function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				$('body').removeClass('blur');
				$(e).siblings('div.input').children().val('');
			}
		});
	});
}

// If asynchronous info in init() init complete => initCount = -1
function initIsCompleted(){
	if( initCount !== -1 ){
		console.log('initCount -> '+initCount);
		initCount++;
		if( initCount === 3 ){
			// init complete
			initCount = -1;
			$('body').removeClass('blur');
		}
	}
}
