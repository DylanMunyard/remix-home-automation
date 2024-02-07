import fetch from 'node-fetch';
import https from 'https';

// process.env.HUE_APPLICATION_KEY could be the way you have it stored in config as environment variable
const hueApplicationKey = process.env.HUE_APPLICATION_KEY ?? "";

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

export interface GroupedLight extends HueResource {
    on: On;
    dimming: Dimming | null;
    dimming_delta: DimmingDelta | null;
    color_temperature: ColorTemperature | null;
    color_temperature_delta: ColorTemperatureDelta | null;
    color: Color | null;
    dynamics: Dynamics | null;
    alert: Alert | null;
    signaling: Signaling | null;
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

export async function getHome() : Promise<{ lights: Light[], zones: Zone[], groups: GroupedLight[] }> {
    console.info("Get lights");
    const lights = get<Light>(`${apiBase}/resource/light`);
    const zones = get<Zone>(`${apiBase}/resource/zone`);
    const groups = get<GroupedLight>(`${apiBase}/resource/grouped_light`);

    const thing = await Promise.all([lights, zones, groups])
      .then(([lights, zones, groups]) => {
          return { lights: lights.data, zones: zones.data, groups: groups.data };
      }).catch(reason => {
          console.error(`get home data failed: ${reason}`);
          return { lights: [], zones: [], groups: [] };
      });

    return thing;
}

export async function getLight(id: string) : Promise<HueResponse<Light>> {
    return get<Light>(`${apiBase}/resource/light/${id}`);
}

export async function updateLight(light: Partial<Light>) : Promise<HueResponse<ResourceIdentifier>> {
    return put(light, `${apiBase}/resource/light/${light.id}`);
}

export async function getGroupedLight(id: string) : Promise<HueResponse<Light>> {
    return get<Light>(`${apiBase}/resource/grouped_light/${id}`);
}

export async function updateGroupedLight(group: Partial<GroupedLight>) : Promise<HueResponse<ResourceIdentifier>> {
    return put(group, `${apiBase}/resource/grouped_light/${group.id}`);
}

async function put<T>(body : T, api: string)  : Promise<HueResponse<ResourceIdentifier>> {
    try {
        console.info(JSON.stringify(body));
        const response = await fetch(api, {
            method: 'PUT',
            agent,
            headers: {
                'Content-Type': 'application/json',
                'hue-application-key': hueApplicationKey
            },
            body: JSON.stringify(body)
        });

        const apiResponse: HueResponse<ResourceIdentifier> = await response.json() as HueResponse<ResourceIdentifier>;
        if (apiResponse.errors.length > 0 || apiResponse.data.length === 0) {
            console.error('Error update lights', apiResponse.errors.map(error => error.description).join(", "));
        }
        return apiResponse;
    } catch (error) {
        console.error(`Hue API Error: ${error}`);
    }

    throw new Error("Hue API Error");
}

async function get<T>(api: string) : Promise<HueResponse<T>> {
    try {
        const apiCall = await fetch(api, {
            method: 'GET',
            agent,
            headers: {
                'hue-application-key': hueApplicationKey
            }
        });

        const response : HueResponse<T> = await apiCall.json() as HueResponse<T>;
        if (response.errors.length > 0 || response.data.length === 0) {
            console.error(`Error from api ${api}:`, response.errors.join(", "));
        }
        console.info(JSON.stringify(response.data));
        return response;
    } catch (error) {
        console.error(`Hue API Error: ${error}`);
        return { errors: [{ description: "Hue API error" }], data: [] };
    }
}