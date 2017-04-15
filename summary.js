$(function(){
  chrome.storage.sync.get(["time", "sessions"], function(res){
    console.log(res.time)

    console.log(res.sessions)

    var today = getDayOfYear(new Date())

    var array = $.map(res.sessions, function(value, index) {
      //filters only from today
      if(index == today){
        return value;
      }
    });

    combinedSessions = combineDuplicates(array)
    console.log(combinedSessions)

    for(session in combinedSessions){
      session = combinedSessions[session]

      var timestring = timeString(session.time)

      var newLi = '<li class="list-group-item"><div class="container"><div class="row"><div class="col my-auto">'+session.name + '</div><div class="col my-auto">'+timestring+'</div><div class="col"><img class="rounded float-right" src="'+session.src+'"></img></div></div></div></li>'

      //p.innerHTML = session.profile.name + ' TIME SPENT: ' + session.time
      //img.src = session.profile.src

      var list = $("#profile-list")
      list.append(newLi)
    }

    var timeDiv = $("#time")
    var timestring = timeString(res.time)
    timeDiv.text(timestring)
  })
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

function getDayOfYear(date){
  var start = new Date(date.getFullYear(), 0, 0);
  var diff = date - start;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return day
}
