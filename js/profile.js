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

      //this should only happen on profile
      res(save)
    }


    var page_name = $('._2wma').text()
    var page_icon_url = $('._4jhq').prop('src')
    if(page_name){
      var save = {
        name: page_name,
        src: page_icon_url,
        url: req.url
      }

      //this should only happen on official page 
      res(save)
    }
  })

})
