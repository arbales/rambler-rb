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
SubscriptionWaker = function(){
  var memory = ABApp.sharedStorageManager().get('channels:remembered');
  if (memory){
    var mem_a = memory.split(",");
    mem_a.each(function(s){
      ABApp.channels[s] = new SubscriptionManager([s]).createTracker().createStreamContainer().pull();
    });
  }
  
  var smemory = ABApp.sharedStorageManager().get('sidebars:remembered');
  if (smemory){
    var mem_b = smemory.split(",");
    mem_b.each(function(d){
      ABApp.channels[d] = new SidebarManager([d]).createTracker().createStreamContainer().pull();
    });
  }
}

def ("SubscriptionManager")({
  // * channels: an _Array_ of channel names without the initial slashes.
  // * element (optional): an _Element_ for the messages to be inserted into.
  init: function(channels, element, force){
    if (ABApp.channels[channels[0]] != undefined){
      new EUMessage("You've already joined this channel.", "You can view it by clicking the appropriate tab on your ramblobar.");
    }
    var self = this; // Shouldn't I just bind functions to the contexts I'm working with :)
    self.hooks = {};
    self.last_xhr_timestamp = false;
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
  forget: function(){
    var memory = ABApp.sharedStorageManager().get('channels:remembered');
    if (memory){
      var mem_a = memory.split(",").without(this.channels[0]);
      ABApp.sharedStorageManager().set('channels:remembered', mem_a.join(","));
    }
    return this;
  },
  remember: function(){
    var memory = ABApp.sharedStorageManager().get('channels:remembered');
    if (memory){
      var mem_a = memory.split(",");
      if (!mem_a.include(this.channels[0])){
        mem_a.push(this.channels[0]);
      }
      ABApp.sharedStorageManager().set('channels:remembered', mem_a.join(","));
    }else{
      var string = this.channels.join(",")
      ABApp.sharedStorageManager().set('channels:remembered', string);
    }
    return this;
  },   
  swapStreamContainers: function(subs){   
		var old_el = this.element;
		old_el.removeAttribute('data-channel');
		old_el.writeAttribute('data-channel', subs.channels[0]);
		this.element = subs.element;           
		this.element.removeAttribute('data-channel');
		this.element.writeAttribute('data-channel', this.channels[0]);
		subs.element = old_el;
		
		var subs_ems = this.element.innerHTML;
		var my_ems = subs.element.innerHTML;        
		
		this.element.update(my_ems);
		subs.element.update(subs_ems);
//		subs.element.insert({top:subs_ems});
    return this;
	},                                                                        
	setStreamContainer: function(element){  
		if (this.element != undefined){
			var content = this.element.innerHTML;
		}else{var content = false;}
		this.element = element;
		this.element.writeAttribute('data-channel', this.channels[0]);
//		this.element.select("p:not(.command)").invoke('remove').invoke();
		if (content){this.element.update(content);}
		return this;
	},
  // Creates an `Element` from a template and readys it for use with a stream. 
  createStreamContainer: function(options){
    var data = {}; 
		if (this.element != undefined){
			data.contents = this.element.innerHTML;
		}
    data.channel = this.channels[0];
    this.element = EUTemplateWaker.wake('stream_container', data);
    return this;
  },
  showStreamContainer: function(button){
    $$('.popup_stream').without(this.element).invoke('hide');
    $$('li.tracker').without(button).invoke('removeClassName','active');
    // Clones the position of the tracker onto the stream container.
    Element.clonePosition(this.element, button, {
      setWidth:false,
      setHeight:false,
      offsetTop: 45,
      offsetLeft: -255});
    
    // Updates visual states.  
    if (button.hasClassName('active')){
			button.removeClassName('active');
			button.down('.count').update("0").removeClassName("new");
			}
    else{    
			button.down('.count').update("0").removeClassName("new");
			button.addClassName('active');
		}
    
    this.element.toggle();
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
  getHook: function(name){
    return ((this.hooks[name]) ? this.hooks[name] : function(){});
  },
  createTracker: function(){
		var tracker = new Element("li").update(this.getName() + " <span class='count'>0</span>");
		$$('.nav ul').first().insert(tracker);
		this.registerTracker(tracker);
		return this;
  },
  // Registers an element to track incoming messages.
  // If the element has a `.count` child, it will be registered
  // as the channel's counter.               
  registerTracker: function(element){
    this.tracker = element;
    this.tracker.writeAttribute('data-channel', this.channels[0]);
    if (this.tracker.down('.count')){
      this.registerCounter(this.tracker.down('.count'));
    }
    if (!this.tracker.hasClassName('tracker')){
      this.tracker.addClassName('tracker');
    }
    return this;
  }, 
  unregisterTracker: function(){
		if (this.tracker != undefined){
			this.tracker.removeAttribute('data-channel');
			this.counter = false;
			this.tracker.fade().remove();
			this.tracker = false;			
		}      
		return this;
	},            
	unregisterStreamContainer: function(){
		if (this.element != undefined){
			this.element.removeAttribute('data-channel');
			this.element.fade().remove();
			this.element = false;
		}   
		return this;
	},  
	unregisterElements: function(){
		return this.unregisterTracker().unregisterStreamContainer();
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
    return this;
  },
  highlightCounter: function(){
    var counter;
    if (counter = this.getCounter()){
      counter.addClassName('new');
    }
    return this;
  },
  // Uses XHR to pull messages from the server, optionally updating the counter and stream element if they exist.
  pull: function(options){
    var _onComplete = this.hooks['pullComplete'] || function(transport){};
    var _onSuccess = this.hooks['pullSuccess'] || function(transport){};
    var _onBegin = this.hooks['pullBegin'] || function(transport){};
    var _onContentInserted = this.hooks['pulledContent'] || function(transport){};
    
    var date = ABApp.sharedStorageManager().get('channel:'+this.channels[0].sub("/","_",5)+':pull');
    
    var self = this;

    this.getHook('pullBegin').bind(this)();
    
    new Ajax.Request("/archive/"+self.channels[0], {
      method: 'get',
      // If date != false, the server will return only the posts created
      // since the date — if there are none, the server will fall back 
      // to pagination and return the first 20 posts. 
      parameters: {since: date, before: self.last_xhr_timestamp},
      onSuccess: function(transport){
        var data = transport.responseText.evalJSON().reverse();
        if (data.size() == 0){
          self.element.down('.command .pull').update('End of Stream').removeClassName("pull").addClassName("inactive");
        }
        
        // If this manager hasn't performed an XHR pull before, then
        // it will just receive the posts like normal, and note the timestamp
        // of the earliest post it got.
        if (self.last_xhr_timestamp == false){
          self.last_xhr_timestamp = data[0].created_at;
          data.each(function(message){
            self.receive(message);
          });
        // If the manager _has_ done an XHR pull then it will receive the posts
        // alerting the user, and insert them at the bottom of the streamContainer.
        // This should be methodized.
        }else{
          data.each(function(message){
            self.last_xhr_timestamp = message.created_at;
            var el = new Element("p");
            self.element.down('p.command').insert({before:el.update(message.text)});
          });
        }
        
        var ndate = new Date();
        ABApp.sharedStorageManager().set('channel:'+self.channels[0].sub("/","_",5)+':pull', ndate.toString());
        
        if (data.size() > 0){
          _onContentInserted.bind(this)();
        }
        this.getHook('pulledContent').bind(this, transport)();
      },
      on500: this.getHook('pull500').bind(this),
      onComplete: this.getHook('pullComplete').bind(this)
    });
    return this;
  }, 
  // Stop receiving messages on this channel.
  cancel: function(){
    this.forget();
    this.unregisterElements();
    new ABMessage('You&rsquo;ve left ' + this.channels[0] + '.');
    this.subscription.cancel();
  },
  getUsername: function(){return ABApp.sharedStorageManager().get('username');},
  // Receive a message on this subscription and insert it into an element as a `p` tag. If no element was provided
  // log the message.
  // *TODO* persist undisplayed messages in localStorage for later display.
  receive: function(message){ 
    var date = ABApp.sharedStorageManager().get('channel:'+this.channels[0].sub("/","_",5)+':pull');
       
    if (this.element){
      
      var el = new Element("p");
      if (message.created_at == undefined){
        if (message.persists == 'false'){el.addClassName("persists-false");}else{this.incrementCounter()}
        if (message.invitation != undefined){
          el.addClassName('invitation');
          el.writeAttribute('data-channel', message.invitation);
        }
        if (message.username != this.getUsername()){
          this.highlightCounter();
        }
      }else{
        var created = ISODate.convert(message.created_at);
        var old_date = new Date(date);
        if(created>old_date){
          if (message.username != this.getUsername()){
            this.highlightCounter();
          }
          this.incrementCounter();
        }
      }
      el.update("<span class='user'>" + message.username + "</span><span class='text'>" + message.text+"</span>").hide();
      this.element.insert({top: el.appear()});      
        
      Event.addBehavior.reload.defer(); 
    } else{
      /*console.log("Unrouted Message:" + message.text);*/
    }
  },  
  // Send text to the server for publishing.
  send: function(send_text){
    ABApp.stream.client.publish("/"+this.channels[0], {text: send_text, username: this.getUsername()});
  },   
	aka: function(name){ 
		this.alias = name;
	 	return this;
	},
	getName: function(){
		if (this.alias != undefined){
			return this.alias;
		}else{
			return this.channels[0];
		}
	},	
  addBehavior: function(name){
	  if (ABApp.behaviors['SubscriptionManager#'+name]){
			behavior = ABApp.behaviors['SubscriptionManager#'+name]
			return behavior.bind(this)();
 		}else{         
			throw("SubscriptionManager#addBehavior("+name+") that behavior is not available.");
			return false;
		}
	}
});   

def ("SidebarManager") << SubscriptionManager ({
  createTracker: function(){
		var tracker = new Element("li").update(this.getName() + " <span class='count'>0</span>");
		$$('.sidebars ul').first().insert(tracker);
		this.registerTracker(tracker);
		return this;
  },
  showStreamContainer: function(button){
    $$('.popup_stream').without(this.element).invoke('hide');
    $$('li.tracker').without(button).invoke('removeClassName','active');
    // Clones the position of the tracker onto the stream container.
    Element.clonePosition(this.element, button, {
      setWidth:false,
      setHeight:false,
      offsetTop: -4,
      offsetLeft: -600});
    
    // Updates visual states.  
    if (button.hasClassName('active')){
			button.removeClassName('active');
			button.down('.count').update("0").removeClassName("new");
			}
    else{    
			button.down('.count').update("0").removeClassName("new");
			button.addClassName('active');
		}
    
    this.element.toggle();
  },
  forget: function(){
    var memory = ABApp.sharedStorageManager().get('sidebars:remembered');
    if (memory){
      var mem_a = memory.split(",").without(this.channels[0]);
      ABApp.sharedStorageManager().set('sidebars:remembered', mem_a.join(","));
    }
    return this;
  },
  remember: function(){
    var memory = ABApp.sharedStorageManager().get('sidebars:remembered');
    if (memory){
      var mem_a = memory.split(",");
      if (!mem_a.include(this.channels[0])){
        mem_a.push(this.channels[0]);
      }
      ABApp.sharedStorageManager().set('sidebars:remembered', mem_a.join(","));
    }else{
      var string = this.channels.join(",")
      ABApp.sharedStorageManager().set('sidebars:remembered', string);
    }
    return this;
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