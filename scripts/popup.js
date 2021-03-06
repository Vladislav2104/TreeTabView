BKG = chrome.extension.getBackgroundPage();
UI_TABS = [];

X_SRC = chrome.extension.getURL('icons/close.png');

function addChild(node) {
    node.parent = this
    this.children.push(node)
    this.children_elem.appendChild(node.elem)
}

function remove() {
    console.log('call remove')      
    console.log(this)      
    // make a copy. this.children will be modified during iteration when
    // children remove themselves.
    var children = this.children.slice(0)
    for (var i in children) {
        console.log('remove child ' + i)
        children[i].remove()
    }
    this.parent.children_elem.removeChild(this.elem)

    if (!this.domain && this.tab) {
        console.log('remove tab')
        console.log(this.tab)
        chrome.tabs.remove(this.tab.id);
    }

    var i = this.parent.children.indexOf(this)
    if (i != -1) {
        console.log('remove ' + i)      
        this.parent.children.splice(i, 1)
    }
}

/*
 *  HTML structure of a tree node:
 *
 *  -----------------------------------------------------
 *                         title
 *  -----------------------------------------------------
 *        padding    |           children_elem
 *  -----------------------------------------------------
 *
 */

function Node(tab, domain) {
    this.tab = tab
    this.domain = domain
    this.children = []
    this.addChild = addChild
    this.remove = remove

    this.elem = document.createElement('table')
    this.elem.setAttribute('class', 'node')
    // table structure
    var row1 = document.createElement('tr')
    this.elem.appendChild(row1)
    var cell1 = document.createElement('td')
    cell1.setAttribute('class', 'cell1')
    cell1.setAttribute('colspan', '2')
	
//    var cell11 = document.createElement('td')
//    cell1.innerHTML=123
	row1.appendChild(cell1)
//	row1.cols[2].innerHTML="All"
	

    var row2 = document.createElement('tr')
    this.elem.appendChild(row2)
    var cell2 = document.createElement('td')
    cell2.width = 20
    row2.appendChild(cell2)
    var cell3 = document.createElement('td')
    row2.appendChild(cell3)

    this.title = cell1
    this.padding = cell2
    this.children_elem = cell3

    // close button
    var xbutton = document.createElement('img')
    xbutton.setAttribute('class', 'xbutton')
    xbutton.onclick = remove.bind(this)
    xbutton.src = X_SRC
    xbutton.style.visibility = 'hidden'
    xbutton.show = function () {
        xbutton.style.visibility = 'visible'
    }
    xbutton.hide = function () {
        xbutton.style.visibility = 'hidden'
    }
    cell1.appendChild(xbutton)
    cell1.onmouseover = xbutton.show
    cell1.onmouseleave = xbutton.hide

    // fav icon and title for tab node
    console.log(this.domain)
    if (this.domain) {
        var fav = document.createElement('img')
        fav.src = tab.favIconUrl
        cell1.appendChild(fav)

        var title = document.createElement('span')
        title.setAttribute('class', 'title')
        title.innerHTML = tab.domain
        console.log('show domain node')
        console.log(tab.domain)
        title.onclick = selecttab.bind(title, tab.id);
        cell1.appendChild(title)
    } else if (this.tab) {
        var fav = document.createElement('img')
        fav.src = tab.favIconUrl
        cell1.appendChild(fav)

        var title = document.createElement('span')
        title.setAttribute('class', 'title')
        title.innerHTML = tab.title
        title.onclick = selecttab.bind(title, tab.id);
        cell1.appendChild(title)
    }
}

byProperty = function(prop) {
    console.log('construct cmp func');
    return function(a,b) {
        console.log("cmp");
        if (typeof a[prop] == "number") {
            return (a[prop] - b[prop]);
        } else {
            return ((a[prop] < b[prop]) ? -1 : ((a[prop] > b[prop]) ? 1 : 0));
        }
    };
}

byKey = function(key) {
    console.log('construct cmp func');
    return function(a,b) {
        console.log("key cmp");
        var s = key(a);
        var t = key(b);
        console.log('compare these:');
        console.log(s);
        console.log(t);
        result = ((s < t) ? -1 : ((s > t) ? 1 : 0));
        console.log(result);
        return result;
    };
}

function sortIntoGroups(tabs) {
    console.log('sort')
    var result = []
    if (tabs.length == 0) {
        console.log(result)
        return result
    }
    var group = []
    for (var i in tabs) { 
        if (i > 0 && tabs[i].domain != tabs[i-1].domain) {
            result.push(group)
            group = []
        }
        group.push(tabs[i])
    }
    result.push(group)
    console.log(result)
    return result
}

// sort by pinned : unpinned

function divide(tabs) {
  var pinned = [];
  var unpinned = [];
  for (var i in tabs) {
      var tab = tabs[i];
      if (tab.pinned)
          pinned.push(tab);
      else
          unpinned.push(tab);
  }
  return { pinned : pinned, unpinned, unpinned };
}

function show(pinned, unpinned) {
    var tab_section = document.getElementById('tabs');

    var root = new Node(null)

    console.log('pinned')
    console.log(pinned)
    pinned_groups = sortIntoGroups(pinned)
    for (var i in pinned_groups) {
        var group = pinned_groups[i]
        var node = null;
        if (group.length > 1) {
            node = new Node(group[0], true)
            node.domain = true
            for (var i in group) {
                var tab = group[i]
                node.addChild(new Node(tab, false))
            }
        } else {
            node = new Node(group[0], false)
        }
        root.addChild(node)
    }

    var hr = document.createElement('hr');
    root.children_elem.appendChild(hr);

    console.log('unpinned')
    console.log(unpinned)
    unpinned_groups = sortIntoGroups(unpinned)
    for (var i in unpinned_groups) {
        var group = unpinned_groups[i]
        var node = null
        if (group.length > 1) {
            var node = new Node(group[0], true)
            for (var i in group) {
                var tab = group[i]
                node.addChild(new Node(tab), false)
            }
        } else {
            var node = new Node(group[0], false)
        }
        root.addChild(node)
    }


    // shrink indent at root level
    root.padding.width = 0
    tab_section.appendChild(root.elem)
    console.log(root)
}

function selecttab(id) {
    console.log('select ' + id);
    chrome.tabs.get(id, function(tab) {
      chrome.tabs.highlight({windowId: chrome.windows.WINDOW_ID_CURRENT, tabs: tab.index}, function(){})
    });
}

function clear() {
    document.getElementById('tabs').innerHTML = '';
}

function removeBar(id) {
    console.log('remove from html ' + id);
    var elem = document.getElementById(id);
    elem.parentNode.removeChild(elem);
    var elem = document.getElementById("x" + id);
    elem.parentNode.removeChild(elem);
    var elem = document.getElementById("br" + id);
    elem.parentNode.removeChild(elem);
    var elem = document.getElementById("fav" + id);
    elem.parentNode.removeChild(elem);
}

function closetab(id) {
    console.log('close ' + id);
    chrome.tabs.remove(id);
    removeBar(id);
}

function numPinned(tabs) {
    var pinned = 0;
    for (i in tabs) {
        if (tabs[i].pinned) {
            pinned++;
        }
    }
    return pinned;
}
/*
function move(pinned, unpinned) {
    console.log('move tabs');
    for (var i = 0; i < unpinned.length; i++) {
      var tab = unpinned[i];
      console.log(pinned.length, i);
      chrome.tabs.move(tab.id, {index: pinned.length + i});
    }
}
*/
function domainTree() {
  var tabs = [];
  for (var id in BKG.TABS) {
    var tab = BKG.TABS[id];
    tabs.push(tab);
  }
  tabs.sort(byKey(function(x) { return x.domain }));
  var root = new node();
  var lastdomain = null;
  for (var tab in tabs) {
    if (!lastdomain || tab.domain != lastdomain) {
      var child = node();
      child.fav = tab.favIconUrl;
      root.children.push(child);
    } else {
      child.children.push(tab);
    }
  }
}

function sortByDomain(tabs) {
    console.log('sort by domain');
    // id used to keep tabs with same domain stable.
}

function sortUnpinned(tabs) {
    // clear button menu
    clear();
    // attach domain
    for (var i in tabs) {
        var tab = tabs[i]
        console.log(tab)
        tab.domain = BKG.getDomain(tab.url)
    }
    // divide into pinned and unpinned
    var pinned = [];
    var unpinned = [];
    for (var i in tabs) {
        var tab = tabs[i];
        if (tab.pinned)
            pinned.push(tab);
        else
            unpinned.push(tab);
    }
    // sort unpinned tabs by domain
    unpinned.sort(byKey(function(x) { return [x.domain, x.id] }));
    show(pinned, unpinned);
    //move(pinned, unpinned);
}

function sortByIndex(tabs) {
    console.log('sort by index');
    clear();
    for (var i in tabs) {
        var tab = tabs[i]
        console.log(tab)
        tab.domain = BKG.getDomain(tab.url)
    }
    tabs.sort(byKey(function(x) { return x.index }));
    show(tabs);
    //move(tabs);
}

function DOMContentLoadedListener() {
    chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, sortUnpinned)
}

document.addEventListener('DOMContentLoaded', DOMContentLoadedListener);
