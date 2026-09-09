/**
 * AI Strategy Snapshot modal.
 *
 * Self-contained: injects its own styles and markup, then wires every
 * [data-snapshot-open] button on the page. Include it once per page with
 *   <script src="assets/snapshot-modal.js" defer></script>
 * and add a button:
 *   <button class="btn btn-primary" type="button" data-snapshot-open>Book...</button>
 *
 * The HubSpot embed is fetched on first open, so pages that are never
 * converted pay nothing for it. HubSpot renders the form inside a
 * cross-origin iframe, so the form's own appearance can only be changed in
 * the HubSpot form editor, not here.
 */
(function () {
  "use strict";

  var PORTAL_ID = "443641127";
  var FORM_ID = "b4cb8e1e-515b-4c33-85af-15178f877296";
  var REGION = "ap1";
  var EMBED_SRC = "https://js-ap1.hsforms.net/forms/embed/" + PORTAL_ID + ".js";


  // Token fallbacks keep this usable on any page, including ones without the
  // site's :root block.
  var CSS = [
    ".snapshot-modal[hidden]{display:none}",
    ".snapshot-modal{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}",
    ".snapshot-modal-backdrop{position:absolute;inset:0;background:rgba(3,7,13,.78);backdrop-filter:blur(4px)}",
    ".snapshot-modal-panel{position:relative;width:min(560px,100%)}",
    ".snapshot-modal-body{max-height:88vh;overflow-y:auto;border-radius:var(--radius,8px);box-shadow:var(--shadow,0 24px 70px rgba(0,0,0,.32))}",
    ".snapshot-modal .hs-form-frame iframe{display:block;width:100%;border:0}",
    ".snapshot-modal-close{position:absolute;top:10px;right:10px;z-index:1;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.22);border-radius:var(--radius,8px);background:rgba(3,7,13,.82);color:#f5f7fa;font-size:19px;line-height:1;cursor:pointer;transition:border-color 180ms ease,color 180ms ease,background 180ms ease}",
    ".snapshot-modal-close:hover{border-color:rgba(35,230,180,.55);color:#23e6b4;background:rgba(3,7,13,.92)}"
  ].join("");

  function init() {
    var openers = document.querySelectorAll("[data-snapshot-open]");
    if (!openers.length) return;

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var modal = document.createElement("div");
    modal.className = "snapshot-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="snapshot-modal-backdrop" data-snapshot-close></div>' +
      '<div class="snapshot-modal-panel" role="dialog" aria-modal="true" aria-label="Book your free AI Strategy Snapshot">' +
      '<button class="snapshot-modal-close" type="button" aria-label="Close" data-snapshot-close>&times;</button>' +
      '<div class="snapshot-modal-body">' +
      '<div class="hs-form-frame" data-region="' + REGION + '" data-form-id="' + FORM_ID + '" data-portal-id="' + PORTAL_ID + '"></div>' +
      "</div></div>";
    document.body.appendChild(modal);

    var lastFocused = null;
    var formRequested = false;

    function loadForm() {
      if (formRequested) return;
      formRequested = true;
      var script = document.createElement("script");
      script.src = EMBED_SRC;
      script.defer = true;
      document.head.appendChild(script);
    }

    function open() {
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.classList.add("menu-open");
      loadForm();
      var closeBtn = modal.querySelector(".snapshot-modal-close");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.classList.remove("menu-open");
      if (lastFocused) lastFocused.focus();
    }

    Array.prototype.forEach.call(openers, function (btn) {
      btn.addEventListener("click", open);
    });
    Array.prototype.forEach.call(modal.querySelectorAll("[data-snapshot-close]"), function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) close();
    });

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
