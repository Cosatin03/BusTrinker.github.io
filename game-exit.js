import { removeSaved } from "./session.js";
const key = location.pathname.endsWith("roulette.html")
  ? "bustrinker.roulette.v1"
  : "bustrinker.ladders.v1";
const dialog = document.createElement("dialog");
const title = document.createElement("h2");
title.textContent = "Runde beenden?";
const text = document.createElement("p");
text.textContent =
  "Die gespeicherte Runde wird gelöscht. Danach könnt ihr ein anderes Spiel auswählen.";
const cancel = document.createElement("button");
cancel.textContent = "Weiterspielen";
cancel.className = "secondary";
cancel.onclick = () => dialog.close();
const finish = document.createElement("button");
finish.textContent = "Beenden & Spiel wählen";
finish.className = "primary";
finish.onclick = () => {
  removeSaved(key);
  location.href = "index.html";
};
dialog.append(title, text, cancel, finish);
document.body.append(dialog);
const exit = document.createElement("button");
exit.type = "button";
exit.textContent = "Runde beenden";
exit.className = "text-button";
exit.onclick = () => dialog.showModal();
if (document.querySelector(".board-topline")) {
  exit.textContent = "×";
  exit.setAttribute("aria-label", "Runde beenden");
  exit.title = "Runde beenden";
  exit.style.cssText =
    "position:fixed;bottom:8px;right:8px;z-index:5;background:#783b38;color:white;border-radius:50%;width:36px;height:36px;min-height:36px;font-size:24px;padding:0";
  document.querySelector("#quick-players").style.paddingRight = "44px";
  document.body.append(exit);
} else {
  exit.style.cssText='position:fixed;bottom:10px;right:12px;z-index:5;background:#783b38;color:white;border-radius:12px;padding:10px;font-size:12px;min-height:44px';
  document.body.append(exit);
}
