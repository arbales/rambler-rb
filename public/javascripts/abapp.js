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