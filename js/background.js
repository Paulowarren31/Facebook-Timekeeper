
$(function(){


  onFacebookVisit()
  onFacebookLeave()

  browserClick()

})

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
    url: url
  }

  chrome.storage.sync.set({session: session}, function(){
    console.log('session started')
  })
}

function getTimeSession(session){
  total = (new Date().getTime() - new Date(session.start).getTime()) / 1000;
  return total
}

function stopSession(res, callback){
  console.log(res.session)
  var timeSpent = getTimeSession(res.session)
  hours = Math.floor(timeSpent/3600)
  mins = Math.floor((timeSpent % 3600)/60)
  secs = Math.round((timeSpent % 60)* 100) / 100

  res.session.time = hours + ":" + mins + ":" + secs

  if(res.time){
    res.time += timeSpent
  }
  else res.time = timeSpent


  chrome.storage.sync.get("sessions", function(r){
    if(!r.sessions) r.sessions = []

    r.sessions.push(res.session)

    chrome.storage.sync.set({session: -1, time: res.time, sessions: r.sessions}, function(){
      console.log('session stopped, new time is ' + res.time)
      callback()
    })

  })

}

function onFacebookVisit(){
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){

    //facebook page loaded, check for profile
    if(changeInfo.status == "complete" && tab.url.includes("https://www.facebook.com")){
      chrome.tabs.sendMessage(tabId, {url: tab.url}, function(res){
        chrome.storage.sync.get("session", function(r){
          if(res && tab.url == r.session.url){
            r.session.profile = res
            chrome.storage.sync.set({session: r.session}, function(){
              console.log("updated session with profile info")
            })
          }
        })
      })
    }

    //loading a facebook page
    if(changeInfo.status == "loading"  && changeInfo.url &&
      changeInfo.url.includes("https://www.facebook.com")){
        chrome.storage.sync.get(["session", "time"], function(res){
          console.log(res)
          if(res.session == -1 || !res.session){
            //starts new session
            startSession(tabId, changeInfo.url)
          }
          else{
            console.log("session running, stopping old one and starting new one")
            stopSession(res, function(){
              startSession(tabId, changeInfo.url)
            })
          }
        })

      }
  })
}

function onFacebookLeave(){
  chrome.tabs.onRemoved.addListener(function(tabId, changeInfo){
    chrome.storage.sync.get(["session", "time"], function(res){
      if(res.session.tab == tabId){
        console.log('facebook closed, end session')
        stopSession(res, function(){})
      }
    })
  })
}
