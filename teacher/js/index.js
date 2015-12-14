var display_result_type = true;
$(function(){
	// Init EasyPieChart
	initPieChart(getUrlVars()['room_id'], viewport.get());
	
	// Convert websiete linking of student to QR-Code
	getTinyURL('http://merry.ee.ncku.edu.tw/~luckyjoou/ilecture/student/index.html?room_id='+getUrlVars()['room_id']+'&code='+getUrlVars()['code'], getUrlVars()['code'], viewport.get());
});


$(window).resize( function(){
	// resize : EasyPieChart
	setPieChart($('#roomInfo nav'), viewport.get());
	// resize : BarChart
	setBarChart(document.getElementById('barCanvas'), viewport.get());
	// resize : QR-Code
	setQRCode($('#show-qrCode'), viewport.get());
	$('#container').removeClass('link');
});

// Sending Text
$(document).on('click', '#text_btn', function(){
	var text = $(this).siblings('div.input').children().val().trim() || null; //trim():Remove whitespace from both sides of a string
	if( text !== null ){
		if( checkTextValidity(text) ){
			sendText(this, JSON.parse(localStorage.tInfo), text);
		}else{
			alert('訊息：含有未認可的標點符號。');
		}
	}else{
		alert('未填寫訊息。');
	}
});

// Press Enter key to send Text
$(document).on('keypress', '#roomMessage > footer input', function(e){
	if( e.keyCode === 13 ){
		$(this).parent().siblings('#text_btn').trigger('click');
		return false;
	}
});

// Click Navigation
$(document).on('click', '#navigation div.item', function(){
	if( !$(this).hasClass('active') ){
		$(this).parent().parent().find('div.active').removeClass('active').end().find('[_nav='+$(this).attr('_nav')+']').addClass('active');
		$('#container').children().children('section.active').removeClass('active').end().children('#'+$(this).attr('_nav')).addClass('active');
		if( $(this).attr('_nav') === 'roomMessage' ){
			// scrolling to bottom
			var $a = $('#'+$(this).attr('_nav')).children('div');
			$a.animate({scrollTop: $a.prop('scrollHeight')}, 500);
		}
	}
});

// Click the asking button
$(document).on('click', '#roomQues nav > div.item > div.ask', function(){
	var num = $(this).parents('#roomQues').attr('_sel'), title = $('#title_input').val().trim() || '未設定問題描述';
	if( checkQuestionValidity(title) ){
		// Send the FireBase
		createQuestion(this, title, JSON.parse(localStorage.tInfo), num);
	}else{
		alert('問題描述：只能輸入任意文字、空白或底線。');
	}
});

// Checkbox : Switch between single-selection and multi-selection
$(document).on('click', '#roomQues div.option.sin > div', function(){
	if( !$(this).hasClass('active') ){
		$(this).addClass('active').siblings().removeClass('active').parents('#roomQues').attr('_type', $(this).attr('_type'));
	}
});

// Switch : Showing or not showing result
$(document).on('click', '#roomQues div.item.type > div', function(){
	if( $(this).hasClass('not_show') ){
		$(this).replaceWith("<div class=\"show\">不顯示投票結果<\/div>");
		switch_display_result("show");
	}else{
		$(this).replaceWith("<div class=\"not_show\">顯示投票結果<\/div>");
		switch_display_result("not_show");
	}
});

// Switch : type of displaying result
var json_question;
$(document).on('click', '#roomResult div.left', function(){
	if(display_result_type){
		display_result_type = false;
		analyzeResult(json_question);
	}else{
		display_result_type = true;
		analyzeResult(json_question);
	}
});
// swtich the number of options
$(document).on('click', '#roomQues div.sel-item', function(){
	if( !$(this).hasClass('active') ){
		$(this).addClass('active').siblings().removeClass('active').parents('#roomQues').attr('_sel', $(this).attr('_sel'));
	}
});

// For large size: open the linking info page
$(document).on('click', '#roomLink_btn', function(){
	$('#container').addClass('link').animate({scrollTop: 0}, 100);
});

// For large size: back to the classroom page
$(document).on('click', '#roomLink div.back', function(){
	$('#container').removeClass('link');
});

// Click to see the history of question
$(document).on('click', '#roomQues div.left', function(){
	$('#container').addClass('history').animate({scrollTop: 0}, 100);
});

// For large size: back to the classroom page
$(document).on('click', '#historyQues div.back', function(){
	$('#container').removeClass('history');
});

// Show and init: Result of new question
function setResult(json_ques){
	json_question = json_ques;
	if( json_ques !== '""' ){
		var $a = $('#roomResult'), o_ques = JSON.parse(json_ques), type = ( o_ques.type === 'single' ) ? '單選' : '多選', title = o_ques.title;
		analyzeResult(json_ques);
		$a.removeClass('null');
	}else{
		var $a = $('#roomResult'), type = '從未發問', title = '未設定問題描述';
	}
	$a.children().children('nav').find('div.left').text(title).end().find('div.type').text(type);
}

// Analyze result of the newest qeustion for chart
function analyzeResult(json_ques){
	var o_ques = JSON.parse(json_ques), answerAry = o_ques.answer.sort(), resultAry = [], current = null, count = 0;
	for( var i=0, iLen=o_ques.num; i<=iLen; i++ ){
		resultAry[i] = 0;
	}
	for( var i=0, iLen=answerAry.length; i<iLen; i++ ){
		if( answerAry[i] != current ){
			if( count > 0 ){
				resultAry[current] = count;
			}
			current = answerAry[i];
			count = 1;
		}else{
			count++;
		}
	}
	if( count > 0 ){
		resultAry[current] = count;
	}
	console.log(answerAry);
	console.log(resultAry);
	drawBarChart(resultAry, viewport.get());
}

function showResult(result){
	var tInfo = JSON.parse(localStorage.tInfo), resultAry = [];
	if ( JSON.parse(localStorage.tlatestQuesInfo).type === "single" ) {
		var option_num = parseInt(JSON.parse(localStorage.tlatestQuesInfo).num);
	}else {
		var option_num = parseInt(JSON.parse(localStorage.tlatestQuesInfo).num) + 1;
	}
	for ( var i = 0; i < option_num; i++ ) {
		resultAry[i] = 0;
	}
	for ( i in result ) {
		if ( result[i][tInfo.question] ) {
			for ( j in result[i][tInfo.question] ) {
				resultAry[result[i][tInfo.question][j]]++;
			}
		}
	}
	drawBarChart(resultAry, viewport.get());
}

// resize for EasyPieChart
function setPieChart($pieChart, _){
	var $chart = $pieChart.find('div.chart-canvas');
	if( _.w <= 980 ){
		if( $chart.hasClass('desktop') ){
			$chart.children('canvas').remove().end().data('easyPieChart', null);
			$chart.removeClass('desktop').addClass('mobile').easyPieChart({
				lineWidth: 10,
				size: 75,
				barColor: 'rgb(241,196,15)',
				trackColor: 'rgba(255,255,255,.2)',
				animate: 1500,
				scaleColor: !1,
				lineCap: 'square'
			});
		}
	}else{
		if( $chart.hasClass('mobile') ){
			$chart.children('canvas').remove().end().data('easyPieChart', null);
			$chart.removeClass('mobile').addClass('desktop').easyPieChart({
				lineWidth: 15,
				size: 104,
				barColor: 'rgb(231,76,60)',
				trackColor: 'rgba(231,76,60,.3)',
				animate: 1500,
				scaleColor: !1,
				lineCap: 'square'
			});
		}
	}
}

// resize for BarChart
function setBarChart(barCanvas, _){
	if( _.w <= 980 ){
		if( $(barCanvas).hasClass('desktop') ){
			drawBarChart(JSON.parse($(barCanvas).data('resultAry')), _);
		}
	}else{
		if( $(barCanvas).hasClass('mobile') ){
			drawBarChart(JSON.parse($(barCanvas).data('resultAry')), _);
		}
	}
}

// resize for QR-Code
function setQRCode($showQRCode, _){
	if( _.w <= 980 ){
		if( $showQRCode.hasClass('desktop') ){
			$showQRCode.html('');
			var url = $showQRCode.data('url'),
				colorDark = (_.w>980)?'rgb(119,107,94':'rgb(248, 227, 173)',
				colorLight = (_.w>980)?'rgba(248,243,230,0)':'rgba(248,243,230,0)',
				qrCode = new QRCode('show-qrCode', {
					width: 280,
					height: 280,
					colorDark : colorDark,
					colorLight : colorLight,
					correctLevel : QRCode.CorrectLevel.H
				});
			qrCode.makeCode(url);
			$showQRCode.removeClass('desktop').addClass('mobile');
		}
	}else{
		if( $showQRCode.hasClass('mobile') ){
			$showQRCode.html('');
			var url = $showQRCode.data('url'),
				colorDark = (_.w>980)?'rgb(119,107,94':'rgb(248, 227, 173)',
				colorLight = (_.w>980)?'rgba(248,243,230,0)':'rgba(248,243,230,0)',
				qrCode = new QRCode('show-qrCode', {
					width: 280,
					height: 280,
					colorDark : colorDark,
					colorLight : colorLight,
					correctLevel : QRCode.CorrectLevel.H
				});
			qrCode.makeCode(url);
			$showQRCode.removeClass('mobile').addClass('desktop');
		}
	}
}

// Add new Message
function addMessages(tInfo, tLog){
	var sId = Object.keys(tLog[0])[0], $a = $('#show-message');
	if( $a.children('div.item:last-child').find('span.timestamp').text() ){ // 若 Messages 不為空
		console.log( compareDateTime($a.children('div.item:last-child').find('span.timestamp').text(), tLog[0][sId].split('_')[1]) );
		if( !compareDateTime($a.children('div.item:last-child').find('span.timestamp').text(), tLog[0][sId].split('_')[1]) ){ // 若 new message 沒比較新，則不動作
			console.log('addMessages 不動作');
			return 0;
		}
	}
	if( tLog[0][sId].split('_')[0] === 'mood' ){
		$a.children('div.item.mood[_sid='+sId+'], div.null').remove().end().append(getMessagesHtml('Mood', tLog[0][sId].substr(25), tLog[0][sId].split('_')[1], sId));
	}else if( tLog[0][sId].split('_')[0] === 'speed' ){
		$a.children('div.item.speed[_sid='+sId+'], div.null').remove().end().append(getMessagesHtml('Speed', tLog[0][sId].substr(26), tLog[0][sId].split('_')[1], sId));
	}else if( tLog[0][sId].split('_')[0] === 'text' ){
		$a.children('div.null').remove().end().append(getMessagesHtml('Text', tLog[0][sId].substr(25), tLog[0][sId].split('_')[1], sId));
	}
	// scrolling 滑到最下面
	var $b = $('#roomMessage').children('section');
	$b.animate({scrollTop: $b.prop('scrollHeight')}, 500);
}

// Add new question log
function addQLog(Qname, Qinfo, A_num, ResultAry){
	$('#show-question div.head').text("歷史問題");
	$a = $('#show-question');
	var flag = 1;
	$('#show-question div').each(function(){
		if($(this).hasClass(Qname)){
			flag = 0;
		}
		console.log($(this).hasClass(Qname));
	});
	if ( flag ) {
		$('#show-question').append("<div class=\"item "+Qname+"\"><p>"+"Question name: "+Qinfo['title']+"&nbsp;&nbsp;&nbsp;Type: "+Qinfo['type']+"&nbsp;&nbsp;&nbsp;Answer numbers: "+A_num+"&nbsp;&nbsp;&nbsp;Answer result: "+ResultAry+"</p></div>");
	}
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
		
// Messages : 顯示資訊(剛載入網頁時)
function showLogs(tLog, tInfo){
	var html = '';
	aa = tLog;
	for( var i=0, aryLen = tLog.length; i<aryLen; i++ ){
		var sId = Object.keys(tLog[i])[0];
		if( tLog[i][sId].split('_')[0] === 'mood' ){
			html += getMessagesHtml('Mood', tLog[i][sId].substr(25), tLog[i][sId].split('_')[1], sId);
		}else if( tLog[i][sId].split('_')[0] === 'speed' ){
			html += getMessagesHtml('Speed', tLog[i][sId].substr(26), tLog[i][sId].split('_')[1], sId);
		}else if( tLog[i][sId].split('_')[0] === 'text' ){
			html += getMessagesHtml('Text', tLog[i][sId].substr(25), tLog[i][sId].split('_')[1], sId);
		}
	}
	$('#show-message').html(html);
	// scrolling 滑到最下面
	var $a = $('#roomMessage').children('section');
	$a.animate({scrollTop: $a.prop('scrollHeight')}, 500);
}

// 產生不同型式 Messages 的 DOM
function getMessagesHtml(mode, val, time, sId){
	if( mode === 'Mood' ){
		var html = '<div class="item mood" _sid='+sId+'>'+
				'<footer><span class="name">No.'+sId.split('_')[1]+'</span>, <span class="timestamp">'+time+'</span></footer>'+
				'<div>'+
					'<img src="../image/mood_'+val+'.png">'+
				'</div>'+
			'</div>';
	}else if( mode === 'Speed' ){
		var html = '<div class="item speed" _sid='+sId+'>'+
				'<footer><span class="name">No.'+sId.split('_')[1]+'</span>, <span class="timestamp">'+time+'</span></footer>'+
				'<div>'+
					'<img src="../image/speed_'+val+'.png">'+
				'</div>'+
			'</div>';
	}else if( mode === 'Text' ){
		if( /https:\/\//g.test(val) ){
			val = val.replace(/https:\/\/\S+/g,'<a href=\'$&\'>$&</a>');
		}else if( /http:\/\//g.test(val) ){
			val = val.replace(/http:\/\/\S+/g,'<a href=\'$&\'>$&</a>');
		}else if( /www\./.test(val) ){
			val = val.replace(/www\.\S+/g,'<a href=\'$&\'>$&</a>');
		}
		var html = '<div class="item" _sid='+sId+'>'+
			'<footer><span class="name">';
		html += ( sId === 'teacher' ) ? 'Teacher' : 'No.'+sId;
		html += '</span>, <span class="timestamp">'+time+'</span></footer>'+
			'<div>'+
			'<p>'+val+'</p>'+
			'</div>'+
			'</div>';
	}
	return html;
}

// 投票結果 : 畫出長條圖
function drawBarChart(resultAry, _){
	if(display_result_type){
		var mode = (_.w>980)?'desktop':'mobile',
		barCanvas = document.getElementById('barCanvas'),
		ctx = barCanvas.getContext('2d'),
		fillColor = (_.w>980)?'rgba(231,76,60,.9)':'rgba(142,68,173,.9)',
		strokeColor = (_.w>980)?'rgba(231,76,60,.8)':'rgba(142,68,173,.8)',
		barChartData = {
			labels : [],
			datasets : [{
				fillColor : fillColor,
				strokeColor : strokeColor,
				highlightFill : 'rgba(119,107,94,.75)',
				highlightStroke : 'rgba(119,107,94,1)',
				data : []
			}]
		};
		ctx.canvas.height = 240;
		ctx.canvas.width = 240;
		$(barCanvas).removeClass('desktop mobile').addClass(mode).data('resultAry', JSON.stringify(resultAry));

		// barChartData : 長條圖的資料陣列
		for( var i=0, iLen=resultAry.length; i<iLen; i++ ){
			barChartData.labels.push(mapLetter(i));
			barChartData.datasets[0].data.push(resultAry[i]);
		}
		console.log(barChartData);

		window.myBar = new Chart(ctx).Bar(barChartData, {
			responsive : true,
			showTooltips: false,
		});		
	}else{
		var mode = (_.w>980)?'desktop':'mobile',
		barCanvas = document.getElementById('barCanvas'),
		ctx = barCanvas.getContext('2d'),
		barChartData = [];
		ctx.canvas.height = 240;
		ctx.canvas.width = 240;
		$(barCanvas).removeClass('desktop mobile').addClass(mode).data('resultAry', JSON.stringify(resultAry));

		//set piechart color
		var color=[] , highlight=[];
		switch(resultAry.length){
			case 1:
				color=["#F7464A"];
				highlight=["#FF5A5E"];
				break;
			case 2:
				color=["#F7464A","#46BFBD"];
				highlight=["#FF5A5E","#5AD3D1"];
				break;
			case 3:
				color=["#F7464A","#46BFBD","#FDB45C"];
				highlight=["#FF5A5E","#5AD3D1","#FFC870"];
				break;
			case 4:
				color=["#F7464A","#46BFBD","#FDB45C","#a15013"];
				highlight=["#FF5A5E","#5AD3D1","#FFC870","#ce6719"];
				break;
			case 5:
				color=["#F7464A","#46BFBD","#FDB45C","#a15013","#fae62a"];
				highlight=["#FF5A5E","#5AD3D1","#FFC870","#ce6719","#fbea4b"];
				break;
			case 6:
				color=["#F7464A","#46BFBD","#FDB45C","#a15013","#fae62a","#4697d7"];
				highlight=["#FF5A5E","#5AD3D1","#FFC870","#ce6719","#fbea4b","#62a7dd"];
				break;
		}
		// barChartData
		for( var i=0, iLen=resultAry.length; i<iLen; i++ ){
			barChartData[i]= {
				value : resultAry[i],
				color : color[i],
				highlight : highlight[i],
				label : mapLetter(i)
			};
		}
		console.log(barChartData);

		window.myBar = new Chart(ctx).Pie(barChartData, {
			segmentShowStroke : true,
			segmentStroke : "#fff"
		});
	}
}

// 轉換 Student 網址成短網址並生成 QR-Code
function getTinyURL(url, roomCode, _){
	$.urlShortener.settings.apiKey = 'AIzaSyDhbUJhg1z_4y1WZiRxu-xqXhU8EsVOj6E';
	$.urlShortener({
		longUrl: url,
		success: function(shortUrl){
			var mode = (_.w>980)?'desktop':'mobile',
				colorDark = (_.w>980)?'rgb(119,107,94':'rgb(248, 227, 173)',
				colorLight = (_.w>980)?'rgba(248,243,230,0)':'rgba(248,243,230,0)',
				qrCode = new QRCode('show-qrCode', {
					width: 280,
					height: 280,
					colorDark : colorDark,
					colorLight : colorLight,
					correctLevel : QRCode.CorrectLevel.H
				});
			// 利用回傳的短網址生成 QR-Code 並顯示在「連線資訊」上
			qrCode.makeCode(url);
			$('#show-qrCode').addClass(mode).data('url', url);
			$('#show-roomCode').text(roomCode);
			$('#show-roomLink').children().text(shortUrl).attr('href', url);
		},
		error: function(err){
			console.log(err);
			alert('產生縮網址發生錯誤。');
		}
	});
}

// 取得該選項相對應的英文編號
function mapLetter(a){
	var map = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	return map[a];
}

// 檢查 : 問題描述 是否合乎標準 -> 標點符號只能用 _ + 任意字符 + 空白
function checkQuestionValidity(a){
	return ( /^[^\.,-\/?#!$%\^&\*;:{}=\-'"~()<>@+|\\]+$/.test(a) ) ? 1 : 0;
}

// 檢查 : Text 是否合乎標準 -> 標點符號不能用 \ / ' " < >
function checkTextValidity(a){
	return ( /^[^'"<>\\]+$/.test(a) ) ? 1 : 0;
}
