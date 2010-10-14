$LOAD_PATH.unshift File.dirname(__FILE__) + '/sinatra/lib'
$LOAD_PATH.unshift File.dirname(__FILE__)

#require "sunshowers"
require 'rubygems'
require 'sinatra'     
#require 'padrino-core/application/rendering'
require 'renderer'
require 'padrino-helpers'
require 'haml' 
require 'digest/md5'
require 'json'
require 'bcrypt'
require 'fileutils'
require 'faye'
require 'mongoid'

load 'configure.rb'
load 'models.rb' 
#load 'models_init.rb'  
load 'helpers.rb'
load 'auth.rb'  
load 'rambler.rb'