
$(function(){

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //facebook page loaded, check for profile
    if(changeInfo.status == "complete" && tab.url.includes("https://www.facebook.com")){
      facebookLoad(tabId, tab.url)
    }

    if(changeInfo.status == "loading"  && changeInfo.url && changeInfo.url.includes("https://www.facebook.com")){
      facebookLoading(tabId, changeInfo.url)
    }
  })

  onFacebookLeave()


  chrome.tabs.onActivated.addListener(function(info){
    tabChange(info)
  })

  chrome.windows.onFocusChanged.addListener(function(){
    windowChange()
  })

  browserClick() // for opening resutls
})

function tabChange(info){
  chrome.storage.sync.get("running_sessions", function(res){
    if(res.running_sessions){
      let session = res.running_sessions[info.tabId]
      if(session) unPauseSession(session, function(){
        pauseSessions(res.running_sessions, session.tab)
      })
      else pauseSessions(res.running_sessions)
    }
  })
}

function windowChange(){
  chrome.windows.getCurrent(function(win){
    if(win.state == "minimized"){
      console.log("minimized")
      //chrome minimized
      chrome.storage.sync.get("running_sessions", function(res){
        if(res.running_sessions){
          pauseSessions(res.running_sessions)
        }
      })

    }
    else if(win.state == "maximized"){
      console.log(win.state)

      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {

        chrome.storage.sync.get("running_sessions", function(res){
          if(tabs[0] && res.running_sessions){

            console.log(tabs[0].id)
            let session = res.running_sessions[tabs[0].id]
            if(session) unPauseSession(session)
          }
        })
      });
    }
  })
}


function create(){
  chrome.storage.sync.set({running_sessions: {}})
}
function clear(){
  chrome.storage.sync.clear(function(){})
}

function browserClick(){
  chrome.browserAction.onClicked.addListener(function(tab){
    chrome.tabs.create({'url': chrome.extension.getURL('summary.html'), 'selected': true});
  })
}

function tabMinimizedHandler(){
}

function startSession(tabId, url){
  console.log('new session')
  var session = {
    start: new Date().toString(),
    tab: tabId, //sets tab id of this session
    url: url,
    isRunning: true,
    time: 0
  }

  chrome.storage.sync.get("running_sessions", function(res){
    if(!res.running_sessions) res.running_sessions = {} //create it if it doesnt exist

    res.running_sessions[tabId] = session;

    chrome.storage.sync.set({running_sessions: res.running_sessions}, function(){
      console.log('session added')
      console.log(res.running_sessions)
    })

  })

}

function getTimeSession(session){
  if(session.isRunning){
    return ((new Date().getTime() - new Date(session.start).getTime()) / 1000) + session.time;
  }
  else return session.time
}

//pauses all running sessions
function pauseSessions(running_sessions, except){

  for(var key in running_sessions){
    sess = running_sessions[key]
    console.log(sess)
    if(sess.isRunning && sess.tab != except){
      console.log('paused session ', key)
      let time = getTimeSession(sess)
      sess.isRunning = false;
      sess.time += time; //running total of time spent on that session if it is paused
      sess.start = "";
      running_sessions[key] = sess;
      chrome.storage.sync.set({running_sessions: running_sessions});
    }
  }
  console.log(running_sessions)


}

function unPauseSession(session, callback){
  session.isRunning = true;
  session.start = new Date().toString()

  console.log('resume session', session.tab)

  chrome.storage.sync.get("running_sessions", function(res){
    res.running_sessions[session.tab] = session;
    chrome.storage.sync.set({running_sessions: res.running_sessions});
    callback()
  })
}

function stopSession(res, tabId, callback){
  let session = res.running_sessions[tabId]

  let timeSpent = getTimeSession(session)
  session.time = timeSpent

  if(res.time){
    res.time += timeSpent
  }
  else res.time = timeSpent


  chrome.storage.sync.get("sessions", function(r){
    if(!r.sessions) r.sessions = []
    r.sessions.push(session)
    res.running_sessions[tabId] = undefined

    chrome.storage.sync.set({running_sessions: res.running_sessions, time: res.time, sessions: r.sessions}, function(){
      console.log('session stopped, new time is ' + res.time)
      callback()
    })

  })

}

//when facebook page totally loaded check for profile or page
function facebookLoad(tabId, url){
  //send message to content script
  chrome.tabs.sendMessage(tabId, {url: url}, function(profile){
    chrome.storage.sync.get("running_sessions", function(r){
      if(r.running_sessions){
        let session = r.running_sessions[tabId]

        if(profile && url == session.url){
          session.profile = profile
          r.running_sessions[tabId] = session

          chrome.storage.sync.set({running_sessions: r.running_sessions}, function(){
            console.log(r.running_sessions)
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
  chrome.storage.sync.get(["running_sessions", "time"], function(res){

    console.log(res)
    if(res.running_sessions){
      let session = res.running_sessions[tabId]

      if(!session){
        //starts new session
        startSession(tabId, url)
      }
      else{
        stopSession(res, tabId, function(){
          startSession(tabId, url)
        })
      }
    }

  })

}

function onFacebookLeave(){
  chrome.tabs.onRemoved.addListener(function(tabId, changeInfo){
    chrome.storage.sync.get(["running_sessions", "time"], function(res){
      if(res.running_sessions){
        let session = res.running_sessions[tabId]

        if(session && session.tab == tabId){
          console.log('facebook closed, end session')
          stopSession(res, tabId, function(){})
        }
      }
    })
  })
}
