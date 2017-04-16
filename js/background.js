var min = false;
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

  chrome.tabs.onRemoved.addListener(function(tabId, changeInfo){
    console.log('remove')
    facebookLeave(tabId, changeInfo)
  })


  chrome.tabs.onActivated.addListener(function(info){
    tabChange(info)
  })

  chrome.windows.onFocusChanged.addListener(function(id){
    windowChange(id)
  })

  browserClick() // for opening resutls
})

function tabChange(info){
  chrome.storage.sync.get("open_sessions", function(res){
    if(res.open_sessions){
      let session = res.open_sessions[info.tabId]
      if(session) unPauseSession(session, function(){
        pauseSessions(res.open_sessions, session.tab)
      })
      else pauseSessions(res.open_sessions)
    }
  })
}

function windowChange(id){
  if(id == -1) return;
  chrome.windows.getCurrent(function(win){
    if(win.state == "minimized"){
      if(!min){
        min = true;
        console.log("minimized")
        //chrome minimized
        chrome.storage.sync.get(["open_sessions","min"], function(res){
          console.log(res.min)
          if(!res.min){
            chrome.storage.sync.set
            console.log(JSON.parse(JSON.stringify(res.open_sessions)))
            if(res.open_sessions){
              pauseSessions(res.open_sessions)
            }
          }
        })
      }

    }
    else if(win.state == "maximized"){
      min = false;
      console.log(win.state)

      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.storage.sync.get("open_sessions", function(res){
          if(tabs[0] && res.open_sessions){
            console.log(tabs[0].id)
            let session = res.open_sessions[tabs[0].id]
            if(session) unPauseSession(session, function(){})
          }
        })
        chrome.storage.sync.set({min: false})
      })
    }
  })
}


function create(){
  chrome.storage.sync.set({open_sessions: {}, sessions: {}})
}
function clear(){
  chrome.storage.sync.clear(function(){})
}

function browserClick(){
  chrome.browserAction.onClicked.addListener(function(tab){
    chrome.tabs.create({'url': chrome.extension.getURL('summary/summary.html'), 'selected': true});
  })
}

function tabMinimizedHandler(){
}

function startSession(tabId, url){
  console.log('new session', tabId)
  var session = {
    start: new Date().toString(),
    tab: tabId, //sets tab id of this session
    url: url,
    isRunning: true,
    time: 0
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
  if(session.isRunning){
    return ((new Date().getTime() - new Date(session.start).getTime()) / 1000) + session.time;
  }
  else return session.time
}

//pauses all running sessions, except for except
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
  console.log(open_sessions)
}

function unPauseSession(session, callback){
  session.isRunning = true;
  session.start = new Date().toString()

  console.log('resume session', session.tab)

  chrome.storage.sync.get("open_sessions", function(res){
    res.open_sessions[session.tab] = session;
    chrome.storage.sync.set({open_sessions: res.open_sessions});
    callback()
  })
}

function stopSession(res, tabId, callback){
  let session = res.open_sessions[tabId]
  let timeSpent = getTimeSession(session)
  session.time = timeSpent


  chrome.storage.sync.get(["sessions","time"], function(r){
    if(!r.sessions) r.sessions = {}
    var dayIdx = getDayOfYear(new Date())
    if(!r.sessions[dayIdx]) r.sessions[dayIdx] = []

    r.sessions[dayIdx].push(session)
    res.open_sessions[tabId] = undefined

    if(r.time){
      r.time += timeSpent
    }
    else r.time = timeSpent


    chrome.storage.sync.set({
      open_sessions: res.open_sessions,
      time: r.time, sessions: r.sessions}, function(){
      console.log('session stopped, new time is ' + r.time)
      callback()
    })

  })
}

function getDayOfYear(date){
  var start = new Date(date.getFullYear(), 0, 0);
  var diff = date - start;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
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
