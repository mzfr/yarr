var TITLE = document.title

const debounce = (callback, wait) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      callback(...args)
    }, wait)
  }
}


var vm = Vue.createApp({
  el: "#app",
  mounted() {
    this.refreshStats()
      .then(this.refreshFeeds.bind(this))
      .then(this.refreshItems.bind(this, false))

    api.feeds.list_errors().then(function(errors) {
      vm.feed_errors = errors
    })
  },
  data() {
    var s = app.settings
    return {
      'ReplyRetweet': '',
      'filterSelected': s.filter,
      'folders': [],
      'feeds': [],
      'feedSelected': s.feed,
      'feedListWidth': s.feed_list_width || 200,
      'feedNewChoice': [],
      'feedNewChoiceSelected': '',
      'items': [],
      'itemsHasMore': true,
      'itemSelected': null,
      'itemSelectedDetails': null,
      'itemSelectedReadability': '',
      'itemSearch': '',
      'itemSortNewestFirst': s.sort_newest_first,
      'itemListWidth': s.item_list_width || 300,

      'filteredFeedStats': {},
      'filteredFolderStats': {},
      'filteredTotalStats': null,

      'settings': '',
      'loading': {
        'feeds': 0,
        'newfeed': false,
        'items': false,
        'readability': false,
      },
      'fonts': ['', 'serif', 'monospace'],
      'feedStats': {},
      'theme': {
        'name': s.theme_name,
        'font': s.theme_font,
        'size': s.theme_size,
      },
      'refreshRate': s.refresh_rate,
      'authenticated': app.authenticated,
      'feed_errors': {},
    }
  },
  computed: {
    foldersWithFeeds() {
      console.log("Reaching here")
      const feedsByFolders = this.feeds.reduce((folders, feed) => {
        if (!folders[feed.folder_id]) {
          folders[feed.folder_id] = [feed];
        } else {
          folders[feed.folder_id].push(feed);
        }
        return folders;
      }, {});

      const folders = this.folders.slice().map((folder) => {
        folder.feeds = feedsByFolders[folder.id];
        console.log(folders)
        return folder;
      });
      folders.push({ id: null, feeds: feedsByFolders[null] });
      return folders;
    },
    feedsById() {
      return this.feeds.reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});
    },
    foldersById() {
      return this.folders.reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});
    },
    current() {
      const parts = (this.feedSelected || '').split(':', 2);
      const type = parts[0];
      const guid = parts[1];
  
      let folder = {};
      let feed = {};
  
      if (type === 'feed') {
        feed = this.feedsById[guid] || {};
      }
      if (type === 'folder') {
        folder = this.foldersById[guid] || {};
      }
  
      return { type, feed, folder };
    },
    itemSelectedContent() {
      if (!this.itemSelected) return '';
  
      if (this.itemSelectedReadability) {
        return this.itemSelectedReadability;
      }
  
      return this.itemSelectedDetails?.content || '';
    },
  },  
  watch: {
    theme: {
      deep: true,
      handler: (theme) => {
        document.body.classList.value = 'theme-' + theme.name;
        api.settings.update({
          theme_name: theme.name,
          theme_font: theme.font,
          theme_size: theme.size,
        });
      },
    },
    feedStats: {
      deep: true,
      handler: debounce(function() {
        var title = TITLE;
        var unreadCount = Object.values(this.feedStats).reduce(function(acc, stat) {
          return acc + stat.unread;
        }, 0);
        if (unreadCount) {
          title += ' (' + unreadCount + ')';
        }
        document.title = title;
        this.computeStats();
      }, 500),
    },
    filterSelected: function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ filter: newVal }).then(() => {
        this.refreshItems(false);
      });
      this.itemSelected = null;
      this.computeStats();
    },
    feedSelected: function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ feed: newVal }).then(() => {
        this.refreshItems(false);
      });
      this.itemSelected = null;
      if (this.$refs.itemlist) this.$refs.itemlist.scrollTop = 0;
    },
    itemSelected(newVal, oldVal) {
      this.itemSelectedReadability = '';
      if (newVal === null) {
        this.itemSelectedDetails = null;
        return;
      }
      if (this.$refs.content) this.$refs.content.scrollTop = 0;
  
      api.items.get(newVal).then((item) => {
        this.itemSelectedDetails = item;
        if (this.itemSelectedDetails.status == 'unread') {
          api.items.update(this.itemSelectedDetails.id, { status: 'read' }).then(() => {
            this.feedStats[this.itemSelectedDetails.feed_id].unread -= 1;
            var itemInList = this.items.find((i) => i.id == item.id);
            if (itemInList) itemInList.status = 'read';
            this.itemSelectedDetails.status = 'read';
          });
        }
      });
    },
    itemSearch: debounce(function(newVal) {
      this.refreshItems();
    }, 500),
    itemSortNewestFirst: function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ sort_newest_first: newVal }).then(() => {
        this.refreshItems(false);
      });
    },
    feedListWidth: debounce(function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ feed_list_width: newVal });
    }, 1000),
    itemListWidth: debounce(function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ item_list_width: newVal });
    }, 1000),
    refreshRate: function(newVal, oldVal) {
      if (oldVal === undefined) return; // do nothing, initial setup
      api.settings.update({ refresh_rate: newVal });
    },
  },  
  methods: {
    refreshStats(loopMode) {
      return api.status().then((data) => {
        if (loopMode && !this.itemSelected) this.refreshItems()
    
        this.loading.feeds = data.running
        if (data.running) {
          setTimeout(() => this.refreshStats(true), 500)
        }
        this.feedStats = data.stats.reduce((acc, stat) => {
          acc[stat.feed_id] = stat
          return acc
        }, {})
    
        api.feeds.list_errors().then((errors) => {
          this.feed_errors = errors
        })
      })
    },    
    getItemsQuery() {
      var query = {}
      if (this.feedSelected) {
        var parts = this.feedSelected.split(':', 2)
        var type = parts[0]
        var guid = parts[1]
        if (type == 'feed') {
          query.feed_id = guid
        } else if (type == 'folder') {
          query.folder_id = guid
        }
      }
      if (this.filterSelected) {
        query.status = this.filterSelected
      }
      if (this.itemSearch) {
        query.search = this.itemSearch
      }
      if (!this.itemSortNewestFirst) {
        query.oldest_first = true
      }
      return query
    },
    async refreshFeeds() {
      return Promise
        .all([api.folders.list(), api.feeds.list()])
        .then(function(values) {
          console.log(values[0], values[1])
          this.folders = values[0]
          this.feeds = values[1]
        })
    },
    refreshItems(loadMore) {
      if (this.feedSelected === null) {
        this.items = []
        return
      }
    
      var query = this.getItemsQuery()
      if (loadMore) {
        query.after = this.items[this.items.length - 1].id
      }
    
      this.loading.items = true
      api.items.list(query).then((data) => {
        if (loadMore) {
          this.items = this.items.concat(data.list)
        } else {
          this.items = data.list
        }
        this.itemsHasMore = data.has_more
        this.loading.items = false
    
        // load more if there's some space left at the bottom of the item list.
        this.$nextTick(() => {
          if (this.itemsHasMore && !this.loading.items && this.itemListCloseToBottom()) {
            this.refreshItems(true)
          }
        })
      })
    },    
    itemListCloseToBottom() {
      // approx. vertical space at the bottom of the list (loading el & paddings) when 1rem = 16px
      var bottomSpace = 70
      var scale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16

      var el = this.$refs.itemlist
      var closeToBottom = (el.scrollHeight - el.scrollTop - el.offsetHeight) < bottomSpace * scale
      return closeToBottom
    },
    loadMoreItems(event, el) {
      if (!this.itemsHasMore) return
      if (this.loading.items) return
      if (this.itemListCloseToBottom()) this.refreshItems(true)
    },
    markItemsRead() {
      var query = this.getItemsQuery()
      api.items.mark_read(query).then(() => {
        this.items = []
        this.itemsPage = { 'cur': 1, 'num': 1 }
        this.itemSelected = null
        this.itemsHasMore = false
        this.refreshStats()
      })
    },
    toggleFolderExpanded(folder) {
      folder.is_expanded = !folder.is_expanded
      api.folders.update(folder.id, { is_expanded: folder.is_expanded })
    },
    formatDate(datestr) {
      var options = {
        year: "numeric", month: "long", day: "numeric",
        hour: '2-digit', minute: '2-digit',
      }
      return new Date(datestr).toLocaleDateString(undefined, options)
    },
    moveFeed(feed, folder) {
      var folder_id = folder ? folder.id : null
      api.feeds.update(feed.id, { folder_id: folder_id }).then(() => {
        feed.folder_id = folder_id
        this.refreshStats()
      })
    },
    moveFeedToNewFolder(feed) {
      var title = prompt('Enter folder name:')
      if (!title) return
      api.folders.create({ 'title': title }).then((folder) => {
        api.feeds.update(feed.id, { folder_id: folder.id }).then(() => {
          this.refreshFeeds().then(() => {
            this.refreshStats()
          })
        })
      })
    },
    createNewFeedFolder() {
      var title = prompt('Enter folder name:')
      if (!title) return
      api.folders.create({ 'title': title }).then((result) => {
        this.refreshFeeds().then(() => {
          this.$nextTick(() => {
            if (this.$refs.newFeedFolder) {
              this.$refs.newFeedFolder.value = result.id
            }
          })
        })
      })
    },    
    renameFolder(folder) {
      let newTitle = prompt('Enter new title', folder.title)
      if (newTitle) {
        api.folders.update(folder.id, { title: newTitle }).then(() => {
          folder.title = newTitle
          this.folders.sort((a, b) => a.title.localeCompare(b.title))
        })
      }
    },    
    deleteFolder(folder) {
      if (confirm('Are you sure you want to delete ' + folder.title + '?')) {
        api.folders.delete(folder.id).then(() => {
          if (this.feedSelected === 'folder:' + folder.id) {
            this.items = []
            this.feedSelected = ''
          }
          this.refreshStats()
          this.refreshFeeds()
        })
      }
    },
    renameFeed(feed) {
      var newTitle = prompt('Enter new title', feed.title)
      if (newTitle) {
        api.feeds.update(feed.id, { title: newTitle }).then(() => {
          feed.title = newTitle
        })
      }
    },
    deleteFeed(feed) {
      if (confirm('Are you sure you want to delete ' + feed.title + '?')) {
        api.feeds.delete(feed.id).then(() => {
          // unselect feed to prevent reading properties of null in template
          var isSelected = !vm.feedSelected
            || (vm.feedSelected === 'feed:' + feed.id
              || (feed.folder_id && vm.feedSelected === 'folder:' + feed.folder_id));
          if (isSelected) vm.feedSelected = null

          this.refreshStats()
          this.refreshFeeds()
        })
      }
    },
    createFeed(event) {
      var form = event.target
      var data = {
        url: form.querySelector('input[name=url]').value,
        folder_id: parseInt(form.querySelector('select[name=folder_id]').value) || null,
      }
      if (this.feedNewChoiceSelected) {
        data.url = this.feedNewChoiceSelected
      }
      this.loading.newfeed = true
      api.feeds.create(data).then((result) => {
        if (result.status === 'success') {
          this.refreshFeeds()
          this.refreshStats()
          this.settings = ''
          this.feedSelected = 'feed:' + result.feed.id
        } else if (result.status === 'multiple') {
          this.feedNewChoice = result.choice
          this.feedNewChoiceSelected = result.choice[0].url
        } else {
          alert('No feeds found at the given url.')
        }
        this.loading.newfeed = false
      })
    },
    toggleItemStatus(item, targetstatus, fallbackstatus) {
      let oldstatus = item.status
      let newstatus = item.status !== targetstatus ? targetstatus : fallbackstatus
    
      const updateStats = (status, incr) => {
        if (status === 'unread' || status === 'starred') {
          this.feedStats[item.feed_id][status] += incr
        }
      }
    
      api.items.update(item.id, { status: newstatus }).then(() => {
        updateStats(oldstatus, -1)
        updateStats(newstatus, +1)
    
        let itemInList = this.items.find((i) => i.id === item.id)
        if (itemInList) itemInList.status = newstatus
        item.status = newstatus
      })
    },
    
    toggleItemStarred(item) {
      this.toggleItemStatus(item, 'starred', 'read')
    },
    
    toggleItemRead(item) {
      this.toggleItemStatus(item, 'unread', 'read')
    },
    
    addToPocket(item) {
      console.log("WORKING!")
      api.add_to_pocket(item.link)
    },
    
    importOPML(event) {
      let input = event.target
      let form = document.querySelector('#opml-import-form')
      this.$refs.menuDropdown.hide()
      api.upload_opml(form).then(() => {
        input.value = ''
        this.refreshFeeds()
        this.refreshStats()
      })
    },
    
    logout() {
      api.logout().then(() => {
        document.location.reload()
      })
    },
    
    toggleReadability() {
      if (this.itemSelectedReadability) {
        this.itemSelectedReadability = null
        return
      }
      let item = this.itemSelectedDetails
      if (!item) return
      if (item.link) {
        this.loading.readability = true
        api.crawl(item.link).then((data) => {
          this.itemSelectedReadability = data && data.content
          this.loading.readability = false
        })
      }
    },
    
    showSettings(settings) {
      this.settings = settings
    
      if (settings === 'create') {
        this.feedNewChoice = []
        this.feedNewChoiceSelected = ''
      }
    },
    
    resizeFeedList(width) {
      this.feedListWidth = Math.min(Math.max(200, width), 700)
    },
    
    resizeItemList(width) {
      this.itemListWidth = Math.min(Math.max(200, width), 700)
    },
    
    resetFeedChoice() {
      this.feedNewChoice = []
      this.feedNewChoiceSelected = ''
    },
    
    incrFont(x) {
      this.theme.size = +(this.theme.size + 0.1 * x).toFixed(1)
    },
    
    isNitterLink(url) {
      return url.includes('nitter')
    },
    
    getNitterAuthor(url) {
      const parseUrl = new URL(url)
      return parseUrl.pathname.split("/")[1]
    },
    
    isReplyRetweet(title) {
      if (title.startsWith("R to ")) {
        this.ReplyRetweet = title.replace("R to", "Replying to").split(" ").slice(0, 3).join(" ").slice(0, -1)
      } else if (title.startsWith("RT by")) {
        this.ReplyRetweet = title.replace("RT by", "Retweeted by").split(" ").slice(0, 3).join(" ").slice(0, -1)
      } else {
        this.ReplyRetweet = null
      }
      return Boolean(this.ReplyRetweet)
    },

    fetchAllFeeds() {
      if (this.loading.feeds) return
      api.feeds.refresh().then(() => {
        this.refreshStats()
      })
    },
    computeStats() {
      let filter = this.filterSelected
      if (!filter) {
        this.filteredFeedStats = {}
        this.filteredFolderStats = {}
        this.filteredTotalStats = null
        return
      }
    
      let statsFeeds = {}
      let statsFolders = {}
      let statsTotal = 0
    
      for (let [id, folder_id] of Object.entries(this.feeds)) {
        if (!this.feedStats[id]) continue
    
        let n = this.feedStats[id][filter] ?? 0
    
        if (!statsFolders[folder_id]) this.$set(statsFolders, folder_id, 0)
    
        this.$set(statsFeeds, id, n)
        statsFolders[folder_id] += n
        statsTotal += n
      }
    
      this.filteredFeedStats = statsFeeds
      this.filteredFolderStats = statsFolders
      this.filteredTotalStats = statsTotal
    },
  } 
})

vm.directive('scroll', {
  inserted: function(el, binding) {
    el.addEventListener('scroll', debounce(function(event) {
      binding.value(event, el)
    }, 200))
  },
})

vm.directive('focus', {
  inserted: function(el) {
    el.focus()
  }
})

vm.component('drag', {
  props: ['width'],
  template: '<div class="drag"></div>',
  mounted: function() {
    var self = this
    var startX = undefined
    var initW = undefined
    var onMouseMove = function(e) {
      var offset = e.clientX - startX
      var newWidth = initW + offset
      self.$emit('resize', newWidth)
    }
    var onMouseUp = function(e) {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    this.$el.addEventListener('mousedown', function(e) {
      startX = e.clientX
      initW = self.width
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  },
})

vm.component('dropdown', {
  props: ['class', 'toggle-class', 'ref', 'drop', 'title'],
  data: function() {
    return { open: false }
  },
  template: `
    <div class="dropdown" :class="$attrs.class">
      <button ref="btn" @click="toggle" :class="btnToggleClass" :title="$props.title"><slot name="button"></slot></button>
      <div ref="menu" class="dropdown-menu" :class="{show: open}"><slot v-if="open"></slot></div>
    </div>
  `,
  computed: {
    btnToggleClass: function() {
      var c = this.$props.toggleClass || ''
      c += ' dropdown-toggle dropdown-toggle-no-caret'
      c += this.open ? ' show' : ''
      return c.trim()
    }
  },
  methods: {
    toggle: function(e) {
      this.open ? this.hide() : this.show()
    },
    show: function(e) {
      this.open = true
      this.$refs.menu.style.top = this.$refs.btn.offsetHeight + 'px'
      var drop = this.$props.drop

      if (drop === 'right') {
        this.$refs.menu.style.left = 'auto'
        this.$refs.menu.style.right = '0'
      } else if (drop === 'center') {
        this.$nextTick(function() {
          var btnWidth = this.$refs.btn.getBoundingClientRect().width
          var menuWidth = this.$refs.menu.getBoundingClientRect().width
          this.$refs.menu.style.left = '-' + ((menuWidth - btnWidth) / 2) + 'px'
        }.bind(this))
      }

      document.addEventListener('click', this.clickHandler)
    },
    hide: function() {
      this.open = false
      document.removeEventListener('click', this.clickHandler)
    },
    clickHandler: function(e) {
      var dropdown = e.target.closest('.dropdown')
      if (dropdown == null || dropdown != this.$el) return this.hide()
      if (e.target.closest('.dropdown-item') != null) return this.hide()
    }
  },
})

vm.component('modal', {
  props: ['open'],
  template: `
    <div class="modal custom-modal" tabindex="-1" v-if="$props.open">
      <div class="modal-dialog">
        <div class="modal-content" ref="content">
          <div class="modal-body">
            <slot v-if="$props.open"></slot>
          </div>
        </div>
      </div>
    </div>
  `,
  data: function() {
    return { opening: false }
  },
  watch: {
    'open': function(newVal) {
      if (newVal) {
        this.opening = true
        document.addEventListener('click', this.handleClick)
      } else {
        document.removeEventListener('click', this.handleClick)
      }
    },
  },
  methods: {
    handleClick: function(e) {
      if (this.opening) {
        this.opening = false
        return
      }
      if (e.target.closest('.modal-content') == null) this.$emit('hide')
    },
  },
})

function dateRepr(d) {
  var sec = (new Date().getTime() - d.getTime()) / 1000
  var neg = sec < 0
  var out = ''

  sec = Math.abs(sec)
  if (sec < 2700)  // less than 45 minutes
    out = Math.round(sec / 60) + 'm'
  else if (sec < 86400)  // less than 24 hours
    out = Math.round(sec / 3600) + 'h'
  else if (sec < 604800)  // less than a week
    out = Math.round(sec / 86400) + 'd'
  else
    out = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })

  if (neg) return '-' + out
  return out
}

vm.component('relative-time', {
  props: ['val'],
  data: function() {
    var d = new Date(this.val)
    return {
      'date': d,
      'formatted': dateRepr(d),
      'interval': null,
    }
  },
  template: '<time :datetime="val">{{ formatted }}</time>',
  mounted: function() {
    this.interval = setInterval(function() {
      this.formatted = dateRepr(this.date)
    }.bind(this), 600000)  // every 10 minutes
  },
  destroyed: function() {
    clearInterval(this.interval)
  },
})

vm.mount('#app')
