var min = false; //to make sure minimize only happens once
var global_time = 0; //to make sure that multiple ending sessions add correctly
$(function(){

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //facebook page loaded, check for profile
    if(changeInfo.status == "complete" && tab.url.includes("https://www.facebook.com")){
      facebookLoad(tabId, tab.url)
    }

    //facebook loading, pause old running sessions and start a new one
    if(changeInfo.status == "loading"  && changeInfo.url && changeInfo.url.includes("https://www.facebook.com")){
      facebookLoading(tabId, changeInfo.url)
    }
  })

  //tab removed, save session
  chrome.tabs.onRemoved.addListener(function(tabId, changeInfo){
    facebookLeave(tabId, changeInfo)
  })


  //tab changed, pause sess
  chrome.tabs.onActivated.addListener(function(info){
    tabChange(info)
  })

  chrome.windows.onFocusChanged.addListener(function(id){
    windowChange()
  })

  browserClick() // for opening resutls
})

function tabChange(info){
  chrome.storage.sync.get("open_sessions", function(res){
    if(res.open_sessions){
      let session = res.open_sessions[info.tabId]
      //if there is a session running in this new tab unpause it and pause all
      //other sessions
      if(session) unPauseSession(session, function(){
        pauseSessions(res.open_sessions, session.tab)
      })
      //else this new tab isnt facebook so pause all sessions
      else pauseSessions(res.open_sessions)
    }
  })
}

function windowChange(id){

  //if not on any window
  if(id == -1){
    if(!min){
      minimized()
    }
    return;
  }

  chrome.windows.getCurrent(function(win){
    if(!win) return;
    if(win.state == "minimized"){
      if(!min){
        minimized()
      }
    }
    else if(win.state == "maximized"){
      maximized()
    }
  })
}


function minimized(){
  console.log("minimized")
  min = true;
  //chrome minimized
  chrome.storage.sync.get(["open_sessions"], function(res){
    //if we have open sessions pause them all
    if(res.open_sessions){
      pauseSessions(res.open_sessions)
    }
  })

}

function maximized(){
  min = false;
  console.log("maximized")
  //get current window
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    chrome.storage.sync.get("open_sessions", function(res){
      if(tabs[0] && res.open_sessions){
        let session = res.open_sessions[tabs[0].id]
        //if the window and tab we maximized to has a paused session, start it 
        //again
        if(session) unPauseSession(session, function(){})
      }
    })
  })

}

//for debugging
function clear(){
  chrome.storage.sync.clear(function(){})
  global_time = 0;
}

//create popup in new page
function browserClick(){
  chrome.browserAction.onClicked.addListener(function(tab){
    chrome.tabs.create({'url': chrome.extension.getURL('summary/summary.html'), 'selected': true});
  })
}


function startSession(tabId, url){
  console.log('new session', tabId)

  var session = {
    start: new Date().toString(), //start time of last time this session was resumed
    tab: tabId, //sets tab id of this session
    url: url, //url of this session
    isRunning: true,
    time: 0 // running total in seconds of this sessions timer, is incremented on pause, also resetting start
  }

  chrome.storage.sync.get("open_sessions", function(res){
    if(!res.open_sessions) res.open_sessions = {} //create it if it doesnt exist
    res.open_sessions[tabId] = session;

    chrome.storage.sync.set({open_sessions: res.open_sessions}, function(){
      console.log('session added')
      console.log(res.open_sessions)
    })

  })

}

function getTimeSession(session){
  //if a session is running add up its old time and current time
  if(session.isRunning){
    return ((new Date().getTime() - new Date(session.start).getTime()) / 1000) + session.time;
  }
  //if a session isnt running just give time which should have all time spent
  else return session.time
}

//pauses all running sessions, except for except
//didnt create a pauseSession because when we want to pause a session we might
//not have the tabId that identifies it
function pauseSessions(open_sessions, except){

  for(var key in open_sessions){
    sess = open_sessions[key]
    if(sess.isRunning && sess.tab != except){
      console.log('paused session ', key)
      let time = getTimeSession(sess)
      sess.isRunning = false;
      sess.time += time; //running total of time spent on that session if it is paused
      sess.start = "";
      open_sessions[key] = sess;
    }
  }
  chrome.storage.sync.set({open_sessions: open_sessions});
}

function unPauseSession(session, callback){
  session.isRunning = true;
  session.start = new Date().toString() // set up new start

  console.log('resume session', session.tab)

  chrome.storage.sync.get("open_sessions", function(res){
    res.open_sessions[session.tab] = session;
    chrome.storage.sync.set({open_sessions: res.open_sessions});
    callback() //callback used when we want to pause all sessions after unpausing one
  })
}

function stopSession(res, tabId, callback){
  let session = res.open_sessions[tabId]
  let timeSpent = getTimeSession(session)
  session.time = timeSpent

  //get sessions and time to update them
  chrome.storage.sync.get(["sessions","time"], function(r){
    if(!r.sessions) r.sessions = {}
    //get day of year 1-365 for summary by day
    let dayIdx = getDayOfYear(new Date())
    //if new day
    if(!r.sessions[dayIdx]) r.sessions[dayIdx] = []

    //push this session to this days sessions
    r.sessions[dayIdx].push(session)
    res.open_sessions[tabId] = undefined

    if(r.time){
      r.time += timeSpent
    }
    else r.time = timeSpent

    global_time += timeSpent

    //should only happen when multiple tabs trying to close at once
    if(global_time != r.time){
      console.log('global time and time out of sync')
      console.log(global_time)
      console.log(r.time)
      r.time = global_time
    }

    chrome.storage.sync.set({
      open_sessions: res.open_sessions,
      time: r.time, sessions: r.sessions}, function(){
      console.log('session stopped, new time is ' + r.time)
      callback()
    })

  })
}

//gets day of year from a date obj 1-365
function getDayOfYear(date){
  let start = new Date(date.getFullYear(), 0, 0);
  let diff = date - start;
  let oneDay = 1000 * 60 * 60 * 24;
  let day = Math.floor(diff / oneDay);
  return day
}

//when facebook page totally loaded check for profile or page
function facebookLoad(tabId, url){
  //send message to content script
  chrome.tabs.sendMessage(tabId, {url: url}, function(profile){
    chrome.storage.sync.get("open_sessions", function(r){
      if(r.open_sessions){
        let session = r.open_sessions[tabId]

        if(profile && url == session.url){
          session.profile = profile
          r.open_sessions[tabId] = session

          chrome.storage.sync.set({open_sessions: r.open_sessions}, function(){
            console.log(r.open_sessions)
            console.log("updated running sessions session with profile info")
          })
        }
      }
    })
  })
}

//loading a facebook page, start timer
function facebookLoading(tabId, url){

  //get current sessions and global time
  chrome.storage.sync.get(["open_sessions", "time"], function(res){

    console.log(res)
    if(!res.open_sessions) res.open_sessions = {}
    if(res.open_sessions){
      let session = res.open_sessions[tabId]

      //if previous tab wasnt a facebook tab
      if(!session){
        //starts new session
        startSession(tabId, url)
      }
      else{
        //stops session on previous tab if it was a facebook tab
        stopSession(res, tabId, function(){
          //starts session on this tab
          startSession(tabId, url)
        })
      }
    }

  })
}

function facebookLeave(tabId, changeInfo){
  chrome.storage.sync.get(["open_sessions", "time"], function(res){
    if(res.open_sessions){
      let session = res.open_sessions[tabId]

      if(session && session.tab == tabId){
        console.log('facebook closed, end session')
        stopSession(res, tabId, function(){})
      }
    }
  })
}
