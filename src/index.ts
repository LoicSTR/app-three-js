import { App } from "~/App";

App.mount({
  debug: true,
  canvas: document.querySelector("canvas")!,
}).then(() => {
  document.body.classList.add("loaded");
});

// const introContainer = document.querySelector(".intro") as HTMLElement;
// const gameContainer = document.querySelector(".game") as HTMLElement;
// const startBtn = introContainer.querySelector("button") as HTMLButtonElement;

// startBtn.addEventListener("click", () => {
//   const gameTop = gameContainer.getBoundingClientRect().top;

//   window.scrollTo({
//     top: gameTop,
//     behavior: "smooth",
//   });
// });

// const resetBtn = gameContainer.querySelector("button") as HTMLButtonElement;
// resetBtn.addEventListener("click", () => {
//   window.location.reload();
//   scrollTo(0, 0);
// });
