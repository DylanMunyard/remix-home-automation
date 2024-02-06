import {useFetcher, useLoaderData, useNavigate, useParams} from "@remix-run/react";
import {ActionFunctionArgs, json, LoaderFunctionArgs} from "@remix-run/node";
import {getLight, Light, updateLight} from "~/api/HueApi";
import {useEffect, useState} from "react";
import {Button, Label, Modal, RangeSlider, Spinner} from "flowbite-react";

export async function loader({
   params,
}: LoaderFunctionArgs) {
  const light = await getLight(params.id as string);
  return json(light);
}

export const action = async ({
 request,
}: ActionFunctionArgs) => {const body = await request.formData();
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

  const params = useParams<{ id: string }>();
  const lightId = params.id ?? "";

  useEffect(() => {
    if (data.data?.length) { // loader seems to cache previous returned value even without a GET
      setLight(data.data[0]);
    }
  }, [data]);

  return (<>
    {!light ? (
      <Modal dismissible show={true} onClose={() => navigate(-1)}>
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
        <Modal dismissible show={true} onClose={() => navigate(-1)}>
          <Modal.Header>{light.metadata?.name}</Modal.Header>
          <Modal.Body>
              <div className="flex items-center space-x-3">
                <fetcher.Form method="post" action={`/lights/${lightId}`}>
                  <input type="hidden" name="id" value={light.id}/>
                  <input type="hidden" name="intent" value="toggle"/>
                  <Button type={"submit"} color="blue">{light.on.on ? "Off" : "On"}</Button>
                </fetcher.Form>
                <div>
                  <div className="mb-1 block">
                    <Label className="text-gray-900 dark:text-white" htmlFor="lg-range" value="Brightness"/>
                  </div>

                  <fetcher.Form method="post" action={`/lights/${lightId}`}>
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
        </Modal>
    ) : null
    }
    </>
  );
}
