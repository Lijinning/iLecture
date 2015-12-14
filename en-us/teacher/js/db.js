var myRootRef = new Firebase('https://ilecture.firebaseio.com/'), initCount = 0;

// 檢查 Auth 是否正確
function checkAuth(tInfo, auth){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.once('value', function(data){
		console.log(data.val());
		if( data.val() !== null ){
			if( data.val().code === tInfo['roomCode'] && data.val().auth === auth ){
				tInfo.params = 'room_id='+tInfo['roomId']+'&code='+tInfo['roomCode']+'&auth='+auth;
				localStorage.setItem('tInfo', JSON.stringify(tInfo));
				// 初始化 DB 的一些資訊
				init(tInfo);
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
function bindRoom(tInfo){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.on('child_changed', function(snapshot, prevChildName){
		console.log(snapshot.name());
		if( snapshot.name() === 'mood' ){  // Key 更新 : Mood
			setMoodInfo( $('#roomInfo nav'), snapshot.val() );
		}else if( snapshot.name() === 'speed' ){  // Key 更新 : Speed
			setSpeedInfo( $('#roomInfo nav'), snapshot.val() );
		}else if( snapshot.name() === 'messages' ){  // Key 更新 : Messages
			addMessages( tInfo, JSON.parse(snapshot.val()) );
		}else if( snapshot.name().indexOf('_') === 1 ){  // Key 更新 : 某個 Question
			var tInfo = JSON.parse(localStorage.tInfo), qId = tInfo.question;
			if( snapshot.name() === qId ){  // 取得投票的結果
				console.log(snapshot.val());
				localStorage.setItem('tlatestQuesInfo', snapshot.val());
				setResult(snapshot.val());
			}
		}else if( snapshot.name() === 'online_s' ){  // Key 更新 : online_s
			updateOnline_s();
		}else if( snapshot.name() === 'sName' ){  // value 更新 : sName
			getLog(JSON.parse(localStorage.tInfo));
		}else if( snapshot.name() === 'question' ){ // Teacher 有提出問題
			console.log(snapshot.val());
			var tInfo = JSON.parse(localStorage.tInfo);
			if( tInfo.question !== snapshot.val() ){ // 這個問題有比較新
				tInfo.question = snapshot.val();
				localStorage.setItem('tInfo', JSON.stringify(tInfo));
				roomRef.child(snapshot.val()).once('value', function(data){
					localStorage.setItem('tlatestQuesInfo', data.val());
					setResult(data.val());
				});
			}
		}
	});
}

// 更新 Student 連線者名單
function updateOnline_s(){ console.log('Update : online_s !');
	var _GET = getUrlVars(),
	roomId = _GET['room_id'] || null,
	roomCode = _GET['code'] || null,
	roomAuth = _GET['auth'],
	tInfo = JSON.parse(localStorage.tInfo) || null,
	num = 0;
	if( roomId === null || roomCode === null || roomAuth === null ){
		alert('Parameter is missing.');
		localStorage.removeItem('tInfo');
		localStorage.removeItem('tlatestQuesInfo');
		window.location.replace('../error/index.html');
		return 0;
	}
	if( tInfo.roomCode !== roomCode || tInfo.roomId !== roomId ){
		alert('One browser can only use one classroom.');
		window.location.replace('../error/index.html');
		return 0;
	}
	var online_sRef = myRootRef.child('rooms').child(roomId).child('online_s');
	online_sRef.once('value', function(data){
		var ary = JSON.parse(data.val()) || null, newAry = [], num = 0, now = timestamp.get().num;
		if( ary !== null ){  // Student 連線人數不為空
			for( var i=0, aryLen = ary.length; i<aryLen; i++ ){
				for( var key in ary[i] ){
					// 刪除超過15秒未繼續連線的 Students -> 亦即他們不在線上
					if( Math.abs( now - parseInt(ary[i][key]) ) > 15*1000 ){
						// 從連線者名單移除 offline 的 Student
						console.log('offline student -> '+key);
					}else{
						// newAry : 新的連線者名單
						newAry.push(ary[i]);
						num++;
					}
					break;
				}
			}
		};
		online_sRef.set(JSON.stringify(newAry), function(error){
			if(error){
				alert('Synchronization failed');
				$('body').removeClass('blur');
			}else{
				$('#show-onlineNum').text(num);
				var tInfo = JSON.parse(localStorage.tInfo);
				tInfo.online_s = num;
				localStorage.setItem('tInfo', JSON.stringify(tInfo));
				initIsCompleted();
			}
		});
	});
}

// 初始化 DB 的一些資訊
function init(tInfo){
	// 更新在線人數的資訊
	updateOnline_s();
	// 開始監聽 FireBase上 該教室的資訊
	bindRoom(tInfo);
	// 抓取 Messages
	getLog(tInfo);
	// 抓取「最新的問題」
	getLatestQuestion(tInfo);
}

// 抓取「最新的問題」
function getLatestQuestion(tInfo){
	var roomRef = myRootRef.child('rooms').child(tInfo['roomId']);
	roomRef.child('question').once('value', function(data1){
		console.log(data1.val());
		var tInfo = JSON.parse(localStorage.tInfo);
		tInfo.question = data1.val();
		localStorage.setItem('tInfo', JSON.stringify(tInfo));
		if( data1.val() !== 'null' ){ // 這間 room -> 曾經發問過問題
			roomRef.child(data1.val()).once('value', function(data2){ // 抓取最新問題的資訊
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

// 初始化所有的 EasyPieChart
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

// 設置 Mood 的百分比
function setMoodInfo($a, a){
	var scores = parseInt(a.split('_')[0]), times = parseInt(a.split('_')[1]), percent = ( times === 0 ) ? 0 : Math.floor(100*((scores+3*times))/(6*times));
	$a.find('div[pieChart=mood]').children('div.chart-number').text(percent+'%').end().children('div.chart-canvas').attr('data-percent', percent).data('easyPieChart').update(percent);
}

// 設置 Speed 的百分比
function setSpeedInfo($a, a){
	var scores = parseInt(a.split('_')[0]), times = parseInt(a.split('_')[1]), percent = ( times === 0 ) ? 0 : Math.floor(100*((scores+3*times))/(6*times));
	$a.find('div[pieChart=speed]').children('div.chart-number').text(percent+'%').end().children('div.chart-canvas').attr('data-percent', percent).data('easyPieChart').update(percent);
}

// 取得 Message's logs
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

// 產生 Question 並傳送到 FireBase
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

// 老師回覆 : 送出 Text
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
