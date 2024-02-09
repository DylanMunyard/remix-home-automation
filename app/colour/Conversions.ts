import {RgbaColor} from "@uiw/color-convert/src";

export function rgbaToXy(rgba: RgbaColor) : { x: number, y: number } {
  /* handy function to check your values: https://viereck.ch/hue-xy-rgb/ */

  const rgb = {
    r: rgba.r / 255,
    g: rgba.g / 255,
    b: rgba.b / 255
  };

  const red = (rgb.r > 0.04045) ? Math.pow((rgb.r + 0.055) / (1.0 + 0.055), 2.4) : (rgb.r / 12.92);
  const green = (rgb.g > 0.04045) ? Math.pow((rgb.g + 0.055) / (1.0 + 0.055), 2.4) : (rgb.g / 12.92);
  const blue = (rgb.b > 0.04045) ? Math.pow((rgb.b + 0.055) / (1.0 + 0.055), 2.4) : (rgb.b / 12.92);

  const X = red * 0.4124 + green * 0.3576 + blue * 0.1805;
  const Y = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const Z = red * 0.0193 + green * 0.1192 + blue * 0.9505;

  const x = X / (X + Y + Z);
  const y = Y / (X + Y + Z);

  return { x, y };
}