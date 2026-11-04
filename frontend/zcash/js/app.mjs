// Shielded 101 entry point: a tiny hash router (#/friend, #/donate, ...)
// so the module works under any base path without server rewrites.
import { lessons } from "./lessons.mjs";
import { isDone } from "./progress.mjs";
import { h } from "./ui.mjs";
import { track } from "./analytics.mjs";

const root = document.getElementById("shielded101");
export const lessonHref = (id) => `#/${id}`;

function header(current) {
  return h("header.topbar",
    h("a.brand", { href: "#/" }, "Shielded ", h("span", "101")),
    h("div.dots", { "aria-label": "Progress" },
      lessons.map((l) => h(`i${isDone(l.id) ? ".done" : ""}${l.id === current ? ".here" : ""}`, { title: l.title }))),
  );
}

function home() {
  const next = lessons.find((l) => !isDone(l.id)) ?? lessons[lessons.length - 1];
  return h("main.fade-in",
    h("h1", "Learn Zcash ", h("span.hl", "privacy"), " by doing it"),
    h("p", "Five short lessons, about 10 minutes in total. Each one sends real transactions on the Zcash ",
      h("b", "testnet"), ", a practice network whose coins (TAZ) have no monetary value. Every step gives you a link to check it yourself on a public block explorer."),
    h("p.muted.small", "No wallet, no sign-up, no faucet. We run practice wallets for you."),
    h("a.btn.btn-hero", { href: lessonHref(next.id) }, isDone(lessons[0].id) ? `Continue: ${next.title}` : "Start lesson 1"),
    h("div", { style: "margin-top:18px" },
      lessons.map((l) => h(`a.card.lesson${isDone(l.id) ? ".done" : ""}`, { href: lessonHref(l.id) },
        h("span.num", isDone(l.id) ? "✓" : l.n),
        h("span", h("b", l.title), h("br"), h("span.muted.small", l.blurb)),
        h("span.arrow", "›")))),
  );
}

async function route() {
  const id = location.hash.replace(/^#\/?/, "").split("?")[0];
  const lesson = lessons.find((l) => l.id === id);
  root.replaceChildren(header(lesson?.id));
  window.scrollTo(0, 0);
  if (!lesson) return root.append(home());
  const main = h("main.fade-in");
  root.append(main);
  const i = lessons.indexOf(lesson);
  const ctx = { lesson, next: lessons[i + 1], nextHref: lessons[i + 1] ? lessonHref(lessons[i + 1].id) : "#/" };
  track("lesson_opened", { lesson: lesson.n });
  try {
    (await lesson.load()).render(main, ctx);
  } catch (e) {
    console.error(e);
    main.append(h("p", "This lesson failed to load. Please refresh the page."));
  }
}

window.addEventListener("hashchange", route);
route();
