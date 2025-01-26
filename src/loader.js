var sfdex = document.createElement("script");
sfdex.src = chrome.runtime.getURL("src/sfdexdl.js");

document.onload = function() {
    this.remove();
}


document.head.appendChild(sfdex);