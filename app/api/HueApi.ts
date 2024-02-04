import fetch from 'node-fetch';
import https from 'https';

// process.env.HUE_APPLICATION_KEY could be the way you have it stored in config as environment variable
const hueApplicationKey = process.env.HUE_APPLICATION_KEY ?? "key";

const apiBase = 'https://192.168.1.110/clip/v2';

export interface HueResponse<T> {
    data: T[];
    errors: HueError[]
}

export interface HueError {
    description: string | null
}

export interface HueResource {
    id: string;
    id_v1: string | null;
    type: string;
    metadata: Metadata | null;
    creation_time: string | null;
    owner: ResourceIdentifier | null;
    services: ResourceIdentifier[] | null;
}

export interface Light extends HueResource {
    on: On;
    dimming: Dimming | null;
    dimming_delta: DimmingDelta | null;
    color_temperature: ColorTemperature | null;
    color_temperature_delta: ColorTemperatureDelta | null;
    color: Color | null;
    dynamics: Dynamics | null;
    alert: Alert | null;
    signaling: Signaling | null;
    mode: string;
    gradient: Gradient | null;
    effects: Effects | null;
    timed_effects: TimedEffects | null;
    powerup: PowerUp | null;
}

export interface Gradient {
    points: GradientPoint[];
    mode: GradientMode;
    mode_values: string[] | null;
    points_capable: number | null;
    pixel_count: number | null;
}

export interface GradientPoint {
    color: Color | null;
}

export enum GradientMode {
    interpolated_palette,
    interpolated_palette_mirrored,
    random_pixelated
}

export interface Metadata {
    name: string;
    archetype: string | null;
    control_id: number | null;
}

export interface Alert {
    action_values: string[];
}

export interface Signaling {
    signal_values: Signal[] | null;
    status: SignalingStatus | null;
}

export interface SignalingStatus {
    signal: Signal;
    estimated_end: string | null;
    colors: XyPosition[] | null;
}

export interface SignalingUpdate {
    signal: Signal;
    duration: number;
    colors: Color[] | null;
}

export interface Dynamics {
    duration: number;
    speed: number;
    speed_valid: boolean;
    status: string;
    status_values: string[];
}

export interface On {
    on: boolean;
}

export interface PowerUpOn {
    mode: PowerUpOnMode | null;
    on: On | null;
}

export interface XyPosition {
    x: number;
    y: number;
}

export interface Gamut {
    blue: XyPosition;
    green: XyPosition;
    red: XyPosition;
}

export interface Color {
    gamut: Gamut | null;
    gamut_type: string | null;
    xy: XyPosition;
}

export interface MirekSchema {
    mirek_maximum: number;
    mirek_minimum: number;
}

export interface ColorTemperature {
    mirek: number | null;
    mirek_schema: MirekSchema;
    mirek_valid: boolean;
}

export interface ColorTemperatureDelta {
    action: DeltaAction;
    mirek_delta: number;
}

export interface Dimming {
    brightness: number;
    min_dim_level?: number | null;
}

export interface DimmingDelta {
    action: DeltaAction;
    brightness_delta: number;
}

export interface Effects {
    effect: Effect;
    effect_values: string[] | null;
    status: string | null;
    status_values: string[] | null;
}

export enum Effect {
    no_effect,
    fire,
    candle,
    sparkle,
    prism,
    glisten,
    opal
}

export interface TimedEffects {
    effect: TimedEffect;
    duration: number;
    effect_values: string[] | null;
    status: string | null;
    status_values: string[] | null;
}

export interface PowerUp {
    preset: PowerUpPreset;
    on: PowerUpOn | null;
    dimming: Dimming | null;
    color: Color | null;
    configured: boolean | null;
}

export enum TimedEffect {
    no_effect,
    sunrise
}

export enum DeltaAction {
    up,
    down,
    stop
}

export enum PowerUpPreset {
    safety,
    powerfail,
    last_on_state,
    custom
}

export enum PowerUpOnMode {
    on,
    toggle,
    previous
}

export enum Signal {
    no_signal,
    on_off,
    on_off_color,
    alternating
}

export interface Zone extends HueResource {
    children: ResourceIdentifier[];
    grouped_services: ResourceIdentifier[];
}

export interface ResourceIdentifier {
    rid: string;
    rtype: string;
}

const agent = new https.Agent({
    rejectUnauthorized: false
});

export async function getHome() : Promise<{ lights: Light[], zones: Zone[] }> {

    try {
        let response = await fetch(`${apiBase}/resource/light`, {
            method: 'GET',
            agent,
            headers: {
                'hue-application-key': hueApplicationKey
            }
        });

        const lightsResponse : HueResponse<Light> = await response.json() as HueResponse<Light>;
        if (lightsResponse.errors.length > 0) {
            console.error('Error getting lights', lightsResponse.errors.join(", "));
        }

        response = await fetch(`${apiBase}/resource/zone`, {
            method: 'GET',
            agent,
            headers: {
                'hue-application-key': hueApplicationKey
            }
        });

        const zonesResponse : HueResponse<Zone> = await response.json() as HueResponse<Zone>;
        if (zonesResponse.errors.length > 0) {
            console.error('Error getting zones', zonesResponse.errors.join(", "));
        }
        return { lights: lightsResponse.data, zones: zonesResponse.data };
    } catch (error) {
        console.error(`Hue API Error: ${error}`);
    }

    return { lights: [], zones: [] };
}

export async function getLight(id: string) : Promise<HueResponse<Light>> {

    try {
        const response = await fetch(`${apiBase}/resource/light/${id}`, {
            method: 'GET',
            agent,
            headers: {
                'hue-application-key': hueApplicationKey
            }
        });

        const lightResponse : HueResponse<Light> = await response.json() as HueResponse<Light>;
        if (lightResponse.errors.length > 0 || lightResponse.data.length === 0) {
            console.error('Error getting lights', lightResponse.errors.join(", "));
        }
        console.info(JSON.stringify(lightResponse.data));
        return lightResponse;
    } catch (error) {
        console.error(`Hue API Error: ${error}`);
        return { errors: [{ description: "Hue API error" }], data: [] };
    }
}

export async function updateLight(light: Partial<Light>) : Promise<HueResponse<ResourceIdentifier>> {
    try {
        console.info(JSON.stringify(light));
        const response = await fetch(`${apiBase}/resource/light/${light.id}`, {
            method: 'PUT',
            agent,
            headers: {
                'Content-Type': 'application/json',
                'hue-application-key': hueApplicationKey
            },
            body: JSON.stringify(light)
        });

        const apiResponse : HueResponse<ResourceIdentifier> = await response.json() as HueResponse<ResourceIdentifier>;
        if (apiResponse.errors.length > 0 || apiResponse.data.length === 0) {
            console.error('Error update lights', apiResponse.errors.map(error => error.description).join(", "));
        }
        return apiResponse;
    } catch (error) {
        console.error(`Hue API Error: ${error}`);
    }

    throw new Error("Hue API Error");
}