// ## Application Code   

ABApp.authorize = function(token, username, userid){
  ABApp.sharedStorageManager().set('token', token);
  ABApp.sharedStorageManager().set('username', username);
  ABApp.sharedStorageManager().set('userid', userid);
};

ABApp.deauthorize = function(){
  ABApp.sharedStorageManager().unset('token');
  ABApp.sharedStorageManager().unset('username');
  ABApp.sharedStorageManager().unset('userid');
  return true;
};

// Wait for the document to be ready.
document.observe('dom:loaded', function(){

	ABApp.behaviors['SubscriptionManager#popstream'] = function(){
		return (this
    // We want to add specific behavior for the beginning of this pull.
    // This stuff should be abstracted into a module, since it applies to any streams with a reload button.
		.addHook('pullBegin', function(){
      this.element.down(".command a").update("<div class='spinner small' alt='Loading'></div>");})
    .addHook('pullComplete', function(){
      this.element.down(".command a.pull").update("<img src='/images/load_more.png' alt='Load More'/>");})
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
  ABApp.stream.client = new Faye.Client('http://bubbles.local/faye');
  
  // Add extensions
  ABApp.stream.client.addExtension(MessageIDHandler);
  ABApp.stream.client.addExtension(ClientAuth);
  ABApp.stream.client.addExtension(MentionHandler);
  ABApp.stream.client.addExtension(GroupFilter);             
  ABApp.stream.client.addExtension(Threader);             
  
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
    "button.local_popup:click,a.local_popup:click":function(event){ 
      Event.stop(event); 
      if (this.value ===undefined){
        var value = this.readAttribute('value')
      } else {
        var value = this.value;
      }
      EUWindowWaker.wake(value);
    },        
    // Publisher for the main chat channel. 
    "form.publisher:submit":function(event){
      Event.stop(event);
      var el = this.down('input[type=text]');
      var channel = $$('li.tracker.active').first().readAttribute('data-channel'); 
      ABApp.channels[channel].send($F(el));
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
    },   
    "a.inactive:click":function(event){
      Event.stop(event);
    },
    "a[href='/logout']:click":function(event){
      Event.stop(event);
      if (ABApp.deauthorize()) {
        window.location.href = '/logout'
      }
    },                  
    'h1 a img':function(event){      
      var self = this;
      var el = new Element('img');
      el.addClassName('logo_hover');
      el.src = "/images/logo_hover.png";
      this.up('h1').appendChild(el.absolutize());
      Element.clonePosition(el, self);
      el.hide().setStyle("width:auto;height:auto;");
    },
    "#loader":function(){
      this.fade({delay:.3});
    },
    ".page.index":function(event){   
        $$('.nav ul')[0].insert('<li class="command"><a class="local_popup small" href="#" value="channel:join">Add</a></li>');
        /*$$('.nav ul')[0].insert('<li class="command"><a class="local_popup small" href="#" value="channel:create">Create</a></li>');*/

        ABApp.channels['chat'] = new SubscriptionManager(["chat"]).aka("<img src='/images/home.png' />")
                                                                  .createTracker()
                                                                  .createStreamContainer()
                                                                  .addBehavior('popstream')
                                                                  .showStreamContainer();

      //
      // This checks to see if there are any mentions in the mention stream container.
      // If there aren't, it'll run XHR to get all the mentions since the last time
      // the user pulled from this browser. Presently the server does not persist
      // a user's access history, although that is also planned. 
      // 

      //  Create an instance of SubscritionManager to watch for and handle mentions.


          ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')] = new SubscriptionManager(['mentions/'+ABApp.sharedStorageManager().get('username')]);
          ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')]
    					 .aka('<img src="/images/mention.png" />')
    					 // Register a tracker element for the channel.
    			     .createTracker()
    			     // This creates an element from an HBS template that handles the streams.
    			     .createStreamContainer()
    					 .addBehavior('popstream');

        SubscriptionWaker();
    },
    '.controls .reply:click':function(event){
      $$('.publisher input')[0].value = "reply[" + $$('.tracker.active')[0].readAttribute('data-channel') + "][" + this.up('.message').readAttribute('data-mid') + "] ";
      $$('.publisher input')[0].focus();
    },
    "#scroll_top:click":function(event){
      $$('h1')[0].scrollTo();
    }
  });
                      
  // ### Run at Load Time
                                 
  // Automatically logs a user in if their token is saves.
  if (ABApp.sharedStorageManager().get('username') != ""){
    /*ABApp.channels['chat'] = new SubscriptionManager(["chat"]).setStreamContainer($('main_stream'))
                                                              .addBehavior('popstream'); */
                                                              


  }    



});


