(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var deck = document.querySelector(".deck");
    if (!deck) return;

    var slides = Array.prototype.slice.call(deck.querySelectorAll(".slide"));
    if (!slides.length) return;

    var total = slides.length;
    var index = 0;
    var channelName = "html-ppt-portfolio-" + location.pathname;
    var channel = null;

    try {
      channel = new BroadcastChannel(channelName);
    } catch (error) {
      channel = null;
    }

    var progress = document.querySelector(".progress-bar");
    if (!progress) {
      progress = document.createElement("div");
      progress.className = "progress-bar";
      progress.innerHTML = "<span></span>";
      document.body.appendChild(progress);
    }

    var progressFill = progress.querySelector("span");
    var number = document.querySelector(".slide-number");
    var notesOverlay = document.querySelector(".notes-overlay");
    var prevButton = document.querySelector('[data-nav="prev"]');
    var nextButton = document.querySelector('[data-nav="next"]');
    var startButton = document.querySelector('[data-nav="start"]');
    var lightbox = document.querySelector(".media-lightbox");
    var lightboxImg = document.querySelector(".media-lightbox-img");
    var lightboxTitle = document.querySelector(".media-lightbox-title");
    var lightboxClose = document.querySelector(".media-lightbox-close");

    if (!notesOverlay) {
      notesOverlay = document.createElement("div");
      notesOverlay.className = "notes-overlay";
      document.body.appendChild(notesOverlay);
    }

    var overview = document.querySelector(".overview");

    if (!overview) {
      overview = document.createElement("div");
      overview.className = "overview";
      slides.forEach(function (slide, i) {
        var title = slide.getAttribute("data-title") ||
          (slide.querySelector("h1,h2,h3") || {}).textContent ||
          "第 " + (i + 1) + " 页";
        var thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "thumb";
        thumb.innerHTML = "<strong>" + (i + 1) + "</strong><span>" + escapeHtml(title) + "</span>";
        thumb.addEventListener("click", function () {
          go(i);
          toggleOverview(false);
        });
        overview.appendChild(thumb);
      });
      document.body.appendChild(overview);
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function slideTitle(i) {
      var slide = slides[i];
      return slide.getAttribute("data-title") ||
        (slide.querySelector("h1,h2,h3") || {}).textContent ||
        "第 " + (i + 1) + " 页";
    }

    function slideNotes(i) {
      var note = slides[i].querySelector(".notes, aside.notes, .speaker-notes");
      return note ? note.innerHTML : "";
    }

    function go(next, remote) {
      var n = Math.max(0, Math.min(total - 1, next));
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === n);
        slide.classList.toggle("is-prev", i < n);
      });

      index = n;

      if (progressFill) progressFill.style.width = ((n + 1) / total * 100) + "%";
      if (number) {
        number.setAttribute("data-current", String(n + 1));
        number.setAttribute("data-total", String(total));
      }

      if (prevButton) {
        prevButton.hidden = n === 0;
        prevButton.setAttribute("aria-disabled", n === 0 ? "true" : "false");
      }

      if (nextButton) {
        nextButton.hidden = n === total - 1;
        nextButton.setAttribute("aria-disabled", n === total - 1 ? "true" : "false");
      }

      if (startButton) {
        startButton.hidden = n !== total - 1;
        startButton.setAttribute("aria-disabled", n === total - 1 ? "false" : "true");
      }

      notesOverlay.innerHTML = slideNotes(n);

      var targetHash = "#/" + (n + 1);
      if (location.hash !== targetHash) {
        history.replaceState(null, "", targetHash);
      }

      if (!remote && channel) {
        channel.postMessage({ type: "go", index: n });
      }
    }

    function parseHash() {
      var match = /^#\/(\d+)/.exec(location.hash || "");
      if (match) {
        index = Math.max(0, Math.min(total - 1, parseInt(match[1], 10) - 1));
      }
    }

    function toggleNotes(force) {
      var shouldOpen = typeof force === "boolean" ? force : !notesOverlay.classList.contains("open");
      notesOverlay.classList.toggle("open", shouldOpen);
    }

    function toggleOverview(force) {
      var shouldOpen = typeof force === "boolean" ? force : !overview.classList.contains("open");
      overview.classList.toggle("open", shouldOpen);
    }

    function fullscreen() {
      var root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        root.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    var presenterWindow = null;

    function openPresenter() {
      if (presenterWindow && !presenterWindow.closed) {
        presenterWindow.focus();
        return;
      }

      var meta = slides.map(function (_, i) {
        return {
          title: slideTitle(i),
          notes: slideNotes(i)
        };
      });

      presenterWindow = window.open("", "html-ppt-presenter", "width=1100,height=720,menubar=no,toolbar=no");
      if (!presenterWindow) return;

      presenterWindow.document.open();
      presenterWindow.document.write(buildPresenterHtml(meta, index, total, channelName));
      presenterWindow.document.close();
    }

    function buildPresenterHtml(meta, start, count, channel) {
      var metaJson = JSON.stringify(meta);
      var channelJson = JSON.stringify(channel);
      return "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">" +
        "<title>演讲者视图</title><style>" +
        "body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Segoe UI,Microsoft YaHei,Arial,sans-serif;letter-spacing:0}" +
        ".wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;padding:18px;height:100vh;box-sizing:border-box}" +
        ".card{border:1px solid rgba(255,255,255,.14);border-radius:8px;background:#111827;padding:18px;overflow:auto}" +
        ".label{color:#94a3b8;font-size:12px;text-transform:uppercase;font-weight:800;letter-spacing:.08em}" +
        "h1{font-size:30px;line-height:1.15;margin:12px 0;color:#fff}" +
        "h2{font-size:20px;line-height:1.25;margin:10px 0;color:#bfdbfe}" +
        ".notes{font-size:18px;line-height:1.6;color:#e5e7eb}" +
        ".timer{font-family:Consolas,monospace;font-size:44px;color:#86efac;font-weight:800}" +
        ".controls{display:flex;gap:10px;margin-top:16px}" +
        "button{border:1px solid rgba(255,255,255,.18);border-radius:6px;background:#1f2937;color:#fff;padding:9px 13px;cursor:pointer}" +
        "</style></head><body><div class=\"wrap\">" +
        "<section class=\"card\"><div class=\"label\">当前页</div><h1 id=\"cur\"></h1><div class=\"label\">下一页</div><h2 id=\"next\"></h2><div class=\"controls\"><button id=\"prev\">上一页</button><button id=\"goNext\">下一页</button><button id=\"reset\">重置计时</button></div></section>" +
        "<section class=\"card\"><div class=\"label\">演讲备注</div><div class=\"notes\" id=\"notes\"></div><div class=\"label\" style=\"margin-top:20px\">已用时间</div><div class=\"timer\" id=\"timer\">00:00</div><p id=\"count\"></p></section>" +
        "</div><script>" +
        "var meta=" + metaJson + ",idx=" + start + ",total=" + count + ",bc=null,start=Date.now();" +
        "try{bc=new BroadcastChannel(" + channelJson + ")}catch(e){}" +
        "function draw(){document.getElementById('cur').textContent=meta[idx].title;document.getElementById('next').textContent=idx+1<total?meta[idx+1].title:'已到最后一页';document.getElementById('notes').innerHTML=meta[idx].notes||'<p>本页暂无备注。</p>';document.getElementById('count').textContent='第 '+(idx+1)+' / '+total+' 页'}" +
        "function go(n){idx=Math.max(0,Math.min(total-1,n));draw();if(bc)bc.postMessage({type:'go',index:idx})}" +
        "if(bc)bc.onmessage=function(e){if(e.data&&e.data.type==='go'){idx=e.data.index;draw()}};" +
        "document.getElementById('prev').onclick=function(){go(idx-1)};document.getElementById('goNext').onclick=function(){go(idx+1)};document.getElementById('reset').onclick=function(){start=Date.now()};" +
        "document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '){go(idx+1);e.preventDefault()}else if(e.key==='ArrowLeft'){go(idx-1);e.preventDefault()}else if(e.key==='Escape'){window.close()}});" +
        "setInterval(function(){var s=Math.floor((Date.now()-start)/1000),m=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');document.getElementById('timer').textContent=m+':'+ss},1000);" +
        "draw();<\/script></body></html>";
    }

    if (channel) {
      channel.onmessage = function (event) {
        if (event.data && event.data.type === "go" && typeof event.data.index === "number") {
          go(event.data.index, true);
        }
      };
    }

    if (prevButton) {
      prevButton.addEventListener("click", function (event) {
        event.stopPropagation();
        go(index - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function (event) {
        event.stopPropagation();
        go(index + 1);
      });
    }

    if (startButton) {
      startButton.addEventListener("click", function (event) {
        event.stopPropagation();
        go(0);
      });
    }

    function openLightbox(src, title) {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = src;
      lightboxImg.alt = title || "放大查看 GIF";
      if (lightboxTitle) lightboxTitle.textContent = title || "对比查看";
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      if (lightboxClose) lightboxClose.focus();
    }

    function closeLightbox() {
      if (!lightbox || !lightboxImg) return;
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.hidden = true;
      lightboxImg.src = "";
      lightboxImg.alt = "";
    }

    document.querySelectorAll(".gif-zoom-trigger").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openLightbox(button.getAttribute("data-zoom-src"), button.getAttribute("data-zoom-title"));
      });
    });

    document.querySelectorAll(".project-card img, .image-card img").forEach(function (img) {
      if (img.closest(".media-lightbox")) return;

      img.classList.add("zoomable-image");

      var card = img.closest(".project-card, .image-card");
      if (card) card.classList.add("zoomable-card");

      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      if (!img.getAttribute("aria-label")) {
        img.setAttribute("aria-label", (img.alt || "预览图") + " - 点击放大");
      }

      function openImagePreview(event) {
        event.preventDefault();
        event.stopPropagation();
        openLightbox(
          img.getAttribute("data-zoom-src") || img.currentSrc || img.src,
          img.getAttribute("data-zoom-title") || img.alt || "预览图"
        );
      }

      img.addEventListener("click", openImagePreview);
      img.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          openImagePreview(event);
        }
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener("click", function (event) {
        event.stopPropagation();
        closeLightbox();
      });
    }

    if (lightbox) {
      lightbox.hidden = true;
      lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) closeLightbox();
      });
    }

    function isInteractiveTarget(target) {
      return Boolean(target.closest(
        "a,button,input,textarea,select,option,label,summary,iframe,video,audio,img,svg,[role='button'],[role='link'],[contenteditable='true'],.gif-card,.gif-frame,.overview,.notes-overlay,.nav-controls,.media-lightbox"
      ));
    }

    deck.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || isInteractiveTarget(event.target)) return;

      if (event.clientX >= window.innerWidth / 2) {
        go(index + 1);
      } else {
        go(index - 1);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
        case "Enter":
          go(index + 1);
          event.preventDefault();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          go(index - 1);
          event.preventDefault();
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(total - 1);
          break;
        case "f":
        case "F":
          fullscreen();
          break;
        case "s":
        case "S":
          openPresenter();
          break;
        case "n":
        case "N":
          toggleNotes();
          break;
        case "o":
        case "O":
          toggleOverview();
          break;
        case "Escape":
          if (lightbox && lightbox.getAttribute("aria-hidden") === "false") {
            closeLightbox();
            event.preventDefault();
            break;
          }
          toggleNotes(false);
          toggleOverview(false);
          break;
      }
    });

    window.addEventListener("hashchange", function () {
      parseHash();
      go(index, true);
    });

    parseHash();
    go(index, true);
  });
})();
