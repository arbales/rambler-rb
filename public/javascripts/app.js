// ## Application Code

// Wait for the document to be ready.
document.observe('dom:loaded', function(){

	ABApp.behaviors['SubscriptionManager#popstream'] = function(){
		return (this
    // We want to add specific behavior for the beginning of this pull.
    // This stuff should be abstracted into a module, since it applies to any streams with a reload button.
		.addHook('pullBegin', function(){
      this.element.down(".command a").update("Fetching messages&hellip;");})
    .addHook('pullComplete', function(){
      this.element.down(".command a.pull").update("Load More");})
    .addHook('pull500', function(){
      this.element.down(".command").update("Unable to connect to archive.");
    })
    .addHook('pulledContent', function(){
      this.getCounter().addClassName('new');})
		.pull()
		);
	};
	
  document.stopObserving('dom:loaded');   

	window.onresize = ABMessageResizer;	
	window.onscroll = ABMessageResizer;
                                          
  // Setup the Faye client.
  ABApp.stream.client = new Faye.Client('http://desk.austinbales.com/faye');
  
  // Add extensions
  ABApp.stream.client.addExtension(ClientAuth); 
  ABApp.stream.client.addExtension(MentionHandler);
  ABApp.stream.client.addExtension(GroupFilter);   
  
  
  if($$('.save_auth_token').size() > 0) { // End of if logged in block.
    var el =$$('.save_auth_token').first();
    var token = $F(el.down("input[type=text][name=token]"));
    var username = $F(el.down("input[type=text][name=username]"));
    var userid = $F(el.down("input[type=text][name=userid]"));
    ABApp.sharedStorageManager().set('token', token);
    ABApp.sharedStorageManager().set('username', username);
    ABApp.sharedStorageManager().set('userid', userid);

    window.location.href = "/";
  }     
       
  
  // ### Event Delegation
  Event.addBehavior({  
    // Sets up th subscription to the main chat channel.
    "form.login:submit":function(event){
      Event.stop(event);      
      var el = this.down("input[type=text]");
      var username = $F(el).toLowerCase();
      ABApp.channels['chat'] = new SubscriptionManager("chat", $('main_stream'));

      this.fade(/*{duration:.25, queue:'end'}*/);
      $$('form.publisher').first().appear();
      
      window.onbeforeunload = function (){
        return ABApp.channels['chat'].send("left the chat.");
      }
      
    }, 
    "button.local_popup:click":function(event){
      EUWindowWaker.wake(this.value);
    },        
    // Publisher for the main chat channel. 
    "form.publisher:submit":function(event){
      Event.stop(event);
      var el = this.down('input[type=text]');
      ABApp.channels['chat'].send($F(el));
      el.clear();
    }, 
    "form.publisher input[type=text]:drop":function(event){
    },  
    // Image zoomer
    ".messages p img:click":function(event){
      var orig = this;
      var el = orig.clone().absolutize();
      Element.clonePosition(el, orig, {setWidth: false, setHeight: false});
      document.body.appendChild(el.setStyle({
        'height':'auto',
        'width': 'auto',
        'border':'4px solid #fff',
        '-webkit-box-shadow':'rgba(0,0,0,.15) 0px 2px 4px 1px'
        }));
      orig.morph("opacity:0");
      el.observe('mouseout', function(event){
        el.fade({duration:.25});
        orig.morph("opacity:1",{duration:.25});
      })
    }, 
    /*"form.publisher input[type=text]:keypress":function(event){
	  	console.log(event.keyCode);
		},*/
    // Save the auth token.
    // * To be replaced by actual login system.
    "input[name=channel[name]]:blur":function(){
      var value = this.value.sub(" ", "-");
      if (value.startsWith("/")){
        value = value.sub("/", "");
      }
      this.value = value;
    },
    "form:submit":function(){
       chan = this.down('input[name=channel[name]]');
      if (chan){
        var value = chan.value.sub(" ", "-");
        if (value.startsWith("/")){
          value = value.sub("/", "");
        }
        chan.value = value;
      }
    },                                       
    // Pre-fill publisher when a user replys to a message.
    ".messages p span.user:click":function(){
      $$('form.publisher').first().down("input[type=text]").value = this.innerHTML.strip() + " ";
      $$('form.publisher').first().down("input[type=text]").focus();
    },    
    
    // Open the mentions panel.
    "li.tracker:click":function(){
      var self = this;
      var channel = this.readAttribute('data-channel');
      ABApp.channels[channel].showStreamContainer(self);
    },         
    // Load additional mentions.
    ".command a.pull:click":function(event){
      Event.stop(event);
      var channel_name = this.up('.messages').readAttribute("data-channel");
      ABApp.channels[channel_name].pull();      
    },            
    ".command a.focus:click":function(event){
      Event.stop(event);
      var channel_name = this.up('.messages').readAttribute("data-channel");
			var old_channel_name = $('main_stream').readAttribute("data-channel");
			ABApp.channels[old_channel_name].createTracker().createStreamContainer().addBehavior("popstream");
			ABApp.channels[channel_name].unregisterElements().setStreamContainer($('main_stream'));
			//ABApp.channels[channel_name].unregisterTracker().swapStreamContainers(ABApp.channels[old_channel_name].createTracker());
			Event.addBehavior.reload();
		},
		'.command a.leave:click':function(event){
      Event.stop(event);
      var channel_name = this.up('.messages').readAttribute("data-channel");
      ABApp.channels[channel_name].cancel();
		},
    "form.remote:submit":function(event){
      if (!this.up('.EUWindow')){
  			Event.stop(event);
        var self = this;
  			$$("#" + self.identify() + ' input.from_ls').each(function(s){ 
  				s.value = ABApp.sharedStorageManager().get(s.readAttribute('name'));
  			});
  			self.request({
  				onSuccess: function(transport){          
  				  if (self.hasClassName('closes')){
    					self.up('.form').fade({duration: .35});				    
  				  }
            new ABMessage(transport.responseText, {type: 'success'});
  				},
  				onFailure: function(transport){
            new ABMessage(transport.responseText, {type: 'error'});
  				}
  			});
		  }
		},  
		
    // General handler for popup links. Utilizes an _EUWindow_
		"a.popup:click":function(event){
      var el = this;
      Event.stop(event);
      var euw = new EUWindow();
      euw.insertWithMessage();
      euw.insertFromURL(this.readAttribute("href"));
      if (el.hasClassName("_sender_closes")){
        EUWindow.destroyWindow(el.up(".EUWindow"));
      }
    }
  });
                      
  // ### Run at Load Time
                                 
  // Automatically logs a user in if their token is saves.
  if (ABApp.sharedStorageManager().get('username') != ""){
    ABApp.channels['chat'] = new SubscriptionManager(["chat"]).setStreamContainer($('main_stream')).addBehavior('popstream');  
    if ($$('.login').size() > 0){
      $$('.login').first().fade();
      $$('form.publisher').first().appear();
    }
      
  //
  // This checks to see if there are any mentions in the mention stream container.
  // If there aren't, it'll run XHR to get all the mentions since the last time
  // the user pulled from this browser. Presently the server does not persist
  // a user's access history, although that is also planned. 
  // 
  
  //  Create an instance of SubscritionManager to watch for and handle mentions.
      ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')] = new SubscriptionManager(['mentions/'+ABApp.sharedStorageManager().get('username')]);
      ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')]
					 .aka('mentions')
					 // Register a tracker element for the channel.
			     .createTracker()
			     // This creates an element from an HBS template that handles the streams.
			     .createStreamContainer()
					 .addBehavior('popstream');
                                            
    SubscriptionWaker();
  }
  
});


