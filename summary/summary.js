$(function(){
  chrome.storage.sync.get(["time", "sessions"], function(res){


    //get sessions from today
    sessions = filterToday(res.sessions)
    //combine duplicates
    combinedSessions = combineDuplicates(sessions)
    console.log(combinedSessions)

    //if no pages found show no pages found message
    if(combinedSessions.length == 0){
      $('#nofound').removeClass('hidden')
    }

    for(session in combinedSessions){
      session = combinedSessions[session]

      //get pretty time
      var timestring = timeString(session.time)

      //ugly 
      var newLi = '<li class="list-group-item pa-3"><div class="container"><div class="row"><div class="col my-auto">'+session.name + '</div><div class="col my-auto">'+timestring+'</div><div class="col"><img class="rounded float-right" src="'+session.src+'"></img></div></div></div></li>'

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

function filterToday(sessions){
  var today = getDayOfYear(new Date())

  var array = $.map(sessions, function(value, key) {
    //filters only from today
    if(key == today){
      return value;
    }
  });

  return array

}
