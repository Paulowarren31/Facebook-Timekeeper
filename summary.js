console.log('summary')
chrome.storage.sync.get(["time", "sessions"], function(res){
  console.log(res.time)

  console.log(res.sessions)
  combinedSessions = combineDuplicates(res.sessions)
  console.log(combinedSessions)

  for(session in combinedSessions){
    session = combinedSessions[session]

    var timestring = timeString(session.time)

    var newLi = '<li class="list-group-item"><div class="container"><div class="col-xs-4">'+session.name + '</div><div class="col-xs-4">'+timestring+'</div><div class="col-xs-4"><img class="rounded" src="'+session.src+'"></img></div></div></li>'

    //p.innerHTML = session.profile.name + ' TIME SPENT: ' + session.time
    //img.src = session.profile.src

    var list = $("#profile-list")
    list.append(newLi)
  }

  var timeDiv = $("#time")
  var timestring = timeString(res.time)
  timeDiv.text(timestring)
})

function timeString(time){

  var date = new Date(null)
  date.setSeconds(time)

  return date.toISOString().substr(11,8);

}

//combines duplicate sessions and filters sessions that werent profiles/pages
function combineDuplicates(sessions){

  var combine = []
  sessions.forEach(function(a){
    if(a.profile){
      if(!this[a.profile.src]){
        this[a.profile.src] = {name: a.profile.name, time: 0, src: a.profile.src}
        combine.push(this[a.profile.src])
      }
      this[a.profile.src].time += a.time
    }
  }, Object.create(null))

  return combine
}
