console.log('summary')
chrome.storage.sync.get(["time", "sessions"], function(res){
  console.log(res.time)

  for(session in res.sessions){
    session = res.sessions[session]
    if(session.profile){


      var newLi = '<li class="list-group-item"><div class="container"><div class="col-xs-4">'+session.profile.name + '</div><div class="col-xs-4">'+session.time+'</div><div class="col-xs-4"><img class="rounded" src="'+session.profile.src+'"></img></div></div></li>'

      //p.innerHTML = session.profile.name + ' TIME SPENT: ' + session.time
      //img.src = session.profile.src

      var list = $("#profile-list")
      list.append(newLi)
    }
  }

  var timeDiv = document.getElementById("time")
  res.time = Math.round(res.time * 100) / 100
  timeDiv.innerHTML = res.time
})

