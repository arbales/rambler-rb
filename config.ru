$LOAD_PATH.unshift File.dirname(__FILE__)
     
require 'rubygems'    
require 'bundler'
Bundler.require
require 'faye'
require 'boot.rb' 

app = Rack::Builder.new {
  run Sinatra::Application
}
require 'extensions.rb'


$faye = Faye::RackAdapter.new(app.to_app, :mount => '/faye')    
$faye.add_extension(Archiver.new)   
$faye.add_extension(ServerAuth.new)   
run $faye