$LOAD_PATH.unshift File.dirname(__FILE__)

require 'faye'
require 'boot.rb' 
require 'extensions.rb'

app = Rack::Builder.new {
  run Sinatra::Application
}

$faye = Faye::RackAdapter.new(app.to_app, :mount => '/faye')    
$faye.add_extension(Archiver.new)   
$faye.add_extension(ServerAuth.new)   
run $faye