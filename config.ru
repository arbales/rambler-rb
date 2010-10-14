$LOAD_PATH.unshift File.dirname(__FILE__)

require 'faye'
require 'boot.rb'

use Faye::RackAdapter, :mount => '/faye', :timeout => 45

run Sinatra::Application