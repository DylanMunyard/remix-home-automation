import {Await, useFetcher, useLoaderData, useNavigate} from "@remix-run/react";
import Wheel from "@uiw/react-color-wheel";
import {ActionFunctionArgs, defer, json, LoaderFunctionArgs, TypedDeferredData} from "@remix-run/node";
import {getLight, HueResponse, Light, updateLight} from "~/api/HueApi";
import React, {Suspense, useState} from "react";
import {Label, Modal, RangeSlider, Spinner, ToggleSwitch} from "flowbite-react";
import {hsvaToRgba, ColorResult} from "@uiw/color-convert";
import {HsvaColor} from "@uiw/color-convert/src";
import { rgbaToXy } from "~/colour/Conversions";

export async function loader({
   params,
}: LoaderFunctionArgs) : Promise<TypedDeferredData<{ data: Promise<HueResponse<Light>> }>>{
  const light = getLight(params.id as string);
  return defer({ data: light });
}

export const action = async ({
 request,
}: ActionFunctionArgs) => {
  const body = await request.formData();
  const id = body.get("id") as string;
  const brightness = body.get("brightness") as string;
  const { errors, data } = await getLight(id);

  if (errors.length) {
    return json({ errors });
  }

  const light : Partial<Light> = {
    id,
    on: data[0].on
  }

  switch (body.get("intent")) {
    case 'toggle': {
      if (light.on !== undefined) light.on.on = !light.on.on;
      const putResponse = await updateLight(light);
      return json({ errors: putResponse.errors });
    }
    case 'brightness': {
      light.on = { on: true };
      light.dimming = { brightness: parseFloat(brightness) };
      const putResponse = await updateLight(light);
      return json({ errors: putResponse.errors });
    }
    case 'colour': {
      light.on = { on: true };
      const x = parseFloat(body.get("x") as string);
      const y = parseFloat(body.get("y") as string);
      if (light.color) {
        light.color.xy = {x, y};
      } else {
        // @ts-expect-error: on update the Gamut is not writeable
        light.color = {
          xy: { x, y }
        }
      }
      const putResponse = await updateLight(light);
      return json({ errors: putResponse.errors });
    }
  }

  return json({ errors: [{description: 'What are you trying to do?'}] });
};

export default function LightDetails() {
  const { data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });
  const [xy, setXy] = useState({x: 0, y: 0});

  React.useEffect(() => {
    if (!hsva) return;

    const rgba = hsvaToRgba(hsva);
    setXy(rgbaToXy(rgba));
  }, [hsva]);

  React.useEffect(() => {
    fetcher.submit({
      "id": "8e035c51-ae32-4492-a4c6-1d3223a30fb7",
      "intent": "colour",
      "x": xy.x,
      "y": xy.y
    }, {
      method: "POST",
      action: `/lights/8e035c51-ae32-4492-a4c6-1d3223a30fb7`
    });
  }, [xy]);

  const modalSize = "md";

  return (
    <Suspense fallback={<LightSkeleton modalSize={modalSize} onClose={() => navigate(-1)} />}>
      <Await resolve={data}>
        {(api) =>
        <Modal size={modalSize} dismissible show={true} onClose={() => navigate(-1)}>
          <Modal.Header>{api.data[0].metadata?.name}</Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center justify-center h-full">
              <Wheel
                className="mb-4"
                color={hsva}
                onChange={(color : ColorResult) => setHsva(color.hsva as HsvaColor)}
                width={196} height={196}/>

              <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                     className="fill-sky-800 dark:fill-slate-100" viewBox="0 0 16 16">
                  <path
                    d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
                </svg>
                <fetcher.Form method="post" action={`/lights/${api.data[0].id}`}>
                  <input type="hidden" name="id" value={api.data[0].id}/>
                  <input type="hidden" name="intent" value="brightness"/>
                  <RangeSlider name="brightness" sizing="lg"
                               min={1} max={100}
                               defaultValue={api.data[0].dimming?.brightness}
                               onClick={(event) => fetcher.submit(event.currentTarget.form)}></RangeSlider>
                </fetcher.Form>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <fetcher.Form method="post" action={`/lights/${api.data[0].id}`}>
              <input type="hidden" name="id" value={api.data[0].id}/>
              <input type="hidden" name="intent" value="toggle"/>
              <ToggleSwitch
                checked={api.data[0].on.on}
                onChange={() => { }}
                onClick={(event) => fetcher.submit(event.currentTarget.form)}/>
            </fetcher.Form>
            <Label className="text-gray-900 dark:text-white" htmlFor="lg-range">Turn {api.data[0].on.on ? "Off" : "On"}</Label>
          </Modal.Footer>
        </Modal>
        }
      </Await>
    </Suspense>
  );
}

function LightSkeleton({ modalSize, onClose } : { modalSize: string, onClose: () => void }) {
  return (
    <Modal size={modalSize} show={true} onClose={onClose}>
      <Modal.Header>
        <div className="animate-bounce">
          <Spinner aria-label="Spinner button example" size="sm" />
          <span className="pl-3 text-gray-500 dark:text-gray-200">Loading...</span>
        </div>
      </Modal.Header>
      <Modal.Body>
        <div className="animate-pulse flex flex-col items-center justify-center h-full">
          <div className="h-[196px] w-[196px] mb-4 bg-gray-200 rounded-full dark:bg-gray-700"></div>

          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                 className="fill-sky-800 dark:fill-slate-100" viewBox="0 0 16 16">
              <path
                d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
            </svg>
            <div className="w-52 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="animate-pulse flex items-center space-x-3">
          <div className="h-6 w-12 bg-gray-200 rounded-full dark:bg-gray-700"></div>
          <div className="h-6 w-12 bg-gray-200 rounded-full dark:bg-gray-700"></div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
