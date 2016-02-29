var myRootRef = new Firebase('https://ilecture.firebaseio.com/');

myRootRef.child('rooms').once('value', function(data1){
	console.log(data1.val());
	// 清除超過 3天 的 rooms
	var now = timestamp.get().num;
	for( var key in data1.val() ){
		if( Math.abs( now - parseInt(key.substr(5)) ) > 86400000*7*20 ){
			console.log( 'remove->'+key );
			myRootRef.child('rooms').child(key).child('code').once('value', function(data2){
				myRootRef.child('codes').once('value', function(data3){
					var ary = JSON.parse( data3.val().array ), index = ary.indexOf(data2.val());
					if( index!=-1 ){
						ary.splice(index, 1);
					}
					myRootRef.child('codes').set({'array': JSON.stringify(ary)});
				});
			});
			myRootRef.child('rooms').child(key).remove();
		}
	}
});

$(document).on('click', '#create-room', function(){
	$('body').addClass('blur');
	var roomId = 'room_' + timestamp.get().num, roomCode = $.password(4), authNumber = RandomNumber(10);
	myRootRef.child('codes').once('value', function(data){
		var a = data.val() || null;
		if( a === null ){  // codes 不存在
			var ary = [roomCode];
		}else{
			var ary = JSON.parse( a.array ), num = ary.indexOf(roomCode);
			while( num >= 0 ){
				roomCode = $.password(4);
				num = ary.indexOf(roomCode);
			}
			ary.push(roomCode);
		}
		myRootRef.child('codes').set({'array': JSON.stringify(ary)}, function(error){
			if(error){
				console.log('Synchronization failed');
				alert('Synchronization failed');
			}else{
				console.log('Synchronization succeeded');
				myRootRef.child('rooms').child(roomId).set({'sName': 0, 'code': roomCode, 'auth': authNumber, 'mood': '0_0', 'speed': '0_0', 'messages': JSON.stringify([]), 'question': 'null', 'online_s': JSON.stringify([])}, function(error){
					if(error){
						console.log('Synchronization failed');
						alert('Synchronization failed');
						$('body').removeClass('blur');
					}else{
						console.log('Synchronization succeeded');
						window.location.href = './teacher/index.html?room_id='+roomId+'&code='+roomCode+'&auth='+authNumber;
					}
				});
			}
		});
	});
});

// 產生 auth 亂數
function RandomNumber(num){
    var ary = new Array("0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"), Str = '';
    for ( var i=1; i<=num; i++ ){
        var index = Math.floor(Math.random()*ary.length);
        Str += ary[index];
    }
  　return Str;
}
