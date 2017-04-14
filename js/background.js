
$(function(){
  chrome.storage.sync.get('sessions', function(sessions){
    console.log(sessions)
  })
  onFacebookVisit()
  onFacebookLeave()
})

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

function startSession(tabId){
  var session = {
    start: new Date().toString(),
    isRunning: true,
    tab: tabId
  }
  //sets tab id of this session

  chrome.storage.sync.set({session: session}, function(){
    console.log('session saved')
  })
}

function stopSession(res){
  res.session.isRunning = false;
  var timeSpent = (new Date().getTime() - new Date(res.session.start).getTime()) / 1000;
  console.log('added ' + timeSpent)

  if(res.time){
    res.time += timeSpent
  }
  else res.time = timeSpent

  chrome.storage.sync.set({session: res.session, time: res.time}, function(){
    console.log('session saved, new time is ' + res.time)
  })

}

function onFacebookVisit(){
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    if(changeInfo.status == "loading"  && changeInfo.url &&
      changeInfo.url.includes("https://www.facebook.com")){

        chrome.storage.sync.get("session", function(res){
          if(!res.session.isRunning && res.session.tab){
            console.log('new session')
            startSession(tabId)
            //starts new session
          }
          else{
            console.log("session running")
            console.log(new Date(res.session.start))
          }
        })

      }
  })
}

function onFacebookLeave(){
  chrome.tabs.onRemoved.addListener(function(tabId, changeInfo){
    chrome.storage.sync.get(["session", "time"], function(res){
      console.log(res.session, tabId)
      if(res.session.tab == tabId){
        console.log('facebook closed, end session')
        stopSession(res)
      }
    })
  })
}
