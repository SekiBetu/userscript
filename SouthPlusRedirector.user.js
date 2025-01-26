// ==UserScript==
// @name         SouthPlus 重定向
// @description  将 SouthPlus 各个域名重定向到 www.south-plus.net
// @homepageURL  https://github.com/SekiBetu/userscript
// @updateURL    https://github.com/SekiBetu/userscript/raw/main/SouthPlusRedirector.user.js
// @downloadURL  https://github.com/SekiBetu/userscript/raw/main/SouthPlusRedirector.user.js
// @version      1.1
// @namespace    https://sekibetu.com
// @author       SekiBetu
// @license      MIT
// @match        *://*.blue-plus.net/*
// @match        *://blue-plus.net/*
// @match        *://*.east-plus.net/*
// @match        *://east-plus.net/*
// @match        *://*.imoutolove.me/*
// @match        *://imoutolove.me/*
// @match        *://*.level-plus.net/*
// @match        *://level-plus.net/*
// @match        *://*.north-plus.net/*
// @match        *://north-plus.net/*
// @match        *://*.snow-plus.net/*
// @match        *://snow-plus.net/*
// @match        *://*.soul-plus.net/*
// @match        *://soul-plus.net/*
// @match        *://*.south-plus.net/*
// @match        *://south-plus.net/*
// @match        *://*.south-plus.org/*
// @match        *://south-plus.org/*
// @match        *://*.spring-plus.net/*
// @match        *://spring-plus.net/*
// @match        *://*.summer-plus.net/*
// @match        *://summer-plus.net/*
// @match        *://*.white-plus.net/*
// @match        *://white-plus.net/*
// ==/UserScript==

(function () {
  "use strict";
  window.location.replace(
    location.href.replace(location.hostname, "www.south-plus.net")
  );
})();
