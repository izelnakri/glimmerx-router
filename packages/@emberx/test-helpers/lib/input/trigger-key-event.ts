import actions from 'qunit-action';

export interface KeyModifiers {
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

const DEFAULT_MODIFIERS: KeyModifiers = Object.freeze({
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
});

export default async function triggerKeyEvent(
  target: Target,
  eventType: KeyboardEventType,
  key: number | string,
  modifiers: KeyModifiers = DEFAULT_MODIFIERS
): Promise<void> {
  return await actions.triggerKeyEvent(target, eventType, key, modifiers);

  // return settled();
}
