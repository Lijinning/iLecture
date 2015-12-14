var myRootRef = new Firebase('https://ilecture.firebaseio.com/');

// 產生hmtl
function gethtml(roomId,auth,mood,speed,sName,question){
	var html = '<p>roomId : '+roomId+'</p>'+
			'<p>auth : '+auth+'</p>'+
			'<p>mood : '+mood+'</p>'+
			'<p>speed : '+speed+'</p>'+
			'<p>sName : '+sName+'</p>'+
			'<p>question : '+question+'</p>';
	return html;
}

// 產生message hmtl
function getmulti_node_html(ary_mul){
	var html ='';
	for( var i=0, aryLen = ary_mul.length; i<aryLen; i++ ){
		for(var x in ary_mul[i] )
		html +='<p>'+x+' : '+ary_mul[i][x]+'</p>';
	}
	return html;
}

// 產生question hmtl
function getques_html(obj_room){
	var html = '';
	for( var x in obj_room ){
		if( x.indexOf('_')===1){
			var obj_ques = JSON.parse(obj_room[x]);
			html = '<p>qId : '+x+'</p>'+
					'<p>title : '+obj_ques.title+'</p>'+
					'<p>num : '+obj_ques.num+'</p>'+
					'<p>type : '+obj_ques.type+'</p>'+
					'<p>count : '+obj_ques.count+'</p>'+
					'<p>s : '+obj_ques.s+'</p>'+
					'</br>';
		}
	}
	return html;
}
// 產生roomlog
function getroomhtml(roomId){
	var roomRef = myRootRef.child('rooms').child(roomId);
	roomRef.once('value', function(data){
		console.log( data.val() );
		html = gethtml(roomId,data.val().auth,data.val().mood,data.val().speed,data.val().sName,data.val().question);
		meg_title ='<h3>message</h3>';
		meg_html = getmulti_node_html( JSON.parse(data.val().messages) );
		on_s_title ='<h3>online_s</h3>';
		on_s_html = getmulti_node_html( JSON.parse(data.val().online_s) );
		ques_title ='<h3>Allquestion</h3>';
		ques_html = getques_html(data.val());
		$('#container').append(html+meg_title+meg_html+on_s_title+on_s_html+ques_title+ques_html);
	});
}

