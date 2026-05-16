import AmmoFactory from "ammo.js";

let ammoPromise;

export function loadAmmo() {
  if (!ammoPromise) {
    const candidates = [
      AmmoFactory,
      AmmoFactory?.default,
      AmmoFactory?.Ammo,
      AmmoFactory?.default?.Ammo,
    ];

    const candidate = candidates.find((entry) => entry != null);

    if (typeof candidate === "function") {
      ammoPromise = Promise.resolve(candidate()).then((ammoLib) => {
        globalThis.Ammo = ammoLib;
        return ammoLib;
      });
    } else if (candidate && typeof candidate.then === "function") {
      ammoPromise = Promise.resolve(candidate).then((ammoLib) => {
        globalThis.Ammo = ammoLib;
        return ammoLib;
      });
    } else if (candidate && typeof candidate === "object") {
      ammoPromise = Promise.resolve(candidate).then((ammoLib) => {
        globalThis.Ammo = ammoLib;
        return ammoLib;
      });
    } else {
      throw new Error("Unable to initialize ammo.js");
    }
  }

  return ammoPromise;
}
