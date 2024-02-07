import {useFetcher, useLoaderData, useNavigate} from "@remix-run/react";
import Wheel from "@uiw/react-color-wheel";
import {ActionFunctionArgs, json, LoaderFunctionArgs} from "@remix-run/node";
import {getLight, Light, updateLight} from "~/api/HueApi";
import {useEffect, useState} from "react";
import {Label, Modal, RangeSlider, Spinner, ToggleSwitch} from "flowbite-react";

export async function loader({
   params,
}: LoaderFunctionArgs) {
  const light = await getLight(params.id as string);
  return json(light);
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
  }

  return json({ errors: [{description: 'What are you trying to do?'}] });
};

export default function LightDetails() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [light, setLight] = useState<Light | null>(null);
  const navigate = useNavigate();
  const [hsva, setHsva] = useState({ h: 214, s: 43, v: 90, a: 1 });
  const modalSize = "md";


  useEffect(() => {
    if (data.data?.length) { // loader seems to cache previous returned value even without a GET
      setLight(data.data[0]);
    }
  }, [data]);

  return (<>
    {!light ? (
      <Modal size={modalSize} dismissible show={true} onClose={() => navigate(-1)}>
        <Modal.Header>
          <div role="status" className="max-w-sm animate-pulse">
            <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"></div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            <Spinner color="pink" aria-label="Hang in there. Retrieving state of light." />
          </div>
        </Modal.Body>
      </Modal>
      ) : light ? (
        <Modal size={modalSize} dismissible show={true} onClose={() => navigate(-1)}>
          <Modal.Header>{light.metadata?.name}</Modal.Header>
          <Modal.Body>
            <div className="flex flex-col items-center justify-center h-full">
              <Wheel
                className="mb-4"
                color={hsva}
                onChange={(color) => setHsva({...hsva, ...color.hsva})}
                width={196} height={196}/>

              <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                     className="fill-sky-800 dark:fill-slate-100" viewBox="0 0 16 16">
                  <path
                    d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
                </svg>
                <fetcher.Form method="post" action={`/lights/${light.id}`}>
                  <input type="hidden" name="id" value={light.id}/>
                  <input type="hidden" name="intent" value="brightness"/>
                  <RangeSlider name="brightness" sizing="lg"
                               min={1} max={100}
                               defaultValue={light.dimming?.brightness}
                               onClick={(event) => fetcher.submit(event.currentTarget.form)}></RangeSlider>
                </fetcher.Form>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <fetcher.Form method="post" action={`/lights/${light.id}`}>
              <input type="hidden" name="id" value={light.id}/>
              <input type="hidden" name="intent" value="toggle"/>
              <ToggleSwitch
                checked={light.on.on}
                onChange={() => { }}
                onClick={(event) => fetcher.submit(event.currentTarget.form)}/>
            </fetcher.Form>
            <Label className="text-gray-900 dark:text-white" htmlFor="lg-range">Turn {light.on.on ? "Off" : "On"}</Label>
          </Modal.Footer>
        </Modal>
    ) : null
    }
    </>
  );
}
