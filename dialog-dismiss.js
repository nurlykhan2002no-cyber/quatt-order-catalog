// Dragging a text selection out of a modal can produce a click on <dialog>.
// Dismiss only a short, complete primary-pointer click on the backdrop.
const bound = new WeakSet();
export function bindDialogBackdrop(dialog) {
  if (bound.has(dialog)) return;
  bound.add(dialog);
  let press = null;
  const outside = event => {
    const r = dialog.getBoundingClientRect();
    return event.target === dialog &&
      (event.clientX < r.left || event.clientX > r.right ||
       event.clientY < r.top || event.clientY > r.bottom);
  };
  dialog.addEventListener('pointerdown', event => {
    press = event.button === 0 && event.isPrimary !== false && outside(event)
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, released: false }
      : null;
  });
  dialog.addEventListener('pointerup', event => {
    if (!press || event.pointerId !== press.id || !outside(event) ||
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) {
      press = null;
      return;
    }
    press.released = true;
  });
  dialog.addEventListener('click', event => {
    const dismiss = press?.released && event.detail > 0 && outside(event);
    press = null;
    if (dismiss) dialog.close();
  });
  for (const name of ['pointercancel', 'close', 'cancel']) {
    dialog.addEventListener(name, () => { press = null; });
  }
}
