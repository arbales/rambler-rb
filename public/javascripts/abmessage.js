__abmessage_timer = {};
// ## ABMessage
// Creates and manages simple elements for HTML message divs. Generally created with Event Delegation in mind, they also
// for various events on individual elements for convenience._I guess I could probably switch to Event Delegation here is well. Maybe later._
var ABMessage = Class.create({
	initialize: function(message, options){   
    clearTimeout(__abmessage_timer);
		this.options = {
			type: 'notice',
			timeout: 0,
      onCreate: function(){}, 
      onClose: function(){},
	    };
	    Object.extend(this.options, options || { });

	    if (Object.isString(this.options.parameters)){
	      this.options.parameters = this.options.parameters.toQueryParams();
	    } else if (Object.isHash(this.options.parameters)){
	      this.options.parameters = this.options.parameters.toObject();
		}
		
		ABMessageResizer();
	  $('message').className = this.options.type + " message";
		this.options.onCreate();
	$('message').down('p').update(message);
		$('message').appear({duration: .25}); 
		$('message').observe('click', function(){
  		this.options.onClose();
			$('message').fade({duration: .25}); 
		}.bind(this));  
		
		//  `ABMessages` can have timeouts. 
		if (this.options.timeout > 0){
		  __abmessage_timer = setTimeout(function() {
		    $('message').fade({duration: .25});
		  }, this.options.timeout * 1000);
		}
	}, 
	// Sets an `ABMessage`'s type.                                   
	type: function(type){
		$('message').className = type + " message";
		return this;
	}, 
	// Updates the text of an `ABMessage`.
	update: function(text){
		$('message').down('p').update(text);
		return this;
	},                                    
	// Closes an ABMessage, optionally performing a callback.
	close: function(callback){                                            
		if (typeof(callback) === 'function'){
			
		}else{
			callback = function(){}
		}                 
		this.options.onClose();
		$('message').fade({duration: .25});
	}
}); 

var ABMessageResizer = function(event){
	var vp = document.viewport.getWidth() - document.width;
	var right =(document.width - $$(".nav ul").first().viewportOffset().left + vp);
	
	if (document.viewport.getScrollOffsets().top > ($$(".nav ul").first().viewportOffset().top + $$(".nav ul").first().measure('height') + 3)){
		var top = "0";       
		var position = "fixed";
	} else {
		var top = $$(".nav ul").first().viewportOffset().top + document.viewport.getScrollOffsets().top;
		var position = "absolute";
	}
	
	width = document.width - right;                               
	
	$('message').setStyle("right:"+right+"px;width:"+width+"px;top:"+top+"px;"+"position:"+position+";");
}