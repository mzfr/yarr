const TITLE = document.title;

const debounce = (callback, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

const app = Vue.createApp({
  setup() {
    const filterSelected = Vue.ref("");
    const folders = Vue.ref([]);
    const feeds = Vue.ref([]);
    const feedSelected = Vue.ref("");
    const feedListWidth = Vue.ref(200);
    const feedNewChoice = Vue.ref([]);
    const feedNewChoiceSelected = Vue.ref("");
    const items = Vue.ref([]);
    const itemsHasMore = Vue.ref(true);
    const itemSelected = Vue.ref(null);
    const itemSelectedDetails = Vue.ref(null);
    const itemSelectedReadability = Vue.ref("");
    const itemSearch = Vue.ref("");
    const itemSortNewestFirst = Vue.ref(false);
    const itemListWidth = Vue.ref(300);
    const filteredFeedStats = Vue.ref({});
    const filteredFolderStats = Vue.ref({});
    const filteredTotalStats = Vue.ref(null);
    const settings = Vue.ref("");
    const loading = Vue.reactive({
      feeds: 0,
      newfeed: false,
      items: false,
      readability: false,
    });
    const fonts = Vue.ref(["", "serif", "monospace"]);
    const feedStats = Vue.ref({});
    const theme = Vue.reactive({
      name: "",
      font: "",
      size: "",
    });
    const refreshRate = Vue.ref("");
    const authenticated = Vue.ref(false);
    const feedErrors = Vue.ref({});
    const itemList = Vue.ref(null);
    const newFeedFolderId = Vue.ref(null);
    const content = Vue.ref(null);

    const api = window.api();
    Vue.onMounted(() => {
      refreshFeeds();
    });

    // Vue.Computed properties
    const foldersWithFeeds = Vue.computed(() => {
      const feedsByFolders = feeds.value.reduce((folders, feed) => {
        if (!folders[feed.folder_id]) {
          folders[feed.folder_id] = [feed];
        } else {
          folders[feed.folder_id].push(feed);
        }
        return folders;
      }, {});

      const foldersList = folders.value.slice().map((folder) => {
        folder.feeds = feedsByFolders[folder.id];
        return folder;
      });
      foldersList.push({ id: null, feeds: feedsByFolders[null] });
      return foldersList;
    });

    const feedsById = Vue.computed(() => {
      return feeds.value.reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});
    });

    const foldersById = Vue.computed(() => {
      return folders.value.reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});
    });

    const current = Vue.computed(() => {
      const parts = (feedSelected.value || "").split(":", 2);
      const type = parts[0];
      const guid = parts[1];

      let folder = {};
      let feed = {};
      if (type === "feed") {
        feed = feedsById.value[guid] || {};
      }
      if (type === "folder") {
        folder = foldersById.value[guid] || {};
      }
      return { type, feed, folder };
    });

    const itemSelectedContent = Vue.computed(() => {
      if (!itemSelected.value) return "";

      if (itemSelectedReadability.value) {
        return itemSelectedReadability.value;
      }

      return itemSelectedDetails.value?.content || "";
    });

    const debouncedHandler = (fn, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fn(...args);
        }, delay);
      };
    };

    // Vue.Watchers
    Vue.watch(
      theme,
      (theme) => {
        document.body.classList.value = "theme-" + theme.name;
        api.settings.update({
          theme_name: theme.name,
          theme_font: theme.font,
          theme_size: theme.size,
        });
      },
      {
        deep: true,
      }
    );

    Vue.watch(
      feedStats,
      debouncedHandler(() => {
        const title = TITLE;
        const unreadCount = Object.values(feedStats.value).reduce(
          (acc, stat) => {
            return acc + stat.unread;
          },
          0
        );
        if (unreadCount) {
          document.title = title + " (" + unreadCount + ")";
        } else {
          document.title = title;
        }
        computeStats();
      }, 500),
      {
        deep: true,
      }
    );

    Vue.watch(filterSelected, (newVal, oldVal) => {
      if (oldVal !== undefined) {
        api.settings.update({ filter: newVal }).then(() => {
          refreshItems(false);
        });
        itemSelected.value = null;
        computeStats();
      }
    });

    Vue.watch(feedSelected, (newVal, oldVal) => {
      if (oldVal !== undefined) {
        api.settings.update({ feed: newVal }).then(() => {
          refreshItems(false);
        });
        itemSelected.value = null;
        if (itemList.value) {
          itemList.value.scrollTop = 0;
        }
      }
    });

    Vue.watch(itemSelected, (newVal, _) => {
      itemSelectedReadability.value = "";
      if (newVal === null) {
        itemSelectedDetails.value = null;
        return;
      }
      if (content.value) {
        content.value.scrollTop = 0;
      }
      api.items.get(newVal).then((item) => {
        itemSelectedDetails.value = item;
        if (itemSelectedDetails.value.status === "unread") {
          api.items
            .update(itemSelectedDetails.value.id, { status: "read" })
            .then(() => {
              feedStats.value[itemSelectedDetails.value.feed_id].unread -= 1;
              const itemInList = items.value.find((i) => i.id === item.id);
              if (itemInList) {
                itemInList.status = "read";
              }
              itemSelectedDetails.value.status = "read";
            });
        }
      });
    });

    Vue.watch(
      itemSearch,
      debouncedHandler((newVal) => {
        refreshItems();
      }, 500)
    );

    Vue.watch(itemSortNewestFirst, (newVal, oldVal) => {
      if (oldVal !== undefined) {
        api.settings.update({ sort_newest_first: newVal }).then(() => {
          refreshItems(false);
        });
      }
    });

    Vue.watch(
      feedListWidth,
      debouncedHandler((newVal, oldVal) => {
        if (oldVal !== undefined) return; // do nothing, initial setup
        api.settings.update({ feed_list_width: newVal });
      }, 1000)
    );

    Vue.watch(
      itemListWidth,
      debouncedHandler((newVal, oldVal) => {
        if (oldVal === undefined) return; // do nothing, initial setup
        api.settings.update({ item_list_width: newVal });
      }, 1000)
    );

    // methods
    function refreshStats(loopMode) {
      return api.status().then((data) => {
        if (loopMode && !itemSelected.value) refreshItems();

        loading.feeds = data.running;
        if (data.running) {
          setTimeout(() => refreshStats(true), 500);
        }
        feedStats.value = data.stats.reduce((acc, stat) => {
          acc[stat.feed_id] = stat;
          return acc;
        }, {});

        api.feeds.listErrors().then((errors) => {
          feedErrors.value = errors;
        });
      });
    }
    function getItemsQuery() {
      const query = {};
      if (feedSelected) {
        const parts = feedSelected.value.split(":", 2);
        const type = parts[0];
        const guid = parts[1];
        if (type == "feed") {
          query.feed_id = guid;
        } else if (type == "folder") {
          query.folder_id = guid;
        }
      }
      if (filterSelected) {
        query.status = filterSelected;
      }
      if (itemSearch) {
        query.search = itemSearch;
      }
      if (!itemSortNewestFirst) {
        query.oldest_first = true;
      }
      return query;
    }
    async function refreshFeeds() {
      const values_1 = await Promise.all([
        api.folders.list(),
        api.feeds.list(),
      ]);
      folders.value = values_1[0];
      feeds.value = values_1[1];
    }

    function refreshItems(loadMore) {
      if (feedSelected === null) {
        items.value = [];
        return;
      }

      const query = getItemsQuery();
      if (loadMore) {
        query.after = items.value[items.value.length - 1].id;
      }

      loading.items = true;
      api.items.list(query).then((data) => {
        if (loadMore) {
          items.value = items.value.concat(data.list);
        } else {
          items.value = data.list;
        }
        itemsHasMore.value = data.has_more;
        loading.items = false;

        // load more if there's some space left at the bottom of the item list.
        Vue.nextTick(() => {
          if (itemsHasMore && !loading.items && itemListCloseToBottom()) {
            refreshItems(true);
          }
        });
      });
    }

    function itemListCloseToBottom() {
      // approx. vertical space at the bottom of the list (loading el & paddings) when 1rem = 16px
      const bottomSpace = 70;
      const scale = (parseFloat(getComputedStyle(document.documentElement).fontSize) ||
        16) / 16;

      const el = itemList.value;

      if (!el) return false;
      const closeToBottom = el.scrollHeight - el.scrollTop - el.offsetHeight < bottomSpace * scale;
      return closeToBottom;
    }

  function loadMoreItems(event, el) {
      if (!itemsHasMore) return;
      if (loading.items) return;
      if (itemListCloseToBottom()) refreshItems(true);
    }
    const markItemsRead = () => {
      const query = getItemsQuery();
      api.items.mark_read(query).then(() => {
        items.value = [];
        itemsPage.value = { cur: 1, num: 1 };
        itemSelected.value = null;
        itemsHasMore.value = false;
        refreshStats();
      });
    };

    function toggleFolderExpanded(folder) {
      folder.is_expanded = !folder.is_expanded;
      api.folders.update(folder.id, { is_expanded: folder.is_expanded });
    }

    function formatDate(datestr) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Date(datestr).toLocaleDateString(undefined, options);
    }

    function moveFeed(feed, folder) {
      const folder_id = folder ? folder.id : null;
      api.feeds.update(feed.id, { folder_id: folder_id }).then(() => {
        feed.folder_id = folder_id;
        refreshStats();
      });
    }

    function moveFeedToNewFolder(feed) {
      const title = prompt("Enter folder name:");
      if (!title) return;
      api.folders.create({ title: title }).then((folder) => {
        api.feeds.update(feed.id, { folder_id: folder.id }).then(() => {
          refreshFeeds().then(() => {
            refreshStats();
          });
        });
      });
    }

    function createNewFeedFolder() {
      const title = prompt("Enter folder name:");
      if (!title) return;
      api.folders.create({ title: title }).then((result) => {
        refreshFeeds().then(() => {
          Vue.nextTick(() => {
            if (newFeedFolderId.value) {
              newFeedFolderId.value = result.id;
            }
          });
        });
      });
    }

    function renameFolder(folder) {
      const newTitle = prompt("Enter new title", folder.title);
      if (newTitle) {
        api.folders.update(folder.id, { title: newTitle }).then(() => {
          folder.title = newTitle;
          folders.value.sort((a, b) => a.title.localeCompare(b.title));
        });
      }
    }

    function deleteFolder(folder) {
      if (confirm("Are you sure you want to delete " + folder.title + "?")) {
        api.folders.remove(folder.id).then(() => {
          if (feedSelected === "folder:" + folder.id) {
            items.value = [];
            feedSelected = "";
          }
          refreshStats();
          refreshFeeds();
        });
      }
    }

    function renameFeed(feed) {
      const newTitle = Vue.ref(prompt("Enter new title", feed.title));
      if (newTitle.value) {
        api.feeds.update(feed.id, { title: newTitle.value }).then(() => {
          feed.title = newTitle.value;
        });
      }
    }

    function deleteFeed(feed) {
      if (confirm("Are you sure you want to delete " + feed.title + "?")) {
        api.feeds.delete(feed.id).then(() => {
          const isSelected = !feedSelected ||
            feedSelected === "feed:" + feed.id ||
            (feed.folder_id && feedSelected === "folder:" + feed.folder_id);
          if (isSelected) feedSelected = null;

          refreshStats();
          refreshFeeds();
        });
      }
    }

    function createFeed(event) {
      const form = event.target;
      const data = {
        url: form.querySelector("input[name=url]").value,
        folder_id:
          parseInt(form.querySelector("select[name=folder_id]").value) || null,
      };
      if (feedNewChoiceSelected.value) {
        data.url = feedNewChoiceSelected.value;
      }
      loading.newfeed = true;
      api.feeds.create(data).then((result) => {
        if (result.status === "success") {
          refreshFeeds();
          refreshStats();
          settings.value = "";
          feedSelected.value = "feed:" + result.feed.id;
        } else if (result.status === "multiple") {
          feedNewChoice.value = result.choice;
          feedNewChoiceSelected.value = result.choice[0].url;
        } else {
          alert("No feeds found at the given URL.");
        }
        loading.newfeed = false;
      });
    }

    function toggleItemStatus(item, targetStatus, fallbackStatus) {
      const oldStatus = item.status;
      const newStatus = item.status !== targetStatus ? targetStatus : fallbackStatus;

      const updateStats = (status, incr) => {
        if (status === "unread" || status === "starred") {
          feedStats[item.feed_id][status] += incr;
        }
      };

      api.items.update(item.id, { status: newStatus }).then(() => {
        updateStats(oldStatus, -1);
        updateStats(newStatus, 1);

        const itemInList = items.value.find((i) => i.id === item.id);
        if (itemInList) itemInList.status = newStatus;
        item.status = newStatus;
      });
    }

    function toggleItemStarred(item) {
      toggleItemStatus(item, "starred", "read");
    }

    function toggleItemRead(item) {
      toggleItemStatus(item, "unread", "read");
    }

    function addToPocket(item) {
      api.add_to_pocket(item.link);
    }

    function importOPML(event) {
      const input = event.target;
      const form = document.querySelector("#opml-import-form");
      $refs.menuDropdown.hide();
      api.upload_opml(form).then(() => {
        input.value = "";
        refreshFeeds();
        refreshStats();
      });
    }

    function logout() {
      api.logout().then(() => {
        document.location.reload();
      });
    }

    function toggleReadability() {
      if (itemSelectedReadability.value) {
        itemSelectedReadability.value = null;
        return;
      }
      const item = itemSelectedDetails.value;
      if (!item) return;
      if (item.link) {
        loading.readability = true;
        api.crawl(item.link).then((data) => {
          itemSelectedReadability.value = data && data.content;
          loading.readability = false;
        });
      }
    }

    function showSettings(settingsOption) {
      settings.value = settingsOption;

      if (settingsOption === "create") {
        feedNewChoice.value = [];
        feedNewChoiceSelected.value = "";
      }
    }

    function resizeFeedList(width) {
      feedListWidth.value = Math.min(Math.max(200, width), 700);
    }

    function resizeItemList(width) {
      itemListWidth.value = Math.min(Math.max(200, width), 700);
    }

    function resetFeedChoice() {
      feedNewChoice.value = [];
      feedNewChoiceSelected.value = "";
    }

    function incrFont(x) {
      theme.size = +(theme.size + 0.1 * x).toFixed(1);
    }

    function isNitterLink(url) {
      return url.includes("nitter");
    }

    function getNitterAuthor(url) {
      const parseUrl = new URL(url);
      return parseUrl.pathname.split("/")[1];
    }

    function isReplyRetweet(title) {
      if (title.startsWith("R to ")) {
        ReplyRetweet.value = title
          .replace("R to", "Replying to")
          .split(" ")
          .slice(0, 3)
          .join(" ")
          .slice(0, -1);
      } else if (title.startsWith("RT by")) {
        ReplyRetweet.value = title
          .replace("RT by", "Retweeted by")
          .split(" ")
          .slice(0, 3)
          .join(" ")
          .slice(0, -1);
      } else {
        ReplyRetweet.value = null;
      }
      return Boolean(ReplyRetweet.value);
    }

    function fetchAllFeeds() {
      if (loading.feeds) return;
      api.feeds.refresh().then(() => {
        refreshStats();
      });
    }

    function computeStats() {
      const filter = filterSelected.value;
      if (!filter) {
        filteredFeedStats.value = {};
        filteredFolderStats.value = {};
        filteredTotalStats.value = null;
        return;
      }

      const statsFeeds = {};
      const statsFolders = {};
      let statsTotal = 0;

      for (const [id, folder_id] of Object.entries(feeds)) {
        if (!feedStats[id]) continue;

        const n = feedStats[id][filter] ?? 0;

        if (!statsFolders[folder_id]) {
          statsFolders[folder_id] = 0;
        }

        statsFeeds[id] = n;
        statsFolders[folder_id] += n;
        statsTotal += n;
      }

      filteredFeedStats.value = statsFeeds;
      filteredFolderStats.value = statsFolders;
      filteredTotalStats.value = statsTotal;
    }

    return {
      filterSelected,
      folders,
      feeds,
      feedSelected,
      feedListWidth,
      feedNewChoice,
      feedNewChoiceSelected,
      items,
      itemsHasMore,
      itemSelected,
      itemSelectedDetails,
      itemSelectedReadability,
      itemSearch,
      content,
      itemSortNewestFirst,
      itemListWidth,
      filteredFeedStats,
      filteredFolderStats,
      filteredTotalStats,
      settings,
      loading,
      fonts,
      feedStats,
      theme,
      refreshRate,
      showSettings,
      authenticated,
      feedErrors,
      foldersWithFeeds,
      feedsById,
      foldersById,
      current,
      itemSelectedContent,
      refreshItems,
      refreshStats,
      refreshFeeds,
      resizeFeedList,
      resizeItemList,
      resetFeedChoice,
      incrFont,
      getNitterAuthor,
      isNitterLink,
      isReplyRetweet,
      fetchAllFeeds,
      toggleReadability,
      logout,
      importOPML,
      addToPocket,
      toggleItemRead,
      toggleItemStarred,
      createFeed,
      loadMoreItems,
      markItemsRead,
      toggleFolderExpanded,
      formatDate,
      createNewFeedFolder,
      newFeedFolderId,
      renameFeed,
      renameFolder,
      deleteFeed,
      deleteFolder
    };
  },
});

// Additional Directives and Components
app.directive("scroll", {
  inserted: function (el, binding) {
    el.addEventListener(
      "scroll",
      debounce(function (event) {
        binding.value(event, el);
      }, 200)
    );
  },
});

app.directive("focus", {
  inserted: function (el) {
    el.focus();
  },
});

app.component("drag", {
  props: ["width"],
  template: '<div class="drag"></div>',
  mounted: function () {
    var self = this;
    var startX = undefined;
    var initW = undefined;
    var onMouseMove = function (e) {
      var offset = e.clientX - startX;
      var newWidth = initW + offset;
      self.$emit("resize", newWidth);
    };
    var onMouseUp = function (e) {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    this.$el.addEventListener("mousedown", function (e) {
      startX = e.clientX;
      initW = self.width;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  },
});

app.component("dropdown", {
  props: ["class", "toggle-class", "ref", "drop", "title"],
  data: function () {
    return { open: false };
  },
  template: `
      <div class="dropdown" :class="$attrs.class">
        <button ref="btn" @click="toggle" :class="btnToggleClass" :title="$props.title"><slot name="button"></slot></button>
        <div ref="menu" class="dropdown-menu" :class="{show: open}"><slot v-if="open"></slot></div>
      </div>
    `,
  computed: {
    btnToggleClass: function () {
      var c = this.$props.toggleClass || "";
      c += " dropdown-toggle dropdown-toggle-no-caret";
      c += this.open ? " show" : "";
      return c.trim();
    },
  },
  methods: {
    toggle: function (e) {
      this.open ? this.hide() : this.show();
    },
    show: function (e) {
      this.open = true;
      this.$refs.menu.style.top = this.$refs.btn.offsetHeight + "px";
      var drop = this.$props.drop;

      if (drop === "right") {
        this.$refs.menu.style.left = "auto";
        this.$refs.menu.style.right = "0";
      } else if (drop === "center") {
        this.$nextTick(
          function () {
            var btnWidth = this.$refs.btn.getBoundingClientRect().width;
            var menuWidth = this.$refs.menu.getBoundingClientRect().width;
            this.$refs.menu.style.left =
              "-" + (menuWidth - btnWidth) / 2 + "px";
          }.bind(this)
        );
      }

      document.addEventListener("click", this.clickHandler);
    },
    hide: function () {
      this.open = false;
      document.removeEventListener("click", this.clickHandler);
    },
    clickHandler: function (e) {
      var dropdown = e.target.closest(".dropdown");
      if (dropdown == null || dropdown != this.$el) return this.hide();
      if (e.target.closest(".dropdown-item") != null) return this.hide();
    },
  },
});

app.component("modal", {
  props: ["open"],
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
  data: function () {
    return { opening: false };
  },
  watch: {
    open: function (newVal) {
      if (newVal) {
        this.opening = true;
        document.addEventListener("click", this.handleClick);
      } else {
        document.removeEventListener("click", this.handleClick);
      }
    },
  },
  methods: {
    handleClick: function (e) {
      if (this.opening) {
        this.opening = false;
        return;
      }
      if (e.target.closest(".modal-content") == null) this.$emit("hide");
    },
  },
});

function dateRepr(d) {
  var sec = (new Date().getTime() - d.getTime()) / 1000;
  var neg = sec < 0;
  var out = "";

  sec = Math.abs(sec);
  if (sec < 2700)
    // less than 45 minutes
    out = Math.round(sec / 60) + "m";
  else if (sec < 86400)
    // less than 24 hours
    out = Math.round(sec / 3600) + "h";
  else if (sec < 604800)
    // less than a week
    out = Math.round(sec / 86400) + "d";
  else
    out = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (neg) return "-" + out;
  return out;
}

app.component("relative-time", {
  props: ["val"],
  data: function () {
    var d = new Date(this.val);
    return {
      date: d,
      formatted: dateRepr(d),
      interval: null,
    };
  },
  template: '<time :datetime="val">{{ formatted }}</time>',
  mounted: function () {
    this.interval = setInterval(
      function () {
        this.formatted = dateRepr(this.date);
      }.bind(this),
      600000
    ); // every 10 minutes
  },
  destroyed: function () {
    clearInterval(this.interval);
  },
});

app.mount("#app");
