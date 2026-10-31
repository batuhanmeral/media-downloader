import { setLocale } from "@/i18n/actions";
import { APP_NAME } from "@/lib/app";
import { LocaleSwitch } from "./locale-switch";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line pb-4">
      <h1 className="font-mono text-base font-semibold tracking-tight">
        {APP_NAME}
      </h1>
      <LocaleSwitch onSelect={setLocale} />
    </header>
  );
}
