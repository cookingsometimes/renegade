import type { ThemeId, ThemePages } from "./ThemeContext";
import { fluentPages } from "./fluent";
import { oxygenuPages } from "./oxygenu";

export interface ThemeMeta {
    id: ThemeId;
    name: string;
    description: string;
}

const themes: Record<ThemeId, ThemePages> = {
    fluent: fluentPages,
    oxygenu: oxygenuPages,
};

export const getThemePages = (id: ThemeId): ThemePages => themes[id] ?? themes.fluent;

export const availableThemes: ThemeMeta[] = [
    { id: "fluent", name: "Fluent", description: "Clean Microsoft Fluent UI design" },
    { id: "oxygenu", name: "OxygenU", description: "Dark navy blue theme inspired by Oxygen U" },
];
