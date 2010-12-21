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
	  $('flash').className = this.options.type + " flash";
		this.options.onCreate();
	$('flash').down('p').update(message);
		$('flash').appear({duration: .25}); 
		$('flash').observe('click', function(){
  		this.options.onClose();
			$('flash').fade({duration: .25}); 
		}.bind(this));  
		
		//  `ABMessages` can have timeouts. 
		if (this.options.timeout > 0){
		  __abmessage_timer = setTimeout(function() {
		    $('flash').fade({duration: .25});
		  }, this.options.timeout * 1000);
		}
	}, 
	// Sets an `ABMessage`'s type.                                   
	type: function(type){
		$('flash').className = type + " flash";
		return this;
	}, 
	// Updates the text of an `ABMessage`.
	update: function(text){
		$('flash').down('p').update(text);
		return this;
	},                                    
	// Closes an ABMessage, optionally performing a callback.
	close: function(callback){                                            
		if (typeof(callback) === 'function'){
			
		}else{
			callback = function(){}
		}                 
		this.options.onClose();
		$('flash').fade({duration: .25});
	}
}); 

var ABMessageResizer = function(event){  
  
	var vp = document.viewport.getWidth() - document.width;
	var right =(document.width - $$(".nav").first().viewportOffset().left + vp);
	
	if (document.viewport.getScrollOffsets().top > ($$(".nav").first().viewportOffset().top + $$(".nav").first().measure('height')+65)){
		var top = "0";       
		var position = "fixed"; 
		$$('.publisher').first().setStyle("margin-top:"+$$(".nav").first().measure('height')+"px");
	} else { 
		var top = "";  
		$$('.publisher').first().setStyle("margin-top:1ex");
		var position = "static";
	}  
	
	if (document.viewport.getScrollOffsets().top > window.innerHeight){
	  $('scroll_top').show();
	}else{
	  $('scroll_top').hide();
	}
	
	width = document.width - right;                               
	$$('.nav').first().setStyle("top:"+top+"px;"+"position:"+position+";width:940px;z-index:100");
	//$('flash').setStyle("right:"+right+"px;width:"+width+"px;top:"+top+"px;"+"position:"+position+";");
}