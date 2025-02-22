import { requestMutation } from '../lib/fasterdom/fasterdom';

import type { ISettings } from '../types';

import { animate } from './animation';
import { lerp } from './math';

import themeColors from '../styles/themes.json';

type RGBAColor = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

let isInitialized = false;

const HEX_COLOR_REGEX =
  /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i;
const DURATION_MS = 200;
const ENABLE_ANIMATION_DELAY_MS = 500;
const RGB_VARIABLES = new Set([
  '--color-primary-shade',
  '--color-text-secondary',
]);

const DISABLE_ANIMATION_CSS = `
.no-animations #root *,
.no-animations #root *::before,
.no-animations #root *::after {
  transition: none !important;
}`;

const colors = (
  Object.keys(themeColors) as Array<keyof typeof themeColors>
).map((property) => ({
  property,
  colors: [
    hexToRgb(themeColors[property][0]),
    hexToRgb(themeColors[property][1]),
  ],
}));

const injectCss = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return () => {
    document.head.removeChild(style);
  };
};

const switchTheme = (theme: ISettings['theme'], withAnimation: boolean) => {
  const themeClassName = `theme-${theme}`;
  if (document.documentElement.classList.contains(themeClassName)) {
    return;
  }
  //const isDarkTheme = theme === 'dark';
  const isDarkTheme = false;
  const shouldAnimate = isInitialized && withAnimation;
  const startIndex = isDarkTheme ? 0 : 1;
  const endIndex = isDarkTheme ? 1 : 0;
  const startAt = Date.now();
  const themeColorTag = document.querySelector('meta[name="theme-color"]');

  requestMutation(() => {
    document.documentElement.classList.remove(
      `theme-${isDarkTheme ? 'light' : 'dark'}`
    );
    let uninjectCss: (() => void) | undefined;
    if (isInitialized) {
      uninjectCss = injectCss(DISABLE_ANIMATION_CSS);
      document.documentElement.classList.add('no-animations');
    }
    document.documentElement.classList.add(themeClassName);
    if (themeColorTag) {
      themeColorTag.setAttribute('content', isDarkTheme ? '#212121' : '#fff');
    }

    setTimeout(() => {
      requestMutation(() => {
        uninjectCss?.();
        document.documentElement.classList.remove('no-animations');
      });
    }, ENABLE_ANIMATION_DELAY_MS);

    isInitialized = true;

    if (shouldAnimate) {
      animate(() => {
        const t = Math.min((Date.now() - startAt) / DURATION_MS, 1);

        applyColorAnimationStep(startIndex, endIndex, transition(t));

        return t < 1;
      }, requestMutation);
    } else {
      applyColorAnimationStep(startIndex, endIndex);
    }
  });
};

function transition(t: number) {
  return 1 - (1 - t) ** 3.5;
}

export function hexToRgb(hex: string): RGBAColor {
  const result = HEX_COLOR_REGEX.exec(hex)!;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] !== undefined ? parseInt(result[4], 16) : undefined,
  };
}

function applyColorAnimationStep(
  startIndex: number,
  endIndex: number,
  interpolationRatio: number = 1
) {
  colors.forEach(({ property, colors: propertyColors }) => {
    const r = Math.round(
      lerp(
        propertyColors[startIndex].r,
        propertyColors[endIndex].r,
        interpolationRatio
      )
    );
    const g = Math.round(
      lerp(
        propertyColors[startIndex].g,
        propertyColors[endIndex].g,
        interpolationRatio
      )
    );
    const b = Math.round(
      lerp(
        propertyColors[startIndex].b,
        propertyColors[endIndex].b,
        interpolationRatio
      )
    );
    const a =
      propertyColors[startIndex].a !== undefined
        ? Math.round(
            lerp(
              propertyColors[startIndex].a!,
              propertyColors[endIndex].a!,
              interpolationRatio
            )
          )
        : undefined;

    document.documentElement.style.setProperty(
      property,
      a !== undefined
        ? `rgba(${r},${g},${b},${a / 255})`
        : `rgb(${r},${g},${b})`
    );

    if (RGB_VARIABLES.has(property)) {
      document.documentElement.style.setProperty(
        `${property}-rgb`,
        `${r},${g},${b}`
      );
    }
  });
}

export default switchTheme;
