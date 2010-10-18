// ## ABApp
// ABApp is the main application namespace. Its typically customized
// on a per-application basis.
if (ABApp === undefined){
	ABApp = {};
}
var ABApp = {
  stream: {},   
	channels: {},
  cache: $H(), 

  //  Returns the shared instance of the StorageManager for interacting with the HTML5 localStorage API.  
  sharedStorageManager: function(){
  	if (ABApp._sharedStorageManager === undefined){
  		ABApp._sharedStorageManager = new StorageManager();
  	}
  	return ABApp._sharedStorageManager;
  },                 
  
  // Gets the shared instance of the FragmentManager for interacting with Javascript dynamic URL's.
  sharedFragmentManager: function(fields, defaults, callback){
  	if (ABApp._sharedFragmentManager === undefined){
  		ABApp._sharedFragmentManager = new FragmentManager(fields, defaults, callback);
  	}
  	return ABApp._sharedFragmentManager;
  },                             

  // Returns the shared instance of WindowManager that keeps track of EUWindow instances, layering, and XHR.
  sharedWindowManager: function(){
  	if (ABApp._sharedWindowManager === undefined){
  		ABApp._sharedWindowManager = new WindowManager();
  	}
  	return ABApp._sharedWindowManager; 
  },              

  generate_uuid: function() {
      // http://www.ietf.org/rfc/rfc4122.txt
      var s = [];
      var hexDigits = "0123456789ABCDEF";
      for (var i = 0; i < 32; i++) {
          s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
      }           

      s[12] = "4";
      
      s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

      var uuid = s.join("");
      return uuid;
  }
}; 

 

// ### ClientAuth              
//  An extension for subscription authentication.
//  Uses a stored value from localStorage for the token  and username. 
ClientAuth = {

  // Adds authentication information to outgoing subscription messages and calls a callback function to continue sending.
  outgoing: function(message, callback){
    if (message.channel == '/meta/subscribe'){
      message.ext = {};
      message.ext.authToken = ABApp.sharedStorageManager().get('token');
      message.ext.authUser = ABApp.sharedStorageManager().get('username');
    }                      
    callback(message);
  },      

  // Inserts welcome notification into messages resulting from a subscription. 
  incoming: function(message, callback){
    if (message.channel == "/meta/subscribe" && message.successful == false){
      message.text = message.error;  
      ABApp.channels['chat'].receive(message);
    } else if (message.channel == "/meta/subscribe" && message.successful == true){
      ABApp.stream.client.publish(message.subscription[0], {
        text:(" joined the conversation on " + message.subscription[0]), 
        username: ABApp.channels['chat'].getUsername(), 
        persists: "false"});
    }
    callback(message);
  }
};       

 
// ### MentionHandler              
//  An extenson to pubsub providing mention detecting and processing.

var MentionHandler = {                      
  
  // Update the message count
  incoming: function(message, callback){
    if (message.channel == ('/mentions/'+ABApp.sharedStorageManager().get('username')) && 
        message.data && 
        message.data.persists != 'false')
    {
//      var mentions = $$('.mentions .count').first();
//      var count = parseInt(mentions.innerHTML) || 0;
//      count++;   
      ABApp.channels['mentions/'+ABApp.sharedStorageManager().get('username')].incrementCounter();
			new ABMessage("<span class='user'>"+message.data.username+" mentioned you&hellip;</span>"+message.data.text, {timeout: 10});
      //mentions.update(count).addClassName('new');
    }
    callback(message); 
    return null;
  }
};   
                                                       
// ## StorageManager              
// Aids in interacting with the HTML5 localStorage API.
def ('StorageManager')({
                           
  init: function(){},   
  //  Returns the data associated with a key or `false` of no data exists.
  get: function(key){
	  var data = localStorage.getItem(key);
		if (data == "" || data == null){
			return false;
		} else {
			return data;
		}
  }, 
  // Sets data to a key in localStorage or overwrites it if it exists. Returns the set value to act chainable.
  set: function(key, value){
    localStorage.setItem(key, value);
    return value; // Look how easily that chains...
  }
});  

// ## SubscriptionManager
//  Provides easy access to subscriptions and a facility for the storage and execution of callbacks.

def ("SubscriptionManager")({
  // * channels: an _Array_ of channel names without the initial slashes.
  // * element (optional): an _Element_ for the messages to be inserted into.
  init: function(channels, element){
    var self = this; // Shouldn't I just bind functions to the contexts I'm working with :)
    self.hooks = {};
    self.element = element || null;
    if (self.element){
      self.element.writeAttribute('data-channel', channels[0]);
    }
    self.channels = channels;
    self.subscriptions = self.channels.collect(function(channel){
      return ABApp.stream.client.subscribe("/"+channel, function(message){self.receive(message);});
    });
    return this;
  },  
  // Creates an `Element` from a template and readys it for use with a stream. 
  createStreamContainer: function(options){
    var data = {};
    data.channel = this.channels[0];
    this.element = EUTemplateWaker.wake('stream_container', data);
    return this;
  },
  // Add a function to `ubscriptionManager` to call at a given point. 
  // Hooks include:
  // * `pullComplete` called after a `pull` operation is completed. 
  // * `pullSuccess` called after a _successful_ `pull` operation.
  // * `pullBegin` called when a `pull` begins.
  // * `pulledContent` after a `pull` has updated content. 
  addHook: function(name, fun){
    this.hooks[name] = fun;
    return this;
  },
  // Registers an element to track incoming messages.
  // If the element has a `.count` child, it will be registered
  // as the channel's counter.
  registerTracker: function(element){
    this.tracker = element.writeAttribute('data-channel', this.channels[0]);
    if (this.tracker.down('.count')){
      this.registerCounter(this.tracker.down('.count'));
    }
    return this;
  },
  registerCounter: function(element){
    this.counter = element;
    return this;
  },  
  updateCounter: function(value){
    var counter = this.getCounter();
    if (counter){
      counter.update(value);
    }
    return this;
  },
  getCounter: function(){
    if (this.counter != undefined){
      return this.counter;
    }else{
      return false;
    }
  },
  incrementCounter: function(){
    var counter = this.getCounter();
    if (counter){
      var count = parseInt(counter.innerHTML) || 0;
      count++;
      counter.update(count);
    }
  },
  // Uses XHR to pull messages from the server, optionally updating the counter and stream element if they exist.
  pull: function(options){
    var _onComplete = this.hooks['pullComplete'] || function(transport){};
    var _onSuccess = this.hooks['pullSuccess'] || function(transport){};
    var _onBegin = this.hooks['pullBegin'] || function(transport){};
    var _onContentInserted = this.hooks['pulledContent'] || function(transport){};
    
    if (options && options.since){
      var date = options.since
    } else {
      var date = ABApp.sharedStorageManager().get('channel:'+self.channels[0].sub("/","_",5)+':pull');
    }
    
    var self = this;

    _onBegin.bind(this)();

/*    var counter = $$('.'+channel_name+' .counter').first(); */
   
/*    this.update("Please wait&hellip;");
    el.update("you're seeing everything").addClassName('inactive'); */    
    
    new Ajax.Request("/"+self.channels[0], {
      method: 'get',
      parameters: {since: date},
      onSuccess: function(transport){
        var data = transport.responseText.evalJSON();
        data.each(function(message){
          self.incrementCounter();
          self.receive(message);
        });
        
        var ndate = new Date();
        ABApp.sharedStorageManager().set('channel:'+self.channels[0].sub("/","_",5)+':pull', ndate.toString());
        
        if (data.size() > 0){
          _onContentInserted.bind(this)();
        }
        _onSuccess.bind(this, transport)();
      },
      onComplete: _onComplete.bind(this)
    });
    return this;
  }, 
  // Stop receiving messages on this channel.
  cancel: function(){this.subscription.cancel();},
  getUsername: function(){return ABApp.sharedStorageManager().get('username');},
  // Receive a message on this subscription and insert it into an element as a `p` tag. If no element was provided
  // log the message.
  // *TODO* persist undisplayed messages in localStorage for later display.
  receive: function(message){    
    if (this.element){
      var el = new Element("p");
      if (message.persists == 'false'){el.addClassName("persists-false");}

      this.element.insert(
        {top: el.update("<span class='user'>" + message.username + "</span><span class='text'>" + message.text+"</span>")
                  .hide()
                  .appear()
        });      
        
      Event.addBehavior.reload.defer(); 
    }else{
      /*console.log("Unrouted Message:" + message.text);*/
    }
  },  
  // Send text to the server for publishing.
  send: function(send_text){
    ABApp.stream.client.publish("/"+this.channels[0], {text: send_text, username: this.getUsername()});
  },
});    


// ## FragmentManager
// Helps manage url fragments for applications using client-side views.
def("FragmentManager")({
	init: function(lurl, defaults, callback){ 
		if (location.hash == "" || location.hash == "#"){
			this.value = window.location.hash;			
		} else {
			//this.value = window.location.hash.substring(1);
		}
		this.template = new Template(lurl);
		this.parts = $H(defaults);           
		if (typeof(callback) === 'function'){
			this.callback = callback;
		}else{
			this.callback = function(){return this;}
		}
		
		return this.setupChecker();
	},   
	setupChecker: function(){
		this.checker = new PeriodicalExecuter(this._checker.bind(this), 0.5);
		return this;
	},
	_checker: function(){
		if (location.hash != "#"+this.value && location.hash != this.value){
    	console.log(window.location.hash + " vs. " + this.value);
			this.checker.stop();
			this.updateHash().callback().setupChecker();
		}
	},
	set: function(key, value){
		this.parts.set(key, value);
		
		return this;
	},
	updateHash: function(){  
		if (this.value != undefined){
			window.location.hash = this.value;			
		}else{
			this.value = window.location.hash.substring(1);
		}
		return this;
	},
	update: function(value){
		this.value = value;   
		return this;
	},
	render: function(){
		this.update(this.template.evaluate(this.parts.toTemplateReplacements()));
		return this;
	}
});
         
// ## WindowManager
// Manages a collection of _EUWindow_ instances and controls their z-order.
def("WindowManager")({
  init: function(){      
    this.pool = $H(); 
    this.EUWMProxyCount = 100;
    
    if (!$('app_element')){
			this.element = new Element('div', {"id":"app_element"});
			document.body.appendChild(this.element)
		}else{
			this.element = $('app_element');
		}
  },
  // Add a window to the pool.
  add: function(instance){
    var key = ABApp.generate_uuid();
    this.pool.set(key, instance);      
    
    instance.element.writeAttribute('data-eid', key);
  },                              
  recall: function(element){
    var id = element.readAttribute('data-eid');
    return this.pool.get(id);
  }
});                                  

// ## Application Code

// Wait for the document to be ready.
document.observe('dom:loaded', function(){
  document.stopObserving('dom:loaded');   

	window.onresize = ABMessageResizer;	
	window.onscroll = ABMessageResizer;
                                          
  // Setup the Faye client.
  ABApp.stream.client = new Faye.Client('http://desk.austinbales.com/faye');
  
  // Add extensions
  ABApp.stream.client.addExtension(ClientAuth); 
  ABApp.stream.client.addExtension(MentionHandler);         
       
  
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
    "form.publisher input[type=text]:keypress":function(event){
	  	console.log(event.keyCode);
		},
    // Save the auth token.
    // * To be replaced by actual login system.
    "form.save_auth_token:submit":function(event){     
      Event.stop(event);
      var token = $F(this.down("input[type=text][name=token]"));
      var username = $F(this.down("input[type=text][name=username]"));
      ABApp.sharedStorageManager().set('token', token);
      ABApp.sharedStorageManager().set('username', username);

      window.location.href = "/";
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
      var stream_element = ABApp.channels[channel].element;
      
      // Clones the position of the tracker onto the stream container.
      Element.clonePosition(stream_element, self, {
        setWidth:false,
        setHeight:false,
        offsetTop: 45,
        offsetLeft: -255});
      
      // Updates visual states.  
      if (self.hasClassName('active')){
				self.removeClassName('active');
				self.down('.count').update("0").removeClassName("new");
				}
      else{    
				self.down('.count').update("0").removeClassName("new");
				self.addClassName('active');
			}
      
      stream_element.toggle();
    },         
    // Load additional mentions.
    ".popup_stream .command a:click":function(event){
      Event.stop(event);
      var channel_name = this.up('.messages').readAttribute("data-channel");
      ABApp.channels[channel_name].pull();      
    },            
    
    "form.remote:submit":function(event){
			Event.stop(event);
      var self = this;
			self.request({
				onSuccess: function(transport){          
				  if (self.hasClassName('closes')){
  					self.up('.form').fade({duration: .15});				    
				  }
          new ABMessage(transport.responseText, {type: 'success'});
				},
				onFailure: function(transport){
          new ABMessage(transport.responseText, {type: 'error'});
				}
			});
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
    ABApp.channels['chat'] = new SubscriptionManager(["chat"], $('main_stream'));  
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
          // Register a tracker element for the channel.
          .registerTracker($$('.mentions.tracker').first())
          // This creates an element from an HBS template that handles the streams.
          .createStreamContainer({'style':'display:none'})
          // We want to add specific behavior for the beginning of this pull.
          // This stuff should be abstracted into a module, since it applies to any streams with a reload button.
          .addHook('pullBegin', function(){
            this.element.down(".command a").update("Fetching mentions&hellip;");})
          .addHook('pullComplete', function(){
            this.element.down(".command a").update("Load More");})
          .addHook('pulledContent', function(){
            this.getCounter().addClassName('new');})
          // This pulls content from the stream that was published since the last time we checked. 
          .pull();                                            
  } // End of if logged in block.
  
});


