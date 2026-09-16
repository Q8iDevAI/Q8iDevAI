import { requireNativeModule, type EventSubscription } from "expo-modules-core";

type HardwareKeyboardSubmitHandler = () => void;

interface Q8iDevAIHardwareKeyboardModule {
  setHardwareKeyboardSubmitEnabled(enabled: boolean): void;
  addListener(
    eventName: "onHardwareKeyboardSubmit",
    handler: HardwareKeyboardSubmitHandler,
  ): EventSubscription;
}

const module = requireNativeModule<Q8iDevAIHardwareKeyboardModule>("Q8iDevAIHardwareKeyboard");

export function setHardwareKeyboardSubmitEnabled(enabled: boolean) {
  module.setHardwareKeyboardSubmitEnabled(enabled);
}

export function addHardwareKeyboardSubmitListener(handler: HardwareKeyboardSubmitHandler) {
  return module.addListener("onHardwareKeyboardSubmit", handler);
}
