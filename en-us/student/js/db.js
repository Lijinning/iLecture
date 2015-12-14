var myRootRef = new Firebase('https://ilecture.firebaseio.com/'), timeVar, initCount = 0;

// 檢查 room 是否正確
function checkRoom(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.once('value', function(data){
		console.log(data.val());
		if( data.val() !== null ){
			if( data.val().code === sInfo['roomCode'] ){
				// 初始化 DB 的一些資訊
			init(sInfo);
			}else{
				alert('Parameters error.');
				window.location.replace('../error/index.html');
			}
		}else{
			alert('Can not find the classroom.');
			window.location.replace('../error/index.html');
		}
	});
}

// 開始監聽 FireBase上 該教室的資訊
function bindRoom(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.on('child_changed', function(snapshot, prevChildName){
		console.log(snapshot.name());
		if( snapshot.name() === 'question' ){ // Teacher 有提出問題
			console.log(snapshot.val());
			var sInfo = JSON.parse(localStorage.sInfo);
			sInfo.question = snapshot.val();
			localStorage.setItem('sInfo', JSON.stringify(sInfo));
			roomRef.child(snapshot.val()).once('value', function(data){
				localStorage.setItem('slatestQuesInfo', data.val());
				setQuestion(data.val());
				setResult(data.val());
				// 顯示 #roomQues 頁面
				$('#navigation').find('div.item.active').removeClass('active').end().find('[_nav=roomQues]').addClass('active');
				$('#container').children().children('section.active').removeClass('active').end().children('#roomQues').addClass('active');
			});
		}else if( snapshot.name() === 'messages' ){  // Key 更新 : Messages
			var message = JSON.parse(snapshot.val());
			if( message[0]['teacher'] ){
				var $a = $('#show-message');
				if( $a.children('div.item:last-child').find('span.timestamp').text() ){ // 若 Messages 不為空
					console.log( compareDateTime($a.children('div.item:last-child').find('span.timestamp').text(), message[0]['teacher'].split('_')[1]) );
					if( !compareDateTime($a.children('div.item:last-child').find('span.timestamp').text(), message[0]['teacher'].split('_')[1]) ){ // 若 new message 沒比較新，則不動作
						console.log('addMessages 不動作');
						return 0;
					}
				}
				$a.append(getMessagesHtml('Text', message[0]['teacher'].substr(25), message[0]['teacher'].split('_')[1], 'teacher'));
				// scrolling 滑到最下面
				var $b = $('#roomMessage').children('section');
				$b.animate({scrollTop: $b.prop('scrollHeight')}, 500);
			}
		}else if( snapshot.name().indexOf('_') === 1 ){  // Key 更新 : 某個 Question
			var sInfo = JSON.parse(localStorage.sInfo), qId = sInfo.question;
			if( snapshot.name() === qId ){  // 取得投票的結果
				console.log(snapshot.val());
				localStorage.setItem('slatestQuesInfo', snapshot.val());
				setResult(snapshot.val());
			}
		}
	});
}

// 更新連線狀態
function updateState(sInfo){
	var _GET = getUrlVars(),
	roomId = _GET['room_id'] || null,
	roomCode = _GET['code'] || null,
	sInfo = JSON.parse(localStorage.sInfo) || null,
	num = 0;
	if( roomId === null || roomCode === null ){
		alert('Parameter is missing.');
		localStorage.removeItem('sInfo');
		localStorage.removeItem('slatestQuesInfo');
		window.location.replace('../error/index.html');
		return 0;
	}
	if( sInfo.roomCode !== roomCode || sInfo.roomId !== roomId ){
		alert('One browser can only use one classroom.');
		window.location.replace('../error/index.html');
		return 0;
	}
	var online_sRef = myRootRef.child('rooms').child(roomId).child('online_s');
	online_sRef.once('value', function(data){
		var ary = JSON.parse(data.val()) || null, o_state = {}, count = -1;
		o_state[sInfo['sId']] = timestamp.get().num;
		if( ary !== null ){
			for( var i=0, aryLen=ary.length; i<aryLen; i++ ){
				// 尋找是否有就得連線狀態 ? 更新並覆寫 : push，用 count 來判斷
				if( Object.keys(ary[i])[0].split('-')[0] === sInfo['sId'].split('-')[0] ){
					ary[i] = o_state;
					count = 1;
					break;
				}
			}
			if( count < 0 ){
				ary.push(o_state);
			}
		}else{
			ary = [];
			ary.push(o_state);
		}
		console.log( ary );
		online_sRef.set(JSON.stringify(ary));
		initIsCompleted();
	});
	// 每「10秒」更新一次
	timeVar = setTimeout(function(){ updateState(JSON.parse(localStorage.sInfo)); }, 1*10*1000);
}

// 送出 Mood
function sendMood(e, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('messages').once('value', function(data1){
		var ary = JSON.parse(data1.val()) || null, o_send = {}, count = -1, time = timestamp.get().read, oldScores = 0, nowScores = parseInt($(e).attr('_mood')), newTimes = 1;
		o_send[sInfo['sId']] = 'mood_'+time+'_'+nowScores;
		if( ary !== null ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				// 尋找是否已經有送出過 Mood ? 覆寫 : unshift，用 count 來判斷
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
				// scores : 學生的 scores 皆不重複，times : 全部學生發送 Speed 的次數
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

// 送出 Speed
function sendSpeed(e, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('messages').once('value', function(data1){
		var ary = JSON.parse(data1.val()) || null, o_send = {}, count = -1, time = timestamp.get().read, oldScores = 0, nowScores = parseInt($(e).attr('_speed')), newTimes = 1;
		o_send[sInfo['sId']] = 'speed_'+time+'_'+nowScores;
		if( ary !== null ){
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				// 尋找是否已經有送出過 Speed ? 覆寫 : unshift，用 count 來判斷
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
					// scores : 學生的 scores 皆不重複，times : 全部學生發送 Speed 的次數
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

// 送出 Text
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

// 取得 Message's logs
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

// 提交 答案
function sentAnswer(e, answerAry, sInfo){
	$('body').addClass('blur');
	var questionRef = myRootRef.child('rooms').child(sInfo['roomId']).child(sInfo.question);
	questionRef.once('value', function(data){ console.log(data.val());
		var o_ques = JSON.parse(data.val()), o_answer = {};
		for( var i=0, iLen=answerAry.length; i<iLen; i++ ){
			o_ques.answer.push(answerAry[i]);
		}
		o_ques.count++;
		o_ques.s.unshift(sInfo['sId']);
		console.log(o_ques);
		var json_ques = JSON.stringify(o_ques);
		questionRef.set(json_ques, function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				localStorage.setItem('slatestQuesInfo', json_ques);
				$(e).hide().siblings('div.answered').show();
				$('body').removeClass('blur');
				setResult(json_ques);
				$('#navigation').find('[_nav=roomResult]').trigger('click');
			}
		});
	});
}

// 設定 Student'Id : sId
function setStudentId(sInfo, mode){
	if( mode ){
		var online_sRef = myRootRef.child('rooms').child(sInfo['roomId']).child('online_s');
		online_sRef.once('value', function(data){
			var ary = JSON.parse(data.val()) || null, sNumber = randomInt(1, 100);
			console.log(ary);
			if( ary !== null ){
				var num = checkSIdIndex(ary, sInfo['sId']);
				while( num >= 0 ){
					sInfo['sId'] = 's_'+randomInt(1, 100);
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

// 更新 FireBase 的 sId 名稱
function sentStudentName(name, sInfo){
	$('body').addClass('blur');
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']), oldId = sInfo['sId'], newId = ( name === null ) ? sInfo['sId'].split('-')[0] : sInfo['sId'].split('-')[0]+'-'+name;
	roomRef.child('messages').once('value', function(data1){ // 抓取 Messages 的資訊
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
					roomRef.child('question').once('value', function(data2){ // 抓取最新問題的 qId
						if( data2.val() !== 'null' ){ // 這間 room -> 曾經發問過問題
							roomRef.child(data2.val()).once('value', function(data4){ // 抓取最新問題的資訊
								var ary = JSON.parse(data4.val()) || null, sAry = ary.s, tempAry2 = [];
								console.log(ary);
								if( sAry.length !== 0 ){ // Student -> 曾經回答過問題
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
											// 清除 updateState TimeOut 計數
											clearTimeout(timeVar);
											// 更新 online_s 的 sId
											updateState(sInfo);
											// 更新 Messages
											getLog(JSON.parse(localStorage.sInfo));
											$('#show-sId').text('No.'+newId.split('_')[1]);
											$('body').removeClass('blur');
											// 更新 sName，讓 Teacher 得知該學生有更新 Name
											roomRef.child('sName').set(timestamp.get().num);
											$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
										}
									});
								}else{
									sInfo.sId = newId;
									localStorage.setItem('sInfo', JSON.stringify(sInfo));
									// 清除 updateState TimeOut 計數
									clearTimeout(timeVar);
									// 更新 online_s 的 sId
									updateState(sInfo);
									// 更新 Messages
									getLog(JSON.parse(localStorage.sInfo));
									$('#show-sId').text('No.'+newId.split('_')[1]);
									$('body').removeClass('blur');
									// 更新 sName，讓 Teacher 得知該學生有更新 Name
									roomRef.child('sName').set(timestamp.get().num);
									$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
								}
							});
						}else{ // 這間 room -> 從未發問過問題
							sInfo.sId = newId;
							localStorage.setItem('sInfo', JSON.stringify(sInfo));
							// 清除 updateState TimeOut 計數
							clearTimeout(timeVar);
							// 更新 online_s 的 sId
							updateState(sInfo);
							// 更新 Messages
							getLog(JSON.parse(localStorage.sInfo));
							$('#show-sId').text('No.'+newId.split('_')[1]);
							$('body').removeClass('blur');
							// 更新 sName，讓 Teacher 得知該學生有更新 Name
							roomRef.child('sName').set(timestamp.get().num);
							$('#show-sId').parent('nav.user').removeClass('active').siblings('.active').removeClass('active').end().siblings('footer').attr('_now', 'none').children('div').removeClass('active');
						}
					});
				}
			});
		}
	});
}

// 初始化 DB 的一些資訊
function init(sInfo){
	// 抓歷史 Message;s Logs
	getLog(sInfo);
	// 開始監聽 FireBase上 該教室的資訊
	bindRoom(sInfo);
	// 更新連線狀態
	updateState(sInfo);
	// 抓取「最新的問題」
	getLatestQuestion(sInfo);
}

// 抓取「最新的問題」
function getLatestQuestion(sInfo){
	var roomRef = myRootRef.child('rooms').child(sInfo['roomId']);
	roomRef.child('question').once('value', function(data1){
		console.log(data1.val());
		var sInfo = JSON.parse(localStorage.sInfo);
		sInfo.question = data1.val();
		localStorage.setItem('sInfo', JSON.stringify(sInfo));
		if( data1.val() !== 'null' ){ // 這間 room -> 曾經發問過問題
			roomRef.child(data1.val()).once('value', function(data2){ // 抓取最新問題的資訊
				console.log(data2.val());
				localStorage.setItem('slatestQuesInfo', data2.val());
				setQuestion(data2.val());
				setResult(data2.val());
				$('#roomResult, #roomQues').removeClass('null');
				initIsCompleted();
			});
		}else{
			localStorage.setItem('slatestQuesInfo', JSON.stringify(''));
			initIsCompleted();
		}
	});
}

// 隨機產生範圍 min~max 的整數
function randomInt(min, max){
    return Math.round(min + Math.random()*(max-min));
}

// 檢查 sId 是否重覆
function checkSIdIndex(ary, sNumber){
	for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
		// 檢查是否有重覆 ?
		if( Object.keys(ary[0])[0] === sNumber ){
			return i;
			break;
		}
	}
	return -1;
}

// 檢查 array values 是否重覆
function checkArrayByIndex(ary, s){
	for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
		if( ary[i] === s ){
			return i;
			break;
		}
	}
	return -1;
}

// 判斷時間戳 b 是否比 a 還要新
/*!
* compareDateTime 原案：return ( new Date(b).valueOf() > new Date(a).valueOf() ) ? 1 : 0;
* 但是發現手機平板瀏覽器會出問題，所以只好手動比較
*/
function compareDateTime(a, b){
	var oldAry = a.split(/[- :]/), newAry = b.split(/[- :]/), oldSeconds = parseInt(oldAry[5])+60*parseInt(oldAry[4])+60*60*parseInt(oldAry[3])+60*60*24*parseInt(oldAry[2]), newSeconds = parseInt(newAry[5])+60*parseInt(newAry[4])+60*60*parseInt(newAry[3])+60*60*24*parseInt(newAry[2]);
	if( parseInt(newAry[0]) > parseInt(oldAry[0]) ){ // 年 : b 比 a 新
		return 1;
	}else if( parseInt(newAry[0]) === parseInt(oldAry[0]) ){ // 年 : b 等於 a
		if( parseInt(newAry[1]) > parseInt(oldAry[1]) ){ // 月 : b 比 a 新
			return 1;
		}else if( parseInt(newAry[1]) === parseInt(oldAry[1]) ){ // 月 : b 等於 a，比較剩餘的秒數
			return ( newSeconds > oldSeconds ) ? 1 : 0;
		}else{ // 月 : b 比 a 舊
			return 0;
		}
	}else{ // 年 : b 比 a 舊
		return 0;
	}
}

// 若 init() 裡面的非同步資訊都初始化完成 -> initCount = -1
function initIsCompleted(){
	if( initCount !== -1 ){
		console.log('initCount -> '+initCount);
		initCount++;
		if( initCount === 3 ){
			// 初始化完成
			initCount = -1;
			$('body').removeClass('blur');
		}
	}
}