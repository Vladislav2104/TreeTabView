window.addEventListener("keydown", function(event) {
  // Bind to both command (for Mac) and control (for Win/Linux)
  var modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.shiftKey && event.keyCode == 80) {
    // Send message to background page to toggle tab
    console.log("pin keys pressed");
    chrome.extension.sendRequest({toggle_pin: true}, function(response) {
      // Do stuff on successful response
    });
  }
}, false);
