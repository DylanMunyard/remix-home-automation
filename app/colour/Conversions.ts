import {RgbaColor} from "@uiw/color-convert/src";
import {XyPosition} from "~/api/HueApi.server";

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

export function xyToRgba(xy: XyPosition): RgbaColor {

  // Reconstruct the XYZ parameters
  const Y = 1.0;
  const X = (Y / xy.y) * xy.x;
  const Z = (Y / xy.y) * (1 - xy.x - xy.y);

  // Reconstruct the normalized RGB values
  const red = X * 3.2406 - Y * 1.5372 - Z * 0.4986;
  const green = -X * 0.9689 + Y * 1.8758 + Z * 0.0415;
  const blue = X * 0.0557 - Y * 0.2040 + Z * 1.0570;

  // Convert them to original sRGB values
  const r = (red <= 0.0031308) ? 12.92 * red : (1.0 + 0.055) * Math.pow(red, (1.0 / 2.4)) - 0.055;
  const g = (green <= 0.0031308) ? 12.92 * green : (1.0 + 0.055) * Math.pow(green, (1.0 / 2.4)) - 0.055;
  const b = (blue <= 0.0031308) ? 12.92 * blue : (1.0 + 0.055) * Math.pow(blue, (1.0 / 2.4)) - 0.055;

  return { r: r * 255, g: g * 255, b: b * 255, a: 1.0 };
}