
(function() {
  var xfetch = function(resource, init) {
    init = init || {}
    if (['post', 'put', 'delete'].indexOf(init.method) !== -1) {
      init['headers'] = init['headers'] || {}
      init['headers']['x-requested-by'] = 'yarr'
    }
    return fetch(resource, init)
  }
  var api = function(method, endpoint, data) {
    var headers = { 'Content-Type': 'application/json' }
    return xfetch(endpoint, {
      method: method,
      headers: headers,
      body: JSON.stringify(data),
    })
  }

  var json = function(res) {
    return res.json()
  }

  var param = function(query) {
    if (!query) return ''
    return '?' + Object.keys(query).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(query[key])
    }).join('&')
  }

  window.api = {
    feeds: {
      list: async function() {
        const res = await api('get', './api/feeds');
        return json(res);
      },
      create: async function(data) {
        const res = await api('post', './api/feeds', data);
        return json(res);
      },
      update: function(id, data) {
        return api('put', './api/feeds/' + id, data)
      },
      delete: function(id) {
        return api('delete', './api/feeds/' + id)
      },
      list_items: async function(id) {
        const res = await api('get', './api/feeds/' + id + '/items');
        return json(res);
      },
      refresh: function() {
        return api('post', './api/feeds/refresh')
      },
      list_errors: async function() {
        const res = await api('get', './api/feeds/errors');
        return json(res);
      },
    },
    folders: {
      list: async function() {
        const res = await api('get', './api/folders');
        return json(res);
      },
      create: async function(data) {
        const res = await api('post', './api/folders', data);
        return json(res);
      },
      update: function(id, data) {
        return api('put', './api/folders/' + id, data)
      },
      delete: function(id) {
        return api('delete', './api/folders/' + id)
      },
      list_items: async function(id) {
        const res = await api('get', './api/folders/' + id + '/items');
        return json(res);
      }
    },
    items: {
      get: async function(id) {
        const res = await api('get', './api/items/' + id);
        return json(res);
      },
      list: async function(query) {
        const res = await api('get', './api/items' + param(query));
        return json(res);
      },
      update: function(id, data) {
        return api('put', './api/items/' + id, data)
      },
      mark_read: function(query) {
        return api('put', './api/items' + param(query))
      }
    },
    settings: {
      get: async function() {
        const res = await api('get', './api/settings');
        return json(res);
      },
      update: function(data) {
        return api('put', './api/settings', data)
      },
    },
    status: async function() {
      const res = await api('get', './api/status');
      return json(res);
    },
    upload_opml: function(form) {
      return xfetch('./opml/import', {
        method: 'post',
        body: new FormData(form),
      })
    },
    logout: function() {
      return api('post', './logout')
    },
    crawl: async function(url) {
      const res = await api('get', './page?url=' + encodeURIComponent(url));
      return json(res);
    },
    add_to_pocket: function(url) {
      return api('get', './api/addToPocket?url=' + encodeURIComponent(url))
    }
  }
})()
