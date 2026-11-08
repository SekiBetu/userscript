// ==UserScript==
// @name         Discord + AdGuard WOT 警告页修复
// @namespace    https://sekibetu.com
// @version      1.0.1
// @description  修复 AdGuard Web of Trust 对 Discord 的低信誉警告页按钮；点击“前往该网站”可跳过警告并写入忽略标记
// @author       SekiBetu
// @license      MIT
// @homepageURL  https://github.com/SekiBetu/userscript
// @supportURL   https://github.com/SekiBetu/userscript/issues
// @downloadURL  https://github.com/SekiBetu/userscript/raw/main/Discord-WOT-Auto-Bypass.user.js
// @updateURL    https://github.com/SekiBetu/userscript/raw/main/Discord-WOT-Auto-Bypass.user.js
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
 *   __agwt_ig             WOT 的忽略标记（点击“前往该网站”后写入）
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
 * 想恢复自动跳过，把下面的 AUTO_SKIP 改成 true。
 */

(function () {
  'use strict';

  // 发布版默认关闭日志；排查问题时可改成 true
  const DEBUG = false;
  const log = (...args) => {
    if (DEBUG) console.log('[WOT auto bypass]', ...args);
  };

  // 主要功能：修复 WOT 警告页，让按钮可见可点
  // 次要功能：自动跳过。false = 只修复页面
  // true = 检测到警告页时自动跳过（页面可能一闪而过）
  const AUTO_SKIP = false;

  // 测试用：强制语言。'zh' = 中文，'en' = 英语，'' = 自动
  const LANG_OVERRIDE = '';

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

    const adguardLocale =
      (typeof window.adguardSettings !== 'undefined' &&
        window.adguardSettings &&
        window.adguardSettings.locale) ||
      '';
    const userLang = (
      LANG_OVERRIDE ||
      adguardLocale ||
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      'en'
    ).toLowerCase();
    const zh = userLang.startsWith('zh');

    const text = zh
      ? {
          head: '警告',
          msg: '这个网站在 Web of Trust 中信用记录过低。',
          back: '返回上一页',
          open: '前往该网站',
          report: '浏览更多细节与评论',
          reviews: '其他用户已经确认存在以下问题：',
        }
      : {
          head: 'Warning',
          msg: 'This website has poor reputation according to Web of Trust.',
          back: 'Go Back',
          open: 'Go to the site',
          report: 'View details and comments',
          reviews: 'Users have identified the following issues:',
        };

    const categoryText = zh
      ? {
          '101': '带有恶意软件或病毒',
          '102': '用户体验差',
          '103': '钓鱼网站',
          '104': '诈骗网站',
          '105': '可能存在违法信息',
          '201': '带有误导性或不道德内容',
          '202': '存在隐私风险',
          '203': '可疑网站',
          '204': '带有煽动仇恨或歧视内容',
          '205': '垃圾站点',
          '206': '网站存在潜在有害程序',
          '207': '网站存在广告或弹窗',
          '301': '网络跟踪',
          '302': '网站涉及另类或有争议的药物内容',
          '303': '网站带有潜在不和谐的意见、宗教、政治内容',
          '304': '其他',
          '401': '网站带有成人内容',
          '402': '网站带有裸体人体内容',
          '403': '网站带有可怕或惊悚内容',
          '404': '供儿童浏览的网站',
          '501': '安全网站',
        }
      : {
          '101': 'Malware or viruses',
          '102': 'Poor customer experience',
          '103': 'Phishing',
          '104': 'Scam',
          '105': 'Potentially illegal',
          '201': 'Misleading or unethical claims',
          '202': 'Privacy risks',
          '203': 'Suspicious',
          '204': 'Hatred, discrimination',
          '205': 'Spam',
          '206': 'Potentially unwanted programs',
          '207': 'Ads / pop-ups',
          '301': 'Online tracking',
          '302': 'Alternative or controversial medicine',
          '303': 'Opinions, religion, politics',
          '304': 'Other',
          '401': 'Adult content',
          '402': 'Incidental nudity',
          '403': 'Gruesome or shocking',
          '404': 'Website for children',
          '501': 'Good site',
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
    put('.popup-reviews_head', text.reviews);

    const open = doc.querySelector('#open');
    const back = doc.querySelector('#back');
    const report = doc.querySelector('#site-report');

    if (report) {
      report.href =
        'https://link.adtidy.org/forward.html?action=wot_scorecard&from=alert&app=wot_extension&domain=' +
        encodeURIComponent(location.host);
      report.target = '_blank';
    }

    const reviews = doc.querySelector('.popup-reviews');
    const reviewsList = doc.querySelector('.popup-reviews_list');
    const wotData =
      typeof window.WotData === 'object' && window.WotData ? window.WotData : null;
    const categories =
      wotData && wotData.categories && typeof wotData.categories === 'object'
        ? wotData.categories
        : null;

    const entries = categories
      ? Object.keys(categories).map((id) => ({
          id,
          value: Number(categories[id]) || 0,
        }))
      : [];
    entries.sort((a, b) => b.value - a.value);

    const confidenceClass = (value) => {
      if (value <= 10) return 'review-no-confidence';
      if (value <= 20) return 'review-low-confidence';
      if (value <= 40) return 'review-medium-confidence';
      return 'review-high-confidence';
    };

    const iconClass = (id) => {
      const n = parseInt(id, 10);
      if (n >= 101 && n <= 105) return 'icon-cross-red';
      if (n >= 201 && n <= 207) return 'icon-cross-yellow';
      if (n >= 301 && n <= 304) return 'icon-cross-grey';
      if (n === 404 || n === 501) return 'icon-cross-green';
      if (n === 401) return 'icon-cross-red';
      if (n === 402 || n === 403) return 'icon-cross-yellow';
      return '';
    };

    if (!entries.length) {
      if (reviews) reviews.style.display = 'none';
    } else if (reviewsList) {
      reviewsList.textContent = '';
      entries.forEach(({ id, value }) => {
        const item = doc.createElement('div');
        item.className = 'popup-reviews_i ' + confidenceClass(value);

        const iconWrap = doc.createElement('div');
        iconWrap.className = 'popup-reviews_icon';
        const icon = doc.createElement('span');
        const cls = iconClass(id);
        if (cls) icon.className = cls;
        iconWrap.appendChild(icon);

        const textEl = doc.createElement('div');
        textEl.className = 'popup-reviews_text ';
        textEl.textContent = categoryText[id] || (zh ? '其他问题' : 'Other issue');

        item.appendChild(iconWrap);
        item.appendChild(textEl);
        reviewsList.appendChild(item);
      });
      if (reviews) reviews.style.display = '';
    }

    const needsFallbackStyle = (el) => {
      if (!el) return false;
      try {
        const bg = doc.defaultView.getComputedStyle(el).backgroundColor;
        return !bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
      } catch (e) {
        return false;
      }
    };

    const styleButton = (el) => {
      if (!el || !needsFallbackStyle(el)) return;
      el.style.cssText =
        'display:inline-block;padding:11px 15px;font-size:14px;line-height:16px;' +
        'font-weight:700;white-space:nowrap;text-decoration:none;text-align:center;' +
        'border:1px solid #dee4ef;cursor:pointer;color:#262626;background-color:#dee4ef;' +
        'min-width:128px;margin:0 8px;';
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
