
$(function(){


  onFacebookVisit()
  onFacebookLeave()

  browserClick()

  chrome.tabs.onActivated.addListener(function(info){
    chrome.storage.sync.get("running_sessions", function(res){
      if(res.running_sessions){
        let session = res.running_sessions[info.tabId]
        if(session) unPauseSession(session)
        else{
          pauseSessions(res.running_sessions)
        }
      }
    })
  })

})


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
  chrome.windows.onFocusChanged.addListener(function(){
    chrome.windows.getCurrent(function(win){
      if(win.state == "minimized"){
        console.log('minimized')
        //chrome minimized
      }
      else{
        console.log('maximized')
        //chrome maximized
      }
    })
  })
}

function tabChange(){
  chrome.tabs.onSelectionChanged.addListener(function(tabId){
    chrome.storage.sync.get("session", function(res){
      console.log(res.session.tab,tabId)
      //if we were on facebook but tabbed away
      if(res.session.isRunning && res.session.tab != tabId){
        stopSession()
      }
    })
  })
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

function pauseSessions(running_sessions){

  for(var key in running_sessions){
    console.log('paused session ', key)
    sess = running_sessions[key]
    if(sess.isRunning){
      let time = getTimeSession(sess)
      sess.isRunning = false;
      sess.time += time;
      sess.start = "";
      running_sessions[key] = sess;
    }
  }
  console.log(running_sessions)

  chrome.storage.sync.set({running_sessions: running_sessions});

}

function unPauseSession(session){
  session.isRunning = true;
  session.start = new Date().toString()

  console.log('resume session', session)

  chrome.storage.sync.get("running_sessions", function(res){
    res.running_sessions[session.tab] = session;
    chrome.storage.sync.set({running_sessions: res.running_sessions});
  })
}


function stopSession(res, tabId, callback){
  let session = res.running_sessions[tabId]

  let timeSpent = getTimeSession(session)
  console.log(timeSpent)
  hours = Math.floor(timeSpent/3600)
  mins = Math.floor((timeSpent % 3600)/60)
  secs = Math.round((timeSpent % 60)* 100) / 100

  session.time = hours + ":" + mins + ":" + secs

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

function onFacebookVisit(){
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){

    //facebook page loaded, check for profile
    if(changeInfo.status == "complete" && tab.url.includes("https://www.facebook.com")){
      //send message to content script
      chrome.tabs.sendMessage(tabId, {url: tab.url}, function(profile){

        chrome.storage.sync.get("running_sessions", function(r){
          if(r.running_sessions){
            let session = r.running_sessions[tabId]

            if(profile && tab.url == session.url){
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

    //loading a facebook page
    if(changeInfo.status == "loading"  && changeInfo.url &&
      changeInfo.url.includes("https://www.facebook.com")){

        //get current sessions and global time
        chrome.storage.sync.get(["running_sessions", "time"], function(res){

          console.log(res)
          if(res.running_sessions){
            let session = res.running_sessions[tabId]

            if(!session){
              //starts new session
              startSession(tabId, changeInfo.url)
            }
            else{
              stopSession(res, tabId, function(){
                startSession(tabId, changeInfo.url)
              })
            }
          }

        })

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
