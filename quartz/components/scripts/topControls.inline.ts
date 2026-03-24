const desktopMediaQuery = window.matchMedia("(min-width: 1200px)");

function updateTocScrollState(shell: HTMLElement, list: HTMLElement) {
  const scrollable = list.scrollHeight - list.clientHeight > 2;
  const scrolled = list.scrollTop > 2;
  const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;

  shell.classList.toggle("is-scrollable", scrollable);
  shell.classList.toggle("is-scrolled", scrolled);
  shell.classList.toggle("is-at-end", !scrollable || atEnd);
}

function setupTopControls(topControls: HTMLElement) {
  const trigger = topControls.querySelector(
    ".toc-trigger",
  ) as HTMLButtonElement | null;
  const panel = topControls.querySelector(
    ".responsive-toc-panel",
  ) as HTMLElement | null;
  const shell = topControls.querySelector(
    ".responsive-toc-scroll-shell",
  ) as HTMLElement | null;
  const list = topControls.querySelector(
    ".responsive-toc-list",
  ) as HTMLElement | null;

  if (!trigger || !panel || !shell || !list) return;

  const close = () => {
    topControls.classList.remove("toc-open");
    trigger.setAttribute("aria-expanded", "false");
    panel.classList.add("collapsed");
    panel.setAttribute("aria-hidden", "true");
    updateTocScrollState(shell, list);
  };

  const open = () => {
    topControls.classList.add("toc-open");
    trigger.setAttribute("aria-expanded", "true");
    panel.classList.remove("collapsed");
    panel.setAttribute("aria-hidden", "false");
    updateTocScrollState(shell, list);
  };

  const toggle = () => {
    if (topControls.classList.contains("toc-open")) {
      close();
    } else {
      open();
    }
  };

  const syncScrollState = () => updateTocScrollState(shell, list);
  const closeOnDesktop = (event: MediaQueryListEvent) => {
    if (event.matches) {
      close();
    }
  };
  const closeOnAnchorClick = () => {
    if (!desktopMediaQuery.matches) {
      close();
    }
  };

  trigger.addEventListener("click", toggle);
  window.addCleanup(() => trigger.removeEventListener("click", toggle));

  list.addEventListener("scroll", syncScrollState, { passive: true });
  window.addCleanup(() => list.removeEventListener("scroll", syncScrollState));

  desktopMediaQuery.addEventListener("change", closeOnDesktop);
  window.addCleanup(() =>
    desktopMediaQuery.removeEventListener("change", closeOnDesktop),
  );

  const links = list.querySelectorAll("a[href^='#']");
  for (const link of links) {
    link.addEventListener("click", closeOnAnchorClick);
    window.addCleanup(() =>
      link.removeEventListener("click", closeOnAnchorClick),
    );
  }

  requestAnimationFrame(syncScrollState);
}

document.addEventListener("nav", () => {
  const topControlsList = document.querySelectorAll(
    ".top-controls",
  ) as NodeListOf<HTMLElement>;
  topControlsList.forEach((topControls) => setupTopControls(topControls));
});
