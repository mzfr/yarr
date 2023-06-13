
function scrollto(target, scroll) {
    var padding = 10
    var targetRect = target.getBoundingClientRect()
    var scrollRect = scroll.getBoundingClientRect()
  
    // target
    var relativeOffset = targetRect.y - scrollRect.y
    var absoluteOffset = relativeOffset + scroll.scrollTop
  
    if (padding <= relativeOffset && relativeOffset + targetRect.height <= scrollRect.height - padding) return
  
    var newPos = scroll.scrollTop
    if (relativeOffset < padding) {
      newPos = absoluteOffset - padding
    } else {
      newPos = absoluteOffset - scrollRect.height + targetRect.height + padding
    }
    scroll.scrollTop = Math.round(newPos)
  }
  
  var helperFunctions = {
    // navigation helper, navigate relative to selected item
    navigateToItem: function(relativePosition) {
      if (app.itemSelected == null) {
        // if no item is selected, select first
        console.log(app)
        if (app.items.length !== 0) app.itemSelected = app.items[0].id
        return
      }
  
      var itemPosition = app.items.findIndex(function(x) { return x.id === app.itemSelected })
      if (itemPosition === -1) {
        if (app.items.length !== 0) app.itemSelected = app.items[0].id
        return
      }
  
      var newPosition = itemPosition + relativePosition
      if (newPosition < 0 || newPosition >= app.items.length) return
  
      app.itemSelected = app.items[newPosition].id
  
      Vue.nextTick(function() {
        var scroll = document.querySelector('#item-list-scroll')
  
        var handle = scroll.querySelector('input[type=radio]:checked')
        var target = handle && handle.parentElement
  
        if (target && scroll) scrollto(target, scroll)
      })
    },
    // navigation helper, navigate relative to selected feed
    navigateToFeed: function(relativePosition) {
      var navigationList = Array.from(document.querySelectorAll('#col-feed-list input[name=feed]'))
        .filter(function(r) { return r.offsetParent !== null && r.value !== 'folder:null' })
        .map(function(r) { return r.value })
  
      var currentFeedPosition = navigationList.indexOf(app.feedSelected)
  
      if (currentFeedPosition == -1) {
        app.feedSelected = ''
        return
      }
  
      var newPosition = currentFeedPosition + relativePosition
      if (newPosition < 0 || newPosition >= navigationList.length) return
  
      app.feedSelected = navigationList[newPosition]
  
      app.$nextTick(function() {
        var scroll = document.querySelector('#feed-list-scroll')
  
        var handle = scroll.querySelector('input[type=radio]:checked')
        var target = handle && handle.parentElement
  
        if (target && scroll) scrollto(target, scroll)
      })
    },
    scrollContent: function(direction) {
      var padding = 40
      var scroll = document.querySelector('.content')
      if (!scroll) return
  
      var height = scroll.getBoundingClientRect().height
      var newpos = scroll.scrollTop + (height - padding) * direction
  
      if (typeof scroll.scrollTo == 'function') {
        scroll.scrollTo({ top: newpos, left: 0, behavior: 'smooth' })
      } else {
        scroll.scrollTop = newpos
      }
    }
  }
  var shortcutFunctions = {
    openItemLink: function() {
      if (app.itemSelectedDetails && app.itemSelectedDetails.link) {
        window.open(app.itemSelectedDetails.link, '_blank')
      }
    },
    toggleReadability: function() {
      app.toggleReadability()
    },
    toggleItemRead: function() {
      if (app.itemSelected != null) {
        app.toggleItemRead(app.itemSelectedDetails)
      }
    },
    addToPocket: function() {
      app.addToPocket(app.itemSelectedDetails.link)
    },
    markAllRead: function() {
      // same condition as 'Mark all read button'
      if (app.filterSelected == 'unread') {
        app.markItemsRead()
      }
    },
    toggleItemStarred: function() {
      if (app.itemSelected != null) {
        app.toggleItemStarred(app.itemSelectedDetails)
      }
    },
    focusSearch: function() {
      document.getElementById("searchbar").focus()
    },
    nextItem() {
      helperFunctions.navigateToItem(+1)
    },
    previousItem() {
      helperFunctions.navigateToItem(-1)
    },
    nextFeed() {
      helperFunctions.navigateToFeed(+1)
    },
    previousFeed() {
      helperFunctions.navigateToFeed(-1)
    },
    scrollForward: function() {
      helperFunctions.scrollContent(+1)
    },
    scrollBackward: function() {
      helperFunctions.scrollContent(-1)
    },
    showAll() {
      app.filterSelected = ''
    },
    showUnread() {
      app.filterSelected = 'unread'
    },
    showStarred() {
      app.filterSelected = 'starred'
    },
  }
  
  // If you edit, make sure you update the help modal
  var keybindings = {
    "o": shortcutFunctions.openItemLink,
    "i": shortcutFunctions.toggleReadability,
    "r": shortcutFunctions.toggleItemRead,
    "R": shortcutFunctions.markAllRead,
    "s": shortcutFunctions.toggleItemStarred,
    "/": shortcutFunctions.focusSearch,
    "j": shortcutFunctions.nextItem,
    "k": shortcutFunctions.previousItem,
    "l": shortcutFunctions.nextFeed,
    "h": shortcutFunctions.previousFeed,
    "f": shortcutFunctions.scrollForward,
    "b": shortcutFunctions.scrollBackward,
    "1": shortcutFunctions.showUnread,
    "2": shortcutFunctions.showStarred,
    "3": shortcutFunctions.showAll,
  }
  
  var codebindings = {
    "KeyO": shortcutFunctions.openItemLink,
    "KeyI": shortcutFunctions.toggleReadability,
    //"r": shortcutFunctions.toggleItemRead,
    //"KeyR": shortcutFunctions.markAllRead,
    "KeyS": shortcutFunctions.toggleItemStarred,
    "Slash": shortcutFunctions.focusSearch,
    "KeyJ": shortcutFunctions.nextItem,
    "KeyK": shortcutFunctions.previousItem,
    "KeyL": shortcutFunctions.nextFeed,
    "KeyH": shortcutFunctions.previousFeed,
    "KeyF": shortcutFunctions.scrollForward,
    "KeyB": shortcutFunctions.scrollBackward,
    "Digit1": shortcutFunctions.showUnread,
    "Digit2": shortcutFunctions.showStarred,
    "Digit3": shortcutFunctions.showAll,
  }
  
  function isTextBox(element) {
    var tagName = element.tagName.toLowerCase()
    // Input elements that aren't text
    var inputBlocklist = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'search', 'submit']
  
    return tagName === 'textarea' ||
      (tagName === 'input'
        && inputBlocklist.indexOf(element.getAttribute('type').toLowerCase()) == -1
      )
  }
  
  document.addEventListener('keydown', function(event) {
    // Ignore while focused on text or
    // when using modifier keys (to not clash with browser behaviour)
    if (isTextBox(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
      return
    }
    var keybindFunction = keybindings[event.key] || codebindings[event.code]
    console.log(keybindFunction)
    if (keybindFunction) {
      event.preventDefault()
      keybindFunction()
    }
  })
  