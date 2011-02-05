	// ## EUWindow           
	// Provides desktop-like windows in the browser. Modal windows, closable window, and draggable windows are supported.
	// Typically complemented by the 	WindowManager	 class for `zIndex` ordering and evented recall.
	
  EUWindow = Class.create({
		initialize:function(options){
	        this.element = new Element('div', {"class": "EUWindow"});
			this.options = {
				draggable: true,
				top: false,
				left: false, 
				position: true,
				type: 'informational',
			  	modal: false,
			  	closeable: true,
        // Should you want to have an `EUWindow` instance perform a callback after XHR, you can provide this
        // function to `new EUWindow({})`
			  afterCommunication: function(){},
				onSubmit: false,
		    };                            
		    
		    Object.extend(this.options, options || { });
        ABApp.sharedWindowManager().add(this);
		},   
		position: function(){
		  // Center the `EUWindow` on the screen.        
		 	if (this.options.position == true){
				if (this.options.left == false || this.options.top == false || this.options.left == undefined || this.options.top == undefined){  
					this.element.style.left= ((parseInt(document.viewport.getWidth()) - this.element.measure('width'))/2)+"px";
		        	this.element.style.top=((window.innerHeight-parseInt(this.element.measure('height')))/2)-10+"px"; 
				}else if(this.options.placement == 'corner'){
					this.element.style.left = this.options.left + "px";
					this.element.style.top = this.options.top + "px";
				}else{
					this.element.style.left = parseInt(this.options.left - (this.element.measure('width')/2)) + "px";
					this.element.style.top = (this.options.top - (this.element.measure('height')/2)) + "px";					
				}   
			}
 		},
		// #### Inserts the `EUWindow` into the DOM. 
		insert:function(options){
			    Object.extend(this.options, options || { });
				
				// Modal windows fire the `app:is_modal` event on `Element#app_element` which you
				// can listen for.
        if (this.options.modal == true){
  				$('app_element').fire('app:is_modal');
  			}			
				$('container').insert({after: this.element});
				/* new Effect.Opacity(this.element, {to: 1.0, duration:.2, delay:.1});*/
				var _instance = this;   
				this.position();
						
				// sets the window's `zIndex` in accordance with the `sharedWindowManager()`
				this.element.style.zIndex = (ABApp.sharedWindowManager().EUWMProxyCount);
				ABApp.sharedWindowManager().EUWMProxyCount++;   
				// Reload event delegation. Should use an event instead.
				//ABApp.fire('dom:updated');
 			  Event.addBehavior.reload.defer();
	
        // Listen for a nevermind button to be pressed
				this.element.observe('click', function(event){
					var element = event.findElement();             
					if (element.hasClassName('button-nevermind') || element.hasClassName('nevermind')){
						$('app_element').fire("app:standby")
						Event.stop(event);
						_instance.destroy(); 
					}
				});                          
				
        // Listen for a form submission.
				this.element.observe("submit", ((this.options.onSubmit == false) ? EUWindow.handleFormSubmission.bindAsEventListener(this) : this.options.onSubmit.bindAsEventListener(this)));
				return this; 
			}, 
			// #### Updating and `EUWindow`
      // Updates the contents of an EUWindow, resizes it, and orders it to the front of the EUWindow pool.   
			update: function(content){
   				this.element.update(content);  	
   				ABApp.sharedWindowManager().EUWMProxyCount++;     
				  Event.addBehavior.reload.defer();
					this.position();
					return this;
   	  		},   

   	  // Updates the `EUWindow` without moving or resizing it. Good if you'd like to update the window without hiding and unhiding it.
   		updateInPlace: function(content){
   					this.element.update(content);  	
					  Event.addBehavior.reload.defer();
						return this;
			},
      // Updates the window and (re)inserts it into the `DOM`. Typically used if the instance was previously initialized.
			updateAndInsert: function(content){
				// You can also pass it the an XHR request object.
				if (content.responseText != undefined){
          c = content.responseText;
				} else {
          c = content;
				}                 
				if (c.strip() == ""){
				  this.failedUpdate();
				  return false;
				}else {
				  this.update(c);
				}              
				this.insert();                              
			  // Since a new `Element` was created, refresh event delegation.
			  Event.addBehavior.reload.defer();
				return this;
			},              
			// Insert the `EUWindow` with a message. 
			insertWithMessage: function(options){
				 var default_options = {
				    message:'',
					  title: 'Please wait&hellip;',
				    };

				    Object.extend(default_options, options || { });
				    Object.extend(this.options, options || { });

				if (this.options.message == ''){
					this.updateAndInsert('<div class="widget full"><h2>Please Wait &hellip;<div class="spinner medium"></div></h2></div>');
				}else {
					this.updateAndInsert('<div class="widget full"><h2>Please Wait &hellip;<div class="spinner medium"></div></h2><div class="form_buffer"><p>'+this.options.message+'</p></div></div>');
				}
				return this;
			},       
			// Called if the `Ajax.Request` failed.
			failedUpdate: function(transport){
				if (transport.responseText.strip() == "" || transport.getHeader('content-type') == "text/html"){
					this.element.update('<div class="widget full"><div class="form_buffer"><h2>Something went wrong&hellip;</h2><p>Either an error occurred or your network connection was interrupted. Please try again.</p></div><p class="action_bar"><input type="button" class="button-nevermind" value="Close" /></p></div>');
					this.insert();
				}else{
					new ABMessage(transport.responseText, {type: 'error'});
					this.destroy();
				}
				$('app_element').fire("app:standby");				
			},      
			// Unregisters the `EUEindow`'s events and removes it from the DOM.
			destroy: function(){
				var _instance = this;
				fade = _instance.element.fade({duration:.25,
					beforeStart: function(){
						_instance.element.stopObserving();
					}});                      
				setTimeout(function() {
				  _instance.element.remove();
				}, 1000);

			},         
			// Fetches content from XHR, updates the `EUWindow` and inserts it.
			insertFromURL:function(url){
				updater = new Ajax.Request(url, {
					method: 'get',
					onSuccess: this.updateAndInsert.bind(this),
					onFailure: this.failedUpdate.bind(this)
				});
				return true;
			}
			/* afterInsertion:function(callback){
				this.afterInsertionMethod = callback;
			} */

		});    

	// #### Handling form submissions
  EUWindow.handleFormSubmission = function(event){
  	  var form = event.findElement('form');
      this.element.stopObserving("submit");
  		form.down('input[type=submit]').hide();
      var _instance = this;        
      // Remote forms happen in place.
  	  if (form.hasClassName("remote")){
  		  Event.stop(event);
        form.request({
          onSuccess: function(transport){  
            try{                      
              // If the form has the CSS class `closes` it should destroy itself an show a success message. 
              if (form.hasClassName("closes")){
                _instance.destroy();
  		          new ABMessage(transport.responseText, {type:"success"});
              } else {
  		  				_instance.element.observe("submit", ((_instance.options.onSubmit == false) ? EUWindow.handleFormSubmission.bindAsEventListener(_instance) : _instance.options.onSubmit.bindAsEventListener(_instance)));
  							_instance.updateInPlace(transport.responseText);
  						}
            }catch(err){
  	        	new ABMessage("Your action was successful, but the application doesn't know how to proceed.", {type:"success"});
  					}
          },                
          // If the XHR fails then a message should be displated and listening for submissions should resume.
          onFailure: function(transport){
            new ABMessage(transport.responseText, {type:"error"});
    				_instance.element.observe("submit", ((_instance.options.onSubmit == false) ? EUWindow.handleFormSubmission.bindAsEventListener(_instance) : _instance.options.onSubmit.bindAsEventListener(_instance)));
  					form.down('input[type=submit]').show();
          },               
          // 404's are a special case. 
  				on404: function(transport){
  					new ABMessage("Your information was not submitted because no endpoint could be found.", {type:"error"});
  					_instance.element.observe("submit", ((_instance.options.onSubmit == false) ? EUWindow.handleFormSubmission.bindAsEventListener(_instance) : _instance.options.onSubmit.bindAsEventListener(_instance)));  
  					form.down('input[type=submit]').show();
  				},
  				onComplete: function(){
  				  /* _instance.afterCommunication(); */

              if (typeof this.options.afterCommunication === 'function'){
                this.options.afterCommunication();
              }    

  				}
        }); 
      }
 	};             
 	// #### Destroying an `EUWindow`
	EUWindow.destroyWindow = function(n){
		fade = n.fade({duration:.15,
			beforeStart: function(){
				n.stopObserving();
			}, 
			afterFinish: function(){
				n.remove();
				_instance = null;
			}});
	};
	                              
	// ## EUMessage
	// Specialization of `EUWindow` for popup messages.
	EUMessage = Class.create(EUWindow, {
		initialize: function($super, title, message, options){
			$super();
		  Object.extend(this.options, options || { });

      if (this.options.modal == true){
			} 
			if (this.options.type == 'informational'){
				this.element.update('<div class="widget full"><h2>'+title+'</h2><div class="form_buffer"><p class="text">'+message+'</p></div><p class="action_bar"><input type="button" class="button-nevermind action" value="Dismiss" /></p></div>');
	   		}else if (this.options.type == 'error'){
				var to_insert = '<div class="widget full"><h2>'+title+'</h2><div class="form_buffer"><p class="text">'+message+'</p></div>'
				if (this.options.closable == true){
					to_insert += '<p class="action_bar"><button class="button-nevermind action">Dismiss</button></p>';
				} else {
					to_insert += '<hr/><label class="block">Please refresh this page</label>';
				}                                                                                                    
				to_insert += '</div>';
				this.element.update(to_insert);
			}
	 		this.insert();  
			if (this.options.modal == false){
				$('app_element').fire("app:standby");
			}
		}
	});