const xfetch = (resource, init) => {
  init = init || {};
  if (['post', 'put', 'delete'].indexOf(init.method) !== -1) {
    init['headers'] = init['headers'] || {};
    init['headers']['x-requested-by'] = 'yarr';
  }
  return fetch(resource, init);
};

const api = (method, endpoint, data) => {
  const headers = { 'Content-Type': 'application/json' };
  return xfetch(endpoint, {
    method: method,
    headers: headers,
    body: JSON.stringify(data),
  });
};

const json = async (res) => {
  return await res.json();
};

const param = (query) => {
  if (!query) return '';
  return '?' + Object.keys(query)
    .map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
    })
    .join('&');
};

const useFeeds = () => {
  const list = async () => {
    const res = await api('get', './api/feeds');
    return await json(res);
  };

  const create = async (data) => {
    const res = await api('post', './api/feeds', data);
    return await json(res);
  };

  const update = (id, data) => {
    return api('put', './api/feeds/' + id, data);
  };

  const remove = (id) => {
    return api('delete', './api/feeds/' + id);
  };

  const listItems = async (id) => {
    const res = await api('get', './api/feeds/' + id + '/items');
    return await json(res);
  };

  const refresh = () => {
    return api('post', './api/feeds/refresh');
  };

  const listErrors = async () => {
    const res = await api('get', './api/feeds/errors');
    return await json(res);
  };

  return {
    list,
    create,
    update,
    remove,
    listItems,
    refresh,
    listErrors,
  };
};

const useFolders = () => {
  const list = async () => {
    const res = await api('get', './api/folders');
    return await json(res);
  };

  const create = async (data) => {
    const res = await api('post', './api/folders', data);
    return await json(res);
  };

  const update = (id, data) => {
    return api('put', './api/folders/' + id, data);
  };

  const remove = (id) => {
    return api('delete', './api/folders/' + id);
  };

  const listItems = async (id) => {
    const res = await api('get', './api/folders/' + id + '/items');
    return await json(res);
  };

  return {
    list,
    create,
    update,
    remove,
    listItems,
  };
};

const useItems = () => {
  const get = async (id) => {
    const res = await api('get', './api/items/' + id);
    return await json(res);
  };

  const list = async (query) => {
    const res = await api('get', './api/items' + param(query));
    return await json(res);
  };

  const update = (id, data) => {
    return api('put', './api/items/' + id, data);
  };

  const markRead = (query) => {
    return api('put', './api/items' + param(query));
  };

  return {
    get,
    list,
    update,
    markRead,
  };
};

const useSettings = () => {
  const get = async () => {
    const res = await api('get', './api/settings');
    return await json(res);
  };

  const update = (data) => {
    return api('put', './api/settings', data);
  };

  return {
    get,
    update,
  };
};

const useApi = () => {
  const feeds = useFeeds();
  const folders = useFolders();
  const items = useItems();
  const settings = useSettings();

  const status = async () => {
    const res = await api('get', './api/status');
    return await json(res);
  };

  const uploadOpml = (form) => {
    return xfetch('./opml/import', {
      method: 'post',
      body: new FormData(form),
    });
  };

  const logout = () => {
    return api('post', './logout');
  };

  const crawl = async (url) => {
    const res = await api('get', './page?url=' + encodeURIComponent(url));
    return await json(res);
  };

  const addToPocket = (url) => {
    return api('get', './api/addToPocket?url=' + encodeURIComponent(url));
  };

  return {
    feeds,
    folders,
    items,
    settings,
    status,
    uploadOpml,
    logout,
    crawl,
    addToPocket,
  };
};

window.api = useApi;