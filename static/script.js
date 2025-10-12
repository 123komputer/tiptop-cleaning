// script.js

// ===== Pomocnicze =====
function withTimeout(ms, promise) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return Promise.race([
    promise(ctrl.signal).finally(() => clearTimeout(t)),
    // Fallback na wypadek, gdyby promise nie respektował AbortController
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Przekroczono czas oczekiwania")), ms + 50)
    )
  ]);
}

function setStatus(msg, type = "info", el) {
  if (!el) return alert(msg); // awaryjnie
  el.textContent = msg;
  el.dataset.type = type; // można podpiąć style [data-type="error"] { ... }
}

// ===== Formularz kontaktowy =====
async function wyslijFormularz(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const btn = form.querySelector('button[type="submit"]');
  const statusEl =
    form.querySelector("#form-status") ||
    document.getElementById("form-status");

  // Blokada wielokrotnego wysłania
  if (btn.dataset.locked === "1") return;
  btn.dataset.locked = "1";

  const prevLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Wysyłanie…";
  setStatus("Wysyłam wiadomość…", "info", statusEl);

  try {
    const res = await withTimeout(10000, (signal) =>
      fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal
      })
    );

    // Czy serwer odpowiedział 2xx?
    if (!res.ok) {
      let errMsg = "Nie udało się wysłać (błąd serwera).";
      try {
        const j = await res.json();
        if (j?.message) errMsg = j.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const json = await res.json().catch(() => ({}));
    setStatus(json.message || "Dziękujemy! Skontaktujemy się wkrótce.", "ok", statusEl);
    form.reset();
  } catch (err) {
    console.error(err);
    const humanMsg =
      err.name === "AbortError"
        ? "Przekroczono czas oczekiwania. Spróbuj ponownie."
        : (err?.message || "Coś poszło nie tak. Spróbuj ponownie.");
    setStatus(humanMsg, "error", statusEl);
  } finally {
    btn.disabled = false;
    btn.textContent = prevLabel || "Wyślij zapytanie";
    btn.dataset.locked = "0";
    // zwróć fokus na przycisk – przydatne dla klawiatury/ czytników
    btn.focus();
  }
}

// ===== Lightbox =====
function initLightbox() {
  const lb = document.getElementById("lb");
  if (!lb) return;

  const img = document.getElementById("lb-img");
  const video = document.getElementById("lb-video");
  const closeBtn = document.getElementById("lb-close");

  let lastFocused = null;

  function bodyScrollLock(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : "";
  }

  function showMedia(src, isVideo = false, title = "") {
    if (isVideo) {
      if (img) {
        img.classList.add("hidden");
        img.removeAttribute("src");
        img.removeAttribute("alt");
      }
      if (video) {
        video.classList.remove("hidden");
        video.src = src;
        video.setAttribute("controls", "controls");
        video.play().catch(() => {});
      }
    } else {
      if (video) {
        video.pause?.();
        video.removeAttribute("src");
        video.classList.add("hidden");
      }
      if (img) {
        img.src = src;
        img.alt = title || "Podgląd";
        img.classList.remove("hidden");
      }
    }
  }

  function openLightbox(src, isVideo = false, title = "") {
    lastFocused = document.activeElement;
    showMedia(src, isVideo, title);
    lb.classList.remove("hidden");
    lb.classList.add("flex");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("role", "dialog");
    bodyScrollLock(true);
    (closeBtn || lb).focus();
  }

  function closeLightbox() {
    lb.classList.add("hidden");
    lb.classList.remove("flex");
    bodyScrollLock(false);
    if (video) {
      video.pause?.();
      video.removeAttribute("src");
    }
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  // Delegacja – działa także dla elementów dodanych później
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox]");
    if (!trigger) return;

    // Akceptuj klik lewym, Enter, Space
    if (
      e.type === "click" ||
      (e.type === "keydown" && (e.key === "Enter" || e.key === " "))
    ) {
      e.preventDefault();
      const href = trigger.getAttribute("href") || trigger.dataset.src || "";
      const explicitType = (trigger.getAttribute("data-type") || "").toLowerCase();
      const title = trigger.getAttribute("data-title") || trigger.getAttribute("title") || "";
      const isVidByExt = /\.(mp4|webm|ogg)(\?.*)?$/i.test(href);
      const isVideo = explicitType === "video" || (explicitType !== "image" && isVidByExt);
      openLightbox(href, isVideo, title);
    }
  });

  // Zamknięcie
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeLightbox();
  });

  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Klawiatura + focus trap
  document.addEventListener("keydown", (e) => {
    if (lb.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();

    // prosty focus-trap
    if (e.key === "Tab") {
      const focusables = lb.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const kontaktForm = document.getElementById("kontakt-form");
  if (kontaktForm) kontaktForm.addEventListener("submit", wyslijFormularz);
  initLightbox();
});
