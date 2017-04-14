$(function(){

  chrome.runtime.onMessage.addListener(function(req, sender, res){

    var profile_name = $('#fb-timeline-cover-name').text()
    var profile_pic = $('.profilePic')
    if(profile_name != '' && profile_pic[0]){
      var profile_pic_src = profile_pic.prop('src')
      var save = {
        name: profile_name,
        src: profile_pic_src,
        url: req.url
      }

      res(save)
    }
  })

})

function saveProfile(save){
  chrome.storage.sync.get("profiles", function(res){
    if(!res.profiles) res.profiles = []
    alert('saved profile!')

    res.profiles.push(save)
    chrome.storage.sync.set({profiles: res.profiles})
  })
}
