// ==UserScript==
// @name                NGA 重定向
// @description         将 NGA 各个域名重定向到 bbs.nga.cn
// @namespace           sekibetu.com
// @version             1.0
// @author              SekiBetu
// @license             MIT License
// @match               *://nga.178.com/*
// @match               *://g.nga.cn/*
// @match               *://ngabbs.com/*
// @match               *://ngacn.cc/*
// @match               *://yues.org/*
// ==/UserScript==

(function () {
  "use strict";
  window.location.replace(
    location.href.replace(location.hostname, "bbs.nga.cn")
  );
})();
