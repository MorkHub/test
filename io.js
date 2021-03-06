module.exports = function ( app, db, io, host, crypto )
{
	// client-server communication
	io.on('connection', function ( socket )
	{
		socket.emit ( 'broadcast', "Connected! :-)");
		socket.emit ( 'connected' );
		socket.on ( 'gate_data', function ( data ) {
			socket.emit ( 'broadcast', "Thanks for the data!" );
		});

		socket.on ( 'login', function ( data )
		{
			db.openSync ( "utf8" );
			var usr = data.usr;
			var pwd = crypto.decrypt ( data.pwd );
			if ( db.checkFieldExists ( "users", usr ) )
			{
				var user = db.getField ( "users", usr );
				if ( user.password === pwd )
				{
					console.log ( "      +  " + user.name + " has signed in (sandbox)" );
					socket.emit ( "login_response", { name: user.name, username: user.username } )
				}
			}
		});
		socket.on ( 'save_data', function ( data )
		{
			db.openAsync( "utf8", function()
			{
				if ( db.checkFieldExists ( "users", data.user.username ) )
				{
					var user = db.getField ( "users", data.user.username );
					user.files = user.files || {};
					user.files [ data.saveData.project.name ] = data.saveData;
					// console.log(data.saveData);
					console.log ( "      -> " + user.username + ", uploaded \"" + data.saveData.project.name + "\" by \"" + data.saveData.project.author + "\"." );
					db.set ( "users", data.user.username, user );
					socket.emit( "save_response", true );
				} else { socket.emit( "save_response", "Invalid user" ); }
			});
		});

		socket.on ( 'load_data', function ( data )
		{
			var user = data.user,
					target = data.target;
			user.username = user.username;
			user.password = crypto.decrypt ( user.password );
			db.openAsync ( "utf8", function()
			{
				if ( db.checkFieldExists ( "users", user.username ) )
				{
					var userObj = db.getField ( "users", user.username );
					var saveData = userObj.files[target] || { gates: {}, wires: {}, project: { name: "", desc: "",author: "" } };
					if ( user.password = userObj.password && saveData.project.name.trim() !== "" )
					{
						console.log ( "      <- " + user.username + ", downloaded \"" + saveData.project.name + "\" by \"" + saveData.project.author + "\"." );
						socket.emit ( "load_data", saveData);
					} else { socket.emit ( 'delete_error', { type: "danger", title: "Delete error", msg: "Password incorrect." } ); }
				} else { socket.emit ( 'load_error', { type: "danger", title: "Load error", msg: "User not found." } ); }
			});
		});

		socket.on ( 'delete_data', function ( data )
    {
      var user = data.user,
          target = data.target;
      user.username = user.username;
      user.password = crypto.decrypt ( user.password );
      db.openAsync ( "utf8", function()
      {
        if ( db.checkFieldExists ( "users", user.username ) )
        {
          var userObj = db.getField ( "users", user.username );
          if ( user.password = userObj.password )
          {
						userObj.files = userObj.files || {};
						delete userObj.files[target];
						db.set ( "users", user.username, userObj );
            console.log ( "      xx " + user.username + " deleted " + target );
          } else { socket.emit ( 'delete_error', { type: "danger", title: "Delete error", msg: "Password incorrect." } ); }
        } else { socket.emit ( 'load_error', { type: "danger", title: "Load error", msg: "User not found." } ); }
      });
    })

	});
}
