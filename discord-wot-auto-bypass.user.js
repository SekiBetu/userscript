// ==UserScript==
// @name         Discord + AdGuard WOT 警告页修复
// @namespace    https://sekibetu.com
// @version      1.0.0
// @description  修复 AdGuard Web of Trust 对 Discord 的低信誉警告页按钮；点击“前往该网站”可跳过警告并写入忽略标记
// @author       SekiBetu
// @license      MIT
// @homepageURL  https://github.com/SekiBetu/userscript
// @supportURL   https://github.com/SekiBetu/userscript/issues
// @downloadURL  https://github.com/SekiBetu/userscript/raw/main/discord-wot-auto-bypass.user.js
// @updateURL    https://github.com/SekiBetu/userscript/raw/main/discord-wot-auto-bypass.user.js
// @match        *://discord.com/*
// @match        *://*.discord.com/*
// @match        *://discordapp.com/*
// @match        *://*.discordapp.com/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

/*
 * 测试 / 重新触发 WOT 警告页
 * ------------------------------------------------------------------
 * 脚本会用到两个键：
 *   __agwt_ig             WOT 的忽略标记（点击“前往该网站”后写入，默认 30 天）
 *   __wot_auto_bypass_at  防止自动跳过失败时反复刷新的时间戳（仅 AUTO_SKIP 模式）
 *
 * 想再次看到 WOT 警告页，从 DevTools 删除这些键：
 *   1. F12 -> Application（应用）
 *   2. 左侧 Storage -> Local Storage -> https://discord.com
 *      删除 __agwt_ig
 *   3. 左侧 Storage -> Session Storage -> https://discord.com
 *      删除 __agwt_ig 和 __wot_auto_bypass_at
 *   4. 回到页面按 Ctrl+R
 * 
 * 默认只修复警告页，不自动跳过；
 * 点击“前往该网站”才会跳过并写入忽略标记（默认 30 天）。
 * 想恢复自动跳过，把下面的 AUTO_SKIP 改成 true。
 */

(function () {
  'use strict';

  // 发布版默认关闭日志；排查问题时可改成 true
  const DEBUG = false;
  const log = (...args) => {
    if (DEBUG) console.log('[WOT auto bypass]', ...args);
  };

  // 主要功能：修复 WOT 警告页
  // 次要功能：自动跳过，false = 只修复页面，由用户点击“前往该网站”；
  // true = 检测到警告页时自动跳过（页面可能一闪而过）
  const AUTO_SKIP = false;

  const BYPASS_KEY = '__agwt_ig';
  const GUARD_KEY = '__wot_auto_bypass_at';

  // WOT 忽略标记的有效期（秒）
  const TTL_SECONDS = 365 * 24 * 60 * 60;

  // 1) 尽早写入 WOT 的“忽略”标记，让 WOT 在检查信誉前就跳过 Discord
  function setBypass() {
    try {
      const value = JSON.stringify({
        value: true,
        ttl: TTL_SECONDS,
        timeAdded: Date.now(),
      });
      localStorage.setItem(BYPASS_KEY, value);
      sessionStorage.setItem(BYPASS_KEY, value);
      log('bypass flag written');
    } catch (e) {
      // localStorage 不可用时忽略
    }
  }

  // 2) 修复 WOT 警告页的按钮
  //    WOT 的警告页是个 iframe，按钮文字和点击事件由 iframe 内联脚本设置；
  //    Discord 的 CSP 会拦住那段内联脚本，所以按钮只剩空壳。
  function repairButtons(frame, showHint = false) {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return;
    }
    if (!doc) return;

    const zh = (navigator.language || '').toLowerCase().startsWith('zh');
    const text = zh
      ? {
          head: '警告',
          msg: '这个网站在 Web of Trust 中信用记录过低。',
          back: '返回上一页',
          open: '前往该网站',
          report: '浏览更多细节与评论',
        }
      : {
          head: 'Warning',
          msg: 'This website has poor reputation according to Web of Trust.',
          back: 'Go Back',
          open: 'Go to the site',
          report: 'View details and comments',
        };

    const put = (selector, value) => {
      const el = doc.querySelector(selector);
      if (el) el.textContent = value;
    };

    put('.popup-head', text.head);
    put('.popup-attention-msg', text.msg);
    put('.popup-site-name', location.host);
    put('#back', text.back);
    put('#open', text.open);
    put('#site-report', text.report);

    const open = doc.querySelector('#open');
    const back = doc.querySelector('#back');
    const report = doc.querySelector('#site-report');

    if (report) {
      report.href =
        'https://link.adtidy.org/forward.html?action=wot_scorecard&from=alert&app=wot_extension&domain=' +
        encodeURIComponent(location.host);
      report.target = '_blank';
    }

    // 如果 iframe 的 CSS 也被 CSP 拦了，给按钮补一点最基本的样式
    const styleButton = (el) => {
      if (!el) return;
      el.style.cssText =
        'display:inline-block;padding:8px 14px;margin:0 6px;border:1px solid #999;' +
        'border-radius:4px;background:#eee;color:#222;text-decoration:none;' +
        'cursor:pointer;font:14px Arial,sans-serif;';
    };
    styleButton(open);
    styleButton(back);

    if (open) {
      open.onclick = (e) => {
        e.preventDefault();
        // 直接写入长有效期标记并刷新，避免 WOT 自己的 Alert_Ignore
        // 把有效期覆盖成默认的 24 小时。
        setBypass();
        location.reload();
      };
    }
    if (back) {
      back.onclick = (e) => {
        e.preventDefault();
        try {
          window.postMessage('Alert_Back', '*');
        } catch (err) {
          // 忽略
        }
        setTimeout(() => {
          if (document.getElementById('adguard-wot-alert')) {
            history.back();
          }
        }, 500);
      };
    }

    if (showHint) {
      let hint = doc.getElementById('wot-auto-bypass-hint');
      if (!hint) {
        hint = doc.createElement('div');
        hint.id = 'wot-auto-bypass-hint';
        hint.style.cssText =
          'margin:12px auto 0;max-width:320px;font:12px/1.5 Arial,sans-serif;' +
          'color:#666;text-align:center;';
        const container = doc.querySelector('.popup-container') || doc.body;
        container.appendChild(hint);
      }
      hint.textContent = zh
        ? '自动跳过失败，请点击“前往该网站”继续。'
        : 'Auto-skip failed. Click “Go to the site” to continue.';
    }
  }

  // 3) 检测到 WOT 警告时：优先恢复页面内容；自动跳过是次要功能
  let repairScheduled = false;

  function handleWot() {
    const frame = document.getElementById('adguard-wot-alert');
    const overlay = document.getElementById('adguard-alert-overlay');
    if (!frame && !overlay) return;

    log('WOT warning page detected');

    // 主功能：恢复 WOT 警告页的内容和按钮
    if (frame) {
      repairButtons(frame);

      // iframe 内容可能还没写完，稍后再修一次
      if (!repairScheduled) {
        repairScheduled = true;
        setTimeout(() => {
          repairScheduled = false;
          const f = document.getElementById('adguard-wot-alert');
          if (f) repairButtons(f);
        }, 500);
      }
    } else {
      // 页面内容无法恢复时，才走跳过兜底，避免一直卡在遮罩上
      log('WOT frame missing; falling back to skip');
      setBypass();
      location.reload();
      return;
    }

    // 次要功能：自动跳过（默认关闭）
    if (!AUTO_SKIP) return;

    // 防止自动跳过失败时反复刷新
    const now = Date.now();
    const last = Number(sessionStorage.getItem(GUARD_KEY) || 0);
    if (now - last < 15000) {
      repairButtons(frame, true);
      return;
    }
    sessionStorage.setItem(GUARD_KEY, String(now));
    setBypass();
    log('auto skip: reloading with bypass');
    location.reload();
  }

  // 4) 监听 DOM，等待 WOT 警告出现
  let scheduled = false;
  function scheduleCheck() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      handleWot();
    }, 100);
  }

  if (AUTO_SKIP) {
    setBypass(); // 自动跳过模式：提前写入标记
  }
  log('loaded on', location.host);

  const observer = new MutationObserver(scheduleCheck);

  function start() {
    handleWot();
    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
    });
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
