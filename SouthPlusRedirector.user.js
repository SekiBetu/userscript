// ==UserScript==
// @name         SouthPlus 重定向
// @description  将 SouthPlus 各个域名重定向到 www.south-plus.net
// @version      1.0
// @namespace    http://sekibetu.com/
// @author       SekiBetu
// @license      MIT License
// @match        *://*.white-plus.net/*
// @match        *://*.level-plus.net/*
// @match        *://*.spring-plus.net/*
// @match        *://*.summer-plus.net/*
// @match        *://*.snow-plus.net/*
// @match        *://*.south-plus.org/*
// @match        *://*.imoutolove.me/*
// @match        *://*.north-plus.net/*
// @match        *://south-plus.net/*
// @match        *://bbs.south-plus.net/*
// @match        *://*.east-plus.net/*
// ==/UserScript==

(function () {
  "use strict";
  window.location.replace(
    location.href.replace(location.hostname, "www.south-plus.net")
  );
})();
