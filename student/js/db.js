var myRootRef = new Firebase('https://ilecture.firebaseio.com/'), timeVar, initCount = 0;
var show_result_flag = 0;

// Check if room is correct
function checkRoom(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.once('value', function(data){
		console.log(data.val());
		if( data.val() !== null ){
			if( data.val().code === sInfo['roomCode'] ){
				// Init DB infos
			init(sInfo);
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

// Monitorting infos of the class in FireBase
function bindRoom(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.on('child_changed', function(snapshot, prevChildName){
		if( snapshot.name() === 'question' ){ // Teacher asked a question
			console.log(snapshot.val());
			var sInfo = JSON.parse(localStorage.sInfo);
			sInfo.question = snapshot.val();
			localStorage.setItem('sInfo', JSON.stringify(sInfo));
			roomRef.child(snapshot.val()).once('value', function(data){
				localStorage.setItem('slatestQuesInfo', data.val());
				setQuestion(data.val());
				if(show_result_flag){
					setResult(data.val());
					// Show #roomQues page
					$('#navigation').find('div.item.active').removeClass('active').end().find('[_nav=roomQues]').addClass('active');
					$('#container').children().children('section.active').removeClass('active').end().children('#roomQues').addClass('active');
				}
			});
		}else if( snapshot.name() === 'messages' ){  // Messages update
			var message = JSON.parse(snapshot.val());
			var $a = $('#show-message');
			if(message[0]['teacher']){
				$a.append(getMessagesHtml('Text', message[0]['teacher'].substr(25), message[0]['teacher'].split('_')[1], 'teacher'));
			}
			// scrolling to the bottom
			var $b = $('#roomMessage').children('section');
			$b.animate({scrollTop: $b.prop('scrollHeight')}, 500);
		}else if( snapshot.name() === 'show_result' ){ //switch show or not show result
			if( snapshot.val()== "show" ){
				roomRef.child("answer").once('value',function(data){
					showResult(data.val());
				});
				show_result_flag = 1 ;
			}else{
				$("#roomResult>div>nav>div:eq(1)").replaceWith("<div class=\"item\"><div class=\"left\">未設定題描述</div><div class=\"type\">從未發問</div><div class=\"chart\"><div><canvas id=\"barCanvas\"></canvas></div></div></div>");
				show_result_flag = 0 ;
			}
		}else if( snapshot.name().indexOf('_') === 1 ){  // Question update
			var sInfo = JSON.parse(localStorage.sInfo), qId = sInfo.question;
			if( snapshot.name() === qId ){  // Get vote result
				console.log(snapshot.val());
				localStorage.setItem('slatestQuesInfo', snapshot.val());
				if(show_result_flag){
					setResult(snapshot.val());
				}
			}
		}else if( snapshot.name() === 'answer' ){
			if ( show_result_flag === 1  ) {
				showResult(snapshot.val());
			}
		}
	});
}

// Update the online status
function updateState(sInfo){
	var _GET = getUrlVars(),
	roomId = _GET['room_id'] || null,
	roomCode = _GET['code'] || null,
	sInfo = JSON.parse(localStorage.sInfo) || null,
	num = 0;
	if( roomId === null || roomCode === null ){
		alert('參數缺失。');
		localStorage.removeItem('sInfo');
		localStorage.removeItem('slatestQuesInfo');
		window.location.replace('../error/index.html');
		return 0;
	}
	if( sInfo.roomCode !== roomCode || sInfo.roomId !== roomId ){
		alert('一個瀏覽器，只能夠同時使用一間教室。');
		window.location.replace('../error/index.html');
		return 0;
	}
	var online_sRef = myRootRef.child('rooms').child(roomId).child('online_s');
	var o_state={};
	o_state[sInfo['sId']]=Firebase.ServerValue.TIMESTAMP;
	online_sRef.update(o_state);

	initIsCompleted();
	// update once per 5 second
	timeVar = setTimeout(function(){ updateState(JSON.parse(localStorage.sInfo)); }, 5*1000);
}


// Send Mood
function sendMood(e, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('messages').once('value', function(data1){
		var ary = JSON.parse(data1.val()) || null, o_send = {}, count = -1, time = timestamp.get().read, oldScores = 0, nowScores = parseInt($(e).attr('_mood')), newTimes = 1;
		o_send[sInfo['sId']] = 'mood_'+time+'_'+nowScores;
		if( ary !== null ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				// Find is there any mood have been sent,use unshift to rewrite, count is flag
				if( sInfo['sId'] in ary[i] ){
					console.log( ary[i][sInfo['sId']] );
					if( ary[i][sInfo['sId']].split('_')[0] === 'mood' ){
						oldScores = parseInt(ary[i][sInfo['sId']].split('_')[2]);
						newTimes = 0;
						for( var j=i; j>0; j-- ){
							ary[j] = ary[j-1];
						}
						ary[0] = o_send;
						count = 1;
						break;
					}
				}
			}
			if( count < 0 ){
				ary.unshift(o_send);
			}
		}else{
			ary = [];
			ary.push(o_send);
		}
		console.log( ary );
		roomRef.child('mood').once('value', function(data2){
		roomRef.child('messages').set(JSON.stringify(ary), function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				// scores : students' scores never overlap, times : all students sent Speed times
				var scores = parseInt(data2.val().split('_')[0]) - oldScores + nowScores, times = parseInt(data2.val().split('_')[1]) + newTimes;
				roomRef.child('mood').set(scores+'_'+times, function(error){
					if(error){
						alert('Synchronization failed');
						$('body').removeClass('blur');
					}else{
						$('body').removeClass('blur');
						addMessages('Mood', e, nowScores, time, sInfo['sId']);
					}
				});
			}
		});
		});
	});
}

// Send Speed
function sendSpeed(e, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('messages').once('value', function(data1){
		var ary = JSON.parse(data1.val()) || null, o_send = {}, count = -1, time = timestamp.get().read, oldScores = 0, nowScores = parseInt($(e).attr('_speed')), newTimes = 1;
		o_send[sInfo['sId']] = 'speed_'+time+'_'+nowScores;
		if( ary !== null ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				// Find is there any speed have been sent,use unshift to rewrite, count is flag
				if( sInfo['sId'] in ary[i] ){
					console.log( ary[i][sInfo['sId']] );
					if( ary[i][sInfo['sId']].split('_')[0] === 'speed' ){
						oldScores = parseInt(ary[i][sInfo['sId']].split('_')[2]);
						newTimes = 0;
						for( var j=i; j>0; j-- ){
							ary[j] = ary[j-1];
						}
						ary[0] = o_send;
						count = 1;
						break;
					}
				}
			}
			if( count < 0 ){
				ary.unshift(o_send);
			}
		}else{
			ary = [];
			ary.push(o_send);
		}
		console.log(ary);
		roomRef.child('speed').once('value', function(data2){
			roomRef.child('messages').set(JSON.stringify(ary), function(error){
				if(error){
					alert('Synchronization failed');
					$('body').removeClass('blur');
				}else{
					// scores : students' scores never overlap, times : all students sent Speed times
					var scores = parseInt(data2.val().split('_')[0]) - oldScores + nowScores, times = parseInt(data2.val().split('_')[1]) + newTimes;
					roomRef.child('speed').set(scores+'_'+times, function(error){
						if(error){
							alert('Synchronization failed');
							$('body').removeClass('blur');
						}else{
							$('body').removeClass('blur');
							addMessages('Speed', e, nowScores, time, sInfo['sId']);
						}
					});
				}
			});
		});
	});
}

// Send Text
function sendText(e, sInfo, text){
	$('body').addClass('blur');
	var messagesRef = myRootRef.child('rooms').child(sInfo['roomId']).child('messages');
	messagesRef.once('value', function( data ){
		var ary = JSON.parse(data.val()) || null, o_send = {}, time = timestamp.get().read;
		o_send[sInfo['sId']] = 'text_'+time+'_'+text;
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
				addMessages('Text', e, text, time, sInfo['sId']);
			}
		});
	});
}

// Get Message's logs
function getLog(sInfo){
	var messagesRef = myRootRef.child('rooms').child(sInfo['roomId']).child('messages');
	messagesRef.once('value', function( data ){
		var ary = JSON.parse(data.val()) || null, sLog = [];
		if( ary !== null && ary.length > 0 ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				if( sInfo['sId'] in ary[i] || 'teacher' in ary[i] ){
					sLog.unshift(ary[i]);
				}
			}
			console.log(sLog);
			showLogs(sLog, sInfo);
		}
		initIsCompleted();
	});
}

// Submit the answer
function sentAnswer(e, answerAry, sInfo){
	$('body').addClass('blur');
	var answerRef = myRootRef.child('rooms').child(sInfo['roomId']).child('answer');
	
	answerRef.once('value', function(data){
		if( "null" == data.val()){
			var answer_total = {};
			answer_total[sInfo['sId']] = {};
			answer_total[sInfo['sId']][sInfo.question] = answerAry;
		}else {
			var answer_total = data.val();
			if ( undefined == answer_total[sInfo['sId']] ) {
				answer_total[sInfo['sId']] = {};
			}
			answer_total[sInfo['sId']][sInfo.question] = answerAry;
		}
		var json_answer = JSON.stringify(answer_total);
		answerRef.set(answer_total, function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				localStorage.setItem('slatestQuesInfo', json_answer);
				if ( e ) {
					$(e).hide().siblings('div.answered').show();
				}
				$('body').removeClass('blur');
				if(show_result_flag){
					setResult(json_answer);
				}
				$('#navigation').find('[_nav=roomResult]').trigger('click');
			}
		});
	});
}
function sentAnswerAgain(answerAry, sInfo){
	$('body').addClass('blur');
	var answerRef = myRootRef.child('rooms').child(sInfo['roomId']).child('answer');
	
	answerRef.once('value', function(data){
		if( "null" == data.val()){
			var answer_total = {};
			answer_total[sInfo['sId']] = {};
			answer_total[sInfo['sId']][sInfo.question] = answerAry;
		}else {
			var answer_total = data.val();
			if ( undefined == answer_total[sInfo['sId']] ) {
				answer_total[sInfo['sId']] = {};
			}
			answer_total[sInfo['sId']][sInfo.question] = answerAry;
		}
		var json_answer = JSON.stringify(answer_total);
		answerRef.set(answer_total, function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				localStorage.setItem('slatestQuesInfo', json_answer);
				$('body').removeClass('blur');
				if(show_result_flag){
					setResult(json_answer);
				}
				$('#navigation').find('[_nav=roomResult]').trigger('click');
			}
		});
	});
}

// Set Student'Id : sId
function setStudentId(sInfo, mode){
	if( mode ){
		var online_sRef = myRootRef.child('rooms').child(sInfo['roomId']).child('online_s');
		online_sRef.once('value', function(data){
			var ary = data.val() || null, sNumber = randomInt(1, 100);
			console.log(ary);
			if( ary !== null ){
				var num = checkSIdIndex(ary, sInfo['sId']);
				while( num >= 0 ){
					sInfo['sId'] = randomInt(1, 100);
					num = checkSIdIndex(ary, sInfo['sId']);
				}
				localStorage.setItem('sInfo', JSON.stringify(sInfo));
			}
			console.log(sInfo);
			checkRoom(sInfo);
		});
	}else{
		checkRoom(sInfo);
	}
}

// Update sId in FireBase
function sentStudentName(name, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']), oldId = sInfo['sId'], newId = ( name === null ) ? sInfo['sId'].split('-')[0] : sInfo['sId'].split('-')[0]+'-'+name;
	roomRef.child('messages').once('value', function(data1){ // get Messages infos
		var ary = JSON.parse(data1.val()) || null, tempAry1 = [];
		console.log(ary);
		if( ary !== null ){
			for( var i=0, aryLen=ary.length; i<aryLen; i++ ){
				if( Object.keys(ary[i])[0].split('-')[0] === oldId.split('-')[0] ){
					var temp_o = {};
					temp_o[newId] = ary[i][oldId];
					tempAry1[i] = temp_o;
				}else{
					tempAry1[i] = ary[i];
				}
			}
			console.log(tempAry1);
			roomRef.child('messages').set(JSON.stringify(tempAry1), function(error){
				if(error){
					alert('Synchronization failed');
					$('body').removeClass('blur');
				}else{
					roomRef.child('question').once('value', function(data2){ // get qId of newest question
						if( data2.val() !== 'null' ){ // this room have questioned ever
							roomRef.child(data2.val()).once('value', function(data4){ // get info of newest question
								var ary = JSON.parse(data4.val()) || null, sAry = ary.s, tempAry2 = [];
								console.log(ary);
								if( sAry.length !== 0 ){ // Student ever answered the Q
									for( var i=0, aryLen=sAry.length; i<aryLen; i++ ){
										if( sAry[i].split('-')[0] === oldId.split('-')[0] ){
											tempAry2[i] = newId;
										}else{
											tempAry2[i] = sAry[i];
										}
									}
									ary.s = tempAry2;
									console.log(ary);
									roomRef.child(data2.val()).set(JSON.stringify(ary), function(error){
										if(error){
											alert('Synchronization failed');
											$('body').removeClass('blur');
										}else{
											sInfo.sId = newId;
											localStorage.setItem('sInfo', JSON.stringify(sInfo));
											
											clearTimeout(timeVar);
											updateState(sInfo);
											getLog(JSON.parse(localStorage.sInfo));
											$('#show-sId').text('No.'+newId.split('_')[1]);
											$('body').removeClass('blur');
											// Update sName, let teacher know this student has new Name
											roomRef.child('sName').set(timestamp.get().num);
											$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
										}
									});
								}else{
									sInfo.sId = newId;
									localStorage.setItem('sInfo', JSON.stringify(sInfo));
									clearTimeout(timeVar);
									updateState(sInfo);
									getLog(JSON.parse(localStorage.sInfo));
									$('#show-sId').text('No.'+newId.split('_')[1]);
									$('body').removeClass('blur');
									// Update sName, let teacher know this student has new Name
									roomRef.child('sName').set(timestamp.get().num);
									$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
								}
							});
						}else{ 
							sInfo.sId = newId;
							localStorage.setItem('sInfo', JSON.stringify(sInfo));
							clearTimeout(timeVar);
							updateState(sInfo);
							getLog(JSON.parse(localStorage.sInfo));
							$('#show-sId').text('No.'+newId.split('_')[1]);
							$('body').removeClass('blur');
							// Update sName, let teacher know this student has new Name
							roomRef.child('sName').set(timestamp.get().num);
							$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
						}
					});
				}
			});
		}
	});
}

// Init DB infos
function init(sInfo){
	getLog(sInfo);
	bindRoom(sInfo);
	updateState(sInfo);
	getLatestQuestion(sInfo);
}

// Get the newest Q
function getLatestQuestion(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('question').once('value', function(data1){
		console.log(data1.val());
		var sInfo = JSON.parse(localStorage.sInfo);
		sInfo.question = data1.val();
		localStorage.setItem('sInfo', JSON.stringify(sInfo));
		if( data1.val() !== 'null' ){ // This room has Q
			roomRef.child(data1.val()).once('value', function(data2){ // get info of newest Q
				console.log(data2.val());
				localStorage.setItem('slatestQuesInfo', data2.val());
				setQuestion(data2.val());
				if(show_result_flag){
					setResult(data2.val());
				}
				$('#roomResult, #roomQues').removeClass('null');
				initIsCompleted();
			});
		}else{
			localStorage.setItem('slatestQuesInfo', JSON.stringify(''));
			initIsCompleted();
		}
	});
}

// Create integer between min and max randomly
function randomInt(min, max){
    return Math.round(min + Math.random()*(max-min));
}

// Check is the sId only
function checkSIdIndex(ary, sNumber){
	for( i in ary ){
		if( i === sNumber ){
			return 1;
			break;
		}
	}
	return -1;
}

// Check is the array values only
function checkArrayByIndex(ary, s){
	for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
		if( ary[i] === s ){
			return i;
			break;
		}
	}
	return -1;
}

// Judge if b is newer than a
/*!
* compareDateTime (primary one)：return ( new Date(b).valueOf() > new Date(a).valueOf() ) ? 1 : 0;
*/
function compareDateTime(a, b){
	var oldAry = a.split(/[- :]/), newAry = b.split(/[- :]/), oldSeconds = parseInt(oldAry[5])+60*parseInt(oldAry[4])+60*60*parseInt(oldAry[3])+60*60*24*parseInt(oldAry[2]), newSeconds = parseInt(newAry[5])+60*parseInt(newAry[4])+60*60*parseInt(newAry[3])+60*60*24*parseInt(newAry[2]);
	if( parseInt(newAry[0]) > parseInt(oldAry[0]) ){ // year : b is newer than a 
		return 1;
	}else if( parseInt(newAry[0]) === parseInt(oldAry[0]) ){ // year : b === a
		if( parseInt(newAry[1]) > parseInt(oldAry[1]) ){ // month : b is newer than a 
			return 1;
		}else if( parseInt(newAry[1]) === parseInt(oldAry[1]) ){ // month : b === a, compare rest second
			return ( newSeconds > oldSeconds ) ? 1 : 0;
		}else{ // month : b is older than a
			return 0;
		}
	}else{ // year : b is older than a 
		return 0;
	}
}

// If asynchronous infos in init() init complete => initCount = -1
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
