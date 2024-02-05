import {useFetcher, useMatches} from "@remix-run/react";
import {ActionFunctionArgs, json, LoaderFunctionArgs} from "@remix-run/node";
import {getLight, Light, updateLight} from "~/api/HueApi";
import {useEffect, useState} from "react";
import { Modal, Spinner, ToggleSwitch} from "flowbite-react";

export async function loader({
   params,
}: LoaderFunctionArgs) {
  if (!params.id) return null;

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const light = await getLight(params.id as string);
  return json(light);
}

export const action = async ({
 request,
}: ActionFunctionArgs) => {
  const body = await request.formData();
  const id = body.get("id") as string;
  const on = body.get("on") as string === "true";
  const putResponse = await updateLight({
    id,  on : { on }
  });
  return json({ errors: putResponse.errors });
};

export default function LightDetails({ partialLight, onClose } : { partialLight: Partial<Light>, onClose: () => void }) {
  const lightDetails = useFetcher<typeof loader>();
  const [on, setOn] = useState(false);
  const fetcher = useFetcher<typeof action>();
  const [light, setLight] = useState<Light | null>(null);

  function handleToggleSwitch(on: boolean) {
    const formData : FormData = new FormData();
    formData.append("id", partialLight.id as string);
    formData.append("on", String(on));
    fetcher.submit(
      formData,
      {
        action: `/lights/${partialLight.id}/details`,
        method: "post",
      }
    );
  }

  useEffect(() => {
    if (lightDetails.state === "idle" &&
        !light &&
        partialLight.id
    ) {
      lightDetails.load(`/lights/${partialLight.id}/details`);
    }
  }, [lightDetails, light, partialLight.id]);

  useEffect(() => {
    if (!partialLight.id) {
      setLight(null);
    }
  }, [partialLight]);

  useEffect(() => {
    if (lightDetails.data?.data.length &&
        lightDetails.data.data[0].id === partialLight.id) { // loader seems to cache previous returned value even without a GET
      setLight(lightDetails.data.data[0]);
    }
  }, [lightDetails, partialLight]);

  return (<>
    {partialLight.id && !light ? (
      <Modal dismissible show={true} onClose={onClose}>
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
        <Modal dismissible show={true} onClose={onClose}>
          <Modal.Header>{light.metadata?.name}</Modal.Header>
          <Modal.Body>
            <div className="space-y-6">
              <fetcher.Form method="post" action={`/lights/${partialLight}/details`}>
                <ToggleSwitch checked={on} onChange={(evt) => {
                  setOn(evt.valueOf());
                  handleToggleSwitch(evt.valueOf());
                }}/>
              </fetcher.Form>
            </div>
          </Modal.Body>
        </Modal>
      ) : null
    }
    </>
  );
}
