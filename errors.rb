error do
  if request.xhr?  
    abmessage :error, "Sorry, Rambler got befuddled while doing its thing. Try again."
  else
    puts "!! Finding error thing."
    haml :error
  end
end

not_found do  
  status 404
  if request.xhr?
    abmessage :error, "Sorry, Rambler couldn&rsquo;t figure out what to do with your request."
  else
    haml :error
  end
end