$LOAD_PATH.unshift File.dirname(__FILE__)
     
require 'rubygems'    
require 'bundler'
Bundler.require
require 'faye'
require 'rambler'
require 'extensions.rb'
 
         

app = Rack::Builder.new {
  run Rambler::Application
}

$faye = Faye::RackAdapter.new(app.to_app, :mount => '/faye')    
$faye.add_extension(Archiver.new)   
$faye.add_extension(ServerAuth.new)   
run $faye