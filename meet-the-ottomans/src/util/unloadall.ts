import type { AppBase } from "playcanvas";

export function unloadAll(app: AppBase) {
    var children = app.root.children;
    for (var i = 0; i<children.length; i++){
      children[i].destroy();
    }
}
