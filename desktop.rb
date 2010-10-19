require 'rubygems'
require 'faye'
require 'eventmachine'
require 'ruby-growl'
require ''
client = Faye::Client.new('http://localhost:80/faye')
itunes = OSA.app('iTunes')

EM.run {
  client.subscribe('/chat') do |message|
    g.notify "ruby-growl Notification", "It Came From Ruby-Growl","Greetings!"
    puts message
  end
}